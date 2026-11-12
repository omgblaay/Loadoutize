import type { Loadout } from "@/types/loadout";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { getGameColor } from "@/lib/gameColors";
import {
  gameMeta,
  GAME_ORDER,
  LAST_SELECTED_GAME_KEY,
  GAME_SELECTOR_ENABLED,
  LOCKED_GAME_ID,
} from "@/lib/games";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { AppLayout } from "@/components/templates/AppLayout";
import type { CardWeapon, CardAttachment, CardTag } from "@/types/loadout";
import { ArrowUpRight, ChevronRight, Crown, Globe, Plus } from "lucide-react";
import { HomeExplorePreview } from "@/components/organisms/HomeExplorePreview";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Skeleton } from "@/components/atoms/Skeleton";
import { cn } from "@/lib/utils";
import { Button } from "@/components/atoms/Button";
import { SignInRequiredDialog } from "@/components/molecules/SignInRequiredDialog";
import { NavIcon } from "@/components/atoms/NavIcon";
import { useAuth } from "@/providers/AuthProvider";
import gameLogoImage from "@/assets/mw4_logo.png";
import extensionIconImage from "@/assets/youtube-loadouts-icon-192.png";
import chromeIcon from "@/assets/browser-icons/chrome.svg";
import chromeWebStoreIcon from "@/assets/browser-icons/chrome-web-store.svg";
import edgeIcon from "@/assets/browser-icons/edge.svg";
import braveIcon from "@/assets/browser-icons/brave.svg";
import operaIcon from "@/assets/browser-icons/opera.svg";
import operaGxIcon from "@/assets/browser-icons/opera-gx.svg";
import vivaldiIcon from "@/assets/browser-icons/vivaldi.svg";
import arcIcon from "@/assets/browser-icons/arc.svg";
import { explorePath, gamePath } from "@/lib/routes";
import { visibleWeaponCatalog } from "@/lib/weaponCategories";
import { isVisibleConfig } from "@/lib/contentVisibility";

interface Game {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
}

// Next.js static imports resolve to { src } objects; these need the URL string.
const gameLogo = gameLogoImage.src;
const extensionIcon = extensionIconImage.src;

const EXTENSION_BROWSERS = [
  { name: "Chrome", icon: chromeIcon },
  { name: "Edge", icon: edgeIcon },
  { name: "Brave", icon: braveIcon },
  { name: "Opera", icon: operaIcon },
  { name: "Opera GX", icon: operaGxIcon },
  { name: "Vivaldi", icon: vivaldiIcon },
  { name: "Arc", icon: arcIcon },
] as const;

