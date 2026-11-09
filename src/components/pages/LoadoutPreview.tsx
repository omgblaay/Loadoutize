import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router";
import { toast } from "sonner";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { getGameColor } from "@/lib/gameColors";
import { gameMeta } from "@/lib/games";
import {
  attachmentMetaPath,
  explorePath,
  gamePath,
  weaponMetaListPath,
  weaponMetaPath,
} from "@/lib/routes";
import { orderedAttachmentEntries } from "@/lib/attachmentOrder";
import { builderAttachmentDisplayName, type BuilderRelationAsset } from "@/lib/weaponBuilderRelations";
import { builderAttachmentImageUrl, loadBuilderAttachmentAssets } from "@/lib/builderAttachmentImages";
import { visibleWeaponCatalog } from "@/lib/weaponCategories";
import gameLogo from "figma:asset/mw4_logo.png";
import { useAuth } from "@/providers/AuthProvider";
import { AppLayout } from "@/components/templates/AppLayout";
import { Button } from "@/components/atoms/Button";
import { Container } from "@/components/atoms/Container";
import {
  QRCodeCanvas,
  generatePlainQRPng,
  generateBrandedQRPng,
} from "@/components/molecules/QRCode";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/molecules/DropdownMenu";
import {
  WeaponImage,
  type WeaponImageBadge,
} from "@/components/molecules/WeaponImage";
import { WeaponPreviewSmoke } from "@/components/molecules/WeaponPreviewSmoke";
import { getWeaponPreviewRef } from "@/lib/weaponSpritePreview";
import { SignInRequiredDialog } from "@/components/molecules/SignInRequiredDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/molecules/AlertDialog";
import type { CardWeapon, CardTag, CardAttachment } from "@/types/loadout";
import { Tag } from "@/components/atoms/Tag";
import {
  BreadcrumbLink,
  BreadcrumbSpacer,
} from "@/components/molecules/Breadcrumb";
import {
  PixelFireButton,
  type PixelFireTone,
} from "@/components/ui/pixel-fire-button";
import { RatingRing } from "@/components/atoms/RatingRing";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Skeleton } from "@/components/atoms/Skeleton";
import { cn } from "@/lib/utils";
import { CompactPageHeader } from "@/components/molecules/CompactPageHeader";
import { VIDEO_PLATFORM_META, type LoadoutVideo } from "@/lib/video";
import {
  SOCIAL_LINK_FIELDS,
  formatCount,
  type SocialLinks,
  type SocialStats,
} from "@/lib/social";
import { isVisibleConfig } from "@/lib/contentVisibility";
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
  LoaderCircle,
  Shield,
} from "lucide-react";
import * as React from "react";

interface Weapon {
  id: string;
  slot?: "primary" | "secondary" | "melee";
  attachments?: Record<string, string>;
}

interface EquipmentSelection {
  name: string;
  slot: "throwable" | "tactical" | "field_upgrade";
  isAny?: boolean;
}

interface PerkCatalogItem {
  id: number;
  name: string;
  slot: "perk_1" | "perk_2" | "perk_3" | null;
  imageUrl: string | null;
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
  contentType?: "full_loadout" | "weapon_config";
  description?: string;
  gameLoadoutCode?: string | null;
  video?: LoadoutVideo | null;
  weapons: Weapon[];
  perks?: string[];
  equipment?: EquipmentSelection[];
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

function FireReactionButton({
  icon,
  label,
  count,
  active,
  tone,
  onClick,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  active: boolean;
  tone: Extract<PixelFireTone, "green" | "red">;
  onClick: () => Promise<boolean>;
  className?: string;
}) {
  const [pending, setPending] = useState(false);
  const activeTone =
    tone === "green"
      ? {
          icon: "border-emerald-200/25 bg-emerald-950/35 text-emerald-100",
          count: "border-emerald-200/20 bg-emerald-950/40 text-emerald-50",
          dot: "bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.9)]",
          glow: "from-emerald-300/45",
        }
      : {
          icon: "border-rose-200/25 bg-rose-950/35 text-rose-100",
          count: "border-rose-200/20 bg-rose-950/40 text-rose-50",
          dot: "bg-rose-300 shadow-[0_0_8px_rgba(253,164,175,0.9)]",
          glow: "from-rose-300/45",
        };

  const handleClick = async () => {
    if (pending) return;
    setPending(true);
    try {
      await onClick();
    } finally {
      setPending(false);
    }
  };

  return (
    <PixelFireButton
      tone={tone}
      lit={active}
      disabled={pending}
      ariaLabel={`${label}, ${count}`}
      ariaPressed={active}
      className={cn(
        "group h-[56px] rounded-2xl px-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_28px_-18px_rgba(0,0,0,0.9)] [&>span.relative]:w-full",
        className,
      )}
      onClick={() => void handleClick()}
      overlay={
        <>
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r via-white/25 to-transparent opacity-60",
              activeTone.glow,
            )}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 translate-x-[-130%] skew-x-[-24deg] bg-gradient-to-r from-transparent via-white/[0.07] to-transparent transition-transform duration-700 group-hover:translate-x-[130%]"
          />
        </>
      }
    >
      <span
        className={cn(
          "relative flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/25 text-white/70 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-white/20 group-hover:text-white",
          active && activeTone.icon,
        )}
      >
        {pending ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <span
            className={cn(
              "flex transition-transform duration-200 group-active:scale-90",
              active && "scale-110",
            )}
          >
            {React.isValidElement(icon)
              ? React.cloneElement(
                  icon as React.ReactElement<{
                    fill?: string;
                    strokeWidth?: number;
                  }>,
                  {
                    fill: active ? "currentColor" : "none",
                    strokeWidth: active ? 2.4 : 2,
                  },
                )
              : icon}
          </span>
        )}
        {active && !pending && (
          <span
            aria-hidden="true"
            className={cn(
              "absolute -right-0.5 -top-0.5 size-2 rounded-full",
              activeTone.dot,
            )}
          />
        )}
      </span>

      <span className="flex min-w-0 flex-1 flex-col items-start leading-none">
        <span className="text-[13px] font-semibold tracking-[-0.01em] text-white">
          {pending ? "Updating" : label}
        </span>
        <span className="mt-1 text-[9px] font-medium uppercase tracking-[0.12em] text-white/40">
          {active ? "Your vote" : "Cast vote"}
        </span>
      </span>

      <span
        className={cn(
          "flex min-w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/25 px-2 py-1.5 text-xs tabular-nums text-white/60 transition-colors group-hover:text-white",
          active && activeTone.count,
        )}
      >
        {count}
      </span>
    </PixelFireButton>
  );
}

