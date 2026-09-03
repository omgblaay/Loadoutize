import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { useAuth } from "./AuthContext";
import { AppLayout } from "./AppLayout";
import { getGameColor } from "../utils/gameColors";
import { gameMeta, GAME_ORDER, GAME_SELECTOR_ENABLED, LOCKED_GAME_ID } from "../utils/games";
import { LoadoutCard, type CardLoadout, type CardWeapon, type CardAttachment, type CardTag } from "./ui/LoadoutCard";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { cn } from "./ui/utils";
import { usePageTitle } from "../hooks/usePageTitle";
import { Settings as SettingsIcon } from "lucide-react";
import { SOCIAL_LINK_FIELDS, formatCount, type SocialLinks, type SocialStats } from "../utils/social";
import { Tag } from "./ui/tag";
import { ROLE_TAG_META, type RoleTag } from "../utils/roles";
import { Container } from "./ui/container";

interface Loadout extends CardLoadout {
  gameId: string;
  userId: string;
  createdAt: string;
}

interface Profile {
  id: string;
  nickname: string;
  name: string;
  avatarUrl: string | null;
  roleTag: RoleTag;
  links: SocialLinks;
  socialStats?: SocialStats | null;
}

interface GameCatalog {
  weapons: CardWeapon[];
  attachments: CardAttachment[];
  tags: CardTag[];
}

const GAMES_TO_LOAD = GAME_SELECTOR_ENABLED ? GAME_ORDER : [LOCKED_GAME_ID];

