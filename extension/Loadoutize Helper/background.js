const API_URL = "https://yvvuitjsunankrffcpck.supabase.co/functions/v1/make-server-6db475c7/youtube/loadouts";
const FALLBACK_URL = "https://yvvuitjsunankrffcpck.supabase.co/functions/v1/make-server-6db475c7/games/mw4/loadouts";
// This is the project's public anon key, used by the site as well. Never put a service-role key here.
const PUBLIC_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2dnVpdGpzdW5hbmtyZmZjcGNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNzg5NzAsImV4cCI6MjA5NDk1NDk3MH0.aO3TT15mGdZQOS4uAAOPeiP3U9oCRg614gRSxhCvFuI";

function videoIdFromUrl(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    let id = null;
    if (host === "youtu.be") id = url.pathname.split("/")[1];
    else if (host === "youtube.com" || host.endsWith(".youtube.com")) {
      if (url.pathname === "/watch") id = url.searchParams.get("v");
      else if (/^\/(shorts|live|embed)\//.test(url.pathname)) id = url.pathname.split("/")[2];
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

async function lookup(videoId) {
  const headers = { apikey: PUBLIC_ANON_KEY, Authorization: `Bearer ${PUBLIC_ANON_KEY}` };
  const response = await fetch(`${API_URL}?videoId=${encodeURIComponent(videoId)}`, { headers });
  if (response.ok) {
    const data = await response.json();
    return Array.isArray(data.loadouts) ? data.loadouts : [];
  }
  if (response.status !== 404) throw new Error(`Lookup failed (${response.status})`);

  // Keeps the unpacked extension usable before the narrow endpoint is deployed.
  const fallback = await fetch(FALLBACK_URL, { headers });
  if (!fallback.ok) throw new Error(`Lookup failed (${fallback.status})`);
  const data = await fallback.json();
  return (data.loadouts ?? [])
    .filter((loadout) => loadout.contentType !== "full_loadout" && videoIdFromUrl(loadout.video?.url) === videoId)
    .map(({ id, gameId, name, userName }) => ({ id, gameId, name, userName }));
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const senderUrl = sender.url ?? "";
  if (message?.type !== "LOADOUTIZE_LOOKUP" ||
      !(senderUrl.startsWith("https://www.youtube.com/") || senderUrl.startsWith("https://youtube.com/"))) {
    return;
  }
  if (typeof message.videoId !== "string" || !/^[A-Za-z0-9_-]{11}$/.test(message.videoId)) {
    sendResponse({ error: "Invalid video ID" });
    return;
  }

  lookup(message.videoId)
    .then((loadouts) => sendResponse({ loadouts }))
    .catch((error) => sendResponse({ error: error.message }));
  return true;
});
