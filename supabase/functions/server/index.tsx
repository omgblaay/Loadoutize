import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
const app = new Hono();

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

// Health check endpoint
app.get("/make-server-6db475c7/health", (c) => {
  return c.json({ status: "ok" });
});

// Sign up
app.post("/make-server-6db475c7/auth/signup", async (c) => {
  try {
    const body = await c.req.json();
    const { createClient } = await import("jsr:@supabase/supabase-js@2.49.8");
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    );

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

// Like a loadout
app.post("/make-server-6db475c7/games/:gameId/loadouts/:loadoutId/like", async (c) => {
  try {
    const gameId = c.req.param("gameId");
    const loadoutId = c.req.param("loadoutId");
    const loadout = await kv.get(`loadout:${gameId}:${loadoutId}`);

    if (!loadout) {
      return c.json({ error: "Loadout not found" }, 404);
    }

    loadout.likes = (loadout.likes || 0) + 1;
    await kv.set(`loadout:${gameId}:${loadoutId}`, loadout);
    return c.json({ loadout });
  } catch (error) {
    console.log(`Error liking loadout: ${error}`);
    return c.json({ error: "Failed to like loadout", details: error.message }, 500);
  }
});

// View a loadout (increment view count)
app.post("/make-server-6db475c7/games/:gameId/loadouts/:loadoutId/view", async (c) => {
  try {
    const gameId = c.req.param("gameId");
    const loadoutId = c.req.param("loadoutId");
    const loadout = await kv.get(`loadout:${gameId}:${loadoutId}`);

    if (!loadout) {
      return c.json({ error: "Loadout not found" }, 404);
    }

    loadout.views = (loadout.views || 0) + 1;
    await kv.set(`loadout:${gameId}:${loadoutId}`, loadout);
    return c.json({ loadout });
  } catch (error) {
    console.log(`Error incrementing views: ${error}`);
    return c.json({ error: "Failed to increment views", details: error.message }, 500);
  }
});

// Get all games
app.get("/make-server-6db475c7/games", async (c) => {
  try {
    const games = await kv.getByPrefix("game:");
    return c.json({ games: games || [] });
  } catch (error) {
    console.log(`Error fetching games: ${error}`);
    return c.json({ error: "Failed to fetch games", details: error.message }, 500);
  }
});

// Get weapons for a specific game
app.get("/make-server-6db475c7/games/:gameId/weapons", async (c) => {
  try {
    const gameId = c.req.param("gameId");
    const weapons = await kv.get(`weapons:${gameId}`);
    return c.json({ weapons: weapons || [] });
  } catch (error) {
    console.log(`Error fetching weapons for game: ${error}`);
    return c.json({ error: "Failed to fetch weapons", details: error.message }, 500);
  }
});

// Get attachments for a specific weapon category
app.get("/make-server-6db475c7/games/:gameId/attachments/:category", async (c) => {
  try {
    const gameId = c.req.param("gameId");
    const category = c.req.param("category");
    const attachments = await kv.get(`attachments:${gameId}:${category}`);
    return c.json({ attachments: attachments || [] });
  } catch (error) {
    console.log(`Error fetching attachments: ${error}`);
    return c.json({ error: "Failed to fetch attachments", details: error.message }, 500);
  }
});

// Get all loadouts for a game (public feed)
app.get("/make-server-6db475c7/games/:gameId/loadouts", async (c) => {
  try {
    const gameId = c.req.param("gameId");
    const loadouts = await kv.getByPrefix(`loadout:${gameId}:`);
    return c.json({ loadouts: loadouts || [] });
  } catch (error) {
    console.log(`Error fetching loadouts: ${error}`);
    return c.json({ error: "Failed to fetch loadouts", details: error.message }, 500);
  }
});

// Get user's own loadouts
app.get("/make-server-6db475c7/games/:gameId/my-loadouts", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { createClient } = await import("jsr:@supabase/supabase-js@2.49.8");
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    );
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const gameId = c.req.param("gameId");
    const allLoadouts = await kv.getByPrefix(`loadout:${gameId}:`);
    const userLoadouts = (allLoadouts || []).filter((l: any) => l.userId === user.id);
    return c.json({ loadouts: userLoadouts });
  } catch (error) {
    console.log(`Error fetching user loadouts: ${error}`);
    return c.json({ error: "Failed to fetch loadouts", details: error.message }, 500);
  }
});

// Create a new loadout (requires auth)
app.post("/make-server-6db475c7/games/:gameId/loadouts", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { createClient } = await import("jsr:@supabase/supabase-js@2.49.8");
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    );
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!user?.id) {
      return c.json({ error: 'Unauthorized - please log in to create loadouts' }, 401);
    }

    const gameId = c.req.param("gameId");
    const body = await c.req.json();
    const loadoutId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const loadout = {
      id: loadoutId,
      gameId,
      userId: user.id,
      userName: user.user_metadata?.name || user.email?.split('@')[0] || 'Anonymous',
      name: body.name,
      description: body.description || '',
      weapons: body.weapons,
      perks: body.perks,
      equipment: body.equipment,
      likes: 0,
      views: 0,
      createdAt: new Date().toISOString(),
    };
    await kv.set(`loadout:${gameId}:${loadoutId}`, loadout);
    return c.json({ loadout });
  } catch (error) {
    console.log(`Error creating loadout: ${error}`);
    return c.json({ error: "Failed to create loadout", details: error.message }, 500);
  }
});

