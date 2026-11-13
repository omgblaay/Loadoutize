import { Link } from "react-router";
import { Logo } from "@/components/atoms/Logo";
import { InstagramIcon, TiktokIcon, YoutubeIcon } from "@/assets/icons/socials";
import {
  attachmentMetaListPath,
  explorePath,
  gamePath,
  weaponMetaListPath,
} from "@/lib/routes";

export function Footer({
  selectedGame,
  orderedGames,
  gameMeta,
}: {
  selectedGame: string;
  orderedGames: { id: string; name: string }[];
  gameMeta: Record<string, { name: string }>;
}) {
  return (
    <footer className="w-full border-t  border-white/[0.05] mt-4 max-sm:mb-12">
      <div className="max-w-[1440px] mx-auto px-6 py-7">
        <div className="flex flex-wrap gap-6">
          <div className="flex-1 min-w-[260px] flex flex-col justify-between gap-6">
            <div className="flex flex-col gap-6 items-start">
              <Logo />
              <div className="text-[14px] text-[#857d7f] flex flex-col gap-1">
                <p>Loadoutize © 2027</p>
                <p>
                  Built independently · Not affiliated with any listed game.
                </p>
              </div>
            </div>
          </div>

          <nav
            aria-label="Pages"
            className="flex-1 min-w-[140px] flex flex-col gap-3 text-[14px] text-[#aea6a8]"
          >
            <Link to="/home" className="hover:text-[#efedf1]">
              Home
            </Link>
            <Link
              to={explorePath(selectedGame)}
              className="hover:text-[#efedf1]"
            >
              Explore
            </Link>
            <Link
              to={gamePath(selectedGame, "community")}
              className="hover:text-[#efedf1]"
            >
              Community
            </Link>
          </nav>

          <nav
            aria-label="Meta"
            className="flex-1 min-w-[140px] flex flex-col gap-3 text-[14px] text-[#aea6a8]"
          >
            <Link
              to={gamePath(selectedGame, "meta")}
              className="hover:text-[#efedf1]"
            >
              Meta overview
            </Link>
            <Link
              to={weaponMetaListPath(selectedGame)}
              className="hover:text-[#efedf1]"
            >
              Weapon breakdown
            </Link>
            <Link
              to={attachmentMetaListPath(selectedGame)}
              className="hover:text-[#efedf1]"
            >
              Attachment breakdown
            </Link>
          </nav>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-x-8 gap-y-4 border-t border-white/[0.08] pt-5 text-[14px] text-[#aea6a8]">
          <nav aria-label="Social" className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 hover:text-[#efedf1]"
            >
              <InstagramIcon
                size={16}
                color="currentColor"
                aria-hidden="true"
              />
              Instagram
            </Link>
            <span aria-hidden="true">·</span>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 hover:text-[#efedf1]"
            >
              <TiktokIcon size={16} color="currentColor" aria-hidden="true" />
              TikTok
            </Link>
            <span aria-hidden="true">·</span>
            <a
              href="https://www.youtube.com/@loadoutize"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-[#efedf1]"
            >
              <YoutubeIcon size={16} color="currentColor" aria-hidden="true" />
              YouTube
            </a>
          </nav>
          <nav aria-label="Legal" className="flex items-center gap-x-6 gap-y-2">
            <Link to="/privacy" className="hover:text-[#efedf1]">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-[#efedf1]">
              Terms of Service
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
