import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { getGameColor } from "@/lib/gameColors";
import { gameMeta } from "@/lib/games";
import { useAuth } from "@/providers/AuthProvider";
import { AppLayout } from "@/components/templates/AppLayout";
import { useGameName } from "@/hooks/useGameName";
import { Button } from "@/components/atoms/Button";
import { Container } from "@/components/atoms/Container";
import { QRCodeCanvas, generatePlainQRPng, generateBrandedQRPng } from "@/components/molecules/QRCode";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/molecules/DropdownMenu";
import { WeaponImage, type WeaponImageBadge } from "@/components/molecules/WeaponImage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/molecules/Dialog";
import { SHOWCASE_SLIDES } from "@/lib/showcaseSlides";
import { LoadoutWall } from "@/components/organisms/LoadoutWall";
import type { CardWeapon, CardTag, CardAttachment } from "@/components/organisms/LoadoutCard";
import { Tag } from "@/components/atoms/Tag";
import { BreadcrumbLink, BreadcrumbSpacer } from "@/components/molecules/Breadcrumb";
import { ReactionButton } from "@/components/molecules/ReactionButton";
import { RatingRing } from "@/components/atoms/RatingRing";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Skeleton } from "@/components/atoms/Skeleton";
import { cn } from "@/lib/utils";
import { CompactPageHeader } from "@/components/molecules/CompactPageHeader";
import { VIDEO_PLATFORM_META, type LoadoutVideo } from "@/lib/video";
import { SOCIAL_LINK_FIELDS, formatCount, type SocialLinks, type SocialStats } from "@/lib/social";
import { explorePath } from "@/lib/routes";
import { ExternalLink } from "lucide-react";
import {
  Edit,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  Download,
  ChevronDown,
  Puzzle,
  Copy,
  Check,
} from "lucide-react";
import * as React from "react";

interface Weapon {
  id: string;
  attachments?: Record<string, string>;
}

interface Loadout {
  id: string;
  gameId: string;
  userId: string;
  userName: string;
  authorNickname?: string | null;
  authorAvatarUrl?: string | null;
  authorLinks?: SocialLinks | null;
  authorSocialStats?: SocialStats | null;
  name: string;
  description?: string;
  gameLoadoutCode?: string | null;
  video?: LoadoutVideo | null;
  weapons: Weapon[];
  perks?: string[];
  equipment?: string[];
  likes: number;
  dislikes: number;
  favorites: number;
  score: number;
  ratingPercent: number | null;
  liked: boolean;
  disliked: boolean;
  favorited: boolean;
  views: number;
  createdAt: string;
  tagId?: number | null;
  
}



type ReactionType = "like" | "dislike" | "favorite";

function LoadoutPreviewSkeleton() {
  const block = "bg-white/[0.06]";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* Weapon build */}
      <Container>
        <div className="flex items-center gap-4">
          <Skeleton className={cn("w-16 h-16 rounded-full shrink-0", block)} />
          <Skeleton className={cn("h-6 w-3/4", block)} />
        </div>
        <div className="flex flex-col items-center gap-2 py-4">
          <Skeleton className={cn("w-full h-[220px] rounded-xl", block)} />
        </div>
        <div className="flex flex-col w-full gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-3 border-b border-white/5 w-full">
              <Skeleton className={cn("w-6 h-6 rounded-md shrink-0", block)} />
              <Skeleton className={cn("h-4 flex-1", block)} />
            </div>
          ))}
        </div>
      </Container>

      <div className="flex flex-col gap-4">
        {/* Description, reactions, author -- one merged info panel now */}
        <Container className="">
          <div className="flex flex-col gap-3 pb-5">
            <Skeleton className={cn("h-3 w-24", block)} />
            <Skeleton className={cn("h-4 w-full", block)} />
            <Skeleton className={cn("h-4 w-2/3", block)} />
            <div className="flex items-center w-full gap-2 pt-2">
              <Skeleton className={cn("h-11 flex-1 rounded-xl", block)} />
              <Skeleton className={cn("h-11 flex-1 rounded-xl", block)} />
            </div>
          </div>

          <div className="flex flex-wrap items-center text-sm gap-4 py-5">
            <Skeleton className={cn("w-20 h-20 rounded-lg shrink-0", block)} />
            <div className="flex flex-col gap-2">
              <Skeleton className={cn("h-4 w-32", block)} />
              <Skeleton className={cn("h-8 w-40", block)} />
            </div>
          </div>
        </Container>

        {/* Share */}
        <Container className="flex flex-row items-center gap-4">
          <Skeleton className={cn("w-[104px] h-[104px] shrink-0", block)} />
          <div className="flex-1 min-w-[200px] flex flex-col gap-3">
            <Skeleton className={cn("h-3 w-28", block)} />
            <Skeleton className={cn("h-3 w-full", block)} />
            <Skeleton className={cn("h-9 w-32 rounded-xl", block)} />
          </div>
        </Container>
      </div>
    </div>
  );
}