// Update a loadout (requires auth and ownership)
app.put("/make-server-6db475c7/games/:gameId/loadouts/:loadoutId", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { createClient } = await import("jsr:@supabase/supabase-js@2.49.8");
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    );
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const gameId = c.req.param("gameId");
    const loadoutId = c.req.param("loadoutId");
    const body = await c.req.json();
    const existing = await kv.get(`loadout:${gameId}:${loadoutId}`);

    if (!existing) {
      return c.json({ error: "Loadout not found" }, 404);
    }

    if (existing.userId !== user.id) {
      return c.json({ error: "You can only edit your own loadouts" }, 403);
    }

    const updated = {
      ...existing,
      ...body,
      userId: existing.userId,
      userName: existing.userName,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`loadout:${gameId}:${loadoutId}`, updated);
    return c.json({ loadout: updated });
  } catch (error) {
    console.log(`Error updating loadout: ${error}`);
    return c.json({ error: "Failed to update loadout", details: error.message }, 500);
  }
});

// Delete a loadout (requires auth and ownership)
app.delete("/make-server-6db475c7/games/:gameId/loadouts/:loadoutId", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { createClient } = await import("jsr:@supabase/supabase-js@2.49.8");
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    );
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const gameId = c.req.param("gameId");
    const loadoutId = c.req.param("loadoutId");
    const existing = await kv.get(`loadout:${gameId}:${loadoutId}`);

    if (!existing) {
      return c.json({ error: "Loadout not found" }, 404);
    }

    if (existing.userId !== user.id) {
      return c.json({ error: "You can only delete your own loadouts" }, 403);
    }

    await kv.del(`loadout:${gameId}:${loadoutId}`);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting loadout: ${error}`);
    return c.json({ error: "Failed to delete loadout", details: error.message }, 500);
  }
});

// Initialize sample data (CMS endpoint - you can call this to seed data)
app.post("/make-server-6db475c7/admin/seed", async (c) => {
  try {
    const games = [
      { id: "blackops7", name: "Black Ops 7", slug: "blackops7" },
      { id: "warzone", name: "Warzone", slug: "warzone" },
      { id: "bf6", name: "Battlefield 6", slug: "bf6" },
      { id: "thefinals", name: "The Finals", slug: "thefinals" },
    ];

    for (const game of games) {
      await kv.set(`game:${game.id}`, game);
    }

    // Sample weapons for Black Ops 7
    const blackOpsWeapons = [
      { id: "xm4", name: "XM4", type: "Assault Rifle", damage: 42, fireRate: 750 },
      { id: "ak47", name: "AK-47", type: "Assault Rifle", damage: 48, fireRate: 600 },
      { id: "mp5", name: "MP5", type: "SMG", damage: 35, fireRate: 900 },
      { id: "mac10", name: "MAC-10", type: "SMG", damage: 32, fireRate: 1100 },
      { id: "pelington", name: "Pelington 703", type: "Sniper", damage: 100, fireRate: 50 },
    ];
    await kv.set("weapons:blackops7", blackOpsWeapons);

    // Sample attachments for assault rifles
    await kv.set("attachments:blackops7:Assault Rifle", {
      optics: ["Reflex", "Holographic", "ACOG 3x", "Thermal 4x"],
      muzzle: ["Suppressor", "Compensator", "Muzzle Brake", "Flash Guard"],
      barrel: ["Extended", "Reinforced Heavy", "Ranger", "Task Force"],
      underbarrel: ["Foregrip", "Bipod", "Field Agent Grip", "Bruiser Grip"],
      magazine: ["Fast Mag", "Extended Mag", "STANAG 60 Rnd", "Salvo 50 Rnd"],
    });

    // Sample weapons for Warzone
    await kv.set("weapons:warzone", [
      { id: "grau", name: "Grau 5.56", type: "Assault Rifle", damage: 40, fireRate: 750 },
      { id: "kar98", name: "Kar98k", type: "Marksman Rifle", damage: 95, fireRate: 45 },
      { id: "fennec", name: "Fennec", type: "SMG", damage: 30, fireRate: 1100 },
    ]);

    // Create sample loadouts for browsing
    const sampleLoadouts = [
      {
        id: "sample1",
        gameId: "blackops7",
        userId: "demo-user-1",
        userName: "ProGamer",
        name: "Aggressive Rush Build",
        description: "Perfect for close-quarters combat and fast-paced gameplay",
        weapons: [blackOpsWeapons[2], blackOpsWeapons[3]],
        perks: ["Ninja", "Gung-Ho", "Ghost"],
        equipment: ["Flashbang", "Semtex"],
        likes: 47,
        views: 234,
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      },
      {
        id: "sample2",
        gameId: "blackops7",
        userId: "demo-user-2",
        userName: "TacticalMind",
        name: "Long-Range Domination",
        description: "Control the battlefield from a distance with precision",
        weapons: [blackOpsWeapons[0], blackOpsWeapons[4]],
        perks: ["Cold Blooded", "Engineer", "Tracker"],
        equipment: ["Smoke Grenade", "Frag Grenade"],
        likes: 92,
        views: 512,
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: "sample3",
        gameId: "blackops7",
        userId: "demo-user-3",
        userName: "RunAndGun",
        name: "SMG Speed Demon",
        description: "Maximum mobility for run-and-gun playstyle",
        weapons: [blackOpsWeapons[2], blackOpsWeapons[3]],
        perks: ["Quick Fix", "Scavenger", "Ninja"],
        equipment: ["Stun Grenade", "Molotov"],
        likes: 63,
        views: 387,
        createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
    ];

    for (const loadout of sampleLoadouts) {
      await kv.set(`loadout:${loadout.gameId}:${loadout.id}`, loadout);
    }

    return c.json({ success: true, message: "Sample data seeded successfully!" });
  } catch (error) {
    console.log(`Error seeding data: ${error}`);
    return c.json({ error: "Failed to seed data", details: error.message }, 500);
  }
});

Deno.serve(app.fetch);