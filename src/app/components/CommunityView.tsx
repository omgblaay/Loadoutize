import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { AppLayout, useGameName } from "./AppLayout";
import { Tag } from "./ui/tag";
import { RatingRing } from "./ui/rating-ring";
import { NavIcon } from "./ui/nav-icon-3d";
import { Users } from "lucide-react";
import { FilterPill, FilterPillGroup } from "./ui/filter-pill";
import { Skeleton } from "./ui/skeleton";
import { cn } from "./ui/utils";
import { ROLE_TAG_META, ROLE_TAG_ORDER, type RoleTag } from "../utils/roles";
import { CompactPageHeader } from "./ui/compact-page-header";
import { SOCIAL_LINK_FIELDS, type SocialLinks, type SocialPlatform } from "../utils/social";

interface LoadoutSummary {
  userId: string;
  authorNickname: string | null;
  authorAvatarUrl: string | null;
  authorRoleTag: RoleTag | null;
  authorLinks: SocialLinks | null;
  userName: string;
  ratingPercent: number | null;
}

interface Member {
  userId: string;
  nickname: string;
  name: string;
  avatarUrl: string | null;
  roleTag: RoleTag;
  links: SocialLinks | null;
  loadoutCount: number;
  avgRating: number | null;
}

const SOCIAL_PLATFORMS = SOCIAL_LINK_FIELDS.map((f) => f.key);
function isSocialPlatform(value: string): value is SocialPlatform {
  return (SOCIAL_PLATFORMS as string[]).includes(value);
}

// A loadout with <3 votes has a null ratingPercent (mapLoadout's own
// "not enough data" sentinel) -- excluded here rather than counted as 0, same
// rule MetaView already applies when averaging weapon ratings.
function average(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function CommunityViewSkeleton() {
  const block = "bg-white/[0.06]";

  return (
    <>
      <div className="flex flex-col gap-2">
        <Skeleton className={cn("h-9 w-48", block)} />
        <Skeleton className={cn("h-4 w-72 max-w-full", block)} />
      </div>

      <Skeleton className={cn("h-9 w-96 max-w-full rounded-xl", block)} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-white/[0.08] bg-card p-4 flex items-center gap-4">
            <Skeleton className={cn("w-14 h-14 rounded-2xl shrink-0", block)} />
            <div className="flex-1 flex flex-col gap-2">
              <Skeleton className={cn("h-4 w-24", block)} />
              <Skeleton className={cn("h-3 w-16", block)} />
            </div>
            <Skeleton className={cn("w-12 h-12 rounded-full shrink-0", block)} />
          </div>
        ))}
      </div>
    </>
  );
}

