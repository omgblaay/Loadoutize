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

    return c.json({ user: data.user });
  } catch (error) {
    console.log(`Error during signup: ${error}`);
    return c.json({ error: "Failed to sign up", details: error.message }, 500);
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
      .select('id, name, description, stats, image, type_name, type_slug')
      .eq('game_id', gameId);
    if (error) throw error;

    const urlById = await resolveImageUrls((data ?? []).map((a: any) => a.image));
    const attachments = (data ?? []).map((a: any) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      stats: a.stats,
      type: a.type_name,
      typeSlug: a.type_slug,
      imageUrl: a.image ? urlById.get(a.image) ?? null : null,
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

function mapLoadout(l: any, viewerId?: string | null) {
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

  return {
    id: l.id,
    gameId: l.game_id,
    userId: l.user_id,
    userName: l.user_name,
    name: l.name,
    description: l.description,
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

    return c.json({ loadout: mapLoadout(full, user.id) });
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

    return c.json({ loadout: mapLoadout(updated, user?.id ?? null) });
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

    return c.json({ loadouts: (data ?? []).map((l: any) => mapLoadout(l, user?.id ?? null)) });
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

    return c.json({ loadouts: (data ?? []).map((l: any) => mapLoadout(l, user.id)) });
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

    const { data: inserted, error } = await supabase
      .from('loadouts')
      .insert({
        id: loadoutId,
        game_id: gameId,
        user_id: user.id,
        user_name: user.user_metadata?.name || user.email?.split('@')[0] || 'Anonymous',
        name: body.name,
        description: body.description || '',
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

    return c.json({ loadout: mapLoadout(full, user.id) });
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

    const { data: updated, error } = await supabase
      .from('loadouts')
      .update({
        name: body.name,
        description: body.description ?? '',
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

    return c.json({ loadout: mapLoadout(full, user.id) });
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
