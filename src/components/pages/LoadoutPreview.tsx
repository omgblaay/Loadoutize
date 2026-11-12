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
import { findAttachmentForWeapon, preferWeaponAttachment } from "@/lib/attachmentLookup";
import {
  builderAttachmentDisplayName,
  type BuilderRelationAsset,
} from "@/lib/weaponBuilderRelations";
import {
  builderAttachmentImageUrl,
  loadBuilderAttachmentAssets,
} from "@/lib/builderAttachmentImages";
import { visibleWeaponCatalog } from "@/lib/weaponCategories";
import gameLogoImage from "@/assets/mw4_logo_breadcrumb.png";
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
import {
  BreadcrumbLink,
  BreadcrumbSpacer,
} from "@/components/molecules/Breadcrumb";
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
const gameLogo = gameLogoImage.src;

const CONTAINER_TITLE_CLASS =
  "font-mono text-xs font-medium uppercase tracking-[0.12em] text-teritary";

function VoteControl({
  likes,
  dislikes,
  liked,
  disliked,
  onLike,
  onDislike,
}: {
  likes: number;
  dislikes: number;
  liked: boolean;
  disliked: boolean;
  onLike: () => Promise<boolean>;
  onDislike: () => Promise<boolean>;
}) {
  const [pending, setPending] = useState<"like" | "dislike" | null>(null);
  const handleVote = async (type: "like" | "dislike") => {
    if (pending) return;
    setPending(type);
    try {
      await (type === "like" ? onLike() : onDislike());
    } finally {
      setPending(null);
    }
  };

  return (
    <div
      role="group"
      aria-label="Rate loadout"
      className="inline-flex shrink-0 items-center rounded-xl border border-white/[0.12] bg-white/[0.035] p-1"
    >
      <button
        type="button"
        aria-label={`Like loadout, ${likes} likes`}
        aria-pressed={liked}
        disabled={pending !== null}
        onClick={() => void handleVote("like")}
        className={cn(
          "flex h-9 min-w-[72px] items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium tabular-nums transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-wait",
          liked ? "bg-emerald-400/10 text-emerald-200" : "text-secondary",
        )}
      >
        {pending === "like" ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <ThumbsUp className="size-4" fill={liked ? "currentColor" : "none"} />
        )}
        <span>{likes}</span>
      </button>
      <span aria-hidden="true" className="mx-1 h-5 w-px bg-white/10" />
      <button
        type="button"
        aria-label={`Dislike loadout, ${dislikes} dislikes`}
        aria-pressed={disliked}
        disabled={pending !== null}
        onClick={() => void handleVote("dislike")}
        className={cn(
          "flex h-9 min-w-[72px] items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium tabular-nums transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-wait",
          disliked ? "bg-rose-400/10 text-rose-200" : "text-secondary",
        )}
      >
        {pending === "dislike" ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <ThumbsDown
            className="size-4"
            fill={disliked ? "currentColor" : "none"}
          />
        )}
        <span>{dislikes}</span>
      </button>
    </div>
  );
}