export function CommunityView() {
  const { gameId: selectedGame = "mw4" } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { name: gameName } = useGameName(selectedGame);

  const [loadouts, setLoadouts] = useState<LoadoutSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<RoleTag | "all">("all");
  // Seeded from ?social=<platform> (e.g. the streamer icons on the homepage
  // link here) so landing on this page already shows only creators who have
  // that platform linked -- not kept in sync with the URL afterward, same as
  // roleFilter.
  const [socialFilter, setSocialFilter] = useState<SocialPlatform | "all">(() => {
    const param = searchParams.get("social");
    return param && isSocialPlatform(param) ? param : "all";
  });

  useEffect(() => {
    setLoading(true);
    fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${selectedGame}/loadouts`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    })
      .then((r) => r.json())
      .then((data) => setLoadouts(data.loadouts ?? []))
      .catch((error) => console.error("Error fetching community data:", error))
      .finally(() => setLoading(false));
  }, [selectedGame]);

  // Only authors with at least one public loadout can appear here -- there's
  // no other endpoint to enumerate "all users" from, and a roster of accounts
  // that have never posted isn't the point of this page anyway.
  const byUser = new Map<string, LoadoutSummary[]>();
  for (const l of loadouts) {
    if (!l.userId) continue;
    (byUser.get(l.userId) ?? byUser.set(l.userId, []).get(l.userId)!).push(l);
  }

  const members: Member[] = [...byUser.entries()].map(([userId, userLoadouts]) => {
    const first = userLoadouts[0];
    const rated = userLoadouts.filter((l) => l.ratingPercent != null);
    return {
      userId,
      nickname: first.authorNickname ?? first.userName,
      name: first.userName,
      avatarUrl: first.authorAvatarUrl,
      roleTag: first.authorRoleTag ?? "player",
      links: first.authorLinks ?? null,
      loadoutCount: userLoadouts.length,
      avgRating: rated.length > 0 ? Math.round(average(rated.map((l) => l.ratingPercent as number))) : null,
    };
  });

  const filtered = members
    .filter((m) => roleFilter === "all" || m.roleTag === roleFilter)
    .filter((m) => socialFilter === "all" || !!m.links?.[socialFilter]);
  const sorted = [...filtered].sort((a, b) => {
    if (a.avgRating == null && b.avgRating == null) return b.loadoutCount - a.loadoutCount;
    if (a.avgRating == null) return 1;
    if (b.avgRating == null) return -1;
    return b.avgRating - a.avgRating;
  });

  if (loading) {
    return (
      <AppLayout selectedGame={selectedGame} onGameSelect={(id) => navigate(`/${id}/community`)}>
        <CommunityViewSkeleton />
      </AppLayout>
    );
  }

  return (
    <AppLayout selectedGame={selectedGame} onGameSelect={(id) => navigate(`/${id}/community`)}>
      <div>
        <h1 className="text-3xl font-semibold flex items-center gap-3">
          <NavIcon icon="community" flat={<Users className="w-7 h-7" />} active hovered={false} size={32} />
          Community
        </h1>
        <p className="text-[#8d898a] text-sm">
          Loadout creators for {gameName}, filtered by who they are and ranked by their average rating.
        </p>
      </div>
      <CompactPageHeader
        title={
          <span className="flex items-center gap-2">
            <NavIcon icon="community" flat={<Users className="w-4 h-4" />} active hovered={false} size={18} />
            Community
          </span>
        }
      />

      <FilterPillGroup type="single" value={roleFilter} onValueChange={(v) => v && setRoleFilter(v as RoleTag | "all")}>
        <FilterPill value="all">All</FilterPill>
        {ROLE_TAG_ORDER.map((tag) => (
          <FilterPill key={tag} value={tag}>
            {ROLE_TAG_META[tag].label}
          </FilterPill>
        ))}
      </FilterPillGroup>

      <FilterPillGroup
        type="single"
        value={socialFilter}
        onValueChange={(v) => v && setSocialFilter(v as SocialPlatform | "all")}
      >
        <FilterPill value="all">All platforms</FilterPill>
        {SOCIAL_LINK_FIELDS.map(({ key, label, icon: Icon }) => (
          <FilterPill key={key} value={key} className="gap-1.5">
            <Icon size={14} />
            {label}
          </FilterPill>
        ))}
      </FilterPillGroup>

      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-16 text-center">
          <p className="text-[#8d898a]">
            {members.length === 0
              ? `No loadout creators for ${gameName} yet.`
              : "No one matches these filters yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {sorted.map((member) => (
            <Link
              key={member.userId}
              to={`/u/${member.nickname}`}
              className="rounded-2xl border border-white/[0.08] bg-card hover:border-white/20 hover:bg-[#1a161a] transition-all p-4 flex items-center gap-4"
            >
              <div className="w-14 h-14 rounded-2xl border border-white/10 overflow-hidden flex items-center justify-center shrink-0 bg-white/[0.04]">
                {member.avatarUrl ? (
                  <img src={member.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg font-semibold text-[#fafafa]">{member.name?.[0]?.toUpperCase() ?? "U"}</span>
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <p className="text-[15px] font-semibold text-[#fafafa] truncate">{member.name}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Tag>{ROLE_TAG_META[member.roleTag].label}</Tag>
                  <span className="text-[12px] text-[#8d898a] font-mono inline-flex items-center h-6 px-2 rounded-full bg-[#171417]">
                    {member.loadoutCount} loadout{member.loadoutCount !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              <RatingRing
                percent={member.avgRating}
                size={48}
                innerClassName="border border-white/5"
                labelClassName={member.avgRating == null ? "text-[9px] text-teritary" : "text-[11px] text-[#fafafa]"}
                fallbackLabel="New"
              />
            </Link>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