export function LoadoutPreview() {
  const { gameId = "mw4", loadoutId } = useParams<{ gameId: string; loadoutId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, accessToken } = useAuth();
  const [loadout, setLoadout] = useState<Loadout | null>(null);
  const [catalogWeapons, setCatalogWeapons] = useState<CardWeapon[]>([]);
  const [catalogAttachments, setCatalogAttachments] = useState<CardAttachment[]>([]);
  const [catalogTags, setCatalogTags] = useState<CardTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [codeCopied, setCodeCopied] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  useEffect(() => {
    if (gameId && loadoutId) {
      fetchLoadout();
    }
    // accessToken starts undefined and resolves after AuthContext loads --
    // refetch once it settles so liked/disliked/favorited reflect this viewer.
  }, [gameId, loadoutId, accessToken]);

  useEffect(() => {
    if (gameId && loadoutId) {
      incrementViews();
    }
  }, [gameId, loadoutId]);

  useEffect(() => {
    fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/weapons`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    })
      .then((r) => r.json())
      .then((data) => setCatalogWeapons(data.weapons ?? []))
      .catch((error) => console.error("Error fetching weapons:", error));

    fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/attachments`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    })
      .then((r) => r.json())
      .then((data) => setCatalogAttachments(data.attachments ?? []))
      .catch((error) => console.error("Error fetching attachments:", error));

    fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/tags`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    })
      .then((r) => r.json())
      .then((data) => setCatalogTags(data.tags ?? []))
      .catch((error) => console.error("Error fetching tags:", error));
  }, [gameId]);

  const fetchLoadout = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/loadouts`,
        { headers: { Authorization: `Bearer ${accessToken ?? publicAnonKey}` } }
      );
      const data = await response.json();
      const found = data.loadouts?.find((l: any) => l.id === loadoutId);
      if (found) setLoadout(found);
    } catch (error) {
      console.error("Error fetching loadout:", error);
    } finally {
      setLoading(false);
    }
  };

  const incrementViews = async () => {
    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/loadouts/${loadoutId}/view`,
        { method: "POST", headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
    } catch (error) {
      console.error("Error incrementing views:", error);
    }
  };

  /** Performs the reaction toggle and resolves to whether `type` is now active, for ReactionButton's success animation. */
  const react = async (type: ReactionType): Promise<boolean> => {
    if (!accessToken) {
      setAuthModalOpen(true);
      return false;
    }
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/loadouts/${loadoutId}/react`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ type }),
        }
      );
      if (!response.ok) return false;
      const { loadout: updated } = await response.json();
      setLoadout(updated);
      return type === "like" ? updated.liked : type === "dislike" ? updated.disliked : updated.favorited;
    } catch (error) {
      console.error("Error reacting to loadout:", error);
      return false;
    }
  };

  const deleteLoadout = async () => {
    if (!accessToken) return;
    if (!confirm("Delete this loadout? This can't be undone.")) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/loadouts/${loadoutId}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (response.ok) {
        navigate(explorePath(gameId));
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete loadout");
      }
    } catch (error) {
      console.error("Error deleting loadout:", error);
    }
  };

  const triggerDownload = (dataUrl: string, suffix: string) => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${loadoutId}-qr-${suffix}.png`;
    a.click();
  };

  const downloadBrandedQr = async () => {
    triggerDownload(await generateBrandedQRPng(shareUrl), "branded");
  };

  const downloadPlainQr = async () => {
    triggerDownload(await generatePlainQRPng(shareUrl, "#000000"), "black");
  };

  const copyGameLoadoutCode = () => {
    if (!loadout?.gameLoadoutCode) return;
    navigator.clipboard.writeText(loadout.gameLoadoutCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const meta = gameMeta[gameId] ?? gameMeta.mw4;
  const { game: activeGame } = useGameName(gameId);
  const accent = getGameColor(gameId).primary;

  const primaryWeapon = loadout?.weapons?.[0];
  const titleWeapon = catalogWeapons.find((w) => w.id === primaryWeapon?.id);
  const titleTag = loadout?.tagId != null ? catalogTags.find((t) => t.id === loadout.tagId) : undefined;
  usePageTitle(
    loadout ? [titleTag?.name, titleWeapon?.name, loadout.name].filter(Boolean).join(" • ") : undefined
  );

  const attachmentIndex = React.useMemo(
    () => new Map(catalogAttachments.map((a) => [`${a.type}:${a.name}`, a])),
    [catalogAttachments]
  );

  const primaryAttachments = React.useMemo(() => {
    if (!primaryWeapon?.attachments) return [];

    return Object.entries(primaryWeapon.attachments).map(([slot, value]) => {
      const attachment = attachmentIndex.get(`${slot}:${value}`);
      return {
        key: slot,
        typeSlug: attachment?.typeSlug || slot,
        label: value,
        iconUrl: attachment?.imageUrl ?? null,
      } satisfies WeaponImageBadge;
    });
  }, [primaryWeapon, attachmentIndex]);

  if (loading) {
    return (
      <AppLayout selectedGame={gameId} onGameSelect={(id) => navigate(explorePath(id))}>
        <LoadoutPreviewSkeleton />
      </AppLayout>
    );
  }

  if (!loadout) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0909] flex-col gap-4">
        <p className="text-xl">Loadout not found.</p>
        <Button
          onClick={() => navigate(explorePath(gameId))}
        >
          Back to Explore
        </Button>
      </div>
    );
  }

  const canEdit = user?.id === loadout.userId;
  const primaryWeaponCatalog = catalogWeapons.find((w) => w.id === primaryWeapon?.id);
  const primaryWeaponImage = primaryWeaponCatalog?.imageUrl ?? null;
  const primaryWeaponBadges = Object.entries(primaryWeapon?.attachments ?? {})
    .map(([slot, value]) => {
      const attachment = catalogAttachments.find((a) => a.type === slot && a.name === value);
      if (!attachment) return null;
      return {
        key: slot,
        typeSlug: attachment.typeSlug || slot,
        label: attachment.name,
        iconUrl: attachment.imageUrl,
      } satisfies WeaponImageBadge;
    })
    .filter((b) => b !== null);
  const shareUrl = window.location.href;

  return (
    <AppLayout
      selectedGame={gameId}
      onGameSelect={(id) => navigate(explorePath(id))}
      breadcrumb={
        <>
          <BreadcrumbLink to={explorePath(gameId)}>
            {activeGame?.logoUrl ? (
              <img src={activeGame.logoUrl} alt="" className="w-10 h-10 object-contain shrink-0" />
            ) : (
              <meta.icon className="w-4 h-4" />
            )}
          </BreadcrumbLink>
          {primaryWeaponCatalog && (
            <>
              <BreadcrumbSpacer />
              {primaryWeaponCatalog.type ? (
                <BreadcrumbLink
                  to={explorePath(gameId, { category: primaryWeaponCatalog.type })}
                >
                  {primaryWeaponCatalog.type || meta.short}
                </BreadcrumbLink>
              ) : (
                null
              )}
              <BreadcrumbSpacer />
              <BreadcrumbLink to={explorePath(gameId, { category: primaryWeaponCatalog.name })}>
                {primaryWeaponCatalog.name}
              </BreadcrumbLink>
            </>
          )}
          <BreadcrumbSpacer />
          <span className="text-base">{loadout.name}</span>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Weapon build */}
        <Container>
          <div className="flex items-center gap-4">

        <RatingRing
          percent={loadout.ratingPercent}
          size={56}
          innerClassName="border border-white/5"
          labelClassName={
            loadout.ratingPercent == null ? "text-[10px] text-teritary" : "text-[11px] text-[#fafafa]"
          }
          fallbackLabel="New"
        />
            <h1 className="text-sm antialiased sm:text-xl wrap-anywhere">

              <span style={{ color: catalogTags.find((t) => t.id === loadout.tagId)?.color }} className="font-handwritten text-2xl py-4 font-light">{catalogTags.find((t) => t.id === loadout.tagId)?.name}</span>
              {" "}
              <Tag
                color={""}
                className="inline relative top-[-5px]"
                link={
                  primaryWeaponCatalog?.type
                    ? explorePath(gameId, { category: primaryWeaponCatalog.type })
                    : undefined
                }
              >
                {primaryWeaponCatalog?.typeShort || meta.short}
              </Tag>
              <span className="font-base font-sans  text-teritary">{" "}{primaryWeaponCatalog?.name}</span>
              {" "}{loadout.name}
            </h1>

          </div>

          <CompactPageHeader
            title={loadout.name}
            actions={
              <>
                <Button variant="outline" size="sm" onClick={() => navigate(explorePath(gameId))}>
                  Back
                </Button>
                <ReactionButton
                  icon={<ThumbsUp className="w-4 h-4" />}
                  label={loadout.liked ? "Liked" : "Like"}
                  count={loadout.likes}
                  active={loadout.liked}
                  accent="#01a059"
                  onClick={() => react("like")}
                  tintIdle
                />
                <ReactionButton
                  icon={<ThumbsDown className="w-4 h-4" />}
                  label={loadout.disliked ? "Disliked" : "Dislike"}
                  count={loadout.dislikes}
                  active={loadout.disliked}
                  accent="#d00050"
                  onClick={() => react("dislike")}
                  tintIdle
                />
              </>
            }
          />

          <div className="flex flex-col items-center gap-2 py-4">
            <div
              style={{ background: `radial-gradient(ellipse at center, ${catalogTags.find((t) => t.id === loadout.tagId)?.color || null}14, transparent 70%)` }}
            >
              <WeaponImage
                imageUrl={primaryWeaponImage}
                weaponId={primaryWeapon?.id}
                badges={primaryWeaponBadges}
                activeBadgeKey={activeKey}
                onBadgeHover={setActiveKey}
              />
            </div>
          </div>
          <div className="flex items-center w-full gap-2">
            <ReactionButton
              icon={<ThumbsUp className="w-4 h-4" />}
              label={loadout.liked ? "Liked" : "Like"}
              count={loadout.likes}
              active={loadout.liked}
              accent="#01a059"
              onClick={() => react("like")}
              fillWidth
              radius={12}
              tintIdle
              className="flex-1"
            />
            <ReactionButton
              icon={<ThumbsDown className="w-4 h-4" />}
              label={loadout.disliked ? "Disliked" : "Dislike"}
              count={loadout.dislikes}
              active={loadout.disliked}
              accent="#d00050"
              onClick={() => react("dislike")}
              fillWidth
              radius={12}
              tintIdle
              className="flex-1"
            />
          </div>

          <div className="divide-y-1 divide-solid divide-white/5 w-full">
          {primaryAttachments.map((att) => {
  const isActive = activeKey === att.key;

  return (
    <button
      key={att.key}
      type="button"
      onPointerEnter={() => setActiveKey(att.key)}
      onPointerLeave={() => setActiveKey(null)}
      onFocus={() => setActiveKey(att.key)}
      onBlur={() => setActiveKey(null)}
      className={`flex items-center gap-4 py-3 px-2 -mx-2 w-full rounded-md text-left
        transition-colors duration-150
        ${isActive ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"}`}
    >
      <div className="w-6 h-6 flex items-center justify-center shrink-0 overflow-hidden">
        {att.iconUrl && (
          <img
            src={att.iconUrl}
            alt=""
            className={`w-full h-full object-contain transition-opacity duration-150
              ${isActive ? "opacity-100" : "opacity-50"}`}
          />
        )}
      </div>
      <span className="font-medium">{att.label}</span>
      <span className="text-white/20">•</span>
      <span className="text-teritary flex-1">{att.typeSlug}</span>
    </button>
  );
})}

            {/* {!primaryWeapon?.attachments &&
              (loadout.equipment ?? []).map((item, i) => (
                <div key={i} className="divide-y-4 divide-solid divide-white w-full">
                  <div className="w-6 h-6 rounded-md bg-white/[0.02] border border-white/[0.18] flex items-center justify-center shrink-0">
                    <Puzzle className="w-3.5 h-3.5 text-[#8d898a]" />
                  </div>
                  <span className="text-[14px] text-[#8d898a] flex-1">Gear</span>
                  <span className="text-[14px] text-[#fafafa] font-medium">{item}</span>
                </div>
              ))} */}

            {!primaryWeapon?.attachments && !(loadout.equipment ?? []).length && (
              <p className="text-[14px] text-[#8d898a] py-2">No build details published for this loadout.</p>
            )}

            {loadout.gameLoadoutCode && (
              <div className="flex flex-row bg-white/[0.03] h-10 rounded-lg items-center mt-4 gap-4 justify-center w-full">
                <span className="text-sm text-teritary/50">
                  In-game code:
                </span>
                <div className="flex items-center gap-2">
                  <code className="uppercase tracking-wider text-sm text-secondary">
                    {loadout.gameLoadoutCode}
                  </code>
                  <Button onClick={copyGameLoadoutCode} variant="ghost" size="sm" aria-label="Copy loadout code" className="text-sm">
                    {codeCopied ? (
                      <><Check className="size-3 text-[#01a059]" /> <span className="text-sm">Copied</span></>
                    ) : (
                      <><Copy className="size-3 text-[#fafafa]" /></>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Container>

        <div className="flex flex-col gap-4">
          {/* Description, reactions, author, in-game code, and video are all
              one info panel now instead of separate cards -- divide-y draws
              the hairline between sections (none above the first). */}
          <Container className="gap-0">
            <div className="flex flex-col gap-3 pb-5">
              {/* Author */}
              <div className="flex flex-wrap items-center text-sm gap-2">
                {(() => {
                  const avatar = (
                    <div className="w-16 h-16 rounded-lg border border-white/10 overflow-hidden flex items-center justify-center  bg-white/[0.04]">
                      {loadout.authorAvatarUrl ? (
                        <img src={loadout.authorAvatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[12px] font-semibold text-[#fafafa]">
                          {loadout.userName?.[0]?.toUpperCase() ?? "U"}
                        </span>
                      )}
                    </div>
                  );
                  return loadout.authorNickname ? (
                    <Link to={`/u/${loadout.authorNickname}`}>{avatar}</Link>
                  ) : (
                    avatar
                  );
                })()}
                <div className="flex flex-col gap-2 text-base">
                  {loadout.authorNickname ? (
                    <Link to={`/u/${loadout.authorNickname}`} className="hover:underline">
                      {loadout.userName} <span className="text-teritary">@{loadout.authorNickname}</span>
                    </Link>
                  ) : (
                    <span>{loadout.userName}</span>
                  )}
                  {loadout.authorLinks && SOCIAL_LINK_FIELDS.some(({ key }) => loadout.authorLinks![key]) && (
                    <div className="flex items-start gap-1 flex-wrap">
                      {SOCIAL_LINK_FIELDS.filter(({ key }) => loadout.authorLinks![key]).map(
                        ({ key, label, icon: Icon, url }) => {
                          const count = formatCount(loadout.authorSocialStats?.[key]);
                          return (
                            <Button key={key} asChild variant="ghost" size="sm">
                              <a
                                href={url(loadout.authorLinks![key]!)}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={label}
                              >
                                <Icon className="w-3.5 h-3.5" />
                                <span className="text-[10px] text-teritary font-mono">{count ?? "—"}</span>
                              </a>
                            </Button>
                          );
                        }
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {loadout.description && <blockquote className="text-secondary text-base">{loadout.description}</blockquote>}

            </div>

            {loadout.video && (() => {
              const platformMeta = VIDEO_PLATFORM_META[loadout.video.platform];
              const PlatformIcon = platformMeta.icon;
              // TikTok/Instagram are reels -- portrait 9:16; YouTube is landscape 16:9.
              const isPortrait = loadout.video.platform !== "youtube";
              const thumbClass = cn("shrink-0 rounded-lg object-cover bg-white/[0.04]", isPortrait ? "h-full aspect-[9/16]" : "h-24 aspect-[16/9]");
              return (<>

                <div className="flex flex-col bg-white/5 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-teritary mb-2">
                    <PlatformIcon className="size-5" />
                    <span className="text-xs tracking-[0.5px] uppercase font-medium">{platformMeta.label} video attached</span>
                  </div>
                  <div className="flex flex-row gap-2 min-w-0 flex-1">
                  {loadout.video.thumbnailUrl ? (
                    <img src={loadout.video.thumbnailUrl} alt={loadout.video.title ?? ""} className={thumbClass} />
                  ) : (
                    <div className={cn(thumbClass, "border border-white/[0.07] flex items-center justify-center")}>
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5 min-w-0 flex-1 justify-center">

                    {loadout.video.title && (
                      <p className="text-[14px] text-[#fafafa] font-medium line-clamp-2">{loadout.video.title}</p>
                    )}
                    {loadout.video.authorName && (
                      <p className="text-[12px] text-[#8d898a]">by {loadout.video.authorName}</p>
                    )}
                    <a href={loadout.video.url} target="_blank" rel="noopener noreferrer" className="w-fit">
                      <Button variant="outline" size="sm">
                        <ExternalLink className="w-3.5 h-3.5 text-[#fafafa]" />
                        <span className="text-[13px] text-[#fafafa]">Watch on {platformMeta.label}</span>
                      </Button>
                    </a>
                  </div>
                  </div>
                </div>
              </>);
            })()}
          </Container>

          <Container className="flex flex-row items-center gap-4">
            <QRCodeCanvas value={shareUrl} size={104} className="w-[104px] h-[104px]" />
            <div className="flex-1 min-w-[200px] flex flex-col gap-3">
              <h3 className="text-[12px] tracking-[0.5px] uppercase text-[#fafafa] font-medium">Share loadout</h3>
              <p className="text-[12px] text-[#8d898a] break-all">{shareUrl}</p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-fit">
                    <Download className="w-4 h-4 text-[#fafafa]" />
                    <span className="text-[14px] text-[#fafafa]">Download QR</span>
                    <span className="text-[14px] text-[#bebcbc]">as PNG</span>
                    <ChevronDown className="w-4 h-4 text-[#bebcbc]" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={downloadBrandedQr}>
                    White QR, with background
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={downloadPlainQr}>
                    Black QR, no background
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </Container>

          {canEdit && (
            <div className="flex items-center gap-3">
              <Button
                onClick={() => navigate(`/${gameId}/create?edit=${loadoutId}`)}
                variant="secondary"
              >
                <Edit className="w-4 h-4" />
                Edit
              </Button>
              <Button
                onClick={deleteLoadout}>
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </div>
          )}
        </div>
      </div>

      <Dialog open={authModalOpen} onOpenChange={setAuthModalOpen}>
        <DialogContent className="!p-0 gap-0 overflow-hidden sm:max-w-3xl">
          <div className="grid grid-cols-1 sm:grid-cols-2">
            <div className="p-6 sm:p-8 flex flex-col gap-6">
              <DialogHeader>
                <DialogTitle>Sign in required</DialogTitle>
                <DialogDescription>
              <ul className="flex flex-col gap-2 mt-4 text-[14px] text-secondary">
                <li>Like, dislike, and favorite the community's loadouts</li>
                <li>Build and publish your own weapon setups</li>
                <li>Share your builds with a link or QR code</li>
              </ul>                </DialogDescription>
              </DialogHeader>

              <DialogFooter className="mt-auto">
                <Button
                  className="w-full"
                  onClick={() => navigate("/join", { state: { from: location.pathname + location.search } })}
                >
                  Join for free
                </Button>
              </DialogFooter>
            </div>
            <div className="relative hidden sm:block min-h-[280px] bg-[#0a0909] overflow-hidden">
              <LoadoutWall />
              <div className="absolute inset-0 flex flex-col justify-end p-6">
                <h3 className="text-xl font-bold text-[#fafafa] mb-1">{SHOWCASE_SLIDES[2].title}</h3>
                <p className="text-neutral-400 text-sm">{SHOWCASE_SLIDES[2].body}</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