function WeaponPreviewCaption({
  weapon,
  gameId,
}: {
  weapon?: CardWeapon;
  gameId: string;
}) {
  const weaponType = weapon?.typeShort || weapon?.type;
  return (
    <div className="absolute left-0 top-0 z-[4] max-w-[min(85%,20rem)] rounded-lg bg-[#0a0909]/80 px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-sm">
      {weapon ? (
        <div className="font-mono text-sm font-semibold uppercase flex items-center gap-4 cursor-auto leading-tight">
          {weaponType && (
            <>
              <Link
                to={weaponMetaListPath(gameId, weapon.type ?? undefined)}
                className="text-teritary hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                {weaponType}
              </Link>
              <span className="text-teritary cursor-auto"> / </span>
            </>
          )}
          <Link
            to={weaponMetaPath(gameId, weapon.id)}
            className="inline-flex items-center gap-1.5 text-white hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            {weapon.imageUrl && (
              <img
                src={weapon.imageUrl}
                alt=""
                className="w-10 shrink-0 cursor-pointer object-contain"
              />
            )}
            {weapon.name}
          </Link>
        </div>
      ) : (
        <span className="font-mono text-sm uppercase cursor-pointer text-secondary">
          Not selected
        </span>
      )}
    </div>
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
  const [relationAssets, setRelationAssets] = useState<BuilderRelationAsset[]>(
    [],
  );
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
        .catch((error) =>
          console.error("Error fetching attachment assets:", error),
        );
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

  /** Performs the reaction toggle and resolves to whether `type` is now active. */
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
    () => {
      const index = new Map<string, CardAttachment[]>();
      for (const attachment of catalogAttachments) {
        const key = `${attachment.type}:${attachment.name}`;
        const matches = index.get(key) ?? [];
        matches.push(attachment);
        index.set(key, matches);
      }
      return index;
    },
    [catalogAttachments],
  );
  const indexedAttachment = (slot: string, name: string, weaponId: string) =>
    preferWeaponAttachment(attachmentIndex.get(`${slot}:${name}`) ?? [], weaponId);
  const relationAssetsById = React.useMemo(
    () => new Map(relationAssets.map((asset) => [asset.id, asset])),
    [relationAssets],
  );
  const attachmentLabel = (
    attachment: CardAttachment | undefined,
    weaponId: string | undefined,
    fallback: string,
  ) =>
    attachment?.displayName ||
    attachment?.stats?.displayName ||
    (gameId === "mw4"
      ? builderAttachmentDisplayName(
          attachment?.stats?.assetId,
          weaponId,
          relationAssetsById,
          fallback,
        )
      : fallback);
  const attachmentSubtypeLabel = (attachment: CardAttachment | undefined) =>
    attachment?.subtypeLabel ||
    attachment?.stats?.subtypeLabel ||
    (attachment?.stats?.assetId
      ? relationAssetsById.get(attachment.stats.assetId)?.subtype_label
      : null) ||
    null;
  const attachmentIconUrl = (attachment: CardAttachment | undefined) =>
    attachment?.imageUrl ||
    (gameId === "mw4"
      ? builderAttachmentImageUrl(
          attachment?.stats?.assetId,
          relationAssetsById,
          attachment?.name,
        )
      : null) ||
    attachment?.stats?.imagePath ||
    null;

  const primaryAttachments = React.useMemo(() => {
    if (!primaryWeapon?.attachments) return [];

    return orderedAttachmentEntries(primaryWeapon.attachments).map(
      ([slot, value]) => {
        const attachment = indexedAttachment(slot, value, primaryWeapon.id);
        return {
          key: slot,
          attachmentId: attachment?.id,
          assetId: attachment?.stats?.assetId,
          typeSlug: attachment?.typeSlug || slot,
          label: attachmentLabel(attachment, primaryWeapon.id, value),
          subtypeLabel: attachmentSubtypeLabel(attachment),
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
        const attachment = indexedAttachment(slot, value, secondaryWeapon.id);
        return {
          key: slot,
          attachmentId: attachment?.id,
          assetId: attachment?.stats?.assetId,
          typeSlug: attachment?.typeSlug || slot,
          label: attachmentLabel(attachment, secondaryWeapon.id, value),
          subtypeLabel: attachmentSubtypeLabel(attachment),
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
      const attachment = findAttachmentForWeapon(catalogAttachments, slot, value, primaryWeapon?.id);
      if (!attachment) return null;
      return {
        key: slot,
        assetId: attachment.stats?.assetId,
        typeSlug: attachment.typeSlug || slot,
        label: attachmentLabel(attachment, primaryWeapon?.id, attachment.name),
        subtypeLabel: attachmentSubtypeLabel(attachment),
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
      const attachment = findAttachmentForWeapon(catalogAttachments, slot, value, secondaryWeapon?.id);
      if (!attachment) return null;
      return {
        key: slot,
        assetId: attachment.stats?.assetId,
        typeSlug: attachment.typeSlug || slot,
        label: attachmentLabel(
          attachment,
          secondaryWeapon?.id,
          attachment.name,
        ),
        subtypeLabel: attachmentSubtypeLabel(attachment),
        iconUrl: attachmentIconUrl(attachment),
        isApex: slot.toLowerCase() === "apex",
      } satisfies WeaponImageBadge;
    })
    .filter((badge) => badge !== null);
  const isFullLoadout = loadout.contentType === "full_loadout";
  const shareUrl = window.location.href;
  const voteCount = loadout.likes + loadout.dislikes;
  const authorName = loadout.authorNickname || loadout.userName || "Player";
  const authorAvatar = (
    <div className="flex size-6 md:size-10 shrink-0 self-center items-baseline justify-center overflow-hidden rounded-full border border-white/10 bg-white/[0.04] text-xs font-semibold">
      {loadout.authorAvatarUrl ? (
        <img
          src={loadout.authorAvatarUrl}
          alt=""
          className="size-full object-cover"
        />
      ) : (
        (authorName[0]?.toUpperCase() ?? "U")
      )}
    </div>
  );

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
                className="inline-flex items-center gap-1.5"
              >
                {primaryWeaponCatalog.imageUrl && (
                  <img
                    src={primaryWeaponCatalog.imageUrl}
                    alt=""
                    className="size-5 shrink-0 object-contain"
                  />
                )}
                {primaryWeaponCatalog.name}
              </BreadcrumbLink>
            </>
          )}
        </>
      }
    >
      <header className="border-b border-white/[0.08] pb-5">
        <div className="flex min-w-0 items-center justify-between gap-4">
          <div className="min-w-0">
            {titleTag && (
              <span
                className="font-handwritten text-[clamp(1.5rem,2.5vw,2.25rem)] leading-none"
                style={{ color: titleTag.color }}
              >
                {titleTag.name}
              </span>
            )}
            <h1
              className={cn(
                "wrap-anywhere text-[clamp(0.5rem,3.5vw,2.75rem)] flex-inline font-semibold leading-[1.1] tracking-[-0.025em]",
                titleTag && "mt-1",
              )}
            >
              {loadout.authorNickname ? (
                <Link
                  to={`/u/${loadout.authorNickname}`}
                  className="mr-2 inline-flex items-baseline gap-2 align-baseline font-normal leading-[1.1] text-secondary hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  {authorAvatar}
                  <span>{authorName}'s</span>
                </Link>
              ) : (
                <span className="mr-2 inline-flex items-baseline gap-2 align-baseline font-normal leading-[1.1] text-secondary">
                  {authorAvatar}
                  <span>{authorName}'s</span>
                </span>
              )}
              <span>{loadout.name}</span>
            </h1>
          </div>
          <RatingRing
            percent={loadout.ratingPercent}
            votes={voteCount}
            size={72}
            innerClassName="border border-white/5"
            fallbackLabel="New"
          />
        </div>

        {loadout.authorLinks &&
          SOCIAL_LINK_FIELDS.some(({ key }) => loadout.authorLinks![key]) && (
            <div className="mt-3 flex flex-wrap items-center gap-1">
              {SOCIAL_LINK_FIELDS.filter(
                ({ key }) => loadout.authorLinks![key],
              ).map(({ key, label, icon: Icon, url }) => {
                const count = formatCount(loadout.authorSocialStats?.[key]);
                return (
                  <Button
                    key={key}
                    asChild
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                  >
                    <a
                      href={url(loadout.authorLinks![key]!)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                    >
                      <Icon className="size-3.5" />
                      <span className="text-[10px] text-teritary font-mono">
                        {count ?? "—"}
                      </span>
                    </a>
                  </Button>
                );
              })}
            </div>
          )}
      </header>

      <div
        className={cn(
          "grid grid-cols-1 gap-6 items-start",
          isFullLoadout ? "md:grid-cols-2" : "grid-cols-1",
        )}
      >
        {/* Weapon build */}
        <Container
          className={
            !isFullLoadout ? "!border-0 !bg-transparent !p-0" : undefined
          }
        >
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
                  <VoteControl
                    likes={loadout.likes}
                    dislikes={loadout.dislikes}
                    liked={loadout.liked}
                    disliked={loadout.disliked}
                    onLike={() => react("like")}
                    onDislike={() => react("dislike")}
                  />
                </>
              }
            />
          )}

          <div
            className={cn(
              "relative isolate flex w-full flex-col items-center gap-2 py-4",
              !isFullLoadout &&
                "min-h-[240px] justify-center py-8 md:min-h-[440px]",
            )}
          >
            {gameId === "mw4" &&
              primaryWeapon?.id &&
              getWeaponPreviewRef(primaryWeapon.id) && <WeaponPreviewSmoke />}
            <WeaponPreviewCaption
              weapon={primaryWeaponCatalog}
              gameId={gameId}
            />
            <div className="absolute right-0 top-0 z-[4] hidden sm:block">
              <VoteControl
                likes={loadout.likes}
                dislikes={loadout.dislikes}
                liked={loadout.liked}
                disliked={loadout.disliked}
                onLike={() => react("like")}
                onDislike={() => react("dislike")}
              />
            </div>
            <div
              className={cn(
                "relative z-[1] flex w-full justify-center",
                isFullLoadout
                  ? "max-w-[300px] sm:max-w-none"
                  : "max-w-[260px] sm:max-w-sm",
              )}
            >
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
                fitSpriteToBounds
                activeBadgeKey={activeKey}
                onBadgeHover={setActiveKey}
              />
            </div>
          </div>
          <div className="flex justify-center sm:hidden">
            <VoteControl
              likes={loadout.likes}
              dislikes={loadout.dislikes}
              liked={loadout.liked}
              disliked={loadout.disliked}
              onLike={() => react("like")}
              onDislike={() => react("dislike")}
            />
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
                    <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/[0.035] p-1">
                      {att.iconUrl ? (
                        <img
                          src={att.iconUrl}
                          alt=""
                          className="size-full object-contain"
                        />
                      ) : (
                        <span className="text-xs font-semibold text-white/70">
                          {att.label.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      {att.attachmentId ? (
                        <Link
                          to={attachmentMetaPath(
                            gameId,
                            String(att.attachmentId),
                          )}
                          className="font-medium hover:underline focus-visible:underline outline-offset-4"
                        >
                          {att.label}
                        </Link>
                      ) : (
                        <span className="font-medium">{att.label}</span>
                      )}
                      <span className="text-[10px] uppercase tracking-[0.12em] text-teritary">
                        {att.subtypeLabel || att.typeSlug}
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
            {secondaryWeapon && secondaryWeaponCatalog ? (
              <>
                <div className="relative flex flex-col items-center gap-2 py-4">
                  <WeaponPreviewCaption
                    weapon={secondaryWeaponCatalog}
                    gameId={gameId}
                  />
                  <div
                    className="relative mx-auto max-w-[300px] sm:max-w-none"
                    style={{
                      background: `radial-gradient(ellipse at center, ${titleTag?.color || null}14, transparent 70%)`,
                    }}
                  >
                    <WeaponImage
                      imageUrl={secondaryWeaponCatalog.imageUrl}
                      weaponId={secondaryWeapon.id}
                      badges={secondaryWeaponBadges}
                      enableSpritePreview={gameId === "mw4"}
                      fitSpriteToBounds
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
                        <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.035] p-1">
                          {attachment.iconUrl ? (
                            <img
                              src={attachment.iconUrl}
                              alt=""
                              className="size-full object-contain"
                            />
                          ) : (
                            <span className="text-xs font-semibold text-white/70">
                              {attachment.label.slice(0, 2).toUpperCase()}
                            </span>
                          )}
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
                            {attachment.subtypeLabel || attachment.typeSlug}
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
            <h2 className={CONTAINER_TITLE_CLASS}>Build notes</h2>
            {loadout.description ? (
              <blockquote className="whitespace-pre-wrap break-words text-base leading-relaxed text-secondary">
                {loadout.description
                  .split(/(https:\/\/[^\s]+)/g)
                  .map((part, index) =>
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
                    <Container>
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
                    </Container>
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
                <h2 className={CONTAINER_TITLE_CLASS}>Share loadout</h2>
                <p className="text-[12px] text-[#8d898a] break-all">
                  {shareUrl}
                </p>
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
          <h2 className={CONTAINER_TITLE_CLASS}>Perks, equipment & melee</h2>

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
                          fitSpriteToBounds
                        />
                      </div>
                      <p className="font-mono text-sm uppercase">
                        {catalogWeapon.name}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {orderedAttachmentEntries(weapon.attachments).map(
                          ([slot, name]) => {
                            const attachment = indexedAttachment(slot, name, weapon.id);
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
                                {attachment.displayName ??
                                  attachment.stats?.displayName ??
                                  name}
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