function UserPageSkeleton() {
  const block = "bg-white/[0.06]";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,320px)_1fr] gap-6 items-start">
      {/* Profile hero */}
      <div className="bg-[#121111] border border-[#201e1f] rounded-3xl p-6 flex flex-col gap-5">
        <div className="flex flex-col items-center text-center gap-3">
          <Skeleton className={cn("w-24 h-24 rounded-2xl", block)} />
          <div className="flex flex-col items-center gap-2">
            <Skeleton className={cn("h-5 w-32", block)} />
            <Skeleton className={cn("h-4 w-20", block)} />
          </div>
        </div>
        <div className="flex items-start justify-center gap-2 flex-wrap">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className={cn("w-14 h-14 rounded-xl", block)} />
          ))}
        </div>
        <div className="h-px w-full bg-white/[0.07]" />
        <div className="flex justify-center w-full">
          <Skeleton className={cn("h-9 w-32 rounded-md", block)} />
        </div>
      </div>

      {/* Loadouts */}
      <div className="flex flex-col gap-4">
        <Skeleton className={cn("h-5 w-28", block)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className={cn("rounded-2xl h-[220px]", block)} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function UserPage() {
  const { nickname } = useParams<{ nickname: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadouts, setLoadouts] = useState<Loadout[]>([]);
  const [catalogs, setCatalogs] = useState<Record<string, GameCatalog>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (nickname) fetchProfile();
  }, [nickname]);

  const fetchProfile = async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/users/${nickname}`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      if (!response.ok) {
        setNotFound(true);
        setProfile(null);
        return;
      }
      const { profile: found } = await response.json();
      setProfile(found);
      await fetchUserContent(found.id);
    } catch (error) {
      console.error("Error fetching profile:", error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserContent = async (userId: string) => {
    try {
      const results = await Promise.all(
        GAMES_TO_LOAD.map(async (gameId) => {
          const [loadoutsRes, weaponsRes, attachmentsRes, tagsRes] = await Promise.all([
            fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/loadouts`, {
              headers: { Authorization: `Bearer ${publicAnonKey}` },
            }).then((r) => r.json()),
            fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/weapons`, {
              headers: { Authorization: `Bearer ${publicAnonKey}` },
            }).then((r) => r.json()),
            fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/attachments`, {
              headers: { Authorization: `Bearer ${publicAnonKey}` },
            }).then((r) => r.json()),
            fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/tags`, {
              headers: { Authorization: `Bearer ${publicAnonKey}` },
            }).then((r) => r.json()),
          ]);
          return {
            gameId,
            loadouts: (loadoutsRes.loadouts ?? []).filter((l: Loadout) => l.userId === userId),
            catalog: {
              weapons: weaponsRes.weapons ?? [],
              attachments: attachmentsRes.attachments ?? [],
              tags: tagsRes.tags ?? [],
            } as GameCatalog,
          };
        })
      );

      setLoadouts(
        results
          .flatMap((r) => r.loadouts)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      );
      setCatalogs(Object.fromEntries(results.map((r) => [r.gameId, r.catalog])));
    } catch (error) {
      console.error("Error fetching user loadouts:", error);
    }
  };

  usePageTitle(profile ? `${profile.name} (@${profile.nickname}) • Loadoutize` : "Loadoutize • Profile");

  const isOwnProfile = user?.id === profile?.id;

  if (loading) {
    return (
      <AppLayout selectedGame={LOCKED_GAME_ID} onGameSelect={(id) => navigate(`/${id}/explore`)}>
        <UserPageSkeleton />
      </AppLayout>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0909] flex-col gap-4">
        <p className="text-[#efedf1] text-xl">User not found.</p>
        <Button onClick={() => navigate("/")} className="h-11 px-5 rounded-xl bg-[#fafafa] text-[#161414] font-medium">
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <AppLayout
      selectedGame={LOCKED_GAME_ID}
      onGameSelect={(id) => navigate(`/${id}/explore`)}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,320px)_1fr] gap-6 items-start">
        {/* Profile hero */}
        <Container className="bg-[#121111] border border-[#201e1f] rounded-3xl p-6 flex flex-col gap-5">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-24 h-24 rounded-2xl border border-white/10 overflow-hidden flex items-center justify-center shrink-0 bg-white/[0.04]">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-semibold text-[#fafafa]">
                  {profile.name?.[0]?.toUpperCase() ?? "U"}
                </span>
              )}
            </div>
            <div className="flex flex-col items-center gap-1">
              <h1 className="text-xl font-semibold text-[#efedf1]">{profile.name}</h1>
              <p className="text-[14px] text-[#8d898a]">@{profile.nickname}</p>
              <Tag>{ROLE_TAG_META[profile.roleTag]?.label ?? "Player"}</Tag>
            </div>
          </div>

          {SOCIAL_LINK_FIELDS.some(({ key }) => profile.links[key]) && (
            <div className="flex items-start justify-center gap-1 flex-wrap">
              {SOCIAL_LINK_FIELDS.filter(({ key }) => profile.links[key]).map(({ key, label, icon: Icon, url }) => {
                const count = formatCount(profile.socialStats?.[key]);
                return (
                  <Button
                    key={key}
                    onClick={() => window.open(url(profile.links[key]!), "_blank")}
                    variant="ghost"
                    rel="noopener noreferrer"
                    aria-label={label}
                    tooltip={
                      <>
                        {label}: <span className="text-teritary">@{profile.links[key]}</span>
                      </>
                    }
                    className="flex-col gap-1 px-1 !max-w-10"
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[10px] text-[#8d898a] font-mono">{count ?? "—"}</span>
                  </Button>
                );
              })}
            </div>
          )}

          <div className="h-px w-full bg-white/[0.07]" />
          <div className="flex justify-center  w-full ">


          {isOwnProfile && (
            <Button onClick={() => navigate("/settings")} size="sm" variant="outline">
              <SettingsIcon className="w-4 h-4" />
              Edit profile
            </Button>
          )}
          </div>
        </Container>

        {/* Loadouts */}
        <div className="flex flex-col gap-4">
          <h2 className="text-[16px] text-[#fafafa] font-semibold">loadout{loadouts.length !== 1 ? "s" : ""}        
            <span className="text-sm ml-2 inline-flex font-mono h-8 w-8 items-center rounded-full justify-center bg-[#171417] text-teritary ">{loadouts.length} </span></h2>
          {loadouts.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-16 text-center">
              <p className="text-[#8d898a]">No loadouts published yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {loadouts.map((l, i) => {
                const catalog = catalogs[l.gameId];
                const meta = gameMeta[l.gameId] ?? gameMeta.mw4;
                const accent = getGameColor(l.gameId).primary;
                return (
                  <LoadoutCard
                    key={l.id}
                    loadout={l}
                    weapons={catalog?.weapons ?? []}
                    attachments={catalog?.attachments ?? []}
                    tags={catalog?.tags ?? []}
                    accent={accent}
                    gameShort={meta.short}
                    index={i}
                    to={`/${l.gameId}/l/${l.id}`}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
