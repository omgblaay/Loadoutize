import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

const app = new Hono();

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_STORAGE_BUCKET = Deno.env.get("SUPABASE_STORAGE_BUCKET") ?? "cms-assets";

// Service-role client used for all Postgres reads/writes and for verifying
// user access tokens. Bypasses RLS -- ownership checks below are enforced
// in application code instead.
const supabase = createClient(
  SUPABASE_URL,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getUserFromRequest(c: any) {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  if (!accessToken) return null;
  const { data: { user } } = await supabase.auth.getUser(accessToken);
  return user ?? null;
}

const AVATARS_BUCKET = "avatars";
const NICKNAME_PATTERN = /^[a-z0-9_-]{3,20}$/;

function avatarUrl(path: string | null): string | null {
  return path ? `${SUPABASE_URL}/storage/v1/object/public/${AVATARS_BUCKET}/${path}` : null;
}

function mapProfile(p: any) {
  return {
    id: p.id,
    nickname: p.nickname,
    name: p.name,
    avatarUrl: avatarUrl(p.avatar_path),
    links: {
      tiktok: p.tiktok ?? null,
      instagram: p.instagram ?? null,
      youtube: p.youtube ?? null,
      twitch: p.twitch ?? null,
      kick: p.kick ?? null,
    },
    socialStats: p.social_stats ?? null,
  };
}

// ---------------------------------------------------------------------------
// Social follower/subscriber counts -- best-effort. Only Kick has a real
// public API; the rest scrape public pages or use undocumented endpoints, so
// any of these can silently start returning null if a platform changes its
// markup, rate-limits this server's IP, or tightens access further. Fetched
// in parallel and cached on profiles.social_stats whenever links are edited
// (see PUT /users/me) rather than live on every profile view.
// ---------------------------------------------------------------------------

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function fetchKickFollowers(handle: string): Promise<number | null> {
  try {
    const response = await fetch(`https://kick.com/api/v2/channels/${encodeURIComponent(handle)}`, {
      headers: { "User-Agent": BROWSER_USER_AGENT },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return typeof data.followers_count === "number" ? data.followers_count : null;
  } catch (error) {
    console.log(`Could not fetch Kick followers: ${error}`);
    return null;
  }
}

async function fetchTikTokFollowers(handle: string): Promise<number | null> {
  try {
    const response = await fetch(`https://www.tiktok.com/@${encodeURIComponent(handle)}`, {
      headers: { "User-Agent": BROWSER_USER_AGENT },
    });
    if (!response.ok) return null;
    const html = await response.text();
    const match = html.match(/"followerCount":(\d+)/);
    return match ? Number(match[1]) : null;
  } catch (error) {
    console.log(`Could not fetch TikTok followers: ${error}`);
    return null;
  }
}

function parseCompactCount(text: string): number | null {
  const match = text.replace(/,/g, "").match(/^([\d.]+)([KM])?$/);
  if (!match) return null;
  const n = parseFloat(match[1]);
  if (match[2] === "M") return Math.round(n * 1_000_000);
  if (match[2] === "K") return Math.round(n * 1_000);
  return Math.round(n);
}

// YouTube channel pages also echo other creators' subscriber counts in
// "recommended channel" shelves elsewhere on the same page, so a single
// regex match can grab the wrong number -- the real channel's own count is
// the one that recurs most often (it's duplicated across several metadata
// blocks for the page's own channel), so take the mode rather than the first match.
async function fetchYouTubeSubscribers(handle: string): Promise<number | null> {
  try {
    const response = await fetch(`https://www.youtube.com/@${encodeURIComponent(handle)}`, {
      headers: { "User-Agent": BROWSER_USER_AGENT, "Accept-Language": "en-US,en;q=0.9" },
    });
    if (!response.ok) return null;
    const html = await response.text();
    const matches = [...html.matchAll(/"simpleText":"([\d.,]+[KM]?) subscribers?"/g)].map((m) => m[1]);
    if (!matches.length) return null;

    const counts = new Map<string, number>();
    for (const m of matches) counts.set(m, (counts.get(m) ?? 0) + 1);
    const [mode] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    return parseCompactCount(mode);
  } catch (error) {
    console.log(`Could not fetch YouTube subscribers: ${error}`);
    return null;
  }
}

async function fetchTwitchFollowers(handle: string): Promise<number | null> {
  try {
    // Twitch gated its official follower-count endpoint behind the
    // broadcaster's own OAuth token in 2023 specifically to stop this kind
    // of read -- there is no documented public REST equivalent. This uses
    // the same public (non-secret) Client-Id Twitch's own web frontend uses,
    // against their internal GraphQL API, for a read-only public query.
    const response = await fetch("https://gql.twitch.tv/gql", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Client-Id": "kimne78kx3ncx6brgo4mv6wki5h1ko" },
      body: JSON.stringify([
        {
          operationName: "ChannelFollows",
          variables: { login: handle },
          query: "query ChannelFollows($login: String!) { user(login: $login) { followers { totalCount } } }",
        },
      ]),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const count = data?.[0]?.data?.user?.followers?.totalCount;
    return typeof count === "number" ? count : null;
  } catch (error) {
    console.log(`Could not fetch Twitch followers: ${error}`);
    return null;
  }
}

async function fetchInstagramFollowers(handle: string): Promise<number | null> {
  try {
    // Instagram's web profile-info endpoint generally 401s with
    // require_login for non-browser-session requests -- kept as a genuine
    // best-effort attempt (it may succeed from some IPs/sessions) rather
    // than skipped outright, but null is the expected common case.
    const response = await fetch(
      `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(handle)}`,
      { headers: { "User-Agent": BROWSER_USER_AGENT, "X-IG-App-ID": "936619743392459" } }
    );
    if (!response.ok) return null;
    const data = await response.json();
    const count = data?.data?.user?.edge_followed_by?.count;
    return typeof count === "number" ? count : null;
  } catch (error) {
    console.log(`Could not fetch Instagram followers: ${error}`);
    return null;
  }
}

async function refreshSocialStats(links: {
  tiktok: string | null;
  instagram: string | null;
  youtube: string | null;
  twitch: string | null;
  kick: string | null;
}) {
  const [tiktok, instagram, youtube, twitch, kick] = await Promise.all([
    links.tiktok ? fetchTikTokFollowers(links.tiktok) : Promise.resolve(null),
    links.instagram ? fetchInstagramFollowers(links.instagram) : Promise.resolve(null),
    links.youtube ? fetchYouTubeSubscribers(links.youtube) : Promise.resolve(null),
    links.twitch ? fetchTwitchFollowers(links.twitch) : Promise.resolve(null),
    links.kick ? fetchKickFollowers(links.kick) : Promise.resolve(null),
  ]);
  return { tiktok, instagram, youtube, twitch, kick, fetchedAt: new Date().toISOString() };
}

// Directus-uploaded images are stored in the Supabase Storage bucket
// configured in docker-compose.yml (STORAGE_SUPABASE_ROOT is empty, so
// objects sit at the bucket root under directus_files.filename_disk).
// Looking filename_disk up directly (rather than assuming it matches the
// image UUID) keeps this correct regardless of Directus's internal naming.
async function resolveImageUrls(imageIds: (string | null)[]): Promise<Map<string, string>> {
  const ids = [...new Set(imageIds.filter((id): id is string => !!id))];
  const urlById = new Map<string, string>();
  if (ids.length === 0) return urlById;

  const { data: files, error } = await supabase
    .from('directus_files')
    .select('id, filename_disk')
    .in('id', ids);

  if (error) {
    // directus_files won't exist until Directus has booted at least once --
    // treat that as "no images yet" rather than failing the whole request.
    console.log(`Could not resolve image URLs (has Directus booted yet?): ${error.message}`);
    return urlById;
  }

  for (const file of files ?? []) {
    urlById.set(file.id, `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}/${file.filename_disk}`);
  }
  return urlById;
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

app.get("/make-server-6db475c7/health", (c) => {
  return c.json({ status: "ok" });
});

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

app.post("/make-server-6db475c7/auth/signup", async (c) => {
  try {
    const body = await c.req.json();
    const nickname = String(body.nickname ?? "").toLowerCase().trim();
    if (!NICKNAME_PATTERN.test(nickname)) {
      return c.json({ error: "Nickname must be 3-20 characters: lowercase letters, numbers, - or _" }, 400);
    }

    const { data: existing, error: existingError } = await supabase
      .from('profiles')
      .select('id')
      .eq('nickname', nickname)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) {
      return c.json({ error: "That nickname is already taken" }, 400);
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: body.email,
      password: body.password,
      user_metadata: { name: body.name },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.log(`Signup error: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({ id: data.user.id, nickname, name: body.name });
    if (profileError) {
      // Nickname race lost, or some other insert failure -- don't leave an
      // auth user with no profile behind.
      await supabase.auth.admin.deleteUser(data.user.id);
      console.log(`Signup profile error: ${profileError.message}`);
      return c.json({ error: "That nickname is already taken" }, 400);
    }

    return c.json({ user: data.user });
  } catch (error) {
    console.log(`Error during signup: ${error}`);
    return c.json({ error: "Failed to sign up", details: error.message }, 500);
  }
});

app.get("/make-server-6db475c7/nickname-available", async (c) => {
  try {
    const nickname = String(c.req.query("nickname") ?? "").toLowerCase().trim();
    if (!NICKNAME_PATTERN.test(nickname)) {
      return c.json({ error: "Nickname must be 3-20 characters: lowercase letters, numbers, - or _" }, 400);
    }

    const { data: existing, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('nickname', nickname)
      .maybeSingle();
    if (error) throw error;

    return c.json({ available: !existing });
  } catch (error) {
    console.log(`Error checking nickname availability: ${error}`);
    return c.json({ error: "Failed to check nickname", details: error.message }, 500);
  }
});

// One-time step for a user who authenticated (e.g. via Google) but has no
// `profiles` row yet -- creates it. Unlike PUT /users/me this only ever
// inserts, so a user who already has a profile can't hit it again.
app.post("/make-server-6db475c7/auth/complete-profile", async (c) => {
  try {
    const user = await getUserFromRequest(c);
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();
    if (existingProfile) {
      return c.json({ error: "Profile already exists" }, 400);
    }

    const form = await c.req.formData();
    const nickname = String(form.get('nickname') ?? "").toLowerCase().trim();
    if (!NICKNAME_PATTERN.test(nickname)) {
      return c.json({ error: "Nickname must be 3-20 characters: lowercase letters, numbers, - or _" }, 400);
    }

    const { data: existingNickname, error: existingError } = await supabase
      .from('profiles')
      .select('id')
      .eq('nickname', nickname)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existingNickname) {
      return c.json({ error: "That nickname is already taken" }, 400);
    }

    const metadata = user.user_metadata ?? {};
    const name = String(metadata.full_name ?? metadata.name ?? user.email?.split('@')[0] ?? "Player").trim();

    // Avatar comes from the verified OAuth identity's own metadata (never a
    // client-supplied URL -- fetching an arbitrary attacker-chosen URL
    // server-side would be an SSRF vector).
    let avatarPath: string | null = null;
    const file = form.get('file');
    if (file instanceof File) {
      try {
        avatarPath = await uploadAvatarBytes(user.id, new Uint8Array(await file.arrayBuffer()));
      } catch (error) {
        return c.json({ error: error.message }, 400);
      }
    } else {
      const oauthAvatarUrl = metadata.avatar_url ?? metadata.picture ?? null;
      if (oauthAvatarUrl) {
        try {
          const response = await fetch(oauthAvatarUrl);
          if (response.ok) {
            const bytes = new Uint8Array(await response.arrayBuffer());
            avatarPath = await uploadAvatarBytes(user.id, bytes);
          }
        } catch (error) {
          // Non-critical -- proceed without an avatar rather than failing registration.
          console.log(`Could not re-host OAuth avatar: ${error}`);
        }
      }
    }

    const { data, error } = await supabase
      .from('profiles')
      .insert({ id: user.id, nickname, name, avatar_path: avatarPath })
      .select()
      .single();
    if (error) throw error;

    return c.json({ profile: mapProfile(data) });
  } catch (error) {
    console.log(`Error completing profile: ${error}`);
    return c.json({ error: "Failed to complete profile", details: error.message }, 500);
  }
});

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

app.get("/make-server-6db475c7/users/me", async (c) => {
  try {
    const user = await getUserFromRequest(c);
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (error) throw error;
    if (!data) return c.json({ error: "Profile not found" }, 404);

    return c.json({ profile: mapProfile(data) });
  } catch (error) {
    console.log(`Error fetching own profile: ${error}`);
    return c.json({ error: "Failed to fetch profile", details: error.message }, 500);
  }
});

app.put("/make-server-6db475c7/users/me", async (c) => {
  try {
    const user = await getUserFromRequest(c);
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const update: Record<string, any> = { updated_at: new Date().toISOString() };

    if (body.name != null) {
      const name = String(body.name).trim();
      if (!name) return c.json({ error: "Name is required" }, 400);
      update.name = name;
    }

    if (body.nickname != null) {
      const nickname = String(body.nickname).toLowerCase().trim();
      if (!NICKNAME_PATTERN.test(nickname)) {
        return c.json({ error: "Nickname must be 3-20 characters: lowercase letters, numbers, - or _" }, 400);
      }
      const { data: existing, error: existingError } = await supabase
        .from('profiles')
        .select('id')
        .eq('nickname', nickname)
        .neq('id', user.id)
        .maybeSingle();
      if (existingError) throw existingError;
      if (existing) return c.json({ error: "That nickname is already taken" }, 400);
      update.nickname = nickname;
    }

    for (const platform of ['tiktok', 'instagram', 'youtube', 'twitch', 'kick']) {
      if (body.links && platform in body.links) {
        const handle = String(body.links[platform] ?? "").trim().replace(/^@/, "");
        update[platform] = handle || null;
      }
    }

    if (body.links) {
      const { data: current } = await supabase
        .from('profiles')
        .select('tiktok, instagram, youtube, twitch, kick')
        .eq('id', user.id)
        .maybeSingle();
      const finalLinks = {
        tiktok: 'tiktok' in update ? update.tiktok : current?.tiktok ?? null,
        instagram: 'instagram' in update ? update.instagram : current?.instagram ?? null,
        youtube: 'youtube' in update ? update.youtube : current?.youtube ?? null,
        twitch: 'twitch' in update ? update.twitch : current?.twitch ?? null,
        kick: 'kick' in update ? update.kick : current?.kick ?? null,
      };
      update.social_stats = await refreshSocialStats(finalLinks);
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(update)
      .eq('id', user.id)
      .select()
      .single();
    if (error) throw error;

    return c.json({ profile: mapProfile(data) });
  } catch (error) {
    console.log(`Error updating profile: ${error}`);
    return c.json({ error: "Failed to update profile", details: error.message }, 500);
  }
});

// Real file-type enforcement -- checks magic bytes rather than trusting the
// client's declared Content-Type/extension, either of which can lie.
const IMAGE_SIGNATURES: { mime: string; ext: string; check: (b: Uint8Array) => boolean }[] = [
  { mime: 'image/png', ext: 'png', check: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { mime: 'image/jpeg', ext: 'jpg', check: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: 'image/webp',
    ext: 'webp',
    check: (b) =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
  { mime: 'image/gif', ext: 'gif', check: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 },
];

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB for png/jpeg/webp
const MAX_GIF_BYTES = 2 * 1024 * 1024; // 2MB -- "small gifs" only

// Checks magic bytes + size and throws a user-facing message if invalid --
// shared by the direct-upload route and Google-onboarding's "re-host their
// picture" path.
function validateAvatarBytes(bytes: Uint8Array) {
  const signature = IMAGE_SIGNATURES.find((s) => s.check(bytes));
  if (!signature) {
    throw new Error("File must be a PNG, JPEG, WEBP, or GIF image");
  }
  const maxBytes = signature.mime === 'image/gif' ? MAX_GIF_BYTES : MAX_IMAGE_BYTES;
  if (bytes.length > maxBytes) {
    throw new Error(`File too large -- max ${Math.round(maxBytes / 1024 / 1024)}MB`);
  }
  return signature;
}

// Validates + uploads to the avatars bucket, returning the storage path.
async function uploadAvatarBytes(userId: string, bytes: Uint8Array): Promise<string> {
  const signature = validateAvatarBytes(bytes);
  const path = `${userId}/avatar.${signature.ext}`;
  const { error: uploadError } = await supabase.storage
    .from(AVATARS_BUCKET)
    .upload(path, bytes, { contentType: signature.mime, upsert: true });
  if (uploadError) throw uploadError;
  return path;
}

app.post("/make-server-6db475c7/users/me/avatar", async (c) => {
  try {
    const user = await getUserFromRequest(c);
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const form = await c.req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return c.json({ error: "No file uploaded" }, 400);
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    try {
      validateAvatarBytes(bytes);
    } catch (error) {
      return c.json({ error: error.message }, 400);
    }
    const path = await uploadAvatarBytes(user.id, bytes);

    const { data, error } = await supabase
      .from('profiles')
      .update({ avatar_path: path, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single();
    if (error) throw error;

    return c.json({ profile: mapProfile(data) });
  } catch (error) {
    console.log(`Error uploading avatar: ${error}`);
    return c.json({ error: "Failed to upload avatar", details: error.message }, 500);
  }
});

app.get("/make-server-6db475c7/users/:nickname", async (c) => {
  try {
    const nickname = c.req.param("nickname").toLowerCase();
    const { data, error } = await supabase.from('profiles').select('*').eq('nickname', nickname).maybeSingle();
    if (error) throw error;
    if (!data) return c.json({ error: "User not found" }, 404);

    return c.json({ profile: mapProfile(data) });
  } catch (error) {
    console.log(`Error fetching profile: ${error}`);
    return c.json({ error: "Failed to fetch profile", details: error.message }, 500);
  }
});

// ---------------------------------------------------------------------------
// Catalog: games / weapons / attachments / perks / equipment
// ---------------------------------------------------------------------------

app.get("/make-server-6db475c7/games", async (c) => {
  try {
    const { data, error } = await supabase.from('games').select('*');
    if (error) throw error;

    const urlById = await resolveImageUrls((data ?? []).map((g: any) => g.Logo));
    const games = (data ?? []).map((g) => ({
      id: g.id,
      name: g.name,
      slug: g.slug,
      hasWeaponCategories: g.has_weapon_categories,
      hasAttachments: g.has_attachments,
      hasPerks: g.has_perks,
      hasClasses: g.has_classes,
      logoUrl: g.Logo ? urlById.get(g.Logo) ?? null : null,
    }));
    return c.json({ games });
  } catch (error) {
    console.log(`Error fetching games: ${error}`);
    return c.json({ error: "Failed to fetch games", details: error.message }, 500);
  }
});

app.get("/make-server-6db475c7/games/:gameId/weapons", async (c) => {
  try {
    const gameId = c.req.param("gameId");
    const { data, error } = await supabase
      .from('weapons')
      .select('id, name, image, weapon_category')
      .eq('game_id', gameId);
    if (error) throw error;

    // weapon_category is a Directus many-to-any pointer (`{ key, collection }`)
    // rather than a plain FK column, so PostgREST can't auto-embed it the way
    // resolveImageUrls embeds directus_files -- resolve weapon_categories rows
    // for the referenced keys separately instead.
    const categoryIds = [...new Set(
      (data ?? []).map((w: any) => w.weapon_category?.key).filter((id: any) => id != null)
    )];
    const { data: categoryRows, error: catError } = categoryIds.length
      ? await supabase.from('weapon_categories').select('id, name, short_version').in('id', categoryIds)
      : { data: [], error: null };
    if (catError) throw catError;
    const categoryById = new Map((categoryRows ?? []).map((cat: any) => [cat.id, cat]));

    const urlById = await resolveImageUrls((data ?? []).map((w: any) => w.image));
    const weapons = (data ?? []).map((w: any) => {
      const category = categoryById.get(w.weapon_category?.key);
      return {
        id: w.id,
        name: w.name,
        type: category?.name ?? null,
        typeShort: category?.short_version ?? null,
        categoryId: category?.id ?? null,
        imageUrl: w.image ? urlById.get(w.image) ?? null : null,
      };
    });
    return c.json({ weapons });
  } catch (error) {
    console.log(`Error fetching weapons for game: ${error}`);
    return c.json({ error: "Failed to fetch weapons", details: error.message }, 500);
  }
});

app.get("/make-server-6db475c7/games/:gameId/attachments", async (c) => {
  try {
    const gameId = c.req.param("gameId");
    const { data, error } = await supabase
      .from('attachments_with_images')
      .select('id, name, description, stats, image, type_name, type_slug, type_image')
      .eq('game_id', gameId);
    if (error) throw error;

    const urlById = await resolveImageUrls((data ?? []).flatMap((a: any) => [a.image, a.type_image]));
    const attachments = (data ?? []).map((a: any) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      stats: a.stats,
      type: a.type_name,
      typeSlug: a.type_slug,
      imageUrl: a.image ? urlById.get(a.image) ?? null : null,
      typeImageUrl: a.type_image ? urlById.get(a.type_image) ?? null : null,
    }));
    return c.json({ attachments });
  } catch (error) {
    console.log(`Error fetching attachments: ${error}`);
    return c.json({ error: "Failed to fetch attachments", details: error.message }, 500);
  }
});

app.get("/make-server-6db475c7/games/:gameId/perks", async (c) => {
  try {
    const gameId = c.req.param("gameId");
    const { data, error } = await supabase
      .from('perks')
      .select('id, name, description, image, display_order')
      .eq('game_id', gameId)
      .order('display_order', { ascending: true });
    if (error) throw error;

    const urlById = await resolveImageUrls((data ?? []).map((p: any) => p.image));
    const perks = (data ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      imageUrl: p.image ? urlById.get(p.image) ?? null : null,
    }));
    return c.json({ perks });
  } catch (error) {
    console.log(`Error fetching perks: ${error}`);
    return c.json({ error: "Failed to fetch perks", details: error.message }, 500);
  }
});

app.get("/make-server-6db475c7/games/:gameId/equipment", async (c) => {
  try {
    const gameId = c.req.param("gameId");
    const { data, error } = await supabase
      .from('equipment')
      .select('id, name, description, image, display_order')
      .eq('game_id', gameId)
      .order('display_order', { ascending: true });
    if (error) throw error;

    const urlById = await resolveImageUrls((data ?? []).map((e: any) => e.image));
    const equipment = (data ?? []).map((e: any) => ({
      id: e.id,
      name: e.name,
      description: e.description,
      imageUrl: e.image ? urlById.get(e.image) ?? null : null,
    }));
    return c.json({ equipment });
  } catch (error) {
    console.log(`Error fetching equipment: ${error}`);
    return c.json({ error: "Failed to fetch equipment", details: error.message }, 500);
  }
});

app.get("/make-server-6db475c7/games/:gameId/tags", async (c) => {
  try {
    const gameId = c.req.param("gameId");
    const { data, error } = await supabase
      .from('tags')
      .select('id, name, color, display_order, tag_weapon_categories(weapon_category_id)')
      .eq('game_id', gameId)
      .order('display_order', { ascending: true });
    if (error) throw error;

    const tags = (data ?? []).map((t: any) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      allowedWeaponCategoryIds: (t.tag_weapon_categories ?? []).map((r: any) => r.weapon_category_id),
    }));
    return c.json({ tags });
  } catch (error) {
    console.log(`Error fetching tags: ${error}`);
    return c.json({ error: "Failed to fetch tags", details: error.message }, 500);
  }
});

// ---------------------------------------------------------------------------
// Loadouts
// ---------------------------------------------------------------------------

async function isTagAllowedForWeapons(gameId: string, tagId: number, weapons: any[]) {
  const { data: tag, error: tagError } = await supabase
    .from('tags')
    .select('id')
    .eq('id', tagId)
    .eq('game_id', gameId)
    .maybeSingle();
  if (tagError) throw tagError;
  if (!tag) return false; // tag doesn't exist or belongs to a different game

  const { data: allowedRows, error } = await supabase
    .from('tag_weapon_categories')
    .select('weapon_category_id')
    .eq('tag_id', tagId);
  if (error) throw error;

  const allowedCategoryIds = (allowedRows ?? []).map((r: any) => r.weapon_category_id);
  if (allowedCategoryIds.length === 0) return true; // unrestricted

  return weapons.every((w: any) => w.categoryId != null && allowedCategoryIds.includes(w.categoryId));
}

// loadouts.weapons used to be a JSONB blob embedding full weapon + attachment
// name copies. It's now normalized into loadout_weapons (one row per weapon
// slot) and loadout_weapon_attachments (many attachments -> one slot). Reads
// go through this nested PostgREST embed and get flattened back into the
// same `{ id, attachments }[]` shape the frontend already expects -- the
// frontend resolves full weapon details (name/type/image/etc.) against the
// catalog `/weapons` list it already fetches, by `id`.
//
// perks/equipment used to be plain TEXT[] of names; they're now
// loadout_perks/loadout_equipment junction rows referencing the catalog by
// id, but mapLoadout still flattens them back to `string[]` of names --
// unlike weapons, nothing else about their frontend shape needed to change.
const LOADOUT_SELECT = `*, loadout_weapons(id, weapon_id, slot_order, loadout_weapon_attachments(attachments(name, attachment_types(name)))), loadout_perks(perks(name)), loadout_equipment(equipment(name)), loadout_reactions(type, user_id)`;

async function saveLoadoutWeapons(loadoutId: string, gameId: string, weaponsPayload: any[]) {
  // Cascades: deleting a loadout_weapons row cascades to its loadout_weapon_attachments rows.
  const { error: deleteError } = await supabase.from('loadout_weapons').delete().eq('loadout_id', loadoutId);
  if (deleteError) throw deleteError;

  if (!weaponsPayload.length) return;

  const { data: catalogAttachments, error: attError } = await supabase
    .from('attachments_with_images')
    .select('id, name, type_name')
    .eq('game_id', gameId);
  if (attError) throw attError;

  for (let i = 0; i < weaponsPayload.length; i++) {
    const w = weaponsPayload[i];
    const { data: lw, error: lwError } = await supabase
      .from('loadout_weapons')
      .insert({ loadout_id: loadoutId, weapon_id: w.id, slot_order: i })
      .select('id')
      .single();
    if (lwError) throw lwError;

    const attachmentIds = Object.entries(w.attachments ?? {})
      .map(([typeName, attachmentName]) =>
        (catalogAttachments ?? []).find((a: any) => a.type_name === typeName && a.name === attachmentName)?.id
      )
      .filter((id): id is number => id != null);
    if (!attachmentIds.length) continue;

    const { error: insertAttError } = await supabase
      .from('loadout_weapon_attachments')
      .insert(attachmentIds.map((attachment_id) => ({ loadout_weapon_id: lw.id, attachment_id })));
    if (insertAttError) throw insertAttError;
  }
}

async function saveLoadoutPerks(loadoutId: string, gameId: string, perkNames: string[]) {
  const { error: deleteError } = await supabase.from('loadout_perks').delete().eq('loadout_id', loadoutId);
  if (deleteError) throw deleteError;
  if (!perkNames.length) return;

  const { data: catalogPerks, error: catError } = await supabase
    .from('perks')
    .select('id, name')
    .eq('game_id', gameId);
  if (catError) throw catError;

  const perkIds = perkNames
    .map((name) => (catalogPerks ?? []).find((p: any) => p.name === name)?.id)
    .filter((id): id is number => id != null);
  if (!perkIds.length) return;

  const { error: insertError } = await supabase
    .from('loadout_perks')
    .insert(perkIds.map((perk_id) => ({ loadout_id: loadoutId, perk_id })));
  if (insertError) throw insertError;
}

async function saveLoadoutEquipment(loadoutId: string, gameId: string, equipmentNames: string[]) {
  const { error: deleteError } = await supabase.from('loadout_equipment').delete().eq('loadout_id', loadoutId);
  if (deleteError) throw deleteError;
  if (!equipmentNames.length) return;

  const { data: catalogEquipment, error: catError } = await supabase
    .from('equipment')
    .select('id, name')
    .eq('game_id', gameId);
  if (catError) throw catError;

  const equipmentIds = equipmentNames
    .map((name) => (catalogEquipment ?? []).find((e: any) => e.name === name)?.id)
    .filter((id): id is number => id != null);
  if (!equipmentIds.length) return;

  const { error: insertError } = await supabase
    .from('loadout_equipment')
    .insert(equipmentIds.map((equipment_id) => ({ loadout_id: loadoutId, equipment_id })));
  if (insertError) throw insertError;
}

// Minimum total reactions before showing a computed rating percentage --
// below this, a percentage is more misleading than informative (e.g. 1
// like/0 dislikes reading as a false "100%").
const MIN_VOTES_FOR_RATING = 3;
// Favorites are a stronger signal (intent to reuse) than a low-effort like,
// so they're weighted higher in both the displayed rating and the sort score.
const FAVORITE_RATING_WEIGHT = 1.5;
const FAVORITE_SCORE_WEIGHT = 2;

// ---------------------------------------------------------------------------
// Attached video (TikTok/Instagram/YouTube) -- oEmbed metadata is fetched
// server-side and cached on the loadout at save time, rather than live on
// every read, so listing loadouts never depends on an external API. Only a
// thumbnail/title/link is stored -- the app never embeds a player.
// ---------------------------------------------------------------------------

type VideoPlatform = "tiktok" | "instagram" | "youtube";

function detectVideoPlatform(url: string): VideoPlatform | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host === "tiktok.com" || host.endsWith(".tiktok.com")) return "tiktok";
    if (host === "instagram.com" || host.endsWith(".instagram.com")) return "instagram";
    if (host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be") return "youtube";
    return null;
  } catch {
    return null;
  }
}

const OEMBED_URL: Partial<Record<VideoPlatform, (url: string) => string>> = {
  youtube: (url) => `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
  tiktok: (url) => `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
};

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

// Instagram's public oEmbed API was deprecated in favor of the Graph API,
// which requires an app access token we don't have configured -- link
// preview services (Slack, Discord, etc.) get Instagram thumbnails/titles by
// reading the Open Graph meta tags Instagram still renders into the public
// post/reel page's HTML, so we do the same. Unofficial and can break if
// Instagram changes its markup or starts gating these pages further, but
// there's no supported alternative without app-review access.
async function scrapeOpenGraph(url: string): Promise<{ title: string | null; thumbnailUrl: string | null } | null> {
  try {
    const response = await fetch(url, {
      headers: {
        // A realistic desktop User-Agent is required -- Instagram serves a
        // stripped, tag-less shell to obvious non-browser clients.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    });
    if (!response.ok) return null;
    const html = await response.text();

    const title = html.match(/<meta property="og:title" content="([^"]*)"/)?.[1] ?? null;
    const thumbnailUrl = html.match(/<meta property="og:image" content="([^"]*)"/)?.[1] ?? null;
    if (!title && !thumbnailUrl) return null;

    return { title: title ? decodeHtmlEntities(title) : null, thumbnailUrl };
  } catch (error) {
    console.log(`Could not scrape Open Graph metadata: ${error}`);
    return null;
  }
}

async function fetchVideoMeta(url: string, platform: VideoPlatform) {
  if (platform === "instagram") {
    const og = await scrapeOpenGraph(url);
    if (!og) return null;
    // Instagram's og:title is typically `<name> on Instagram: "<caption>"` --
    // there's no separate author field in Open Graph tags, so pull it from there.
    const authorName = og.title?.match(/^(.+?) on Instagram/)?.[1]?.trim() ?? null;
    return { title: og.title, authorName, thumbnailUrl: og.thumbnailUrl };
  }

  try {
    const response = await fetch(OEMBED_URL[platform]!(url));
    if (!response.ok) return null;
    const data = await response.json();
    return {
      title: data.title ?? null,
      authorName: data.author_name ?? null,
      thumbnailUrl: data.thumbnail_url ?? null,
    };
  } catch (error) {
    console.log(`Could not fetch oEmbed metadata for ${platform}: ${error}`);
    return null;
  }
}

/** Resolves a pasted video URL into the stored `video` shape, fetching oEmbed metadata best-effort. */
async function resolveVideo(videoUrl: string | null | undefined): Promise<{ video: any; error?: string }> {
  const url = videoUrl?.trim();
  if (!url) return { video: null };

  const platform = detectVideoPlatform(url);
  if (!platform) {
    return { video: null, error: "Video must be a TikTok, Instagram, or YouTube link" };
  }

  const meta = await fetchVideoMeta(url, platform);
  return {
    video: {
      url,
      platform,
      title: meta?.title ?? null,
      authorName: meta?.authorName ?? null,
      thumbnailUrl: meta?.thumbnailUrl ?? null,
    },
  };
}

interface AuthorProfile {
  nickname: string;
  avatar_path: string | null;
  tiktok: string | null;
  instagram: string | null;
  youtube: string | null;
  twitch: string | null;
  kick: string | null;
  social_stats: any;
}

// Batch-fetches profiles for a set of loadouts' user_ids, keyed by id --
// same batching shape as resolveImageUrls, avoiding an N+1 lookup per
// loadout. Loadouts predate profiles, so an author may not have one yet.
async function fetchAuthorProfiles(loadouts: any[]): Promise<Map<string, AuthorProfile>> {
  const userIds = [...new Set(loadouts.map((l) => l.user_id).filter(Boolean))];
  const byId = new Map<string, AuthorProfile>();
  if (userIds.length === 0) return byId;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, nickname, avatar_path, tiktok, instagram, youtube, twitch, kick, social_stats')
    .in('id', userIds);
  if (error) {
    console.log(`Could not resolve author profiles: ${error.message}`);
    return byId;
  }
  for (const p of data ?? []) {
    byId.set(p.id, {
      nickname: p.nickname,
      avatar_path: p.avatar_path,
      tiktok: p.tiktok,
      instagram: p.instagram,
      youtube: p.youtube,
      twitch: p.twitch,
      kick: p.kick,
      social_stats: p.social_stats,
    });
  }
  return byId;
}

function mapLoadout(l: any, viewerId?: string | null, authorProfiles?: Map<string, AuthorProfile>) {
  const weapons = (l.loadout_weapons ?? [])
    .slice()
    .sort((a: any, b: any) => (a.slot_order ?? 0) - (b.slot_order ?? 0))
    .map((lw: any) => {
      const attachments: Record<string, string> = {};
      for (const lwa of lw.loadout_weapon_attachments ?? []) {
        const typeName = lwa.attachments?.attachment_types?.name;
        const attachmentName = lwa.attachments?.name;
        if (typeName && attachmentName) attachments[typeName] = attachmentName;
      }
      return { id: lw.weapon_id, attachments };
    });

  const perks = (l.loadout_perks ?? [])
    .map((lp: any) => lp.perks?.name)
    .filter((name: any): name is string => Boolean(name));

  const equipment = (l.loadout_equipment ?? [])
    .map((le: any) => le.equipment?.name)
    .filter((name: any): name is string => Boolean(name));

  const reactions = l.loadout_reactions ?? [];
  const likes = reactions.filter((r: any) => r.type === 'like').length;
  const dislikes = reactions.filter((r: any) => r.type === 'dislike').length;
  const favorites = reactions.filter((r: any) => r.type === 'favorite').length;
  const totalVotes = likes + dislikes + favorites;
  const weightedPositive = likes + favorites * FAVORITE_RATING_WEIGHT;
  const ratingPercent =
    totalVotes >= MIN_VOTES_FOR_RATING
      ? Math.round((weightedPositive / (weightedPositive + dislikes)) * 100)
      : null;
  const score = likes + favorites * FAVORITE_SCORE_WEIGHT - dislikes;
  const mine = viewerId ? reactions.filter((r: any) => r.user_id === viewerId).map((r: any) => r.type) : [];
  const author = authorProfiles?.get(l.user_id);

  return {
    id: l.id,
    gameId: l.game_id,
    userId: l.user_id,
    userName: l.user_name,
    authorNickname: author?.nickname ?? null,
    authorAvatarUrl: avatarUrl(author?.avatar_path ?? null),
    authorLinks: author
      ? {
          tiktok: author.tiktok,
          instagram: author.instagram,
          youtube: author.youtube,
          twitch: author.twitch,
          kick: author.kick,
        }
      : null,
    authorSocialStats: author?.social_stats ?? null,
    name: l.name,
    description: l.description,
    gameLoadoutCode: l.game_loadout_code ?? null,
    video: l.video ?? null,
    weapons,
    perks,
    equipment,
    tagId: l.tag_id ?? null,
    likes,
    dislikes,
    favorites,
    score,
    ratingPercent,
    liked: mine.includes('like'),
    disliked: mine.includes('dislike'),
    favorited: mine.includes('favorite'),
    views: l.views,
    createdAt: l.created_at,
    updatedAt: l.updated_at,
  };
}

const REACTION_TYPES = ['like', 'dislike', 'favorite'];

app.post("/make-server-6db475c7/games/:gameId/loadouts/:loadoutId/react", async (c) => {
  try {
    const user = await getUserFromRequest(c);
    if (!user?.id) {
      return c.json({ error: 'Unauthorized - please log in to react to loadouts' }, 401);
    }

    const gameId = c.req.param("gameId");
    const loadoutId = c.req.param("loadoutId");
    const body = await c.req.json();
    const type = body.type;
    if (!REACTION_TYPES.includes(type)) {
      return c.json({ error: "Invalid reaction type" }, 400);
    }

    const { data: existingLoadout, error: fetchError } = await supabase
      .from('loadouts')
      .select('id')
      .eq('id', loadoutId)
      .eq('game_id', gameId)
      .single();
    if (fetchError || !existingLoadout) {
      return c.json({ error: "Loadout not found" }, 404);
    }

    const { data: existingReaction, error: existingError } = await supabase
      .from('loadout_reactions')
      .select('id')
      .eq('loadout_id', loadoutId)
      .eq('user_id', user.id)
      .eq('type', type)
      .maybeSingle();
    if (existingError) throw existingError;

    if (existingReaction) {
      // Toggle off: same reaction already exists, remove it.
      const { error: deleteError } = await supabase.from('loadout_reactions').delete().eq('id', existingReaction.id);
      if (deleteError) throw deleteError;
    } else {
      // like/dislike are mutually exclusive per user; favorite is independent of both.
      if (type === 'like' || type === 'dislike') {
        const opposite = type === 'like' ? 'dislike' : 'like';
        const { error: clearError } = await supabase
          .from('loadout_reactions')
          .delete()
          .eq('loadout_id', loadoutId)
          .eq('user_id', user.id)
          .eq('type', opposite);
        if (clearError) throw clearError;
      }
      const { error: insertError } = await supabase
        .from('loadout_reactions')
        .insert({ loadout_id: loadoutId, user_id: user.id, type });
      if (insertError) throw insertError;
    }

    const { data: full, error: reloadError } = await supabase
      .from('loadouts')
      .select(LOADOUT_SELECT)
      .eq('id', loadoutId)
      .single();
    if (reloadError) throw reloadError;

    const authorProfiles = await fetchAuthorProfiles([full]);
    return c.json({ loadout: mapLoadout(full, user.id, authorProfiles) });
  } catch (error) {
    console.log(`Error reacting to loadout: ${error}`);
    return c.json({ error: "Failed to react to loadout", details: error.message }, 500);
  }
});

app.post("/make-server-6db475c7/games/:gameId/loadouts/:loadoutId/view", async (c) => {
  try {
    const user = await getUserFromRequest(c);
    const gameId = c.req.param("gameId");
    const loadoutId = c.req.param("loadoutId");

    const { data: existing, error: fetchError } = await supabase
      .from('loadouts')
      .select('views')
      .eq('id', loadoutId)
      .eq('game_id', gameId)
      .single();
    if (fetchError || !existing) {
      return c.json({ error: "Loadout not found" }, 404);
    }

    const { data: updated, error } = await supabase
      .from('loadouts')
      .update({ views: (existing.views ?? 0) + 1 })
      .eq('id', loadoutId)
      .eq('game_id', gameId)
      .select(LOADOUT_SELECT)
      .single();
    if (error) throw error;

    const authorProfiles = await fetchAuthorProfiles([updated]);
    return c.json({ loadout: mapLoadout(updated, user?.id ?? null, authorProfiles) });
  } catch (error) {
    console.log(`Error incrementing views: ${error}`);
    return c.json({ error: "Failed to increment views", details: error.message }, 500);
  }
});

app.get("/make-server-6db475c7/games/:gameId/loadouts", async (c) => {
  try {
    const user = await getUserFromRequest(c);
    const gameId = c.req.param("gameId");
    const { data, error } = await supabase
      .from('loadouts')
      .select(LOADOUT_SELECT)
      .eq('game_id', gameId)
      .eq('is_public', true)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const authorProfiles = await fetchAuthorProfiles(data ?? []);
    return c.json({ loadouts: (data ?? []).map((l: any) => mapLoadout(l, user?.id ?? null, authorProfiles)) });
  } catch (error) {
    console.log(`Error fetching loadouts: ${error}`);
    return c.json({ error: "Failed to fetch loadouts", details: error.message }, 500);
  }
});

app.get("/make-server-6db475c7/games/:gameId/my-loadouts", async (c) => {
  try {
    const user = await getUserFromRequest(c);
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const gameId = c.req.param("gameId");
    const { data, error } = await supabase
      .from('loadouts')
      .select(LOADOUT_SELECT)
      .eq('game_id', gameId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const authorProfiles = await fetchAuthorProfiles(data ?? []);
    return c.json({ loadouts: (data ?? []).map((l: any) => mapLoadout(l, user.id, authorProfiles)) });
  } catch (error) {
    console.log(`Error fetching user loadouts: ${error}`);
    return c.json({ error: "Failed to fetch loadouts", details: error.message }, 500);
  }
});

app.post("/make-server-6db475c7/games/:gameId/loadouts", async (c) => {
  try {
    const user = await getUserFromRequest(c);
    if (!user?.id) {
      return c.json({ error: 'Unauthorized - please log in to create loadouts' }, 401);
    }

    const gameId = c.req.param("gameId");
    const body = await c.req.json();
    const loadoutId = crypto.randomUUID().replace(/-/g, "").slice(0, 8);

    let tagId = body.tagId ?? null;
    if (tagId != null && !(await isTagAllowedForWeapons(gameId, tagId, body.weapons ?? []))) {
      tagId = null;
    }

    const { video, error: videoError } = await resolveVideo(body.videoUrl);
    if (videoError) {
      return c.json({ error: videoError }, 400);
    }

    const { data: inserted, error } = await supabase
      .from('loadouts')
      .insert({
        id: loadoutId,
        game_id: gameId,
        user_id: user.id,
        user_name: user.user_metadata?.name || user.email?.split('@')[0] || 'Anonymous',
        name: body.name,
        description: body.description || '',
        game_loadout_code: body.gameLoadoutCode || null,
        video,
        tag_id: tagId,
      })
      .select()
      .single();
    if (error) throw error;

    await saveLoadoutWeapons(loadoutId, gameId, body.weapons ?? []);
    await saveLoadoutPerks(loadoutId, gameId, body.perks ?? []);
    await saveLoadoutEquipment(loadoutId, gameId, body.equipment ?? []);

    const { data: full, error: reloadError } = await supabase
      .from('loadouts')
      .select(LOADOUT_SELECT)
      .eq('id', loadoutId)
      .single();
    if (reloadError) throw reloadError;

    const authorProfiles = await fetchAuthorProfiles([full]);
    return c.json({ loadout: mapLoadout(full, user.id, authorProfiles) });
  } catch (error) {
    console.log(`Error creating loadout: ${error}`);
    return c.json({ error: "Failed to create loadout", details: error.message }, 500);
  }
});

app.put("/make-server-6db475c7/games/:gameId/loadouts/:loadoutId", async (c) => {
  try {
    const user = await getUserFromRequest(c);
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const gameId = c.req.param("gameId");
    const loadoutId = c.req.param("loadoutId");
    const body = await c.req.json();

    const { data: existing, error: fetchError } = await supabase
      .from('loadouts')
      .select('user_id')
      .eq('id', loadoutId)
      .eq('game_id', gameId)
      .single();
    if (fetchError || !existing) {
      return c.json({ error: "Loadout not found" }, 404);
    }
    if (existing.user_id !== user.id) {
      return c.json({ error: "You can only edit your own loadouts" }, 403);
    }

    let tagId = body.tagId ?? null;
    if (tagId != null && !(await isTagAllowedForWeapons(gameId, tagId, body.weapons ?? []))) {
      tagId = null;
    }

    const { video, error: videoError } = await resolveVideo(body.videoUrl);
    if (videoError) {
      return c.json({ error: videoError }, 400);
    }

    const { data: updated, error } = await supabase
      .from('loadouts')
      .update({
        name: body.name,
        description: body.description ?? '',
        game_loadout_code: body.gameLoadoutCode || null,
        video,
        tag_id: tagId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', loadoutId)
      .eq('game_id', gameId)
      .select()
      .single();
    if (error) throw error;

    await saveLoadoutWeapons(loadoutId, gameId, body.weapons ?? []);
    await saveLoadoutPerks(loadoutId, gameId, body.perks ?? []);
    await saveLoadoutEquipment(loadoutId, gameId, body.equipment ?? []);

    const { data: full, error: reloadError } = await supabase
      .from('loadouts')
      .select(LOADOUT_SELECT)
      .eq('id', loadoutId)
      .single();
    if (reloadError) throw reloadError;

    const authorProfiles = await fetchAuthorProfiles([full]);
    return c.json({ loadout: mapLoadout(full, user.id, authorProfiles) });
  } catch (error) {
    console.log(`Error updating loadout: ${error}`);
    return c.json({ error: "Failed to update loadout", details: error.message }, 500);
  }
});

app.delete("/make-server-6db475c7/games/:gameId/loadouts/:loadoutId", async (c) => {
  try {
    const user = await getUserFromRequest(c);
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const gameId = c.req.param("gameId");
    const loadoutId = c.req.param("loadoutId");

    const { data: existing, error: fetchError } = await supabase
      .from('loadouts')
      .select('user_id')
      .eq('id', loadoutId)
      .eq('game_id', gameId)
      .single();
    if (fetchError || !existing) {
      return c.json({ error: "Loadout not found" }, 404);
    }
    if (existing.user_id !== user.id) {
      return c.json({ error: "You can only delete your own loadouts" }, 403);
    }

    const { error } = await supabase
      .from('loadouts')
      .delete()
      .eq('id', loadoutId)
      .eq('game_id', gameId);
    if (error) throw error;

    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting loadout: ${error}`);
    return c.json({ error: "Failed to delete loadout", details: error.message }, 500);
  }
});

Deno.serve(app.fetch);
