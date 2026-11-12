import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { useAuth } from "@/providers/AuthProvider";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { gameMeta } from "@/lib/games";
import { AppLayout } from "@/components/templates/AppLayout";
import {
  ArrowLeft,
  Plus,
  Search,
  ChevronRight,
  Check,
  Ban,
  X,
  Download,
  Crosshair,
  Layers3,
  Shield,
  Bomb,
  Radio,
} from "lucide-react";
import { WeaponCard } from "@/components/organisms/WeaponCard";
import { AttachmentIcon } from "@/components/atoms/AttachmentIcon";
import { apexAttachmentIconUrl } from "@/lib/apexAttachmentIcon";
import { AttachmentGroupIcon } from "@/components/atoms/AttachmentGroupIcon";
import { builderAttachmentImageUrl } from "@/lib/builderAttachmentImages";
import {
  WeaponImage,
  type WeaponImageBadge,
} from "@/components/molecules/WeaponImage";
import { Tag } from "@/components/atoms/Tag";
import {
  BreadcrumbLink,
  BreadcrumbSpacer,
} from "@/components/molecules/Breadcrumb";
import { FilterPill, FilterPillGroup } from "@/components/molecules/FilterPill";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/molecules/ToggleGroup";
import { ResponsiveDialog } from "@/components/molecules/ResponsiveDialog";
import { Skeleton } from "@/components/atoms/Skeleton";
import { cn } from "@/lib/utils";
import {
  sortWeaponCategories,
  visibleWeaponCatalog,
} from "@/lib/weaponCategories";
import {
  applyBuilderRelations,
  attachmentAllowedByApex,
  builderAttachmentDisplayName,
  getBuilderApexRelation,
  mw4MuzzleAllowed,
  mw4UnderbarrelAllowed,
  AR_OPTIC_IDS,
  arAllowsOptic,
  SMG_OPTIC_IDS,
  smgAllowsOptic,
  AR_LASER_IDS,
  arAllowsLaser,
  VEL_AMMUNITION_IDS,
  velAllowsAmmunition,
  rezi12NoStockBlocksComb,
  strigaDreadlineSelected,
  type BuilderRelationAsset,
} from "@/lib/weaponBuilderRelations";
import { normalizePreviewSlot } from "@/lib/weaponSpritePreview";
import { detectVideoPlatform, VIDEO_PLATFORM_META } from "@/lib/video";
import { Container } from "@/components/atoms/Container";
import { Button } from "@/components/atoms/Button";
import {
  getRecaptchaToken,
  RecaptchaNotice,
} from "@/components/molecules/Recaptcha";
import { explorePath, gamePath, loadoutPath } from "@/lib/routes";
import { FULL_LOADOUTS_ENABLED } from "@/lib/contentVisibility";
import {
  QRCodeCanvas,
  generateBrandedQRPng,
} from "@/components/molecules/QRCode";

interface Weapon {
  imageUrl: string | null | undefined;
  id: string;
  name: string;
  type: string | null;
  typeShort: string | null;
  categoryId: number | null;
  damage: number;
  fireRate: number;
}

interface SelectedWeapon extends Weapon {
  slot: WeaponSlot;
  attachments: Record<string, string>;
}

interface Attachment {
  id: string;
  name: string;
  type: string;
  typeSlug: string;
  typeImageUrl: string | null;
  imageUrl?: string | null;
  weaponIds?: string[] | null;
  displayName?: string;
  subtypeLabel?: string | null;
  stats?: {
    assetId?: string;
    weaponIds?: string[];
    displayName?: string;
    subtypeLabel?: string;
    builderSelectable?: boolean;
    imagePath?: string;
    muzzleOrder?: number;
    underbarrelOrder?: number;
  } | null;
}

interface Perk {
  id: number;
  name: string;
  slot: PerkSlot | null;
  displayOrder: number;
  imageUrl?: string | null;
}

interface Equipment {
  id: number;
  name: string;
  slot: EquipmentSlot | null;
  imageUrl?: string | null;
}

type ContentType = "full_loadout" | "weapon_config";
type WeaponSlot = "primary" | "secondary" | "melee";
type PerkSlot = "perk_1" | "perk_2" | "perk_3";
type EquipmentSlot = "throwable" | "tactical" | "field_upgrade";

interface EquipmentSelection {
  name: string;
  slot: EquipmentSlot;
  isAny?: boolean;
}

interface LoadoutTag {
  id: number;
  name: string;
  color: string;
  allowedWeaponCategoryIds: number[];
}

// What the API now returns per weapon slot on a loadout -- just the catalog
// weapon id + chosen attachments. Full weapon details (name/type/image/etc.)
// are resolved against the already-fetched catalog `weapons` list by id.
interface LoadoutWeaponRef {
  id: string;
  slot?: WeaponSlot;
  attachments: Record<string, string>;
}

const WEAPON_SLOTS: { id: WeaponSlot; label: string; description: string }[] = [
  { id: "primary", label: "Primary", description: "Main weapon" },
  {
    id: "secondary",
    label: "Secondary",
    description: "Sidearm and attachments",
  },
  { id: "melee", label: "Melee", description: "Close-range backup" },
];

const EQUIPMENT_SLOTS: {
  id: EquipmentSlot;
  label: string;
  icon: typeof Bomb;
}[] = [
  { id: "throwable", label: "Throwable", icon: Bomb },
  { id: "tactical", label: "Tactical", icon: Crosshair },
  { id: "field_upgrade", label: "Field upgrade", icon: Radio },
];

const PERK_GROUPS: { id: PerkSlot; label: string }[] = [
  { id: "perk_1", label: "Perk 1" },
  { id: "perk_2", label: "Perk 2" },
  { id: "perk_3", label: "Perk 3" },
];

const allowsAnyAttachment = (type: string) =>
  type.trim().toLowerCase() !== "apex";

const MIN_REQUIRED_ATTACHMENTS = 1;
const MAX_STANDARD_ATTACHMENTS = 5;
const isApexAttachmentType = (type: string) =>
  type.trim().toLowerCase() === "apex";
const ANY_ATTACHMENT_VALUE = "__any__";

function FinishActionLabel({
  saving,
  editing,
}: {
  saving: boolean;
  editing: boolean;
}) {
  return (
    <>
      <span className="flex size-6 items-center justify-center rounded-full bg-black/10 transition-transform duration-300 group-hover/finish:scale-110 group-active/finish:scale-90">
        <Check
          className={cn(
            "size-4 transition-transform duration-300 group-hover/finish:-rotate-6 group-hover/finish:scale-110",
            saving && "animate-pulse",
          )}
          strokeWidth={2.5}
        />
      </span>
      {saving ? "Finishing…" : editing ? "Finish editing" : "Finish creating"}
    </>
  );
}

/** Searchable list shown inside the attachment ResponsiveDialog -- a fresh instance mounts each
 * time the dialog opens (the caller only renders it while a type is open), so its search query
 * resets for free instead of needing to be cleared manually. */