function ChromeExtensionPromo({
  screenshotUrl,
  extensionUrl = "https://chromewebstore.google.com/detail/loadoutize-for-youtube/agcinigdpcgmpohidgbnigbjimfnidak?authuser=1&hl=en-GB",
}: {
  screenshotUrl?: string;
  extensionUrl?: string;
}) {
  const details = (
    <div>
      <div className="mt-6 border-t border-white/[0.1] pt-4">
        <ul
          className="mt-3 flex flex-wrap gap-x-4 items-center gap-y-3 md:grid-cols-3 xl:grid-cols-4"
          aria-label="Chrome Web Store compatible desktop browsers"
        >
          <li>
            <Button asChild>
              <a href={extensionUrl} target="_blank" rel="noopener noreferrer">
                <img src={chromeWebStoreIcon} alt="" className="size-5" />
                Get the extension
                <ArrowUpRight className="size-4" />
              </a>
            </Button>
          </li>
          {EXTENSION_BROWSERS.map(({ name, icon }) => (
            <li
              key={name}
              className="flex items-center gap-2 text-sm text-secondary"
            >
              <img
                src={icon}
                alt=""
                className="size-5 opacity-50 brightness-0 invert"
              />
              <span>{name}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  return (
    <section
      aria-labelledby="chrome-extension-title"
      className={cn(
        "mt-4 flex-col items-center gap-5 overflow-hidden rounded-2xl border border-white/[0.1] bg-[#151314] p-6 sm:p-8",
        screenshotUrl
          ? "lg:grid-cols-2 lg:gap-8"
          : "sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] sm:gap-8",
      )}
    >
      <div className="flex items-center gap-5">
        <img
          src={extensionIcon}
          alt=""
          width={56}
          height={56}
          className="size-14 shrink-0 mb-4"
        />
        <div>
          <h2
            id="chrome-extension-title"
            className="text-xl leading-tight text-white"
          >
            Browser extension for YouTube
          </h2>
          <p className="text-sm leading-6 text-secondary sm:leading-7">
            The browser extension shows weapon configs linked to the video
            you&apos;re watching, right below its title. Open a matching build,
            or create the first one when none has been shared yet.
          </p>
        </div>
      </div>
      {details}
      {screenshotUrl && (
        <img
          src={screenshotUrl}
          alt="Loadoutize extension showing weapon configs below a YouTube video"
          loading="lazy"
          className="w-full rounded-xl border border-white/[0.1] object-cover lg:col-start-2 lg:row-span-2 lg:row-start-1"
        />
      )}
    </section>
  );
}

function HomeSkeleton() {
  const block = "bg-white/[0.06]";

  return (
    <>
      <Skeleton className={cn("h-[340px] rounded-[28px]", block)} />

      {/* Primary actions */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className={cn("h-[180px] rounded-2xl", block)} />
        ))}
      </div>

      {/* Top weapons + popular loadouts */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className={cn("h-5 w-48", block)} />
            <Skeleton className={cn("h-5 w-28", block)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton
                key={i}
                className={cn("rounded-2xl h-[240px]", block)}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Skeleton className={cn("h-5 w-40", block)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton
                key={i}
                className={cn("rounded-2xl h-[220px]", block)}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export function Home() {
  usePageTitle("Loadoutize • Build, Rate, and Share Weapon Configs");

  const [games, setGames] = useState<Game[]>([]);
  const [loadouts, setLoadouts] = useState<Loadout[]>([]);
  const [weapons, setWeapons] = useState<CardWeapon[]>([]);
  const [attachments, setAttachments] = useState<CardAttachment[]>([]);
  const [tags, setTags] = useState<CardTag[]>([]);
  const [selectedGame, setSelectedGame] = useState<string>(
    GAME_SELECTOR_ENABLED ? "" : LOCKED_GAME_ID,
  );
  const [loading, setLoading] = useState(true);
  const [loadoutsError, setLoadoutsError] = useState(false);
  const [exploreCtaHovered, setExploreCtaHovered] = useState(false);
  const [hoveredAction, setHoveredAction] = useState<
    "explore" | "meta" | "create" | null
  >(null);
  const [signInRequiredOpen, setSignInRequiredOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games`,
      {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      },
    )
      .then((r) => r.json())
      .then((data) => data.games && setGames(data.games))
      .catch((error) => console.error("Error fetching games:", error));
  }, []);

  useEffect(() => {
    if (!GAME_SELECTOR_ENABLED) return;
    const gameParam = searchParams.get("game");
    if (gameParam) setSelectedGame(gameParam);
  }, [searchParams]);

  // Falls back to the last game the user picked elsewhere (e.g. on Explore),
  // then the first game in GAME_ORDER actually returned by the API, instead
  // of a hardcoded id that may no longer exist in the database (e.g. a
  // retired game).
  useEffect(() => {
    if (!GAME_SELECTOR_ENABLED) return;
    if (games.length === 0) return;
    setSelectedGame((current) => {
      if (current && games.some((g) => g.id === current)) return current;
      let stored: string | null = null;
      try {
        stored = localStorage.getItem(LAST_SELECTED_GAME_KEY);
      } catch {
        // localStorage may be unavailable (e.g. private browsing).
      }
      if (stored && games.some((g) => g.id === stored)) return stored;
      const preferred = GAME_ORDER.find((id) => games.some((g) => g.id === id));
      return preferred ?? games[0].id;
    });
  }, [games]);

  // While the selector is disabled, only the locked game's loadouts are
  // needed — no reason to wait on or fetch the full games list.
  useEffect(() => {
    if (GAME_SELECTOR_ENABLED) return;
    fetchLoadouts([LOCKED_GAME_ID]);
  }, []);

  useEffect(() => {
    if (!GAME_SELECTOR_ENABLED) return;
    if (games.length === 0) return;
    fetchLoadouts(games.map((g) => g.id));
  }, [games]);

  useEffect(() => {
    if (!selectedGame) return;
    fetchWeapons(selectedGame);
    fetchAttachments(selectedGame);
    fetchTags(selectedGame);
  }, [selectedGame]);

  const fetchLoadouts = async (gameIds: string[]) => {
    setLoading(true);
    setLoadoutsError(false);
    try {
      const results = await Promise.all(
        gameIds.map((gameId) =>
          fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/loadouts`,
            { headers: { Authorization: `Bearer ${publicAnonKey}` } },
          ).then((r) => {
            if (!r.ok) throw new Error(`Loadouts request failed: ${r.status}`);
            return r.json();
          }),
        ),
      );
      setLoadouts(
        results.flatMap((data) => data.loadouts ?? []).filter(isVisibleConfig),
      );
    } catch (error) {
      console.error("Error fetching loadouts:", error);
      setLoadoutsError(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeapons = async (gameId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/weapons`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } },
      );
      const data = await response.json();
      if (data.weapons)
        setWeapons(visibleWeaponCatalog<CardWeapon>(data.weapons));
    } catch (error) {
      console.error("Error fetching weapons:", error);
    }
  };

  const fetchAttachments = async (gameId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/attachments`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } },
      );
      const data = await response.json();
      if (data.attachments) setAttachments(data.attachments);
    } catch (error) {
      console.error("Error fetching attachments:", error);
    }
  };

  const fetchTags = async (gameId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/tags`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } },
      );
      const data = await response.json();
      if (data.tags) setTags(data.tags);
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  };

  const activeGame = games.find((g) => g.id === selectedGame);
  const activeMeta = gameMeta[selectedGame];
  const activeName = activeGame?.name ?? activeMeta?.name ?? selectedGame;
  const activeShort = activeMeta?.short ?? activeName.slice(0, 3).toUpperCase();
  const accent = getGameColor(selectedGame).primary;

  if (loading) {
    return (
      <AppLayout selectedGame={selectedGame} onGameSelect={setSelectedGame}>
        <HomeSkeleton />
      </AppLayout>
    );
  }

  return (
    <AppLayout selectedGame={selectedGame} onGameSelect={setSelectedGame}>
      <section className="relative overflow-hidden ">
        <div className="max-w-[70rem]">
          <div className="flex min-w-0 flex-col items-start">
            <img
              src={gameLogo}
              alt="Modern Warfare 4"
              className="w-44 object-contain sm:w-52"
            />
            <h1 className="mt-10 text-[clamp(1.2rem,4.5vw,4rem)] leading-[0.92] uppercase tracking-[-0.04em]">
              WEAPON CONFIGS DRIVEN BY COMMUNITY
            </h1>
            {/* <p className="text-sm uppercase tracking-[0.18em] text-teritary">
              Loadoutize Meta Vault
            </p> */}
            <p className="mt-5 max-w-xl text-base leading-7 text-secondary sm:text-lg">
              Discover community-built MW4 weapon configs. Compare ratings and
              the live meta. Follow creator setups, and share weapon codes or
              downloadable QR codes.
            </p>
          </div>
        </div>
      </section>

      <section
        aria-label="Get started"
        className="grid grid-cols-1 gap-4 md:grid-cols-3"
      >
        <button
          type="button"
          onClick={() => navigate(explorePath(selectedGame))}
          onPointerEnter={() => setHoveredAction("explore")}
          onPointerLeave={() => setHoveredAction(null)}
          onFocus={() => setHoveredAction("explore")}
          onBlur={() => setHoveredAction(null)}
          className="flex gap-2 relative overflow-hidden rounded-xl border border-white/[0.1] p-4 items-center text-left transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:bg-[#1a1719] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <NavIcon
            icon="explore"
            flat={<Globe className="size-6 opacity-30" />}
            active={false}
            hovered={hoveredAction === "explore"}
            size={32}
          />
          <p className="text-base flex-1 font-semibold text-white">
            Explore configs
          </p>

          <ChevronRight className="size-5 text-teritary transition-transform duration-300 group-hover:translate-x-1 group-hover:text-white" />
        </button>

        <button
          type="button"
          onClick={() => navigate(gamePath(selectedGame, "meta"))}
          onPointerEnter={() => setHoveredAction("meta")}
          onPointerLeave={() => setHoveredAction(null)}
          onFocus={() => setHoveredAction("meta")}
          onBlur={() => setHoveredAction(null)}
          className="flex gap-2 relative overflow-hidden rounded-xl border border-white/[0.1] p-4 items-center text-left transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:bg-[#1a1719] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <NavIcon
            icon="meta"
            flat={<Crown className="size-6 opacity-30" />}
            active={false}
            hovered={hoveredAction === "meta"}
            size={32}
          />
          <p className="font-semibold text-white">Explore meta</p>
          <ChevronRight className="size-5 text-teritary transition-transform duration-300 group-hover:translate-x-1 group-hover:text-white" />
        </button>

        {/* <a
          href="/best-loadouts"
          className="flex gap-2 relative overflow-hidden rounded-xl border border-white/[0.1] p-4 items-center text-left transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:bg-[#1a1719] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <p className="font-semibold text-white">Best MW4 loadouts by weapon</p>
          <ChevronRight className="size-5 text-teritary transition-transform duration-300 group-hover:translate-x-1 group-hover:text-white" />
        </a> */}

        <button
          type="button"
          onClick={() =>
            user
              ? navigate(gamePath(selectedGame, "create"))
              : setSignInRequiredOpen(true)
          }
          onPointerEnter={() => setHoveredAction("create")}
          onPointerLeave={() => setHoveredAction(null)}
          onFocus={() => setHoveredAction("create")}
          onBlur={() => setHoveredAction(null)}
          className="flex gap-2 relative overflow-hidden rounded-xl border border-white/[0.1] p-4 items-center text-left transition-all duration-300 hover:-translate-y-1 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <Plus className="size-5 transition-transform duration-300 group-hover:rotate-90" />
          <p className="font-semibold flex-1">Create new</p>
          <ChevronRight className="size-5 opacity-55 transition-transform duration-300 group-hover:translate-x-1 group-hover:opacity-100" />
        </button>
      </section>

      {/* Add screenshotUrl and extensionUrl when the extension assets are ready. */}
      <ChromeExtensionPromo />

      {loadoutsError ? (
        <section
          role="alert"
          className="rounded-2xl border border-white/[0.1] bg-white/[0.02] px-6 py-10 text-center"
        >
          <h2 className="text-xl text-white">Weapon configs are unavailable</h2>
          <p className="mt-2 text-secondary">
            We couldn't load community builds. Please try again.
          </p>
          <Button
            className="mt-5"
            onClick={() =>
              fetchLoadouts(
                GAME_SELECTOR_ENABLED
                  ? games.map((game) => game.id)
                  : [LOCKED_GAME_ID],
              )
            }
          >
            Try again
          </Button>
        </section>
      ) : (
        <HomeExplorePreview
          selectedGame={selectedGame}
          loadouts={loadouts}
          weapons={weapons}
          attachments={attachments}
          tags={tags}
          accent={accent}
          gameShort={activeShort}
          gameName={activeName}
        />
      )}
      <SignInRequiredDialog
        open={signInRequiredOpen}
        onOpenChange={setSignInRequiredOpen}
        returnTo={gamePath(selectedGame, "create")}
      />
    </AppLayout>
  );
}
