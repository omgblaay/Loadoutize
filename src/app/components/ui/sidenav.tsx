import { useState } from "react";
import { HomeIcon, Globe, Flame, Crown, Zap, Menu, X } from "lucide-react";
import { SideNavButton } from "./sidenav-button";
import { SearchBar } from "./searchbar";

export interface SideNavCategory {
  name: string;
  typeShort: string | null;
}

export function SideNav({
  isHome,
  isExplore,
  selectedGame,
  categories,
  navigate,
  handleGameSelect,
  setShowAuthModal,
}: {
  isHome: boolean;
  isExplore: boolean;
  selectedGame: string;
  categories: SideNavCategory[];
  navigate: (path: string) => void;
  handleGameSelect: (id: string) => void;
  setShowAuthModal: (show: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  // Shared by the full menu (xl+, and inside the overlay below xl) so both
  // stay in sync -- closes the overlay after navigating, a no-op when it's
  // already collapsed.
  const go = (path: string) => {
    navigate(path);
    setExpanded(false);
  };

  const fullMenu = (
    <>
      <SearchBar isExplore={isExplore} />

      <div className="flex flex-col gap-1 w-full">
        <p className="text-[10px] tracking-[0.5px] uppercase text-[#8d898a] font-semibold mb-2">Menu</p>
        <SideNavButton state={isHome ? "active" : "default"} onClick={() => go("/")}>
          <HomeIcon className="w-5 h-5" />
          Home
        </SideNavButton>
        <SideNavButton state={isExplore ? "active" : "default"} onClick={() => go(`/${selectedGame}/explore`)}>
          <Globe className="w-5 h-5" />
          Explore
        </SideNavButton>
        <SideNavButton>
          <Flame className="w-5 h-5" />
          Trending
        </SideNavButton>
        <SideNavButton>
          <Crown className="w-5 h-5" />
          Meta
        </SideNavButton>
      </div>

      {categories.length > 0 && (
        <div className="flex flex-col gap-0.5 w-full">
          <p className="text-[10px] tracking-[0.5px] uppercase text-[#8d898a] font-semibold mb-2">Best of</p>
          {categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => go(`/${selectedGame}/explore?category=${encodeURIComponent(cat.name)}`)}
              className="min-h-10 rounded-xl px-3.5 py-2 flex items-center text-[#fafafa] uppercase text-[14px] font-medium hover:bg-white/[0.05] text-left"
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      <div
        className="relative rounded-xl p-6 flex flex-col gap-5 overflow-hidden"
        style={{ backgroundImage: "linear-gradient(to bottom, #1a181a 34%, #212126)" }}
      >
        <div
          className="absolute inset-0 pointer-events-none rounded-[inherit]"
          style={{ boxShadow: "inset 0px -40px 120px 0px rgba(255,255,255,0.04)" }}
        />
        <div className="flex gap-4 items-start relative">
          <Zap className="w-[18px] h-6 text-[#efedf1] shrink-0" />
          <p className="flex-1 text-[20px] text-[#fafafa]">Join the battlefield with the best setups</p>
        </div>
        <p className="text-[14px] leading-[1.4] text-[#bebcbc] relative">
          Join the community now, and enjoy the best configs for your favourite games
        </p>
        <button
          onClick={() => setShowAuthModal(true)}
          className="h-[52px] rounded-xl bg-[#fafafa] flex items-center justify-center gap-2 relative"
        >
          <span className="text-[#161414]">Join now</span>
          <span className="text-[#8d898a]">For free</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Full menu, shown in-flow at xl (1280px) and up */}
      <aside className="hidden xl:flex flex-col gap-6 w-[320px] shrink-0">{fullMenu}</aside>

      {/* Icon-only rail, below xl: nav links as icons, "Best of" as typeShort, no search */}
      <aside className="flex xl:hidden flex-col items-center gap-4 w-[72px] shrink-0">
        <button
          onClick={() => setExpanded(true)}
          title="Show full menu"
          aria-label="Show full menu"
          className="min-h-10 w-11 rounded-xl flex items-center justify-center text-[#8d898a] hover:text-[#fafafa] hover:bg-white/[0.05]"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center gap-1 w-full">
          <SideNavButton
            state={isHome ? "active" : "default"}
            onClick={() => go("/")}
            className="justify-center px-0 w-11"
            title="Home"
            aria-label="Home"
          >
            <HomeIcon className="w-5 h-5" />
          </SideNavButton>
          <SideNavButton
            state={isExplore ? "active" : "default"}
            onClick={() => go(`/${selectedGame}/explore`)}
            className="justify-center px-0 w-11"
            title="Explore"
            aria-label="Explore"
          >
            <Globe className="w-5 h-5" />
          </SideNavButton>
          <SideNavButton className="justify-center px-0 w-11" title="Trending" aria-label="Trending">
            <Flame className="w-5 h-5" />
          </SideNavButton>
          <SideNavButton className="justify-center px-0 w-11" title="Meta" aria-label="Meta">
            <Crown className="w-5 h-5" />
          </SideNavButton>
        </div>

        {categories.length > 0 && (
          <div className="flex flex-col items-center gap-1 w-full">
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => go(`/${selectedGame}/explore?category=${encodeURIComponent(cat.name)}`)}
                title={cat.name}
                aria-label={cat.name}
                className="min-h-10 w-11 rounded-xl flex items-center justify-center text-[#fafafa] uppercase text-[11px] font-semibold hover:bg-white/[0.05]"
              >
                {cat.typeShort ?? cat.name.slice(0, 3)}
              </button>
            ))}
          </div>
        )}
      </aside>

      {/* Full menu overlay, opened from the icon rail below xl */}
      {expanded && (
        <div className="xl:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setExpanded(false)} />
          <aside className="relative w-[320px] max-w-[85vw] h-full bg-[#0a0909] border-r border-white/[0.08] p-6 flex flex-col gap-6 overflow-y-auto">
            <button
              onClick={() => setExpanded(false)}
              aria-label="Close menu"
              className="self-end text-[#8d898a] hover:text-[#fafafa]"
            >
              <X className="w-5 h-5" />
            </button>
            {fullMenu}
          </aside>
        </div>
      )}
    </>
  );
}
