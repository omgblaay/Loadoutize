import { useState } from "react";
import { useLocation } from "react-router";
import { HomeIcon, Globe, Flame, Crown, Users, Zap, Menu, X } from "lucide-react";
import { SideNavButton } from "./sidenav-button";
import { AppTooltip } from "./tooltip";
import { NavIcon, type NavIconKey } from "./nav-icon-3d";
import { Button } from "./button";
import { Tag } from "./tag";

export interface SideNavCategory {
  name: string;
  typeShort: string | null;
}

export function SideNav({
  isHome,
  isExplore,
  isMeta,
  isCommunity,
  selectedGame,
  categories,
  navigate,
  handleGameSelect,
}: {
  isHome: boolean;
  isExplore: boolean;
  isMeta: boolean;
  isCommunity: boolean;
  selectedGame: string;
  categories: SideNavCategory[];
  navigate: (path: string, options?: { state?: unknown }) => void;
  handleGameSelect: (id: string) => void;
}) {
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);
  // Shared between the full menu and the icon rail -- only one of the two
  // layouts is ever hit-testable at a given viewport width (the other is
  // `hidden`), so one hover key covers both without cross-wiring.
  const [hoveredIcon, setHoveredIcon] = useState<NavIconKey | null>(null);
  const hoverHandlers = (key: NavIconKey) => ({
    onMouseEnter: () => setHoveredIcon(key),
    onMouseLeave: () => setHoveredIcon((h) => (h === key ? null : h)),
  });

  // Shared by the full menu (xl+, and inside the overlay below xl) so both
  // stay in sync -- closes the overlay after navigating, a no-op when it's
  // already collapsed.
  const go = (path: string) => {
    navigate(path);
    setExpanded(false);
  };

  const fullMenu = (
    <>
      {/*  <SearchBar isExplore={isExplore} /> Search bar is only shown in the full menu, not the icon rail below xl */}


      <div className="flex flex-col gap-1 w-full">
        <p className="text-[10px] tracking-[0.5px] uppercase text-[#8d898a] font-semibold mb-2">Menu</p>
        <SideNavButton state={isHome ? "active" : "default"} onClick={() => go("/")} {...hoverHandlers("home")}>
          <NavIcon icon="home" flat={<HomeIcon className="w-5 h-5" />} active={isHome} hovered={hoveredIcon === "home"} />
          Home
        </SideNavButton>
        <SideNavButton
          state={isExplore ? "active" : "default"}
          onClick={() => go(`/${selectedGame}/explore`)}
          {...hoverHandlers("explore")}
        >
          <NavIcon icon="explore" flat={<Globe className="w-5 h-5" />} active={isExplore} hovered={hoveredIcon === "explore"} />
          Explore
        </SideNavButton>
        <SideNavButton {...hoverHandlers("trending")}>
          <NavIcon icon="trending" flat={<Flame className="w-5 h-5" />} active={false} hovered={hoveredIcon === "trending"} />
          Trending
        </SideNavButton>
        <SideNavButton state={isMeta ? "active" : "default"} onClick={() => go(`/${selectedGame}/meta`)} {...hoverHandlers("meta")}>
          <NavIcon icon="meta" flat={<Crown className="w-5 h-5" />} active={isMeta} hovered={hoveredIcon === "meta"} />
          Meta
        </SideNavButton>
        <SideNavButton
          state={isCommunity ? "active" : "default"}
          onClick={() => go(`/${selectedGame}/community`)}
          {...hoverHandlers("community")}
        >
          <NavIcon icon="community" flat={<Users className="w-5 h-5" />} active={isCommunity} hovered={hoveredIcon === "community"} />
          Community
        </SideNavButton>
      </div>

      {categories.length > 0 && (
        <div className="flex flex-col gap-0.5 w-full">
          <p className="text-[10px] tracking-[0.5px] uppercase text-[#8d898a] font-semibold mb-2">Best of</p>
          {categories.map((cat) => (
            <SideNavButton
              key={cat.name}
              onClick={() => go(`/${selectedGame}/explore?category=${encodeURIComponent(cat.name)}`)}
              className="text-secondary"
            >
              <Tag>{cat.typeShort ?? cat.name.slice(0, 3)}</Tag>
              {cat.name}
            </SideNavButton>
          ))}
        </div>
      )}

       {/* <div
        className="relative rounded-xl p-6 flex flex-col gap-5 overflow-hidden"
        style={{ backgroundImage: "linear-gradient(to bottom, #1a181a 34%, #212126)" }}
      >
        <div
          className="absolute inset-0 pointer-events-none rounded-[inherit]"
          style={{ boxShadow: "inset 0px -40px 120px 0px rgba(255,255,255,0.04)" }}
        />
          {/* <Zap className="w-[18px] h-6 text-[#efedf1] shrink-0" />
          <h2 className="text-sm">Join the battlefield with the best setups</h2>
        <p className="text-[14px] leading-[1.4] text-[#bebcbc] relative">
          Join the community now, and enjoy the best configs for your favourite games
        </p>
        <button
          onClick={() => navigate("/join", { state: { from: location.pathname + location.search } })}
          className="h-[52px] rounded-xl bg-[#fafafa] flex items-center justify-center gap-2 relative"
        >
          <span className="text-[#161414]">Join now</span>
          <span className="text-[#8d898a]">For free</span>
        </button>
      </div> */}
    </>
  );

  return (
    <>
      {/* Full menu, shown in-flow at xl (1280px) and up */}
      <aside className="hidden xl:flex flex-col gap-6 w-[320px] shrink-0">{fullMenu}</aside>

      {/* Icon-only rail, sm-xl: nav links as icons, "Best of" as typeShort, no search. Below sm, the bottom bar takes over instead. */}
      <aside className="hidden sm:flex xl:hidden flex-col items-center gap-4 w-[72px] shrink-0">
        <AppTooltip content="Show full menu" side="right">
          <button
            onClick={() => setExpanded(true)}
            aria-label="Show full menu"
            className="min-h-10 w-11 rounded-xl flex items-center justify-center text-[#8d898a] hover:text-[#fafafa] hover:bg-white/[0.05]"
          >
            <Menu className="w-5 h-5" />
          </button>
        </AppTooltip>

        <div className="flex flex-col items-center gap-1 w-full">
          <SideNavButton
            state={isHome ? "active" : "default"}
            onClick={() => go("/")}
            className="justify-center px-0 w-11"
            tooltip="Home"
            aria-label="Home"
            {...hoverHandlers("home")}
          >
            <NavIcon icon="home" flat={<HomeIcon className="w-5 h-5" />} active={isHome} hovered={hoveredIcon === "home"} />
          </SideNavButton>
          <SideNavButton
            state={isExplore ? "active" : "default"}
            onClick={() => go(`/${selectedGame}/explore`)}
            className="justify-center px-0 w-11"
            tooltip="Explore"
            aria-label="Explore"
            {...hoverHandlers("explore")}
          >
            <NavIcon icon="explore" flat={<Globe className="w-5 h-5" />} active={isExplore} hovered={hoveredIcon === "explore"} />
          </SideNavButton>
          <SideNavButton className="justify-center px-0 w-11" tooltip="Trending" aria-label="Trending" {...hoverHandlers("trending")}>
            <NavIcon icon="trending" flat={<Flame className="w-5 h-5" />} active={false} hovered={hoveredIcon === "trending"} />
          </SideNavButton>
          <SideNavButton
            state={isMeta ? "active" : "default"}
            onClick={() => go(`/${selectedGame}/meta`)}
            className="justify-center px-0 w-11"
            tooltip="Meta"
            aria-label="Meta"
            {...hoverHandlers("meta")}
          >
            <NavIcon icon="meta" flat={<Crown className="w-5 h-5" />} active={isMeta} hovered={hoveredIcon === "meta"} />
          </SideNavButton>
          <SideNavButton
            state={isCommunity ? "active" : "default"}
            onClick={() => go(`/${selectedGame}/community`)}
            className="justify-center px-0 w-11"
            tooltip="Community"
            aria-label="Community"
            {...hoverHandlers("community")}
          >
            <NavIcon icon="community" flat={<Users className="w-5 h-5" />} active={isCommunity} hovered={hoveredIcon === "community"} />
          </SideNavButton>
        </div>

        {categories.length > 0 && (
          <div className="flex flex-col items-center gap-1 w-full">
            {categories.map((cat) => (
              <AppTooltip key={cat.name} content={cat.name} side="right">
                <SideNavButton
                  onClick={() => go(`/${selectedGame}/explore?category=${encodeURIComponent(cat.name)}`)}
                  aria-label={cat.name}
                  className="hover:bg-white/[0.05] !h-max-[20px]"
                >
                  <Tag>{cat.typeShort ?? cat.name.slice(0, 3)}</Tag>
                </SideNavButton>
              </AppTooltip>
            ))}
          </div>
        )}
      </aside>

      {/* Bottom tab bar, below sm: primary nav links + a "More" tab for categories/join, reusing the same overlay */}
      <nav
        className="sm:hidden fixed inset-x-0 bottom-0 z-40 bg-[#0a0909] border-t border-white/[0.08] pb-[env(safe-area-inset-bottom)]"
        aria-label="Primary"
      >
        <div className="grid grid-cols-6 h-14">
          <SideNavButton
            onClick={() => go("/")}
            aria-label="Home"
            aria-current={isHome ? "page" : undefined}
            className={`flex flex-col items-center justify-center gap-0.5 ${isHome ? "text-[#fafafa]" : "text-[#8d898a]"}`}
            {...hoverHandlers("home")}
          >
            <NavIcon icon="home" flat={<HomeIcon className="w-5 h-5" />} active={isHome} hovered={hoveredIcon === "home"} />
            <span className="text-[9px] uppercase tracking-[0.3px] font-medium">Home</span>
          </SideNavButton>
          <SideNavButton    
            onClick={() => go(`/${selectedGame}/explore`)}
            aria-label="Explore"
            aria-current={isExplore ? "page" : undefined}
            className={`flex flex-col items-center justify-center gap-0.5 ${isExplore ? "text-[#fafafa]" : "text-[#8d898a]"}`}
            {...hoverHandlers("explore")}
          >
            <NavIcon icon="explore" flat={<Globe className="w-5 h-5" />} active={isExplore} hovered={hoveredIcon === "explore"} />
            <span className="text-[9px] uppercase tracking-[0.3px] font-medium">Explore</span>
          </SideNavButton>
          <SideNavButton
            aria-label="Trending"
            className="flex flex-col items-center justify-center gap-0.5 text-[#8d898a]"
            {...hoverHandlers("trending")}
          >
            <NavIcon icon="trending" flat={<Flame className="w-5 h-5" />} active={false} hovered={hoveredIcon === "trending"} />
            <span className="text-[9px] uppercase tracking-[0.3px] font-medium">Trending</span>
          </SideNavButton>
          <SideNavButton
            onClick={() => go(`/${selectedGame}/meta`)}
            aria-label="Meta"
            aria-current={isMeta ? "page" : undefined}
            className={`flex flex-col items-center justify-center gap-0.5 ${isMeta ? "text-[#fafafa]" : "text-[#8d898a]"}`}
            {...hoverHandlers("meta")}
          >
            <NavIcon icon="meta" flat={<Crown className="w-5 h-5" />} active={isMeta} hovered={hoveredIcon === "meta"} />
            <span className="text-[9px] uppercase tracking-[0.3px] font-medium">Meta</span>
          </SideNavButton>
          <SideNavButton
            onClick={() => go(`/${selectedGame}/community`)}
            aria-label="Community"
            aria-current={isCommunity ? "page" : undefined}
            className={`flex flex-col items-center justify-center gap-0.5 ${isCommunity ? "text-[#fafafa]" : "text-[#8d898a]"}`}
            {...hoverHandlers("community")}
          >
            <NavIcon icon="community" flat={<Users className="w-5 h-5" />} active={isCommunity} hovered={hoveredIcon === "community"} />
            <span className="text-[9px] uppercase tracking-[0.3px] font-medium">Community</span>
          </SideNavButton>
          <SideNavButton
            onClick={() => setExpanded(true)}
            aria-label="More"
            className="flex flex-col items-center justify-center gap-0.5 text-[#8d898a]"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[9px] uppercase tracking-[0.3px] font-medium">More</span>
          </SideNavButton>
        </div>
      </nav>

      {/* Full menu overlay, opened from the icon rail below xl, or the More tab below sm */}
      {expanded && (
        <div className="xl:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setExpanded(false)} />
          <aside className="relative w-[320px] max-w-[85vw] h-full bg-[#0a0909] border-r border-white/[0.08] p-6 flex flex-col gap-6 overflow-y-auto">
            <Button
              onClick={() => setExpanded(false)}
              aria-label="Close menu"
              className="self-end"
              variant="ghost"
            >
              <X className="w-5 h-5" />
            </Button>
            {fullMenu}
          </aside>
        </div>
      )}
    </>
  );
}