function AttachmentPickerList({
  options,
  selected,
  allowAny,
  onSelect,
  onDeselect,
}: {
  options: Attachment[];
  selected: string | undefined;
  allowAny: boolean;
  onSelect: (name: string) => void;
  onDeselect: () => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = options.filter((att) =>
    [att.displayName ?? att.name, att.subtypeLabel].some((value) =>
      value?.toLowerCase().includes(query.trim().toLowerCase()),
    ),
  );

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search attachments..."
        className="h-11 rounded-xl bg-white/[0.04] border border-white/[0.07] px-4 text-[14px]  placeholder:text-[#8d898a] outline-none focus:border-white/30 transition-colors"
      />

      {allowAny && (
        <button
          type="button"
          onClick={() => onSelect(ANY_ATTACHMENT_VALUE)}
          className={cn(
            "flex h-12 shrink-0 items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors",
            selected === ANY_ATTACHMENT_VALUE
              ? "bg-[#fafafa] text-[#161414]"
              : " hover:bg-white/[0.05]",
          )}
        >
          <div className="flex size-6 shrink-0 items-center justify-center opacity-50 font-mono text-3xl font-semibold">
            ∞
          </div>
          <span className="min-w-0 flex-1">
            <span className="block font-medium">Any</span>
            <span
              className={cn(
                "block truncate text-xs",
                selected === ANY_ATTACHMENT_VALUE
                  ? "text-black/55"
                  : "text-teritary",
              )}
            >
              No specific attachment required
            </span>
          </span>
          {selected === ANY_ATTACHMENT_VALUE && (
            <Check className="size-4 shrink-0" />
          )}
        </button>
      )}

      {selected && (
        <button
          type="button"
          onClick={onDeselect}
          className="h-11 px-4 rounded-xl border border-[#d4183d]/30 flex items-center justify-between text-[14px] text-[#ef9696] hover:border-[#d4183d]/60 transition-colors"
        >
          Clear{" "}
          {selected === ANY_ATTACHMENT_VALUE
            ? "Any"
            : (options.find((option) => option.name === selected)
                ?.displayName ?? selected)}
          <X className="w-4 h-4" />
        </button>
      )}

      <div className="flex flex-col gap-1 max-h-[min(60vh,420px)] overflow-y-auto -mx-1 px-1">
        {filtered.length === 0 ? (
          <p className="text-[14px] text-[#8d898a] py-4 text-center">
            No attachments match your search.
          </p>
        ) : (
          filtered.map((att) => {
            const isSelected = selected === att.name;
            return (
              <button
                key={att.id}
                type="button"
                onClick={() => onSelect(att.name)}
                className={cn(
                  "flex items-center gap-3 min-h-14 px-3 py-2 rounded-lg text-left text-[14px] transition-colors shrink-0",
                  isSelected
                    ? "bg-[#fafafa] text-[#161414]"
                    : " hover:bg-white/[0.05]",
                )}
              >
                <AttachmentIcon attachment={att} className="size-8" />
                <span className="flex-1 min-w-0">
                  <span className="block truncate">
                    {att.displayName ?? att.name}
                  </span>
                  {att.subtypeLabel && att.subtypeLabel !== att.displayName && (
                    <span className="block truncate text-xs text-teritary">
                      {att.subtypeLabel}
                    </span>
                  )}
                </span>
                {isSelected && <Check className="w-4 h-4 shrink-0" />}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function TagOption({
  tag,
  isSelected,
  disabled,
}: {
  tag: LoadoutTag;
  isSelected: boolean;
  disabled: boolean;
}) {
  return (
    <ToggleGroupItem
      value={String(tag.id)}
      disabled={disabled}
      title={
        disabled
          ? "Not available for the weapon category(ies) in this loadout"
          : undefined
      }
      className="h-auto min-w-0 py-2 px-4 bg-transparent hover:bg-transparent hover:text-inherit data-[state=on]:bg-transparent data-[state=on]:text-inherit data-[state=on]:hover:bg-transparent transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
      style={
        isSelected
          ? {
              background: `${tag.color} 20%`,
              color: "#f1f1f1",
              outlineOffset: 2,
            }
          : undefined
      }
    >
      {/* <div className="w-2 h-2 rounded-full" style={!isSelected ? { background: `${tag.color}`} : undefined}/> */}
      <p
        className="font-handwritten text-xl flex"
        style={{ color: isSelected ? "#ffffff" : tag.color }}
      >
        {tag.name}
      </p>
    </ToggleGroupItem>
  );
}

function LoadoutBuilderSkeleton() {
  const block = "bg-white/[0.06]";

  return (
    <>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Skeleton className={cn("rounded-xl w-14 h-14", block)} />
        <div className="flex flex-col flex-1 gap-2">
          <Skeleton className={cn("h-8 w-64", block)} />
          <Skeleton className={cn("h-4 w-80 max-w-full", block)} />
        </div>
        <Skeleton className={cn("h-[52px] w-32 rounded-xl", block)} />
      </div>

      <Container>
        <Skeleton className={cn("h-5 w-40", block)} />
        <div className="flex flex-col gap-4">
          <Skeleton className={cn("h-12 rounded-xl", block)} />
          <Skeleton className={cn("h-20 rounded-xl", block)} />
          <Skeleton className={cn("h-12 rounded-xl", block)} />
          <Skeleton className={cn("h-12 rounded-xl", block)} />
        </div>
      </Container>

      <Container>
        <Skeleton className={cn("h-5 w-32", block)} />
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton
              key={i}
              className={cn("rounded-2xl aspect-square", block)}
            />
          ))}
        </div>
      </Container>
    </>
  );
}

export function LoadoutBuilder() {
  const { gameId = "mw4" } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const requestedType = searchParams.get("type");
  const { user, accessToken, loading: authLoading } = useAuth();

  const [loadoutName, setLoadoutName] = useState("");
  const [contentType, setContentType] = useState<ContentType | null>(
    !FULL_LOADOUTS_ENABLED
      ? "weapon_config"
      : requestedType === "full_loadout" || requestedType === "weapon_config"
        ? requestedType
        : editId
          ? "weapon_config"
          : null,
  );
  const [loadoutNameError, setLoadoutNameError] = useState("");
  const [loadoutDescription, setLoadoutDescription] = useState("");
  const [gameLoadoutCode, setGameLoadoutCode] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoError, setVideoError] = useState("");
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [selectedWeapons, setSelectedWeapons] = useState<SelectedWeapon[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [relationAssets, setRelationAssets] = useState<BuilderRelationAsset[]>(
    [],
  );
  const [relationRulesReady, setRelationRulesReady] = useState(false);
  const [relationRulesFailed, setRelationRulesFailed] = useState(false);
  const [availablePerks, setAvailablePerks] = useState<Perk[]>([]);
  const [selectedPerks, setSelectedPerks] = useState<string[]>([]);
  const [availableEquipment, setAvailableEquipment] = useState<Equipment[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<
    EquipmentSelection[]
  >([]);
  const [tags, setTags] = useState<LoadoutTag[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [pendingWeaponRefs, setPendingWeaponRefs] = useState<
    LoadoutWeaponRef[] | null
  >(null);
  const [weaponTypeFilter, setWeaponTypeFilter] = useState<string | null>(null);
  const [pickingWeapon, setPickingWeapon] = useState(false);
  const [activeWeaponSlot, setActiveWeaponSlot] =
    useState<WeaponSlot>("primary");
  const [openAttachmentType, setOpenAttachmentType] = useState<string | null>(
    null,
  );
  const [openEquipmentSlot, setOpenEquipmentSlot] =
    useState<EquipmentSlot | null>(null);
  const [weaponSearchOpen, setWeaponSearchOpen] = useState(false);
  const [weaponSearchQuery, setWeaponSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createdLoadoutId, setCreatedLoadoutId] = useState<string | null>(null);
  const [downloadingQr, setDownloadingQr] = useState(false);
  const [attachmentRequirementOpen, setAttachmentRequirementOpen] =
    useState(false);
  const [attachmentError, setAttachmentError] = useState(false);

  const selectedAttachmentCount = selectedWeapons.reduce(
    (total, weapon) =>
      total +
      Object.entries(weapon.attachments ?? {}).filter(
        ([type, name]) => !isApexAttachmentType(type) && Boolean(name),
      ).length,
    0,
  );

  useEffect(() => {
    if (selectedAttachmentCount >= MIN_REQUIRED_ATTACHMENTS) {
      setAttachmentError(false);
    }
  }, [selectedAttachmentCount]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate(explorePath(gameId));
    }
  }, [user, authLoading, gameId, navigate]);

  useEffect(() => {
    if (gameId) {
      fetchWeapons();
      fetchAttachments();
      setRelationRulesReady(gameId !== "mw4");
      setRelationRulesFailed(false);
      if (gameId === "mw4") {
        fetch(
          "/weapon-preview/weapon-builder/catalog.json?v=20261110-underbarrels",
          { cache: "no-cache" },
        )
          .then((response) => {
            if (!response.ok)
              throw new Error("Could not load weapon builder rules");
            return response.json();
          })
          .then((catalog: { assets: BuilderRelationAsset[] }) => {
            setRelationAssets(catalog.assets);
            setRelationRulesReady(true);
          })
          .catch((error) => {
            console.error("Error fetching weapon builder rules:", error);
            setRelationRulesFailed(true);
          });
      } else {
        setRelationAssets([]);
      }
      fetchPerks();
      fetchEquipment();
      fetchTags();
      if (editId) {
        loadExistingLoadout();
      }
    }
  }, [gameId, editId]);

  const fetchWeapons = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/weapons`,
        {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
          cache: "no-store",
        },
      );
      const data = await response.json();
      if (data.weapons) {
        setWeapons(
          visibleWeaponCatalog(
            (data.weapons as Weapon[]).map((weapon) =>
              gameId === "mw4" && weapon.id === "rex_sm_fmgolf"
                ? { ...weapon, name: "CSG-35" }
                : weapon,
            ),
          ),
        );
      }
    } catch (error) {
      console.error("Error fetching weapons:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttachments = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/attachments`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } },
      );
      const data = await response.json();
      if (data.attachments) {
        setAttachments(
          (data.attachments as Attachment[])
            .filter(
              (attachment) =>
                attachment.stats?.builderSelectable !== false &&
                !(
                  gameId === "mw4" &&
                  ["iron_sights", "other"].includes(
                    normalizePreviewSlot(
                      attachment.typeSlug || attachment.type,
                    ),
                  )
                ),
            )
            .map((attachment) => ({
              ...attachment,
              weaponIds:
                attachment.weaponIds ?? attachment.stats?.weaponIds ?? null,
              displayName:
                attachment.displayName ?? attachment.stats?.displayName,
              subtypeLabel:
                attachment.subtypeLabel ??
                attachment.stats?.subtypeLabel ??
                null,
              imageUrl:
                attachment.imageUrl ?? attachment.stats?.imagePath ?? null,
            })),
        );
      }
    } catch (error) {
      console.error("Error fetching attachments:", error);
    }
  };

  const fetchPerks = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/perks`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } },
      );
      const data = await response.json();
      if (data.perks) setAvailablePerks(data.perks);
    } catch (error) {
      console.error("Error fetching perks:", error);
    }
  };

  const fetchEquipment = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/equipment`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } },
      );
      const data = await response.json();
      if (data.equipment) setAvailableEquipment(data.equipment);
    } catch (error) {
      console.error("Error fetching equipment:", error);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/tags`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } },
      );
      const data = await response.json();
      if (data.tags) setTags(data.tags);
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  };

  const loadExistingLoadout = async () => {
    if (!accessToken) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/my-loadouts`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      const data = await response.json();
      const loadout = data.loadouts?.find((l: any) => l.id === editId);
      if (loadout) {
        setLoadoutName(loadout.name);
        if (!FULL_LOADOUTS_ENABLED && loadout.contentType === "full_loadout") {
          navigate(explorePath(gameId));
          return;
        }
        setContentType(loadout.contentType ?? "weapon_config");
        setLoadoutDescription(loadout.description || "");
        setGameLoadoutCode(loadout.gameLoadoutCode || "");
        setVideoUrl(loadout.video?.url || "");
        setPendingWeaponRefs(
          (loadout.weapons || []).map((w: any) => ({
            id: w.id,
            slot: w.slot,
            attachments: w.attachments ?? {},
          })),
        );
        setSelectedPerks(loadout.perks || []);
        setSelectedEquipment(
          (loadout.equipment || []).filter(
            (item: EquipmentSelection) => item?.name && item?.slot,
          ),
        );
        setSelectedTagId(loadout.tagId ?? null);
      }
    } catch (error) {
      console.error("Error loading loadout:", error);
    }
  };

  const saveLoadout = async () => {
    if (!relationRulesReady) {
      toast.error(
        relationRulesFailed
          ? "Weapon rules could not load"
          : "Weapon rules are still loading",
        {
          description: relationRulesFailed
            ? "Refresh the page and try again."
            : "Wait for the builder rules to load before saving.",
        },
      );
      return;
    }
    const nameMissing = !loadoutName.trim();
    const attachmentsMissing =
      selectedAttachmentCount < MIN_REQUIRED_ATTACHMENTS;
    const trimmedVideoUrl = videoUrl.trim();
    const videoInvalid =
      Boolean(trimmedVideoUrl) && !detectVideoPlatform(trimmedVideoUrl);

    setLoadoutNameError(nameMissing ? "A loadout name is required." : "");
    setAttachmentError(attachmentsMissing);
    setVideoError(
      videoInvalid ? "Video must be a TikTok, Instagram, or YouTube link" : "",
    );

    if (nameMissing) {
      toast.error("Loadout name is missing", {
        description: "Give your loadout a name before finishing.",
      });
      return;
    }

    if (
      selectedTagId == null ||
      !tags.some((tag) => tag.id === selectedTagId && isTagAllowed(tag))
    ) {
      toast.error("Choose a tag", {
        description: "Every loadout needs a tag before it can be saved.",
      });
      return;
    }

    if (attachmentsMissing) {
      setAttachmentRequirementOpen(true);
      return;
    }

    if (!accessToken) {
      toast.error("Sign in required", {
        description: "You must be signed in to save a loadout.",
      });
      return;
    }

    if (!contentType) return;

    if (videoInvalid) return;

    setSaving(true);
    try {
      const recaptchaToken = editId
        ? undefined
        : await getRecaptchaToken("create_loadout");

      const loadoutData = {
        name: loadoutName,
        description: loadoutDescription,
        gameLoadoutCode: gameLoadoutCode.trim() || null,
        videoUrl: trimmedVideoUrl || null,
        contentType,
        weapons: selectedWeapons.map((weapon) => ({
          ...weapon,
          attachments: Object.fromEntries(
            Object.entries(
              applyBuilderRelations(
                weapon.attachments,
                attachments,
                relationAssets,
                weapon.id,
              ),
            ).filter(([, name]) => name !== ANY_ATTACHMENT_VALUE),
          ),
        })),
        perks: selectedPerks,
        equipment: selectedEquipment,
        tagId: selectedTagId,
        recaptchaToken,
      };

      const url = editId
        ? `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/loadouts/${editId}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/loadouts`;

      const response = await fetch(url, {
        method: editId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(loadoutData),
      });

      if (response.ok) {
        const { loadout } = await response.json();
        if (editId) {
          navigate(loadoutPath(gameId, loadout.id, loadout.contentType));
        } else {
          setCreatedLoadoutId(loadout.id);
        }
      } else {
        const error = await response.json();
        console.error("Error saving loadout:", error);
        toast.error(error.error || "Failed to save loadout", {
          description: "Check your loadout and try again.",
        });
      }
    } catch (error) {
      console.error("Error saving loadout:", error);
      toast.error("Failed to save loadout", {
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const createdLoadoutPath = createdLoadoutId
    ? contentType === "full_loadout"
      ? loadoutPath(gameId, createdLoadoutId, "full_loadout")
      : loadoutPath(gameId, createdLoadoutId)
    : "";
  const createdLoadoutUrl = createdLoadoutPath
    ? new URL(createdLoadoutPath, window.location.origin).toString()
    : "";

  const downloadCreatedLoadoutQr = async () => {
    if (!createdLoadoutId || !createdLoadoutUrl) return;
    setDownloadingQr(true);
    try {
      const dataUrl = await generateBrandedQRPng(createdLoadoutUrl);
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${createdLoadoutId}-${contentType === "full_loadout" ? "loadout" : "weapon-config"}-qr.png`;
      link.click();
    } catch (error) {
      console.error("Error generating loadout QR code:", error);
      toast.error("Could not download the QR code", {
        description: "Please try again.",
      });
    } finally {
      setDownloadingQr(false);
    }
  };

  const createAnotherLoadout = () => {
    setCreatedLoadoutId(null);
    setLoadoutName("");
    setContentType(null);
    setLoadoutNameError("");
    setLoadoutDescription("");
    setGameLoadoutCode("");
    setVideoUrl("");
    setVideoError("");
    setSelectedWeapons([]);
    setSelectedPerks([]);
    setSelectedEquipment([]);
    setSelectedTagId(null);
    setWeaponTypeFilter(null);
    setPickingWeapon(false);
    setActiveWeaponSlot("primary");
    setOpenAttachmentType(null);
    setOpenEquipmentSlot(null);
    setWeaponSearchOpen(false);
    setWeaponSearchQuery("");
    setAttachmentError(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleWeapon = (weapon: Weapon) => {
    setSelectedWeapons((prev) => {
      const current = prev.find((w) => w.slot === activeWeaponSlot);
      if (current?.id === weapon.id) {
        return prev.filter((w) => w.slot !== activeWeaponSlot);
      }
      const next = prev.filter(
        (w) => w.slot !== activeWeaponSlot && w.id !== weapon.id,
      );
      next.push({ ...weapon, slot: activeWeaponSlot, attachments: {} });
      return next.sort(
        (a, b) =>
          WEAPON_SLOTS.findIndex((slot) => slot.id === a.slot) -
          WEAPON_SLOTS.findIndex((slot) => slot.id === b.slot),
      );
    });
  };

  // attachmentName is "" when the ToggleGroup reports its active item was clicked again
  // (Radix's single-select deselect) -- clear the slot instead of setting an empty value.
  const setWeaponAttachment = (
    weaponId: string,
    slot: string,
    attachmentName: string,
  ) => {
    const currentWeapon = selectedWeapons.find(
      (weapon) => weapon.id === weaponId,
    );
    const relation = getBuilderApexRelation(
      currentWeapon?.attachments ?? {},
      attachments,
      relationAssets,
    );
    if (
      attachmentName &&
      (relation?.lockedSlots.has(normalizePreviewSlot(slot)) ||
        (normalizePreviewSlot(slot) === "comb" &&
          rezi12NoStockBlocksComb(
            currentWeapon?.attachments ?? {},
            attachments,
            weaponId,
          )) ||
        (normalizePreviewSlot(slot) === "underbarrel" &&
          weaponId === "rex_sm_pmike63" &&
          !strigaDreadlineSelected(
            currentWeapon?.attachments ?? {},
            attachments,
            weaponId,
          )))
    )
      return;
    if (
      attachmentName &&
      !isApexAttachmentType(slot) &&
      !currentWeapon?.attachments[slot] &&
      !(weaponId === "rex_br_asierra12" && normalizePreviewSlot(slot) === "optic" &&
        attachments.some((attachment) => attachment.name === attachmentName && attachment.stats?.assetId === "rex_scope_asierra12") &&
        Boolean(relation?.defaultSlots.get("optic"))) &&
      selectedAttachmentCount >= MAX_STANDARD_ATTACHMENTS
    ) {
      toast.info(
        "You can select up to five standard attachments. APEX is optional and does not count toward this limit.",
      );
      return;
    }
    if (attachmentName && isApexAttachmentType(slot) && currentWeapon) {
      const next = applyBuilderRelations(
        { ...currentWeapon.attachments, [slot]: attachmentName },
        attachments,
        relationAssets,
        weaponId,
      );
      const removed = Object.keys(currentWeapon.attachments).filter(
        (type) => type !== slot && !(type in next),
      );
      if (removed.length > 0) {
        toast.info("APEX updated this build", {
          description: `Removed incompatible ${removed.join(", ")} attachment${removed.length === 1 ? "" : "s"}.`,
        });
      }
    }
    setSelectedWeapons((prev) =>
      prev.map((w) => {
        if (w.id !== weaponId) return w;
        const next = { ...w.attachments };
        if (!attachmentName) {
          delete next[slot];
        } else {
          next[slot] = attachmentName;
        }
        return {
          ...w,
          attachments: applyBuilderRelations(
            next,
            attachments,
            relationAssets,
            weaponId,
          ),
        };
      }),
    );
  };

  const clearWeaponAttachments = (weaponId: string) => {
    setSelectedWeapons((current) =>
      current.map((weapon) =>
        weapon.id === weaponId ? { ...weapon, attachments: {} } : weapon,
      ),
    );
    setOpenAttachmentType(null);
  };

  const togglePerk = (perk: Perk) => {
    if (!perk.slot) return;
    setSelectedPerks((current) => {
      if (current.includes(perk.name)) {
        return current.filter((name) => name !== perk.name);
      }
      const namesInGroup = new Set(
        availablePerks
          .filter((candidate) => candidate.slot === perk.slot)
          .map((candidate) => candidate.name),
      );
      return [...current.filter((name) => !namesInGroup.has(name)), perk.name];
    });
  };

  const selectEquipment = (
    slot: EquipmentSlot,
    name: string,
    isAny = false,
  ) => {
    setSelectedEquipment((current) => {
      return [
        ...current.filter((item) => item.slot !== slot),
        { slot, name, isAny },
      ];
    });
  };

  const isTagAllowed = (tag: LoadoutTag) => {
    if (tag.allowedWeaponCategoryIds.length === 0) return true;
    return selectedWeapons.every(
      (w) =>
        w.categoryId != null &&
        tag.allowedWeaponCategoryIds.includes(w.categoryId),
    );
  };

  useEffect(() => {
    if (selectedTagId == null) return;
    const current = tags.find((t) => t.id === selectedTagId);
    if (current && !isTagAllowed(current)) {
      setSelectedTagId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeapons, tags]);

  // Resolves an in-edit loadout's weapon refs ({id, attachments}) into full
  // SelectedWeapon objects once the catalog `weapons` list has loaded --
  // fetchWeapons() and loadExistingLoadout() run in parallel, so this can't
  // be done inline in loadExistingLoadout.
  useEffect(() => {
    if (pendingWeaponRefs == null || weapons.length === 0) return;
    setSelectedWeapons(
      pendingWeaponRefs
        .map((ref) => {
          const catalogWeapon = weapons.find((w) => w.id === ref.id);
          return catalogWeapon
            ? {
                ...catalogWeapon,
                slot: ref.slot ?? "primary",
                attachments: ref.attachments,
              }
            : null;
        })
        .filter((w): w is SelectedWeapon => w !== null),
    );
    setPendingWeaponRefs(null);
  }, [weapons, pendingWeaponRefs]);

  useEffect(() => {
    if (relationAssets.length === 0 || attachments.length === 0) return;
    const assetsById = new Map(
      relationAssets.map((asset) => [asset.id, asset]),
    );
    setSelectedWeapons((current) => {
      let changed = false;
      const next = current.map((weapon) => {
        const normalized = applyBuilderRelations(
          weapon.attachments,
          attachments,
          relationAssets,
          weapon.id,
        );
        if (gameId === "mw4") {
          for (const [type, name] of Object.entries(normalized)) {
            const slot = normalizePreviewSlot(type);
            if (slot !== "muzzle" && slot !== "underbarrel") continue;
            const attachment = attachments.find(
              (item) => item.type === type && item.name === name,
            );
            const allowed =
              slot === "muzzle"
                ? mw4MuzzleAllowed(
                    attachment?.stats?.assetId,
                    weapon.id,
                    assetsById,
                  )
                : mw4UnderbarrelAllowed(
                    attachment?.stats?.assetId,
                    weapon.id,
                    assetsById,
                  );
            if (!allowed) {
              delete normalized[type];
            }
          }
        }
        if (
          Object.keys(normalized).length ===
          Object.keys(weapon.attachments).length
        )
          return weapon;
        changed = true;
        return { ...weapon, attachments: normalized };
      });
      return changed ? next : current;
    });
  }, [attachments, relationAssets, gameId]);

  const meta = gameMeta[gameId] ?? gameMeta.mw4;

  if (loading) {
    return (
      <AppLayout
        selectedGame={gameId}
        onGameSelect={(id) => navigate(gamePath(id, "create"))}
        // breadcrumb={
        //   <>
        //     <BreadcrumbLink to={explorePath(gameId)}>
        //       {meta.short}
        //     </BreadcrumbLink>
        //     <BreadcrumbSpacer />
        //     <span className="">{editId ? "Edit Loadout" : "New Loadout"}</span>
        //   </>
        // }
      >
        <LoadoutBuilderSkeleton />
      </AppLayout>
    );
  }

  const selectedWeapon =
    selectedWeapons.find((weapon) => weapon.slot === activeWeaponSlot) ?? null;
  const selectedApexRelation = selectedWeapon
    ? getBuilderApexRelation(
        selectedWeapon.attachments,
        attachments,
        relationAssets,
      )
    : null;
  const reziCombBlocked = selectedWeapon
    ? rezi12NoStockBlocksComb(
        selectedWeapon.attachments,
        attachments,
        selectedWeapon.id,
      )
    : false;
  const strigaUnderbarrelBlocked =
    selectedWeapon?.id === "rex_sm_pmike63" &&
    !strigaDreadlineSelected(
      selectedWeapon.attachments,
      attachments,
      selectedWeapon.id,
    );
  const subtypeByAssetId = new Map(
    relationAssets.map((asset) => [asset.id, asset.subtype_label]),
  );
  const assetsById = new Map(relationAssets.map((asset) => [asset.id, asset]));
  const attachmentsByType = attachments
    .map((attachment) => ({
      ...attachment,
      displayName:
        attachment.displayName ??
        (gameId === "mw4"
          ? builderAttachmentDisplayName(
              attachment.stats?.assetId,
              selectedWeapon?.id,
              assetsById,
              attachment.name,
            )
          : attachment.name),
      subtypeLabel:
        attachment.subtypeLabel !== undefined
          ? attachment.subtypeLabel
          : (subtypeByAssetId.get(attachment.stats?.assetId ?? "") ?? null),
      imageUrl: isApexAttachmentType(attachment.type)
        ? apexAttachmentIconUrl(attachment.typeImageUrl, gameId)
        : (attachment.imageUrl ??
          (gameId === "mw4"
            ? builderAttachmentImageUrl(
                attachment.stats?.assetId,
                assetsById,
                attachment.name,
              )
            : null)),
    }))
    .filter((attachment) => {
      if (!selectedWeapon) return true;
      if (
        gameId === "mw4" &&
        !attachmentAllowedByApex(
          attachment.stats?.assetId,
          selectedWeapon.attachments,
          attachments,
        )
      )
        return false;
      if (
        gameId === "mw4" &&
        normalizePreviewSlot(attachment.typeSlug || attachment.type) ===
          "muzzle"
      ) {
        return mw4MuzzleAllowed(
          attachment.stats?.assetId,
          selectedWeapon.id,
          assetsById,
        );
      }
      if (
        gameId === "mw4" &&
        normalizePreviewSlot(attachment.typeSlug || attachment.type) ===
          "underbarrel"
      ) {
        return mw4UnderbarrelAllowed(
          attachment.stats?.assetId,
          selectedWeapon.id,
          assetsById,
        );
      }
      if (
        selectedWeapon.id === "rex_sm_pmike63" &&
        normalizePreviewSlot(attachment.typeSlug || attachment.type) === "guard"
      )
        return false;
      if (
        selectedWeapon.id.startsWith("rex_ar_") &&
        normalizePreviewSlot(attachment.typeSlug || attachment.type) === "optic"
      ) {
        return arAllowsOptic(attachment.stats?.assetId);
      }
      if (
        selectedWeapon.id.startsWith("rex_sm_") &&
        normalizePreviewSlot(attachment.typeSlug || attachment.type) === "optic"
      ) {
        return smgAllowsOptic(attachment.stats?.assetId);
      }
      if (
        selectedWeapon.id.startsWith("rex_ar_") &&
        normalizePreviewSlot(attachment.typeSlug || attachment.type) === "laser"
      ) {
        return arAllowsLaser(attachment.stats?.assetId);
      }
      if (
        selectedWeapon.id === "rex_sm_mpapa7" &&
        normalizePreviewSlot(attachment.typeSlug || attachment.type) ===
          "ammunition"
      ) {
        return velAllowsAmmunition(attachment.stats?.assetId);
      }
      return (
        !attachment.weaponIds ||
        attachment.weaponIds.includes(selectedWeapon.id)
      );
    })
    .reduce<Record<string, Attachment[]>>((acc, a) => {
      (acc[a.type] ??= []).push(a);
      return acc;
    }, {});
  if (selectedWeapon?.id.startsWith("rex_ar_")) {
    for (const [type, choices] of Object.entries(attachmentsByType)) {
      const slot = normalizePreviewSlot(type);
      const ordered =
        slot === "optic"
          ? AR_OPTIC_IDS
          : slot === "laser"
            ? AR_LASER_IDS
            : null;
      if (!ordered) continue;
      const order = new Map<string, number>(
        ordered.map((id, index) => [id, index]),
      );
      choices.sort(
        (a, b) =>
          (order.get(a.stats?.assetId ?? "") ?? 99) -
          (order.get(b.stats?.assetId ?? "") ?? 99),
      );
    }
  }
  if (selectedWeapon?.id.startsWith("rex_sm_")) {
    const order = new Map<string, number>(
      SMG_OPTIC_IDS.map((id, index) => [id, index]),
    );
    for (const [type, choices] of Object.entries(attachmentsByType)) {
      if (normalizePreviewSlot(type) !== "optic") continue;
      choices.sort(
        (a, b) =>
          (order.get(a.stats?.assetId ?? "") ?? 99) -
          (order.get(b.stats?.assetId ?? "") ?? 99),
      );
    }
  }
  if (selectedWeapon && gameId === "mw4") {
    for (const [type, choices] of Object.entries(attachmentsByType)) {
      const slot = normalizePreviewSlot(type);
      if (slot !== "muzzle" && slot !== "underbarrel") continue;
      choices.sort((a, b) =>
        slot === "muzzle"
          ? (a.stats?.muzzleOrder ?? 999) - (b.stats?.muzzleOrder ?? 999)
          : (a.stats?.underbarrelOrder ?? 999) -
            (b.stats?.underbarrelOrder ?? 999),
      );
    }
  }
  if (selectedWeapon?.id === "rex_sm_mpapa7") {
    const order = new Map<string, number>(
      VEL_AMMUNITION_IDS.map((id, index) => [id, index]),
    );
    for (const [type, choices] of Object.entries(attachmentsByType)) {
      if (normalizePreviewSlot(type) !== "ammunition") continue;
      choices.sort(
        (a, b) =>
          (order.get(a.stats?.assetId ?? "") ?? 99) -
          (order.get(b.stats?.assetId ?? "") ?? 99),
      );
    }
  }
  const isMw4Firearm =
    gameId === "mw4" &&
    Boolean(selectedWeapon) &&
    !/launcher|melee/i.test(
      `${selectedWeapon?.type ?? ""} ${selectedWeapon?.typeShort ?? ""}`,
    );
  if (isMw4Firearm) {
    attachmentsByType.Ammunition ??= [];
    attachmentsByType.APEX ??= [];
  }
  const attachmentTypes = Object.keys(attachmentsByType);

  const weaponTypes = sortWeaponCategories(
    weapons
      .map((w) => w.typeShort || w.type)
      .filter((t): t is string => Boolean(t)),
  );

  const selectedWeaponBadges: WeaponImageBadge[] = selectedWeapon
    ? Object.entries(selectedWeapon.attachments)
        .map(([type, name]): WeaponImageBadge | null => {
          const attachment = attachmentsByType[type]?.find(
            (a) => a.name === name,
          );
          if (!attachment) return null;
          return {
            key: attachment.id,
            assetId: attachment.stats?.assetId,
            typeSlug: attachment.typeSlug || type,
            label: attachment.displayName ?? attachment.name,
            iconUrl: attachment.imageUrl,
            isApex: type.toLowerCase() === "apex",
          };
        })
        .filter((badge): badge is WeaponImageBadge => badge !== null)
    : [];
  const filledStandardAttachmentSlots = new Set(
    selectedWeapon
      ? Object.entries(selectedWeapon.attachments)
          .filter(
            ([slot, name]) =>
              Boolean(name) &&
              !isApexAttachmentType(slot) &&
              !selectedApexRelation?.lockedSlots.has(
                normalizePreviewSlot(slot),
              ),
          )
          .map(([slot]) => normalizePreviewSlot(slot))
      : [],
  );
  selectedApexRelation?.lockedSlots.forEach((slot, key) => {
    if (slot.included) filledStandardAttachmentSlots.add(key);
  });
  const hasApexSelected = Boolean(
    selectedWeapon &&
    Object.entries(selectedWeapon.attachments).some(
      ([slot, value]) => isApexAttachmentType(slot) && Boolean(value),
    ),
  );

  const filteredWeapons = weapons.filter((weapon) => {
    const category =
      `${weapon.type ?? ""} ${weapon.typeShort ?? ""}`.toLowerCase();
    if (contentType === "full_loadout") {
      if (activeWeaponSlot === "secondary" && !category.includes("pistol"))
        return false;
      if (activeWeaponSlot === "melee" && !category.includes("melee"))
        return false;
      if (
        activeWeaponSlot === "primary" &&
        (category.includes("pistol") || category.includes("melee"))
      )
        return false;
    }
    if (
      weaponTypeFilter &&
      weapon.typeShort !== weaponTypeFilter &&
      weapon.type !== weaponTypeFilter
    ) {
      return false;
    }
    if (
      weaponSearchQuery.trim() &&
      !weapon.name
        .toLowerCase()
        .includes(weaponSearchQuery.trim().toLowerCase())
    ) {
      return false;
    }
    return true;
  });
  const groupedWeapons = weaponTypes
    .map((type) => {
      const items = filteredWeapons.filter(
        (weapon) => weapon.typeShort === type || weapon.type === type,
      );
      return { type, label: items[0]?.type ?? type, items };
    })
    .filter((group) => group.items.length > 0);

  if (!contentType) {
    return (
      <AppLayout
        selectedGame={gameId}
        onGameSelect={(id) => navigate(gamePath(id, "create"))}
        // breadcrumb={
        //   <>
        //     <BreadcrumbLink to={explorePath(gameId)}>
        //       {meta.short}
        //     </BreadcrumbLink>
        //     <BreadcrumbSpacer />
        //     <span>Choose creation type</span>
        //   </>
        // }
      >
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 py-6 sm:py-12">
          <header className="max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-teritary">
              Create
            </p>
            <h1 className="mt-3 text-3xl uppercase sm:text-5xl">
              What are you sharing?
            </h1>
            <p className="mt-3 leading-7 text-secondary">
              Publish a complete class setup or focus on one finely tuned weapon
              configuration.
            </p>
          </header>

          <div className="grid gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setContentType("full_loadout")}
              className="group min-h-72 rounded-3xl border border-white/[0.1] bg-[#151314] p-7 text-left transition-all hover:-translate-y-1 hover:border-white/25 hover:bg-[#1a1719]"
            >
              <span className="flex size-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                <Layers3 className="size-6" />
              </span>
              <h2 className="mt-14 text-2xl uppercase">Full loadout</h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-teritary">
                Primary and secondary builds, melee, perks, throwable, tactical,
                and field upgrade—all in one shareable setup.
              </p>
              <span className="mt-6 flex items-center gap-2 text-sm text-secondary">
                Build complete loadout
                <ChevronRight className="size-4 transition-transform group-hover:translate-x-1" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => setContentType("weapon_config")}
              className="group min-h-72 rounded-3xl border border-white/[0.1] bg-[#151314] p-7 text-left transition-all hover:-translate-y-1 hover:border-white/25 hover:bg-[#1a1719]"
            >
              <span className="flex size-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                <Crosshair className="size-6" />
              </span>
              <h2 className="mt-14 text-2xl uppercase">Weapon config</h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-teritary">
                Share one weapon and its attachments without building an entire
                class around it.
              </p>
              <span className="mt-6 flex items-center gap-2 text-sm text-secondary">
                Configure one weapon
                <ChevronRight className="size-4 transition-transform group-hover:translate-x-1" />
              </span>
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      selectedGame={gameId}
      onGameSelect={(id) => navigate(gamePath(id, "create"))}
      // breadcrumb={
      //   <>
      //     <BreadcrumbLink to={explorePath(gameId)}>{meta.short}</BreadcrumbLink>
      //     <BreadcrumbSpacer />
      //     <span className="">
      //       {editId
      //         ? `Edit ${contentType === "full_loadout" ? "Loadout" : "Weapon Config"}`
      //         : contentType === "full_loadout"
      //           ? "New Loadout"
      //           : "New Weapon Config"}
      //     </span>
      //   </>
      // }
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Button
          onClick={() =>
            editId || !FULL_LOADOUTS_ENABLED
              ? navigate(explorePath(gameId))
              : setContentType(null)
          }
          variant="ghost"
          className="*:h-14 w-14"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <div className="flex flex-col flex-1 gap-1">
          <h1 className="text-[32px] leading-[40px] text-[#efedf1] font-semibold">
            {editId ? "Edit" : "New"}{" "}
            {contentType === "full_loadout" ? "Loadout" : "Weapon Config"}
          </h1>
          <p className="text-[14px] text-[#8d898a]">
            {contentType === "full_loadout"
              ? "Build the full class—from weapons and perks to every equipment slot."
              : "Pick one weapon, tune its attachments, and publish the config."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={saveLoadout}
            disabled={saving}
            className="group/finish h-[52px] rounded-xl bg-[#fafafa] px-5 font-medium text-[#161414] disabled:opacity-60"
          >
            <FinishActionLabel saving={saving} editing={Boolean(editId)} />
          </Button>
        </div>
      </div>

      <Container>
        {/* <h2 className="text-[16px] font-semibold">
          {contentType === "full_loadout" ? "Loadout details" : "Weapon config details"}
        </h2> */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="loadout-name"
              className={cn(
                "text-[12px] tracking-[0.5px] uppercase font-semibold",
                loadoutNameError ? "text-[#ef9696]" : "text-[#8d898a]",
              )}
            >
              Name
            </label>
            <input
              id="loadout-name"
              type="text"
              value={loadoutName}
              onChange={(e) => {
                setLoadoutName(e.target.value);
                if (loadoutNameError && e.target.value.trim()) {
                  setLoadoutNameError("");
                }
              }}
              aria-invalid={Boolean(loadoutNameError)}
              aria-describedby={
                loadoutNameError ? "loadout-name-error" : undefined
              }
              placeholder={
                contentType === "full_loadout"
                  ? "Enter a name for this loadout"
                  : "Enter a name for this weapon config"
              }
              className={cn(
                "h-12 rounded-xl border px-4 text-[14px] placeholder:text-[#8d898a] outline-none transition-colors",
                loadoutNameError
                  ? "border-destructive bg-[#241214] focus:border-destructive focus:ring-2 focus:ring-destructive/20"
                  : "border-white/[0.07] bg-white/[0.04] focus:border-white/30",
              )}
            />
            {loadoutNameError && (
              <p id="loadout-name-error" className="text-[12px] text-[#ef9696]">
                {loadoutNameError}
              </p>
            )}
          </div>
          {tags.length > 0 && (
            <div>
              <span
                id="loadout-tag-label"
                className="block text-[12px] pb-2 tracking-[0.5px] uppercase text-[#8d898a] font-semibold"
              >
                Tag *
              </span>
              <ToggleGroup
                aria-labelledby="loadout-tag-label"
                type="single"
                value={selectedTagId != null ? String(selectedTagId) : ""}
                onValueChange={(value) => {
                  const tag = tags.find((t) => String(t.id) === value);
                  setSelectedTagId(tag ? tag.id : null);
                }}
                className="flex flex-wrap gap-2"
              >
                {tags.map((tag) => (
                  <TagOption
                    key={tag.id}
                    tag={tag}
                    isSelected={selectedTagId === tag.id}
                    disabled={selectedTagId !== tag.id && !isTagAllowed(tag)}
                  />
                ))}
              </ToggleGroup>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="loadout-description"
              className="text-[12px] tracking-[0.5px] uppercase text-[#8d898a] font-semibold"
            >
              Description (optional)
            </label>
            <textarea
              id="loadout-description"
              value={loadoutDescription}
              onChange={(e) => setLoadoutDescription(e.target.value)}
              placeholder="Describe your strategy, playstyle, or tips..."
              rows={3}
              className="rounded-xl bg-white/[0.04] border border-white/[0.07] px-4 py-3 text-[14px]  placeholder:text-[#8d898a] outline-none focus:border-white/30 transition-colors resize-none"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label
              htmlFor="loadout-code"
              className="text-[12px] tracking-[0.5px] uppercase text-[#8d898a] font-semibold"
            >
              In-game loadout code (optional)
            </label>
            <input
              id="loadout-code"
              type="text"
              value={gameLoadoutCode}
              onChange={(e) => setGameLoadoutCode(e.target.value)}
              placeholder="Paste the loadout code from the game"
              className="h-12 rounded-xl bg-white/[0.04] border border-white/[0.07] px-4 text-[14px] font-mono  placeholder:text-[#8d898a] placeholder:font-sans outline-none focus:border-white/30 transition-colors"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label
              htmlFor="loadout-video"
              className={cn(
                "text-[12px] tracking-[0.5px] uppercase font-semibold",
                videoError ? "text-[#ef9696]" : "text-[#8d898a]",
              )}
            >
              Attach a video (optional)
            </label>
            <div
              className={cn(
                "h-12 rounded-xl border px-4 flex items-center gap-2 transition-colors",
                videoError
                  ? "border-destructive bg-[#241214] focus-within:border-destructive focus-within:ring-2 focus-within:ring-destructive/20"
                  : "border-white/[0.07] bg-white/[0.04] focus-within:border-white/30",
              )}
            >
              {(() => {
                const platform = videoUrl.trim()
                  ? detectVideoPlatform(videoUrl.trim())
                  : null;
                const Icon = platform
                  ? VIDEO_PLATFORM_META[platform].icon
                  : null;
                return Icon ? (
                  <Icon className="w-4 h-4 text-[#8d898a] shrink-0" />
                ) : null;
              })()}
              <input
                id="loadout-video"
                type="url"
                value={videoUrl}
                onChange={(e) => {
                  setVideoUrl(e.target.value);
                  setVideoError("");
                }}
                aria-invalid={Boolean(videoError)}
                aria-describedby={
                  videoError ? "loadout-video-error" : undefined
                }
                placeholder="Paste a TikTok, Instagram, or YouTube link"
                className="flex-1 bg-transparent text-[14px]  placeholder:text-[#8d898a] outline-none"
              />
            </div>
            {videoError && (
              <p
                id="loadout-video-error"
                className="text-[12px] text-[#ef9696]"
              >
                {videoError}
              </p>
            )}
          </div>
        </div>
      </Container>

      <Container
        className={cn(
          "transition-colors",
          attachmentError && "border-destructive/40 bg-[#1b1113]",
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <h2
              className={cn("text-base", attachmentError && "text-[#ef9696]")}
            >
              Weapon Config
            </h2>
          </div>
          {attachmentError && (
            <p className="text-xs text-[#ef9696]" role="alert">
              Choose {MIN_REQUIRED_ATTACHMENTS - selectedAttachmentCount} more
              attachment
              {MIN_REQUIRED_ATTACHMENTS - selectedAttachmentCount === 1
                ? ""
                : "s"}
            </p>
          )}
        </div>

        {contentType === "full_loadout" && (
          <div className="grid gap-2 sm:grid-cols-3">
            {WEAPON_SLOTS.map((slot) => {
              const weapon = selectedWeapons.find(
                (candidate) => candidate.slot === slot.id,
              );
              const selected = activeWeaponSlot === slot.id;
              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => {
                    setActiveWeaponSlot(slot.id);
                    setPickingWeapon(!weapon);
                    setWeaponTypeFilter(null);
                    setWeaponSearchQuery("");
                  }}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-colors",
                    selected
                      ? "border-white/35 bg-white/[0.08]"
                      : "border-white/[0.08] bg-white/[0.025] hover:bg-white/[0.05]",
                  )}
                >
                  <span className="block text-xs uppercase tracking-[0.08em] text-teritary">
                    {slot.label}
                  </span>
                  <span className="mt-1 block truncate text-sm">
                    {weapon?.name ?? slot.description}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {selectedWeapon && !pickingWeapon ? (
          <div className="grid items-start gap-6 lg:grid-cols-2 xl:gap-8">
            <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-6">
              <div className="flex min-h-48 items-center justify-center">
                <WeaponImage
                  imageUrl={selectedWeapon.imageUrl}
                  variant="large"
                  alt={selectedWeapon.name}
                  weaponId={selectedWeapon.id}
                  badges={selectedWeaponBadges}
                  enableSpritePreview={gameId === "mw4"}
                  highlightSlugs={selectedWeaponBadges.map(
                    (badge) => badge.typeSlug,
                  )}
                />
              </div>
              <div className="min-w-0 flex items-center gap-3">
                {selectedWeapon.typeShort && (
                  <Tag>{selectedWeapon.typeShort}</Tag>
                )}
                <p className="truncate flex-1 text-base font-medium">
                  {selectedWeapon.name}
                </p>
                {selectedWeapon && !pickingWeapon && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-teritary"
                    onClick={() => setPickingWeapon(true)}
                  >
                    Change weapon
                  </Button>
                )}
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xs">Attachments</h2>
                <div className="flex items-center gap-3">
                  <div
                    role="img"
                    className="flex items-center gap-1.5"
                    aria-label={`${Math.min(filledStandardAttachmentSlots.size, MAX_STANDARD_ATTACHMENTS)} of ${MAX_STANDARD_ATTACHMENTS} standard attachments selected${hasApexSelected ? ", APEX selected" : ""}`}
                  >
                    {Array.from(
                      { length: MAX_STANDARD_ATTACHMENTS },
                      (_, index) => (
                        <span
                          key={index}
                          aria-hidden="true"
                          className={cn(
                            "size-3 rounded-[2px] border transition-colors",
                            index <
                              Math.min(
                                filledStandardAttachmentSlots.size,
                                MAX_STANDARD_ATTACHMENTS,
                              )
                              ? "border-yellow-400 bg-yellow-400/80"
                              : "border-white/25 bg-transparent",
                          )}
                        />
                      ),
                    )}
                    <span
                      aria-hidden="true"
                      className={cn(
                        "ml-1 size-3 rotate-45 rounded-[2px] border transition-colors",
                        hasApexSelected
                          ? "border-yellow-400 bg-yellow-400/80"
                          : "border-white/25 bg-transparent",
                      )}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-teritary"
                    disabled={
                      Object.keys(selectedWeapon.attachments).length === 0
                    }
                    aria-label={`Clear all attachments for ${selectedWeapon.name}`}
                    onClick={() => clearWeaponAttachments(selectedWeapon.id)}
                  >
                    Clear
                  </Button>
                </div>
              </div>

              {attachmentTypes.length === 0 ? (
                <p className="text-teritary">
                  No attachments configured for this game yet.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {attachmentTypes.map((type) => {
                    const hasOptions = attachmentsByType[type].length > 0;
                    const typeImageUrl =
                      attachmentsByType[type][0]?.typeImageUrl;
                    const selectedName = selectedWeapon.attachments[type];
                    const isAnySelected = selectedName === ANY_ATTACHMENT_VALUE;
                    const selectedAttachment = attachmentsByType[type].find(
                      (attachment) => attachment.name === selectedName,
                    );
                    const selectedImageUrl =
                      selectedAttachment?.imageUrl ??
                      selectedAttachment?.stats?.imagePath;
                    const defaultSlot =
                      selectedApexRelation?.defaultSlots.get(normalizePreviewSlot(type));
                    const lockedSlot =
                      selectedApexRelation?.lockedSlots.get(
                        normalizePreviewSlot(type),
                      ) ??
                      (reziCombBlocked && normalizePreviewSlot(type) === "comb"
                        ? { slot: "comb" }
                        : strigaUnderbarrelBlocked &&
                            normalizePreviewSlot(type) === "underbarrel"
                          ? { slot: "underbarrel" }
                          : undefined);
                    const lockSource =
                      reziCombBlocked && normalizePreviewSlot(type) === "comb"
                        ? "No Stock"
                        : strigaUnderbarrelBlocked &&
                            normalizePreviewSlot(type) === "underbarrel"
                          ? "Ballistarc Dreadline 80 barrel"
                          : selectedApexRelation?.apexName;
                    return (
                      <div key={type} className="flex flex-col">
                        {/* <div className="flex items-center gap-1">
                        <div>
                          {typeImageUrl ? (
                            <img src={typeImageUrl} alt="" className="size-5 opacity-80 object-contain" />
                          ) : (
                            null
                          )}
                        </div>
                        <p className="uppercase text-secondary text-xs font-semibold">
                          {type}
                        </p>
                      </div> */}
                        <button
                          type="button"
                          onClick={() => setOpenAttachmentType(type)}
                          disabled={Boolean(lockedSlot) || !hasOptions}
                          className={cn(
                            "p-4 rounded-xl text-base border border-white/[0.12] flex items-center gap-2 text-left transition-colors hover:border-white/40",
                            lockedSlot?.included
                              ? "border-emerald-300/25 bg-emerald-300/[0.06] text-white"
                              : lockedSlot &&
                                  "cursor-not-allowed border-white/[0.07] text-teritary hover:border-white/[0.07]",
                            !hasOptions && "cursor-not-allowed text-teritary",
                            selectedName && "bg-white/5",
                            attachmentError &&
                              !selectedName &&
                              !lockedSlot &&
                              hasOptions &&
                              "border-destructive/50 bg-destructive/[0.06] hover:border-destructive",
                          )}
                          aria-invalid={
                            attachmentError &&
                            !selectedName &&
                            !lockedSlot &&
                            hasOptions
                          }
                          title={
                            lockedSlot
                              ? `${type} is controlled by ${lockSource}`
                              : !hasOptions
                                ? `No compatible ${type.toLowerCase()} recovered`
                                : undefined
                          }
                        >
                          <div className="flex gap-2 flex-1 flex-row">
                            {lockedSlot?.included ? (
                              builderAttachmentImageUrl(
                                lockedSlot.includedAssetId,
                                assetsById,
                                lockedSlot.includedPart,
                              ) ? (
                                <img
                                  src={
                                    builderAttachmentImageUrl(
                                      lockedSlot.includedAssetId,
                                      assetsById,
                                      lockedSlot.includedPart,
                                    )!
                                  }
                                  alt=""
                                  className="size-10 shrink-0 object-contain"
                                />
                              ) : (
                                <AttachmentIcon
                                  attachment={{
                                    name: lockedSlot.includedPart ?? type,
                                    type,
                                  }}
                                  className="size-10"
                                />
                              )
                            ) : lockedSlot ? (
                              <Ban
                                className="size-6 shrink-0 text-rose-300/80"
                                aria-hidden="true"
                              />
                            ) : defaultSlot?.includedAssetId ? (
                              <img
                                src={builderAttachmentImageUrl(defaultSlot.includedAssetId, assetsById, defaultSlot.includedPart) ?? ""}
                                alt=""
                                className="size-10 shrink-0 object-contain"
                              />
                            ) : isAnySelected ? (
                              <span className="flex size-5 items-center justify-center font-mono text-3xl text-teritary">
                                ∞
                              </span>
                            ) : null}

                            {!lockedSlot &&
                            selectedAttachment &&
                            selectedImageUrl ? (
                              <img
                                src={selectedImageUrl}
                                alt=""
                                className="size-10 shrink-0 object-contain"
                              />
                            ) : !lockedSlot && selectedAttachment ? (
                              <AttachmentIcon
                                attachment={selectedAttachment}
                                className="w-8"
                              />
                            ) : // <AttachmentGroupIcon
                            //   type={type}
                            //   imageUrl={typeImageUrl}
                            // />
                            null}

                            {lockedSlot ? (
                              <span className="flex min-w-0 flex-col leading-tight">
                                {lockedSlot.includedPart ? (
                                  <>
                                    <span className="max-w-full truncate">
                                      <span className="text-teritary">
                                        Included:{" "}
                                      </span>
                                      <span className="text-white">
                                        {lockedSlot.includedPart}
                                      </span>
                                    </span>
                                    <span className="max-w-full truncate text-xs text-teritary">
                                      {type}
                                      {lockedSlot.includedSubtypeLabel &&
                                        ` · ${lockedSlot.includedSubtypeLabel}`}
                                    </span>
                                  </>
                                ) : lockedSlot.included ? (
                                  <span className="text-teritary">
                                    Included with {lockSource}
                                  </span>
                                ) : (
                                  `${type} unavailable`
                                )}
                                {!lockedSlot.included && (
                                  <span className="text-xs text-teritary">
                                    {lockSource}
                                  </span>
                                )}
                              </span>
                            ) : defaultSlot ? (
                              <span className="min-w-0 flex flex-col items-start">
                                <span className="max-w-full truncate">{defaultSlot.includedPart}</span>
                                <span className="max-w-full truncate text-xs text-teritary font-normal">
                                  Default {type} with {selectedApexRelation?.apexName} · changeable
                                </span>
                              </span>
                            ) : !hasOptions ? (
                              <span className="text-teritary">
                                {type}: no recovered options
                              </span>
                            ) : isAnySelected ? (
                              <>
                                Any
                                <span className="text-teritary font-normal">
                                  {type}
                                </span>
                              </>
                            ) : selectedName ? (
                              <span className="min-w-0 flex flex-col items-start">
                                <span className="max-w-full truncate">
                                  {selectedAttachment?.displayName ??
                                    selectedName}
                                </span>
                                <span className="max-w-full truncate text-xs text-teritary font-normal">
                                  {selectedAttachment?.subtypeLabel &&
                                  selectedAttachment.subtypeLabel !==
                                    selectedAttachment.displayName
                                    ? `${type} · ${selectedAttachment.subtypeLabel}`
                                    : type}
                                </span>
                              </span>
                            ) : (
                              <span>Add {type}</span>
                            )}
                          </div>
                          {!lockedSlot && (
                            <ChevronRight className="w-4 h-4 text-teritary shrink-0" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {weaponSearchOpen && (
              <input
                type="text"
                autoFocus
                value={weaponSearchQuery}
                onChange={(e) => setWeaponSearchQuery(e.target.value)}
                placeholder="Search weapons by name..."
                className="h-11 rounded-xl bg-white/[0.04] border border-white/[0.07] px-4 text-[14px]  placeholder:text-[#8d898a] outline-none focus:border-white/30 transition-colors"
              />
            )}

            {weaponTypes.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setWeaponSearchOpen((v) => !v);
                      if (weaponSearchOpen) setWeaponSearchQuery("");
                    }}
                    className="w-9 h-9 rounded-xl border border-white/[0.18] flex items-center justify-center  hover:bg-white/[0.05] transition-colors"
                    aria-label={
                      weaponSearchOpen ? "Close search" : "Search weapons"
                    }
                  >
                    {weaponSearchOpen ? (
                      <X className="w-4 h-4" />
                    ) : (
                      <Search className="size-4.5" />
                    )}
                  </button>
                </div>
                <FilterPillGroup
                  type="single"
                  value={weaponTypeFilter ?? ""}
                  onValueChange={(v) => setWeaponTypeFilter(v || null)}
                >
                  <FilterPill value="">All</FilterPill>
                  {weaponTypes.map((type) => (
                    <FilterPill key={type} value={type} className="uppercase">
                      {type}
                    </FilterPill>
                  ))}
                </FilterPillGroup>
              </div>
            )}

            {weapons.length === 0 ? (
              <p className="text-[14px] text-[#8d898a]">
                No weapons available for this game yet.
              </p>
            ) : filteredWeapons.length === 0 ? (
              <p className="text-[14px] text-[#8d898a]">
                No weapons match your filters.
              </p>
            ) : (
              <div className="flex flex-col gap-10">
                {groupedWeapons.map((group) => (
                  <section key={group.type} className="flex flex-col gap-6">
                    <div className="flex items-center gap-4">
                      <h3 className="text-xs">{group.label}</h3>
                      <div className="h-px flex-1 bg-white/[0.08]" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                      {group.items.map((weapon) => {
                        const isSelected = selectedWeapons.some(
                          (selected) => selected.id === weapon.id,
                        );
                        return (
                          <WeaponCard
                            key={weapon.id}
                            weapon={weapon}
                            selected={isSelected}
                            onSelect={() => {
                              toggleWeapon(weapon);
                              setPickingWeapon(false);
                            }}
                          />
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </Container>

      {selectedWeapon && openAttachmentType && (
        <ResponsiveDialog
          open
          onOpenChange={(open) => {
            if (!open) setOpenAttachmentType(null);
          }}
          title={openAttachmentType}
        >
          <AttachmentPickerList
            options={attachmentsByType[openAttachmentType]}
            selected={selectedWeapon.attachments[openAttachmentType]}
            allowAny={allowsAnyAttachment(openAttachmentType)}
            onSelect={(name) => {
              setWeaponAttachment(selectedWeapon.id, openAttachmentType, name);
              setOpenAttachmentType(null);
            }}
            onDeselect={() => {
              setWeaponAttachment(selectedWeapon.id, openAttachmentType, "");
              setOpenAttachmentType(null);
            }}
          />
        </ResponsiveDialog>
      )}

      {openEquipmentSlot && (
        <ResponsiveDialog
          open
          onOpenChange={(open) => {
            if (!open) setOpenEquipmentSlot(null);
          }}
          title={`Choose ${EQUIPMENT_SLOTS.find((slot) => slot.id === openEquipmentSlot)?.label ?? "equipment"}`}
        >
          <div className="flex flex-col gap-2">
            {(() => {
              const selected = selectedEquipment.find(
                (item) => item.slot === openEquipmentSlot,
              );
              const choices = availableEquipment.filter(
                (equipment) => equipment.slot === openEquipmentSlot,
              );
              return (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      selectEquipment(openEquipmentSlot, "Any", true);
                      setOpenEquipmentSlot(null);
                    }}
                    className={cn(
                      "flex min-h-14 items-center gap-3 rounded-xl border px-4 text-left transition-colors",
                      selected?.isAny
                        ? "border-white/40 bg-white/[0.1]"
                        : "border-white/[0.08] bg-white/[0.025] hover:bg-white/[0.05]",
                    )}
                  >
                    <span className="flex size-8 items-center justify-center rounded-lg border border-white/[0.12] font-mono text-sm">
                      ∞
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">Any</span>
                      <span className="block text-xs text-teritary">
                        Any item in this equipment slot
                      </span>
                    </span>
                    {selected?.isAny && <Check className="size-4" />}
                  </button>

                  {choices.map((equipment) => {
                    const isSelected =
                      !selected?.isAny && selected?.name === equipment.name;
                    return (
                      <button
                        key={equipment.id}
                        type="button"
                        onClick={() => {
                          selectEquipment(openEquipmentSlot, equipment.name);
                          setOpenEquipmentSlot(null);
                        }}
                        className={cn(
                          "flex min-h-14 items-center gap-3 rounded-xl border px-4 text-left text-sm transition-colors",
                          isSelected
                            ? "border-white/40 bg-white/[0.1]"
                            : "border-white/[0.08] bg-white/[0.025] hover:bg-white/[0.05]",
                        )}
                      >
                        {equipment.imageUrl ? (
                          <img
                            src={equipment.imageUrl}
                            alt=""
                            className="size-8 object-contain"
                          />
                        ) : (
                          <span className="size-8" />
                        )}
                        <span className="min-w-0 flex-1 truncate">
                          {equipment.name}
                        </span>
                        {isSelected && <Check className="size-4" />}
                      </button>
                    );
                  })}

                  {selected && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setSelectedEquipment((current) =>
                          current.filter(
                            (item) => item.slot !== openEquipmentSlot,
                          ),
                        );
                        setOpenEquipmentSlot(null);
                      }}
                      className="mt-2 w-full"
                    >
                      Clear selection
                    </Button>
                  )}
                </>
              );
            })()}
          </div>
        </ResponsiveDialog>
      )}

      <ResponsiveDialog
        open={attachmentRequirementOpen}
        onOpenChange={setAttachmentRequirementOpen}
        title="Add more attachments"
        variant="destructive"
      >
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-base leading-6 ">
              Choose at least one standard attachment before finishing your
              weapon config.
            </p>
            <p className="mt-2 text-sm leading-6 text-teritary">
              Select up to five standard attachments. APEX is optional and does
              not count toward that limit.
            </p>
          </div>

          <div className="rounded-xl border border-destructive/25 bg-destructive/[0.06] p-4">
            <div className="mb-3 flex items-center justify-between gap-4">
              <span className="text-sm text-secondary">
                Standard attachments selected
              </span>
              <span className="font-mono text-sm text-[#ef9696]">
                {selectedAttachmentCount}/{MAX_STANDARD_ATTACHMENTS}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-destructive transition-[width] duration-300"
                style={{
                  width: `${Math.min(
                    100,
                    (selectedAttachmentCount / MAX_STANDARD_ATTACHMENTS) * 100,
                  )}%`,
                }}
              />
            </div>
          </div>

          <Button
            type="button"
            onClick={() => setAttachmentRequirementOpen(false)}
            className="w-full"
          >
            Continue building
          </Button>
        </div>
      </ResponsiveDialog>

      <ResponsiveDialog
        open={Boolean(createdLoadoutId)}
        title=""
        variant="success"
        onOpenChange={(open) => {
          if (!open && createdLoadoutPath) navigate(createdLoadoutPath);
        }}
      >
        {createdLoadoutId && (
          <div className="flex flex-col items-center gap-5 text-center">
            <div className="flex size-14 items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-400/10 text-emerald-300 motion-safe:animate-[pulse_1.2s_ease-in-out_2]">
              <Check className="size-7" strokeWidth={2.5} />
            </div>

            <div>
              <h3 className="text-xl font-semibold ">
                Your{" "}
                {contentType === "full_loadout" ? "loadout" : "weapon config"}{" "}
                was created successfully
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-teritary">
                Download its QR code to share the build anywhere, or jump
                straight to your published{" "}
                {contentType === "full_loadout" ? "loadout" : "weapon config"}.
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-4">
              <QRCodeCanvas
                value={createdLoadoutUrl}
                size={176}
                className="size-44"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={downloadCreatedLoadoutQr}
              disabled={downloadingQr}
              className="w-full"
            >
              <Download className="size-4" />
              {downloadingQr ? "Preparing QR…" : "Download QR code"}
            </Button>

            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                type="button"
                onClick={() => navigate(createdLoadoutPath)}
              >
                View{" "}
                {contentType === "full_loadout" ? "loadout" : "weapon config"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={createAnotherLoadout}
              >
                Create another
              </Button>
            </div>
          </div>
        )}
      </ResponsiveDialog>

      {contentType === "full_loadout" && (
        <>
          <Container>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold">Perks</h2>
                <p className="mt-1 text-sm text-teritary">
                  Choose one perk from each group.
                </p>
              </div>
              <span className="rounded-lg border border-white/[0.12] px-3 py-1.5 text-xs text-secondary">
                {selectedPerks.length}/3
              </span>
            </div>
            {availablePerks.length === 0 ? (
              <p className="text-sm text-teritary">
                No perks are available for this game yet.
              </p>
            ) : (
              <div className="flex flex-col gap-6">
                {PERK_GROUPS.map((group) => {
                  const perks = availablePerks
                    .filter((perk) => perk.slot === group.id)
                    .sort((a, b) => a.displayOrder - b.displayOrder);
                  return (
                    <section key={group.id}>
                      <div className="mb-3 flex items-center gap-4">
                        <h3 className="shrink-0 text-xs font-semibold uppercase tracking-[0.12em] text-secondary">
                          {group.label}
                        </h3>
                        <span className="h-px flex-1 bg-white/[0.08]" />
                      </div>
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                        {perks.map((perk) => {
                          const selected = selectedPerks.includes(perk.name);
                          return (
                            <button
                              key={perk.id}
                              type="button"
                              onClick={() => togglePerk(perk)}
                              aria-pressed={selected}
                              className={cn(
                                "flex min-h-24 flex-col items-center justify-center gap-3 rounded-xl border p-3 text-center text-xs transition-colors",
                                selected
                                  ? "border-[#d6bf49]/60 bg-[#d6bf49]/10 text-[#f2d858]"
                                  : "border-white/[0.08] bg-white/[0.025] hover:bg-white/[0.05]",
                              )}
                            >
                              {perk.imageUrl ? (
                                <img
                                  src={perk.imageUrl}
                                  alt=""
                                  className="size-9 object-contain"
                                />
                              ) : (
                                <Shield className="size-7 text-teritary" />
                              )}
                              <span className="flex items-center gap-1.5 uppercase tracking-wide">
                                {selected && <Check className="size-3.5" />}
                                {perk.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </Container>

          <Container>
            <div>
              <h2 className="text-base font-semibold">Equipment</h2>
              <p className="mt-1 text-sm text-teritary">
                Pick one item for each equipment slot.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {EQUIPMENT_SLOTS.map(({ id, label, icon: Icon }) => {
                const selected = selectedEquipment.find(
                  (equipment) => equipment.slot === id,
                );
                const selectedCatalog = availableEquipment.find(
                  (equipment) =>
                    equipment.slot === id && equipment.name === selected?.name,
                );
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setOpenEquipmentSlot(id)}
                    className="group overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] text-left transition-colors hover:border-white/[0.18] hover:bg-white/[0.04]"
                  >
                    <div className="flex items-center gap-2 border-b border-white/[0.07] px-4 py-3">
                      <Icon className="size-4 text-teritary" />
                      <h3 className="flex-1 text-sm">{label}</h3>
                      <ChevronRight className="size-4 text-teritary transition-transform group-hover:translate-x-0.5" />
                    </div>
                    <div className="flex min-h-20 items-center gap-3 p-4">
                      {selected?.isAny ? (
                        <span className="flex size-9 items-center justify-center rounded-lg border border-white/[0.12] font-mono text-sm">
                          ∞
                        </span>
                      ) : selectedCatalog?.imageUrl ? (
                        <img
                          src={selectedCatalog.imageUrl}
                          alt=""
                          className="size-9 object-contain"
                        />
                      ) : (
                        <span className="flex size-9 items-center justify-center rounded-lg bg-white/[0.04]">
                          <Icon className="size-4 text-teritary" />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">
                          {selected?.name ?? `Choose ${label.toLowerCase()}`}
                        </span>
                        <span className="mt-1 block text-xs text-teritary">
                          Open list
                        </span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </Container>
        </>
      )}

      {!editId && <RecaptchaNotice className="text-[12px] text-[#8d898a]" />}

      <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="font-semibold ">
            {editId
              ? "Ready to save your changes?"
              : "Ready to share your loadout?"}
          </p>
          <p className="mt-1 text-sm text-teritary">
            {editId
              ? "Update the published loadout with your latest setup."
              : "Publish it so other players can find, rate, and save it."}
          </p>
        </div>
        <Button
          onClick={saveLoadout}
          disabled={saving}
          className="group/finish h-[52px] w-full shrink-0 rounded-xl bg-[#fafafa] px-6 font-medium text-[#161414] disabled:opacity-60 sm:w-auto"
        >
          <FinishActionLabel saving={saving} editing={Boolean(editId)} />
        </Button>
      </div>
    </AppLayout>
  );
}
