import { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronDown, Globe, Heart, LogOut, Settings as SettingsIcon, Star, UserRound } from "lucide-react";
import { useAuth } from "../AuthContext";
import { gameMeta } from "@/app/utils/games";
import { Logo } from "./logo";
import { NavIcon } from "./nav-icon-3d";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./dialog";
import { Button } from "./button";

export function TopNavBar({
  activeLogoUrl,
  user,
  selectedGame,
  orderedGames,
  handleGameSelect,
  setShowAuthModal,
}: {
  activeLogoUrl: string | null;
  user: any;
  selectedGame: string;
  orderedGames: { id: string; name: string; slug: string; logoUrl: string | null }[];
  handleGameSelect: (id: string) => void;
  setShowAuthModal: (show: boolean) => void;
}) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [gameMenuOpen, setGameMenuOpen] = useState(false);
  const [favouritesHovered, setFavouritesHovered] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const activeMeta = gameMeta[selectedGame];
  const activeName = orderedGames.find((g) => g.id === selectedGame)?.name ?? activeMeta?.name ?? selectedGame;
  const ActiveIcon = activeMeta?.icon ?? Globe;
    return (<div className="w-full backdrop-blur-md bg-[rgba(6,5,9,0.6)] border-b border-white/[0.16] sticky top-0 z-40">
        <div className="max-w-[1440px] mx-auto p-2 sm:p-6  h-[72px] flex items-center gap-5">
          <div className="flex items-center gap-3 shrink-0">
            <a href="/" className="flex items-center gap-1.5">
              <Logo />
            </a>
            {/*<span className="text-[#5D5658] px-1">/</span>
            <div className="relative">
              <button
                onClick={() => setGameMenuOpen((v) => !v)}
                className="h-10 px-3.5 rounded-xl border border-white/[0.18] bg-white/[0.04] flex items-center gap-2 text-[#efedf1]"
              >
                {activeLogoUrl ? (
                  <img src={activeLogoUrl} alt="" className="w-4 h-4 object-contain shrink-0" />
                ) : (
                  <ActiveIcon className="w-4 h-4" />
                )}
                <span>{activeName}</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              {gameMenuOpen && (
                <div className="absolute top-[calc(100%+8px)] left-0 w-56 rounded-xl border border-white/10 bg-[#161415] shadow-2xl overflow-hidden z-50">
                  {orderedGames.map((game) => {
                    const meta = gameMeta[game.id];
                    const Icon = meta?.icon ?? Globe;
                    return (
                      <button
                        key={game.id}
                        onClick={() => {
                          handleGameSelect(game.id);
                          setGameMenuOpen(false);
                        }}
                        className={`w-full px-3.5 py-2.5 flex items-center gap-2 text-left hover:bg-white/5 ${
                          selectedGame === game.id ? "text-[#f8f7f9]" : "text-[#aea6a8]"
                        }`}
                      >
                        {game.logoUrl ? (
                          <img src={game.logoUrl} alt="" className="w-4 h-4 object-contain shrink-0" />
                        ) : (
                          <Icon className="w-4 h-4" />
                        )}
                        <span>{game.name ?? meta?.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            */}
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-4 shrink-0">
            {user && (
              <button
                className="h-[52px] px-4 rounded-xl border border-white/[0.18] flex items-center gap-2 text-[#efedf1]"
                onMouseEnter={() => setFavouritesHovered(true)}
                onMouseLeave={() => setFavouritesHovered(false)}
              >
                <NavIcon icon="favourites" flat={<Heart className="w-4 h-4" />} active={false} hovered={favouritesHovered} size={16} />
                <span className="sm:block hidden">Favourites</span>
              </button>
            )}
            <button
              onClick={() => (user ? navigate(`/${selectedGame}/create`) : setShowAuthModal(true))}
              className="h-[52px] px-4 rounded-xl border border-white/[0.08] bg-[#2a2829] flex items-center gap-2 text-[#efedf1]"
            >
              <span>Create</span>
            </button>
            {user ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="w-12 h-12 rounded-2xl border border-white/10 overflow-hidden flex items-center justify-center text-[#fafafa] shrink-0"
                      style={
                        user.avatarUrl
                          ? undefined
                          : { backgroundImage: "linear-gradient(135deg, rgb(207,206,212) 0%, rgb(64,62,67) 100%)" }
                      }
                    >
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        user.email?.[0]?.toUpperCase() || "U"
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-52 rounded-xl border-white/10 bg-[#161415] text-[#efedf1] p-1.5"
                  >
                    <DropdownMenuItem
                      onClick={() => navigate(`/u/${user.nickname ?? user.name}`)}
                      className="rounded-lg gap-2.5 focus:bg-white/[0.06] focus:text-[#fafafa]"
                    >
                      <UserRound className="w-4 h-4 text-teritary" />
                      View profile
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate("/settings")}
                      className="rounded-lg gap-2.5 focus:bg-white/[0.06] focus:text-[#fafafa]"
                    >
                      <SettingsIcon className="w-4 h-4 text-teritary" />
                      Edit profile
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate("/liked")}
                      className="rounded-lg gap-2.5 focus:bg-white/[0.06] focus:text-[#fafafa]"
                    >
                      <Heart className="w-4 h-4 text-teritary" />
                      See liked
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/[0.08]" />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setLogoutConfirmOpen(true)}
                      className="rounded-lg gap-2.5"
                    >
                      <LogOut className="w-4 h-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Dialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
                  <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                      <DialogTitle>Log out?</DialogTitle>
                      <DialogDescription>You'll need to sign back in to create or edit loadouts.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setLogoutConfirmOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          logout();
                          setLogoutConfirmOpen(false);
                        }}
                      >
                        Log out
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="h-[52px] px-5 rounded-xl bg-[#efedf1] text-[#161414] font-medium flex items-center gap-2"
              >
                <span>Join</span>
              </button>
            )}
          </div>
        </div>
      </div>);
}