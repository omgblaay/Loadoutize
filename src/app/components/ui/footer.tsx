import { Logo } from "./logo";

export function Footer({ handleGameSelect, navigate, selectedGame, orderedGames, gameMeta }: { handleGameSelect: (id: string) => void; navigate: (path: string) => void; selectedGame: string; orderedGames: { id: string; name: string }[]; gameMeta: Record<string, { name: string }> }) {
  return (
      <footer className="w-full border-t border-white/[0.18] mt-4">
        <div className="max-w-[1440px] mx-auto px-6 py-7 flex flex-wrap gap-6">
          <div className="flex-1 min-w-[260px] flex flex-col justify-between gap-6">
            <div className="flex gap-6 items-start">
              <Logo />
              <div className="text-[14px] text-[#857d7f] flex flex-col gap-1">
                <p>Loadoutize © 2027</p>
                <p>Built independently · Not affiliated with any listed game.</p>
              </div>
            </div>
            <div className="flex gap-3 text-[14px] text-[#aea6a8]">
              <span>Instagram</span>
              <span>·</span>
              <span>TikTok</span>
              <span>·</span>
              <span>YouTube</span>
            </div>
          </div>

          <div className="flex-1 min-w-[140px] flex flex-col gap-3 text-[14px] text-[#aea6a8]">
            <a onClick={() => navigate("/")} className="hover:text-[#efedf1] cursor-pointer">
              Home
            </a>
            <a onClick={() => navigate(`/${selectedGame}/explore`)} className="hover:text-[#efedf1] cursor-pointer">
              Explore
            </a>
            <a className="hover:text-[#efedf1]">Ranking</a>
            <a className="hover:text-[#efedf1]">Creator</a>
            <a className="hover:text-[#efedf1]">Favourites</a>
          </div>

          <div className="flex-1 min-w-[140px] flex flex-col gap-3 text-[14px] text-[#aea6a8]">
            <a className="hover:text-[#efedf1]">Privacy Policy</a>
            <a className="hover:text-[#efedf1]">Terms of Use</a>
            <a className="hover:text-[#efedf1]">About us</a>
            <a className="hover:text-[#efedf1]">Blog</a>
          </div>

          <div className="flex-1 min-w-[140px] flex flex-col gap-3 text-[14px] text-[#aea6a8]">
            {orderedGames.map((game) => (
              <a
                key={game.id}
                onClick={() => handleGameSelect(game.id)}
                className="hover:text-[#efedf1] cursor-pointer"
              >
                {gameMeta[game.id]?.name ?? game.name}
              </a>
            ))}
          </div>
        </div>
      </footer>
    );
}