function LoadoutPreviewSkeleton() {
  const block = "bg-white/[0.02] animate-pulse";

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
            <div
              key={i}
              className="flex items-center gap-4 py-3 border-b border-white/5 w-full"
            >
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
  const {
    gameId = "mw4",
    loadoutId: routeLoadoutId,
    configId,
  } = useParams<{
    gameId: string;
    loadoutId: string;
    configId: string;
  }>();
  const loadoutId = routeLoadoutId ?? configId;
  const navigate = useNavigate();
  const location = useLocation();
  const { user, accessToken } = useAuth();
  const [loadout, setLoadout] = useState<Loadout | null>(null);
  const [catalogWeapons, setCatalogWeapons] = useState<CardWeapon[]>([]);
  const [catalogAttachments, setCatalogAttachments] = useState<
    CardAttachment[]
  >([]);
  const [relationAssets, setRelationAssets] = useState<BuilderRelationAsset[]>([]);
  const [catalogTags, setCatalogTags] = useState<CardTag[]>([]);
  const [catalogPerks, setCatalogPerks] = useState<PerkCatalogItem[]>([]);
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
    if (gameId === "mw4") {
      loadBuilderAttachmentAssets()
        .then(setRelationAssets)
        .catch((error) => console.error("Error fetching attachment assets:", error));
    } else {
      setRelationAssets([]);
    }
    fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/weapons`,
      {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      },
    )
      .then((r) => r.json())
      .then((data) =>
        setCatalogWeapons(visibleWeaponCatalog<CardWeapon>(data.weapons ?? [])),
      )
      .catch((error) => console.error("Error fetching weapons:", error));

    fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/attachments`,
      {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      },
    )
      .then((r) => r.json())
      .then((data) => setCatalogAttachments(data.attachments ?? []))
      .catch((error) => console.error("Error fetching attachments:", error));

    fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/tags`,
      {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      },
    )
      .then((r) => r.json())
      .then((data) => setCatalogTags(data.tags ?? []))
      .catch((error) => console.error("Error fetching tags:", error));

    fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/perks`,
      {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      },
    )
      .then((r) => r.json())
      .then((data) => setCatalogPerks(data.perks ?? []))
      .catch((error) => console.error("Error fetching perks:", error));
  }, [gameId]);

  const fetchLoadout = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/loadouts`,
        {
          headers: { Authorization: `Bearer ${accessToken ?? publicAnonKey}` },
        },
      );
      const data = await response.json();
      const found = data.loadouts?.find((l: any) => l.id === loadoutId);
      if (found && isVisibleConfig(found)) setLoadout(found);
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
        {
          method: "POST",
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        },
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
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ type }),
        },
      );
      if (!response.ok) return false;
      const { loadout: updated } = await response.json();
      setLoadout(updated);
      return type === "like"
        ? updated.liked
        : type === "dislike"
          ? updated.disliked
          : updated.favorited;
    } catch (error) {
      console.error("Error reacting to loadout:", error);
      return false;
    }
  };

  const deleteLoadout = async () => {
    if (!accessToken) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/loadouts/${loadoutId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      if (response.ok) {
        navigate(explorePath(gameId));
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete loadout", {
          description: "The loadout was not deleted. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error deleting loadout:", error);
      toast.error("Failed to delete loadout", {
        description: "Something went wrong. Please try again.",
      });
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
  const accent = getGameColor(gameId).primary;

  const primaryWeapon =
    loadout?.weapons?.find((weapon) => weapon.slot === "primary") ??
    loadout?.weapons?.[0];
  const secondaryWeapon = loadout?.weapons?.find(
    (weapon) => weapon.slot === "secondary",
  );
  const titleWeapon = catalogWeapons.find((w) => w.id === primaryWeapon?.id);
  const titleTag =
    loadout?.tagId != null
      ? catalogTags.find((t) => t.id === loadout.tagId)
      : undefined;
  usePageTitle(
    loadout
      ? [titleTag?.name, titleWeapon?.name, loadout.name]
          .filter(Boolean)
          .join(" • ")
      : undefined,
  );

  const attachmentIndex = React.useMemo(
    () => new Map(catalogAttachments.map((a) => [`${a.type}:${a.name}`, a])),
    [catalogAttachments],
  );
  const relationAssetsById = React.useMemo(
    () => new Map(relationAssets.map((asset) => [asset.id, asset])),
    [relationAssets],
  );
  const attachmentLabel = (attachment: CardAttachment | undefined, weaponId: string | undefined, fallback: string) =>
    gameId === "mw4"
      ? builderAttachmentDisplayName(attachment?.stats?.assetId, weaponId, relationAssetsById, attachment?.stats?.displayName ?? fallback)
      : attachment?.stats?.displayName ?? fallback;
  const attachmentIconUrl = (attachment: CardAttachment | undefined) =>
    attachment?.imageUrl ||
    (gameId === "mw4"
      ? builderAttachmentImageUrl(attachment?.stats?.assetId, relationAssetsById, attachment?.name)
      : null) || attachment?.stats?.imagePath || null;

  const primaryAttachments = React.useMemo(() => {
    if (!primaryWeapon?.attachments) return [];

    return orderedAttachmentEntries(primaryWeapon.attachments).map(
      ([slot, value]) => {
        const attachment = attachmentIndex.get(`${slot}:${value}`);
        return {
          key: slot,
          attachmentId: attachment?.id,
          assetId: attachment?.stats?.assetId,
          typeSlug: attachment?.typeSlug || slot,
          label: attachmentLabel(attachment, primaryWeapon.id, value),
          iconUrl: attachmentIconUrl(attachment),
          isApex: slot.toLowerCase() === "apex",
        };
      },
    );
  }, [primaryWeapon, attachmentIndex, relationAssetsById, gameId]);

  const secondaryAttachments = React.useMemo(() => {
    if (!secondaryWeapon?.attachments) return [];

    return orderedAttachmentEntries(secondaryWeapon.attachments).map(
      ([slot, value]) => {
        const attachment = attachmentIndex.get(`${slot}:${value}`);
        return {
          key: slot,
          attachmentId: attachment?.id,
          assetId: attachment?.stats?.assetId,
          typeSlug: attachment?.typeSlug || slot,
          label: attachmentLabel(attachment, secondaryWeapon.id, value),
          iconUrl: attachmentIconUrl(attachment),
          isApex: slot.toLowerCase() === "apex",
        };
      },
    );
  }, [secondaryWeapon, attachmentIndex, relationAssetsById, gameId]);

  if (loading) {
    return (
      <AppLayout
        selectedGame={gameId}
        onGameSelect={(id) => navigate(explorePath(id))}
      >
        <LoadoutPreviewSkeleton />
      </AppLayout>
    );
  }

  if (!loadout) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0909] flex-col gap-4">
        <p className="text-xl">Loadout not found.</p>
        <Button onClick={() => navigate(explorePath(gameId))}>
          Back to Explore
        </Button>
      </div>
    );
  }

  const canEdit = user?.id === loadout.userId;
  const primaryWeaponCatalog = catalogWeapons.find(
    (w) => w.id === primaryWeapon?.id,
  );
  const primaryWeaponImage = primaryWeaponCatalog?.imageUrl ?? null;
  const primaryWeaponBadges = orderedAttachmentEntries(
    primaryWeapon?.attachments,
  )
    .map(([slot, value]) => {
      const attachment = catalogAttachments.find(
        (a) => a.type === slot && a.name === value,
      );
      if (!attachment) return null;
      return {
        key: slot,
        assetId: attachment.stats?.assetId,
        typeSlug: attachment.typeSlug || slot,
        label: attachmentLabel(attachment, primaryWeapon?.id, attachment.name),
        iconUrl: attachmentIconUrl(attachment),
        isApex: slot.toLowerCase() === "apex",
        to: attachmentMetaPath(gameId, String(attachment.id)),
      } satisfies WeaponImageBadge;
    })
    .filter((b) => b !== null);
  const secondaryWeaponCatalog = catalogWeapons.find(
    (w) => w.id === secondaryWeapon?.id,
  );
  const secondaryWeaponBadges = orderedAttachmentEntries(
    secondaryWeapon?.attachments,
  )
    .map(([slot, value]) => {
      const attachment = catalogAttachments.find(
        (a) => a.type === slot && a.name === value,
      );
      if (!attachment) return null;
      return {
        key: slot,
        assetId: attachment.stats?.assetId,
        typeSlug: attachment.typeSlug || slot,
        label: attachmentLabel(attachment, secondaryWeapon?.id, attachment.name),
        iconUrl: attachmentIconUrl(attachment),
        isApex: slot.toLowerCase() === "apex",
      } satisfies WeaponImageBadge;
    })
    .filter((badge) => badge !== null);
  const isFullLoadout = loadout.contentType === "full_loadout";
  const shareUrl = window.location.href;

  return (
    <AppLayout
      selectedGame={gameId}
      onGameSelect={(id) => navigate(explorePath(id))}
      breadcrumb={
        <>
          <img
            src={gameLogo}
            alt="Modern Warfare 4"
            className="w-10 h-10 object-contain shrink-0"
          />
          {primaryWeaponCatalog && (
            <>
              <BreadcrumbSpacer />
              {primaryWeaponCatalog.type ? (
                <BreadcrumbLink
                  to={weaponMetaListPath(gameId, primaryWeaponCatalog.type)}
                >
                  {primaryWeaponCatalog.type || meta.short}
                </BreadcrumbLink>
              ) : null}
              <BreadcrumbSpacer />
              <BreadcrumbLink
                to={weaponMetaPath(gameId, primaryWeaponCatalog.id)}
              >
                {primaryWeaponCatalog.name}
              </BreadcrumbLink>
            </>
          )}
          <BreadcrumbSpacer />
          <span className="text-base">{loadout.name}</span>
        </>
      }
    >
      {isFullLoadout && (
        <header className="flex flex-row gap-4 ">
          <div className="flex min-w-0  flex-1 items-center gap-4">
            <RatingRing
              percent={loadout.ratingPercent}
              votes={loadout.likes + loadout.dislikes}
              size={64}
              innerClassName="border border-white/5"
              fallbackLabel="New"
            />
            <div className="flex-1">
              {titleTag && (
                <p
                  style={{ color: titleTag.color }}
                  className="font-handwritten text-xl font-light"
                >
                  {titleTag.name}
                </p>
              )}
              <h1 className="wrap-anywhere flxe-1 text-xl sm:text-2xl">
                {loadout.name}
              </h1>
            </div>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <FireReactionButton
              icon={<ThumbsUp className="w-4 h-4" />}
              label={loadout.liked ? "Liked" : "Like"}
              count={loadout.likes}
              active={loadout.liked}
              tone="green"
              onClick={() => react("like")}
              className="flex-1 sm:min-w-36"
            />
            <FireReactionButton
              icon={<ThumbsDown className="w-4 h-4" />}
              label={loadout.disliked ? "Disliked" : "Dislike"}
              count={loadout.dislikes}
              active={loadout.disliked}
              tone="red"
              onClick={() => react("dislike")}
              className="flex-1 sm:min-w-36"
            />
          </div>
        </header>
      )}

      {!isFullLoadout && (
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <RatingRing
              percent={loadout.ratingPercent}
              votes={loadout.likes + loadout.dislikes}
              size={56}
              innerClassName="border border-white/5"
              fallbackLabel="New"
            />
            <h1 className="min-w-0 text-sm antialiased sm:text-xl wrap-anywhere">
              {titleTag && (
                <span
                  style={{ color: titleTag.color }}
                  className="mr-2 font-handwritten text-2xl font-light"
                >
                  {titleTag.name}
                </span>
              )}
              {primaryWeaponCatalog && (
                <>
                  <Tag
                    className="mr-2 align-middle"
                    link={explorePath(gameId, {
                      category: primaryWeaponCatalog.type,
                    })}
                  >
                    {primaryWeaponCatalog.typeShort || meta.short}
                  </Tag>
                  <Link
                    to={weaponMetaPath(gameId, primaryWeaponCatalog.id)}
                    className="font-sans text-teritary hover:text-[#efedf1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                  >
                    {primaryWeaponCatalog.name}
                  </Link>{" "}
                </>
              )}
              {loadout.name}
            </h1>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <FireReactionButton
              icon={<ThumbsUp className="w-4 h-4" />}
              label={loadout.liked ? "Liked" : "Like"}
              count={loadout.likes}
              active={loadout.liked}
              tone="green"
              onClick={() => react("like")}
              className="flex-1 sm:min-w-36"
            />
            <FireReactionButton
              icon={<ThumbsDown className="w-4 h-4" />}
              label={loadout.disliked ? "Disliked" : "Dislike"}
              count={loadout.dislikes}
              active={loadout.disliked}
              tone="red"
              onClick={() => react("dislike")}
              className="flex-1 sm:min-w-36"
            />
          </div>
        </header>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-white/[0.06] pb-4">
        {(() => {
          const avatar = (
            <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/[0.04] text-xs font-semibold">
              {loadout.authorAvatarUrl ? (
                <img
                  src={loadout.authorAvatarUrl}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                loadout.userName?.[0]?.toUpperCase() ?? "U"
              )}
            </div>
          );
          return loadout.authorNickname ? (
            <Link
              to={`/u/${loadout.authorNickname}`}
              aria-label={`View ${loadout.userName ?? loadout.authorNickname}'s profile`}
              className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              {avatar}
            </Link>
          ) : avatar;
        })()}
        <div className="flex min-w-0 items-baseline gap-1.5 text-sm">
          <span className="text-teritary">by</span>
          {loadout.authorNickname ? (
            <Link to={`/u/${loadout.authorNickname}`} className="truncate font-medium hover:underline">
              {loadout.userName} <span className="text-teritary">@{loadout.authorNickname}</span>
            </Link>
          ) : (
            <span className="truncate font-medium">{loadout.userName}</span>
          )}
        </div>
        {loadout.authorLinks &&
          SOCIAL_LINK_FIELDS.some(({ key }) => loadout.authorLinks![key]) && (
            <div className="ml-auto flex items-center gap-1">
              {SOCIAL_LINK_FIELDS.filter(({ key }) => loadout.authorLinks![key]).map(
                ({ key, label, icon: Icon, url }) => {
                  const count = formatCount(loadout.authorSocialStats?.[key]);
                  return (
                    <Button key={key} asChild variant="ghost" size="sm" className="h-8 px-2">
                      <a
                        href={url(loadout.authorLinks![key]!)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={label}
                      >
                        <Icon className="size-3.5" />
                        <span className="text-[10px] text-teritary font-mono">{count ?? "—"}</span>
                      </a>
                    </Button>
                  );
                },
              )}
            </div>
          )}
      </div>

      <div
        className={cn(
          "grid grid-cols-1 gap-6 items-start",
          isFullLoadout ? "md:grid-cols-2" : "grid-cols-1",
        )}
      >
        {/* Weapon build */}
        <Container className={!isFullLoadout ? "!border-0 !bg-transparent !p-0" : undefined}>
          {isFullLoadout ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-teritary">
                  Primary weapon
                </p>
                <h2 className="mt-1 font-mono text-base uppercase">
                  {primaryWeaponCatalog ? (
                    <Link
                      to={weaponMetaPath(gameId, primaryWeaponCatalog.id)}
                      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                    >
                      {primaryWeaponCatalog.name}
                    </Link>
                  ) : (
                    "Not selected"
                  )}
                </h2>
              </div>
              {primaryWeaponCatalog?.typeShort && (
                <Tag>{primaryWeaponCatalog.typeShort}</Tag>
              )}
            </div>
          ) : null}

          {!isFullLoadout && (
            <CompactPageHeader
              title={loadout.name}
              actions={
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(explorePath(gameId))}
                  >
                    Back
                  </Button>
                  <FireReactionButton
                    icon={<ThumbsUp className="w-4 h-4" />}
                    label={loadout.liked ? "Liked" : "Like"}
                    count={loadout.likes}
                    active={loadout.liked}
                    tone="green"
                    onClick={() => react("like")}
                  />
                  <FireReactionButton
                    icon={<ThumbsDown className="w-4 h-4" />}
                    label={loadout.disliked ? "Disliked" : "Dislike"}
                    count={loadout.dislikes}
                    active={loadout.disliked}
                    tone="red"
                    onClick={() => react("dislike")}
                  />
                </>
              }
            />
          )}

          <div className={cn("relative isolate flex w-full flex-col items-center gap-2 py-4", !isFullLoadout && "min-h-[240px] justify-center py-8 md:min-h-[440px]")}>
            {gameId === "mw4" && primaryWeapon?.id && getWeaponPreviewRef(primaryWeapon.id) && (
              <WeaponPreviewSmoke />
            )}
            <div className={cn("relative z-[1] flex w-full justify-center", !isFullLoadout && "max-w-sm")}>
              <WeaponImage
                imageUrl={primaryWeaponImage}
                loading={
                  !primaryWeaponCatalog &&
                  Boolean(primaryWeapon?.id) &&
                  catalogWeapons.length === 0
                }
                weaponId={primaryWeapon?.id}
                badges={primaryWeaponBadges}
                ovalBadgeLabels
                enableSpritePreview={gameId === "mw4"}
                activeBadgeKey={activeKey}
                onBadgeHover={setActiveKey}
              />
            </div>
          </div>
          <div className="divide-y-1 divide-solid divide-white/5 w-full">
            <div className="lg:hidden">
            {primaryAttachments.map((att) => {
              return (
                <div
                  key={att.key}
                  onPointerEnter={() => setActiveKey(att.key)}
                  onPointerLeave={() => setActiveKey(null)}
                  onFocus={() => setActiveKey(att.key)}
                  onBlur={() => setActiveKey(null)}
                  className="flex w-full items-center gap-4 py-3 text-left"
                >
                  <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/[0.035] p-2">
                    {att.iconUrl ? (
                      <img
                        src={att.iconUrl}
                        alt=""
                        className="size-full object-contain"
                      />
                    ) : <span className="text-xs font-semibold text-white/70">{att.label.slice(0, 2).toUpperCase()}</span>}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    {att.attachmentId ? (
                      <Link
                        to={attachmentMetaPath(gameId, String(att.attachmentId))}
                        className="font-medium hover:underline focus-visible:underline outline-offset-4"
                      >
                        {att.label}
                      </Link>
                    ) : (
                      <span className="font-medium">{att.label}</span>
                    )}
                    <span className="text-[10px] uppercase tracking-[0.12em] text-teritary">
                      {att.typeSlug}
                    </span>
                  </div>
                </div>
              );
            })}
            </div>

            {/* {!primaryWeapon?.attachments &&
              (loadout.equipment ?? []).map((item, i) => (
                <div key={i} className="divide-y-4 divide-solid divide-white w-full">
                  <div className="w-6 h-6 rounded-md bg-white/[0.02] border border-white/[0.18] flex items-center justify-center shrink-0">
                    <Puzzle className="w-3.5 h-3.5 text-[#8d898a]" />
                  </div>
                  <span className="text-[14px] text-[#8d898a] flex-1">Gear</span>
                  <span className="text-[14px]  font-medium">{item}</span>
                </div>
              ))} */}

            {!primaryWeapon?.attachments &&
              !(loadout.equipment ?? []).length && (
                <p className="text-[14px] text-[#8d898a] py-2 lg:hidden">
                  No build details published for this loadout.
                </p>
              )}

            {!isFullLoadout && loadout.gameLoadoutCode && (
              <div className="flex flex-row bg-white/[0.03] h-10 rounded-lg items-center mt-4 gap-4 justify-center w-full">
                <span className="text-sm text-teritary/50">In-game code:</span>
                <div className="flex items-center gap-2">
                  <code className="uppercase tracking-wider text-sm text-secondary">
                    {loadout.gameLoadoutCode}
                  </code>
                  <Button
                    onClick={copyGameLoadoutCode}
                    variant="ghost"
                    size="sm"
                    aria-label="Copy loadout code"
                    className="text-sm"
                  >
                    {codeCopied ? (
                      <>
                        <Check className="size-3 text-[#01a059]" />{" "}
                        <span className="text-sm">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3 " />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Container>

        {isFullLoadout && (
          <Container>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-teritary">
                  Secondary weapon
                </p>
                <h2 className="mt-1 font-mono text-base uppercase">
                  {secondaryWeaponCatalog?.name ?? "Not selected"}
                </h2>
              </div>
              {secondaryWeaponCatalog?.typeShort && (
                <Tag>{secondaryWeaponCatalog.typeShort}</Tag>
              )}
            </div>

            {secondaryWeapon && secondaryWeaponCatalog ? (
              <>
                <div className="flex flex-col items-center gap-2 py-4">
                  <div
                    style={{
                      background: `radial-gradient(ellipse at center, ${titleTag?.color || null}14, transparent 70%)`,
                    }}
                  >
                    <WeaponImage
                      imageUrl={secondaryWeaponCatalog.imageUrl}
                      weaponId={secondaryWeapon.id}
                      badges={secondaryWeaponBadges}
                      enableSpritePreview={gameId === "mw4"}
                      activeBadgeKey={
                        activeKey?.startsWith("secondary:")
                          ? activeKey.slice("secondary:".length)
                          : null
                      }
                      onBadgeHover={(key) =>
                        setActiveKey(key ? `secondary:${key}` : null)
                      }
                    />
                  </div>
                </div>
                <div className="divide-y-1 divide-solid divide-white/5 w-full">
                  {secondaryAttachments.map((attachment) => {
                    const attachmentKey = `secondary:${attachment.key}`;
                    return (
                      <div
                        key={attachment.key}
                        onPointerEnter={() => setActiveKey(attachmentKey)}
                        onPointerLeave={() => setActiveKey(null)}
                        onFocus={() => setActiveKey(attachmentKey)}
                        onBlur={() => setActiveKey(null)}
                        className="flex w-full items-center gap-4 py-3 text-left"
                      >
                        <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/[0.035] p-2">
                          {attachment.iconUrl ? (
                            <img
                              src={attachment.iconUrl}
                              alt=""
                              className="size-full object-contain"
                            />
                          ) : <span className="text-xs font-semibold text-white/70">{attachment.label.slice(0, 2).toUpperCase()}</span>}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          {attachment.attachmentId ? (
                            <Link
                              to={attachmentMetaPath(
                                gameId,
                                String(attachment.attachmentId),
                              )}
                              className="font-medium hover:underline focus-visible:underline outline-offset-4"
                            >
                              {attachment.label}
                            </Link>
                          ) : (
                            <span className="font-medium">
                              {attachment.label}
                            </span>
                          )}
                          <span className="text-[10px] uppercase tracking-[0.12em] text-teritary">
                            {attachment.typeSlug}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="py-8 text-sm text-teritary">
                No secondary weapon selected.
              </p>
            )}
          </Container>
        )}

        {isFullLoadout && loadout.gameLoadoutCode && (
          <div className="flex min-h-12 items-center justify-center gap-4 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 md:col-span-2">
            <span className="text-sm text-teritary/50">In-game code:</span>
            <code className="uppercase tracking-wider text-sm text-secondary">
              {loadout.gameLoadoutCode}
            </code>
            <Button
              onClick={copyGameLoadoutCode}
              variant="ghost"
              size="sm"
              aria-label="Copy loadout code"
            >
              {codeCopied ? (
                <>
                  <Check className="size-3 text-[#01a059]" />
                  <span className="text-sm">Copied</span>
                </>
              ) : (
                <Copy className="size-3" />
              )}
            </Button>
          </div>
        )}

        <div
          className={cn(
            "flex flex-col gap-4",
            !isFullLoadout && "lg:grid lg:grid-cols-2",
            isFullLoadout && "md:col-span-2 lg:grid lg:grid-cols-2",
          )}
        >
          <Container className="gap-3">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-teritary">
              Build notes
            </h2>
            {loadout.description ? (
              <blockquote className="whitespace-pre-wrap break-words text-base leading-relaxed text-secondary">
                {loadout.description.split(/(https:\/\/[^\s]+)/g).map((part, index) =>
                  part.startsWith("https://") ? (
                    <a
                      key={index}
                      href={part}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="break-all underline underline-offset-4 hover:text-white"
                    >
                      {part}
                    </a>
                  ) : (
                    <React.Fragment key={index}>{part}</React.Fragment>
                  ),
                )}
              </blockquote>
            ) : (
              <p className="text-sm text-teritary">No description provided.</p>
            )}
          </Container>

          <div className="flex flex-col gap-4">
            {loadout.video &&
              (() => {
                const platformMeta =
                  VIDEO_PLATFORM_META[loadout.video.platform];
                const PlatformIcon = platformMeta.icon;
                // TikTok/Instagram are reels -- portrait 9:16; YouTube is landscape 16:9.
                const isPortrait = loadout.video.platform !== "youtube";
                const thumbClass = cn(
                  "shrink-0 rounded-lg object-cover bg-white/[0.04]",
                  isPortrait ? "h-full aspect-[9/16]" : "h-24 aspect-[16/9]",
                );
                return (
                  <>
                    <div className="flex flex-col bg-white/5 p-4 rounded-lg">
                      <div className="flex items-center gap-2 text-teritary mb-2">
                        <PlatformIcon className="size-5" />
                        <span className="text-xs tracking-[0.5px] uppercase font-medium">
                          {platformMeta.label} video attached
                        </span>
                      </div>
                      <div className="flex flex-row gap-2 min-w-0 flex-1">
                        {loadout.video.thumbnailUrl ? (
                          <img
                            src={loadout.video.thumbnailUrl}
                            alt={loadout.video.title ?? ""}
                            className={thumbClass}
                          />
                        ) : (
                          <div
                            className={cn(
                              thumbClass,
                              "border border-white/[0.07] flex items-center justify-center",
                            )}
                          ></div>
                        )}
                        <div className="flex flex-col gap-1.5 min-w-0 flex-1 justify-center">
                          {loadout.video.title && (
                            <p className="text-[14px]  font-medium line-clamp-2">
                              {loadout.video.title}
                            </p>
                          )}
                          {loadout.video.authorName && (
                            <p className="text-[12px] text-[#8d898a]">
                              by {loadout.video.authorName}
                            </p>
                          )}
                          <a
                            href={loadout.video.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-fit"
                          >
                            <Button variant="outline" size="sm">
                              <ExternalLink className="w-3.5 h-3.5 " />
                              <span className="text-[13px] ">
                                Watch on {platformMeta.label}
                              </span>
                            </Button>
                          </a>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
          <Container className="flex flex-row items-center gap-4">
            <QRCodeCanvas
              value={shareUrl}
              size={104}
              className="w-[104px] h-[104px]"
            />
            <div className="flex-1 min-w-[200px] flex flex-col gap-3">
              <h3 className="text-[12px] tracking-[0.5px] uppercase  font-medium">
                Share loadout
              </h3>
              <p className="text-[12px] text-[#8d898a] break-all">{shareUrl}</p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-fit">
                    <Download className="w-4 h-4 " />
                    <span className="text-[14px] ">Download QR</span>
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
                onClick={() =>
                  navigate(`${gamePath(gameId, "create")}?edit=${loadoutId}`)
                }
                variant="secondary"
              >
                <Edit className="w-4 h-4" />
                Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent variant="destructive">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this loadout?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. The loadout and its shared
                      link will be removed permanently.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep loadout</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={() => void deleteLoadout()}
                    >
                      Delete loadout
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
          </div>
        </div>
      </div>

      {isFullLoadout && (
        <Container>
          <h2 className="mt-1 text-xl">Perks, equipment & melee</h2>

          <div className="grid gap-4">
            {(["melee"] as const).map((slot) => {
              const weapon = loadout.weapons.find(
                (candidate) => (candidate.slot ?? "primary") === slot,
              );
              const catalogWeapon = catalogWeapons.find(
                (candidate) => candidate.id === weapon?.id,
              );
              return (
                <section
                  key={slot}
                  className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]"
                >
                  <div className="border-b border-white/[0.07] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-teritary">
                    {slot}
                  </div>
                  {weapon && catalogWeapon ? (
                    <div className="flex flex-col gap-3 p-4">
                      <div className="h-24">
                        <WeaponImage
                          imageUrl={catalogWeapon.imageUrl}
                          alt={catalogWeapon.name}
                          weaponId={weapon.id}
                          variant="small"
                          enableSpritePreview={gameId === "mw4"}
                        />
                      </div>
                      <p className="font-mono text-sm uppercase">
                        {catalogWeapon.name}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {orderedAttachmentEntries(weapon.attachments).map(
                          ([slot, name]) => {
                            const attachment = attachmentIndex.get(
                              `${slot}:${name}`,
                            );
                            const className =
                              "rounded-md border border-white/[0.08] bg-black/20 px-2 py-1 text-[10px] text-secondary";
                            return attachment ? (
                              <Link
                                key={slot}
                                to={attachmentMetaPath(
                                  gameId,
                                  String(attachment.id),
                                )}
                                className={`${className} hover:underline focus-visible:underline`}
                              >
                                {attachment.stats?.displayName ?? name}
                              </Link>
                            ) : (
                              <span key={slot} className={className}>
                                {name}
                              </span>
                            );
                          },
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="p-4 text-sm text-teritary">Not selected</p>
                  )}
                </section>
              );
            })}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-2xl border border-white/[0.08] p-4">
              <div className="flex items-center gap-2">
                <Puzzle className="size-4 text-teritary" />
                <h3 className="text-sm">Perks</h3>
              </div>
              <div className="mt-3">
                {(loadout.perks ?? []).length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-3">
                    {loadout.perks!.map((perkName) => {
                      const perk = catalogPerks.find(
                        (candidate) => candidate.name === perkName,
                      );
                      const group = perk?.slot
                        ? `Perk ${perk.slot.slice(-1)}`
                        : "Perk";

                      return (
                        <div
                          key={perkName}
                          className="flex min-w-0 items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.025] p-3"
                        >
                          <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-black/25 p-2">
                            {perk?.imageUrl ? (
                              <img
                                src={perk.imageUrl}
                                alt=""
                                className="size-full object-contain"
                              />
                            ) : (
                              <Shield className="size-5 text-white/25" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="block font-mono text-[10px] uppercase tracking-[0.1em] text-teritary">
                              {group}
                            </span>
                            <span className="mt-1 block truncate font-mono text-sm uppercase">
                              {perkName}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-sm text-teritary">None selected</span>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-white/[0.08] p-4">
              <div className="flex items-center gap-2">
                <Puzzle className="size-4 text-teritary" />
                <h3 className="text-sm">Equipment</h3>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {(["throwable", "tactical", "field_upgrade"] as const).map(
                  (slot) => {
                    const equipment = loadout.equipment?.find(
                      (item) => item.slot === slot,
                    );
                    return (
                      <div
                        key={slot}
                        className="rounded-lg bg-white/[0.035] px-3 py-2"
                      >
                        <span className="block text-[10px] uppercase tracking-[0.08em] text-teritary">
                          {slot === "field_upgrade" ? "Field upgrade" : slot}
                        </span>
                        <span className="mt-1 block truncate text-sm">
                          {equipment?.name ?? "Not selected"}
                        </span>
                      </div>
                    );
                  },
                )}
              </div>
            </section>
          </div>
        </Container>
      )}

      <SignInRequiredDialog
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        returnTo={location.pathname + location.search}
      />
    </AppLayout>
  );
}
