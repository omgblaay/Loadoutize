import { HomeIcon, Globe, Flame, Crown, Zap, Search } from "lucide-react";
import { SideNavButton } from "./sidenav-button";
import { SearchBar } from "./searchbar";


export function SideNav({ isHome, isExplore, selectedGame, categories, navigate, handleGameSelect, setShowAuthModal }: { isHome: boolean; isExplore: boolean; selectedGame: string; categories: string[]; navigate: (path: string) => void; handleGameSelect: (id: string) => void; setShowAuthModal: (show: boolean) => void }) {
  return (
    <aside className="hidden lg:flex flex-col gap-6 w-[320px] shrink-0">
        <SearchBar isExplore={isExplore} />

          <div className="flex flex-col gap-1 w-full">
            <p className="text-[10px] tracking-[0.5px] uppercase text-[#8d898a] font-semibold mb-2">Menu</p>
            <SideNavButton
              state={isHome ? "active" : "default"}
              onClick={() => navigate("/")}
            >
              <HomeIcon className="w-5 h-5" />
              Home
            </SideNavButton>
            <SideNavButton
              state={isExplore ? "active" : "default"}
              onClick={() => navigate(`/${selectedGame}/explore`)}
             >
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
                  key={cat}
                  onClick={() => navigate(`/${selectedGame}/explore?category=${encodeURIComponent(cat)}`)}
                  className="min-h-10 rounded-xl px-3.5 py-2 flex items-center text-[#fafafa] uppercase text-[14px] font-medium hover:bg-white/[0.05] text-left"
                >
                  {cat}
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
        </aside>
  );}