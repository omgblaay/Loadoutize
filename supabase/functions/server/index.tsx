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
      .select('id, name, image, damage, fire_rate, range, accuracy, description, weapon_categories(name)')
      .eq('game_id', gameId);
    if (error) throw error;

    const urlById = await resolveImageUrls((data ?? []).map((w: any) => w.image));
    const weapons = (data ?? []).map((w: any) => ({
      id: w.id,
      name: w.name,
      type: w.weapon_categories?.name ?? null,
      damage: w.damage,
      fireRate: w.fire_rate,
      range: w.range,
      accuracy: w.accuracy,
      description: w.description,
      imageUrl: w.image ? urlById.get(w.image) ?? null : null,
    }));
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

// ---------------------------------------------------------------------------
// Loadouts
// ---------------------------------------------------------------------------

function mapLoadout(l: any) {
  return {
    id: l.id,
    gameId: l.game_id,
    userId: l.user_id,
    userName: l.user_name,
    name: l.name,
    description: l.description,
    weapons: l.weapons ?? [],
    perks: l.perks ?? [],
    equipment: l.equipment ?? [],
    likes: l.likes,
    views: l.views,
    createdAt: l.created_at,
    updatedAt: l.updated_at,
  };
}

app.post("/make-server-6db475c7/games/:gameId/loadouts/:loadoutId/like", async (c) => {
  try {
    const gameId = c.req.param("gameId");
    const loadoutId = c.req.param("loadoutId");

    const { data: existing, error: fetchError } = await supabase
      .from('loadouts')
      .select('likes')
      .eq('id', loadoutId)
      .eq('game_id', gameId)
      .single();
    if (fetchError || !existing) {
      return c.json({ error: "Loadout not found" }, 404);
    }

    const { data: updated, error } = await supabase
      .from('loadouts')
      .update({ likes: (existing.likes ?? 0) + 1 })
      .eq('id', loadoutId)
      .eq('game_id', gameId)
      .select()
      .single();
    if (error) throw error;

    return c.json({ loadout: mapLoadout(updated) });
  } catch (error) {
    console.log(`Error liking loadout: ${error}`);
    return c.json({ error: "Failed to like loadout", details: error.message }, 500);
  }
});

app.post("/make-server-6db475c7/games/:gameId/loadouts/:loadoutId/view", async (c) => {
  try {
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
      .select()
      .single();
    if (error) throw error;

    return c.json({ loadout: mapLoadout(updated) });
  } catch (error) {
    console.log(`Error incrementing views: ${error}`);
    return c.json({ error: "Failed to increment views", details: error.message }, 500);
  }
});

app.get("/make-server-6db475c7/games/:gameId/loadouts", async (c) => {
  try {
    const gameId = c.req.param("gameId");
    const { data, error } = await supabase
      .from('loadouts')
      .select('*')
      .eq('game_id', gameId)
      .eq('is_public', true)
      .order('created_at', { ascending: false });
    if (error) throw error;

    return c.json({ loadouts: (data ?? []).map(mapLoadout) });
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
      .select('*')
      .eq('game_id', gameId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;

    return c.json({ loadouts: (data ?? []).map(mapLoadout) });
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
    const loadoutId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const { data: inserted, error } = await supabase
      .from('loadouts')
      .insert({
        id: loadoutId,
        game_id: gameId,
        user_id: user.id,
        user_name: user.user_metadata?.name || user.email?.split('@')[0] || 'Anonymous',
        name: body.name,
        description: body.description || '',
        weapons: body.weapons ?? [],
        perks: body.perks ?? [],
        equipment: body.equipment ?? [],
      })
      .select()
      .single();
    if (error) throw error;

    return c.json({ loadout: mapLoadout(inserted) });
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

    const { data: updated, error } = await supabase
      .from('loadouts')
      .update({
        name: body.name,
        description: body.description ?? '',
        weapons: body.weapons ?? [],
        perks: body.perks ?? [],
        equipment: body.equipment ?? [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', loadoutId)
      .eq('game_id', gameId)
      .select()
      .single();
    if (error) throw error;

    return c.json({ loadout: mapLoadout(updated) });
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
