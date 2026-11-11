import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { useAuth } from "@/providers/AuthProvider";
import { AppLayout } from "@/components/templates/AppLayout";
import { getGameColor } from "@/lib/gameColors";
import {
  gameMeta,
  GAME_ORDER,
  GAME_SELECTOR_ENABLED,
  LOCKED_GAME_ID,
} from "@/lib/games";
import { LoadoutCard } from "@/components/organisms/LoadoutCard";
import type {
  CardLoadout,
  CardWeapon,
  CardAttachment,
  CardTag,
} from "@/types/loadout";
import { Button } from "@/components/atoms/Button";
import { Skeleton } from "@/components/atoms/Skeleton";
import { cn } from "@/lib/utils";
import { visibleWeaponCatalog } from "@/lib/weaponCategories";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Settings as SettingsIcon, Download, Search } from "lucide-react";
import { Input } from "@/components/atoms/Input";
import {
  QRCodeCanvas,
  generateBrandedQRPng,
} from "@/components/molecules/QRCode";
import {
  SOCIAL_LINK_FIELDS,
  formatCount,
  type SocialLinks,
  type SocialStats,
} from "@/lib/social";
import { Tag } from "@/components/atoms/Tag";
import { ROLE_TAG_META, type RoleTag } from "@/lib/roles";
import { Container } from "@/components/atoms/Container";
import { explorePath, loadoutPath } from "@/lib/routes";
import { ResponsiveDialog } from "@/components/molecules/ResponsiveDialog";
import { WeaponPreviewSmoke } from "@/components/molecules/WeaponPreviewSmoke";

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
    <div className="flex flex-col">
      {/* Profile hero */}
      <Container>
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
      </Container>

      {/* Loadouts */}
      <div className="flex flex-col gap-4">
        <Skeleton className={cn("h-5 w-28", block)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
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
  const [qrOpen, setQrOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredLoadouts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return loadouts;
    return loadouts.filter((l) => {
      const catalog = catalogs[l.gameId];
      const weaponName =
        catalog?.weapons.find((w) => w.id === l.weapons[0]?.id)?.name ?? "";
      const tagName = catalog?.tags.find((t) => t.id === l.tagId)?.name ?? "";
      return [l.name, weaponName, tagName].some((value) =>
        value.toLowerCase().includes(query),
      );
    });
  }, [loadouts, catalogs, search]);

  useEffect(() => {
    if (nickname) fetchProfile();
  }, [nickname]);

  const fetchProfile = async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/users/${nickname}`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } },
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
          const [loadoutsRes, weaponsRes, attachmentsRes, tagsRes] =
            await Promise.all([
              fetch(
                `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/loadouts`,
                {
                  headers: { Authorization: `Bearer ${publicAnonKey}` },
                },
              ).then((r) => r.json()),
              fetch(
                `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/weapons`,
                {
                  headers: { Authorization: `Bearer ${publicAnonKey}` },
                },
              ).then((r) => r.json()),
              fetch(
                `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/attachments`,
                {
                  headers: { Authorization: `Bearer ${publicAnonKey}` },
                },
              ).then((r) => r.json()),
              fetch(
                `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/tags`,
                {
                  headers: { Authorization: `Bearer ${publicAnonKey}` },
                },
              ).then((r) => r.json()),
            ]);
          return {
            gameId,
            loadouts: (loadoutsRes.loadouts ?? []).filter(
              (l: Loadout) =>
                l.userId === userId && l.contentType !== "full_loadout",
            ),
            catalog: {
              weapons: visibleWeaponCatalog<CardWeapon>(
                weaponsRes.weapons ?? [],
              ),
              attachments: attachmentsRes.attachments ?? [],
              tags: tagsRes.tags ?? [],
            } as GameCatalog,
          };
        }),
      );

      setLoadouts(
        results
          .flatMap((r) => r.loadouts)
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ),
      );
      setCatalogs(
        Object.fromEntries(results.map((r) => [r.gameId, r.catalog])),
      );
    } catch (error) {
      console.error("Error fetching user loadouts:", error);
    }
  };

  usePageTitle(
    profile
      ? `${profile.name} (@${profile.nickname}) • Loadoutize`
      : "Loadoutize • Profile",
  );

  const isOwnProfile = user?.id === profile?.id;
  const profileUrl = profile
    ? `${window.location.origin}/u/${profile.nickname}`
    : "";

  const downloadBrandedQr = async () => {
    const dataUrl = await generateBrandedQRPng(
      profileUrl,
      240,
      "Scan to view this profile",
    );
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${profile?.nickname ?? "profile"}-qr.png`;
    a.click();
  };

  if (loading) {
    return (
      <AppLayout
        selectedGame={LOCKED_GAME_ID}
        onGameSelect={(id) => navigate(explorePath(id))}
      >
        <UserPageSkeleton />
      </AppLayout>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0909] flex-col gap-4">
        <p className="text-[#efedf1] text-xl">User not found.</p>
        <Button onClick={() => navigate("/home")}>Back to Home</Button>
      </div>
    );
  }

  return (
    <AppLayout
      selectedGame={LOCKED_GAME_ID}
      onGameSelect={(id) => navigate(explorePath(id))}
    >
      <div className="flex flex-col gap-6">
        {/* Profile hero */}
        <Container className="relative isolate overflow-hidden border-0">
          <WeaponPreviewSmoke />
          <div className="relative z-[1] flex flex-col items-center gap-4 py-4 text-center">
            <div className="flex size-28 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] sm:size-36">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <span className="text-3xl">
                  {profile.name?.[0]?.toUpperCase() ?? "U"}
                </span>
              )}
            </div>
            <div className="flex flex-col items-center gap-2">
              <h1 className="text-3xl">{profile.name}</h1>
              <div className="flex items-center gap-3">
                <p className="text-md text-secondary">@{profile.nickname}</p>
                <Tag>{ROLE_TAG_META[profile.roleTag]?.label ?? "Player"}</Tag>
              </div>
            </div>

            {SOCIAL_LINK_FIELDS.some(({ key }) => profile.links[key]) && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                {SOCIAL_LINK_FIELDS.filter(({ key }) => profile.links[key]).map(
                  ({ key, label, icon: Icon, url }) => {
                    const count = formatCount(profile.socialStats?.[key]);
                    return (
                      <Button
                        key={key}
                        onClick={() =>
                          window.open(url(profile.links[key]!), "_blank")
                        }
                        variant="ghost"
                        rel="noopener noreferrer"
                        aria-label={label}
                        tooltip={
                          <>
                            {label}:{" "}
                            <span className="text-teritary">
                              @{profile.links[key]}
                            </span>
                          </>
                        }
                        className="gap-2 px-1 !max-w-20"
                      >
                        <Icon className="size-6" />
                        <span className="text-xs text-teritary font-mono">
                          {count ?? "—"}
                        </span>
                      </Button>
                    );
                  },
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3">
              {isOwnProfile && (
                <Button
                  onClick={() => navigate("/settings")}
                  size="sm"
                  variant="outline"
                >
                  <SettingsIcon className="w-4 h-4" />
                  Edit profile
                </Button>
              )}
              <button
                type="button"
                onClick={() => setQrOpen(true)}
                aria-label={`Open QR code for @${profile.nickname}`}
                className="group flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.04] px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-secondary transition-colors hover:border-white/40 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <QRCodeCanvas
                  value={profileUrl}
                  size={40}
                  className="size-10"
                />
                <span className="group-hover:text-white">QR code</span>
              </button>
            </div>
          </div>
        </Container>

        <ResponsiveDialog
          open={qrOpen}
          onOpenChange={setQrOpen}
          title={
            isOwnProfile
              ? "Your profile QR code"
              : `${profile.name}'s profile QR code`
          }
        >
          <div className="flex flex-col items-center gap-5 pt-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <QRCodeCanvas value={profileUrl} size={208} className="size-52" />
            </div>
            <div className="w-full text-center">
              <p className="text-sm text-secondary">
                {isOwnProfile
                  ? "Share this code to open your profile."
                  : `Scan this code to open @${profile.nickname}'s profile.`}
              </p>
              <p className="mt-2 break-all text-xs text-teritary">
                {profileUrl}
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={downloadBrandedQr}
            >
              <Download className="size-4" />
              {isOwnProfile
                ? "Download your QR code"
                : "Download QR code for this profile"}
            </Button>
          </div>
        </ResponsiveDialog>

        {/* Loadouts */}
        <div className="flex flex-col gap-4">
          <div className="flex gap-4 sm:items-center sm:justify-between">
            <h2 className="text-[16px] font-semibold">
              weapon config{loadouts.length !== 1 ? "s" : ""}
              <span className="text-sm ml-2 inline-flex font-mono h-8 w-8 items-center rounded-full justify-center bg-[#171417] text-teritary ">
                {search.trim()
                  ? `${filteredLoadouts.length}/${loadouts.length}`
                  : loadouts.length}
              </span>
            </h2>
            <div>
              <Input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, weapon or tag"
                aria-label="Search weapon configs"
                icon={<Search className="size-4 text-teritary" />}
                className="h-11 !w-auto"
              />
            </div>
          </div>
          {loadouts.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-16 text-center">
              <p className="text-[#8d898a]">No weapon configs published yet.</p>
            </div>
          ) : filteredLoadouts.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-16 text-center">
              <p className="text-[#8d898a]">
                No weapon configs match “{search.trim()}”.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredLoadouts.map((l, i) => {
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
                    to={loadoutPath(
                      l.gameId,
                      l.id,
                      l.contentType ?? "weapon_config",
                    )}
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
