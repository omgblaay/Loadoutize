import { Link } from "react-router";
import { Logo } from "./logo";

export function Footer({ selectedGame, orderedGames, gameMeta }: { selectedGame: string; orderedGames: { id: string; name: string }[]; gameMeta: Record<string, { name: string }> }) {
  return (
      <footer className="w-full border-t border-white/[0.18] mt-4">
        <div className="max-w-[1440px] mx-auto px-6 py-7 flex flex-wrap gap-6">
          <div className="flex-1 min-w-[260px] flex flex-col justify-between gap-6">
            <div className="flex flex-col gap-6 items-start">
              <Logo />
              <div className="text-[14px] text-[#857d7f] flex flex-col gap-1">
                <p>Loadoutize © 2027</p>
                <p>Built independently · Not affiliated with any listed game.</p>
              </div>
            </div>
            <div className="flex gap-3 text-[14px] text-[#aea6a8]">
              <Link to="/">Instagram</Link>
              <span>·</span>
              <Link to="/">TikTok</Link>
              <span>·</span>
              <Link to="/">YouTube</Link>
            </div>
          </div>

          <div className="flex-1 min-w-[140px] flex flex-col gap-3 text-[14px] text-[#aea6a8]">
            <Link to="/" className="hover:text-[#efedf1]">
              Home
            </Link>
            <Link to={`/${selectedGame}/explore`} className="hover:text-[#efedf1]">
              Explore
            </Link>
          </div>

          <div className="flex-1 min-w-[140px] flex flex-col gap-3 text-[14px] text-[#aea6a8]">
            <Link to="/privacy" className="hover:text-[#efedf1]">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-[#efedf1]">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    );
}
