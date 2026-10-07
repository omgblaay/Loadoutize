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
  X,
  Download,
} from "lucide-react";
import { WeaponCard } from "@/components/organisms/WeaponCard";
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
import { sortWeaponCategories } from "@/lib/weaponCategories";
import { detectVideoPlatform, VIDEO_PLATFORM_META } from "@/lib/video";
import { Container } from "@/components/atoms/Container";
import { Button } from "@/components/atoms/Button";
import {
  getRecaptchaToken,
  RecaptchaNotice,
} from "@/components/molecules/Recaptcha";
import { explorePath } from "@/lib/routes";
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
  attachments: Record<string, string>;
}

interface Attachment {
  id: string;
  name: string;
  type: string;
  typeSlug: string;
  typeImageUrl: string | null;
  imageUrl?: string | null;
}

interface Perk {
  id: number;
  name: string;
}

interface Equipment {
  id: number;
  name: string;
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
  attachments: Record<string, string>;
}

const allowsAnyAttachment = (type: string) =>
  type.trim().toLowerCase() !== "apex";

const MIN_REQUIRED_ATTACHMENTS = 5;
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
    att.name.toLowerCase().includes(query.trim().toLowerCase()),
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
          <div className="flex size-6 shrink-0 items-center justify-center rounded-md border border-current/20 font-mono text-[10px] font-semibold">
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
          Clear {selected === ANY_ATTACHMENT_VALUE ? "Any" : selected}
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
                  "flex items-center gap-3 h-12 px-3 rounded-lg text-left text-[14px] transition-colors shrink-0",
                  isSelected
                    ? "bg-[#fafafa] text-[#161414]"
                    : " hover:bg-white/[0.05]",
                )}
              >
                {att.imageUrl ? (
                  <img
                    src={att.imageUrl}
                    alt=""
                    className="w-6 h-6 object-contain shrink-0"
                  />
                ) : (
                  <div className="w-6 h-6 shrink-0" />
                )}
                <span className="flex-1">{att.name}</span>
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
              background: `${tag.color}`,
              color: "#f1f1f1",
              outlineOffset: 2,
              borderRadius: 20,
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
  const { user, accessToken, loading: authLoading } = useAuth();

  const [loadoutName, setLoadoutName] = useState("");
  const [loadoutNameError, setLoadoutNameError] = useState("");
  const [loadoutDescription, setLoadoutDescription] = useState("");
  const [gameLoadoutCode, setGameLoadoutCode] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoError, setVideoError] = useState("");
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [selectedWeapons, setSelectedWeapons] = useState<SelectedWeapon[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [availablePerks, setAvailablePerks] = useState<Perk[]>([]);
  const [selectedPerks, setSelectedPerks] = useState<string[]>([]);
  const [availableEquipment, setAvailableEquipment] = useState<Equipment[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [tags, setTags] = useState<LoadoutTag[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [pendingWeaponRefs, setPendingWeaponRefs] = useState<
    LoadoutWeaponRef[] | null
  >(null);
  const [weaponTypeFilter, setWeaponTypeFilter] = useState<string | null>(null);
  const [pickingWeapon, setPickingWeapon] = useState(false);
  const [openAttachmentType, setOpenAttachmentType] = useState<string | null>(
    null,
  );
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
      Object.values(weapon.attachments ?? {}).filter((name) => Boolean(name))
        .length,
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
        { headers: { Authorization: `Bearer ${publicAnonKey}` } },
      );
      const data = await response.json();
      if (data.weapons) setWeapons(data.weapons);
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
      if (data.attachments) setAttachments(data.attachments);
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
        setLoadoutDescription(loadout.description || "");
        setGameLoadoutCode(loadout.gameLoadoutCode || "");
        setVideoUrl(loadout.video?.url || "");
        setPendingWeaponRefs(
          (loadout.weapons || []).map((w: any) => ({
            id: w.id,
            attachments: w.attachments ?? {},
          })),
        );
        setSelectedPerks(loadout.perks || []);
        setSelectedEquipment(loadout.equipment || []);
        setSelectedTagId(loadout.tagId ?? null);
      }
    } catch (error) {
      console.error("Error loading loadout:", error);
    }
  };

  const saveLoadout = async () => {
    const nameMissing = !loadoutName.trim();
    const attachmentsMissing =
      selectedAttachmentCount < MIN_REQUIRED_ATTACHMENTS;
    const trimmedVideoUrl = videoUrl.trim();
    const videoInvalid =
      Boolean(trimmedVideoUrl) && !detectVideoPlatform(trimmedVideoUrl);

    setLoadoutNameError(nameMissing ? "A loadout name is required." : "");
    setAttachmentError(attachmentsMissing);
    setVideoError(
      videoInvalid
        ? "Video must be a TikTok, Instagram, or YouTube link"
        : "",
    );

    if (nameMissing) {
      toast.error("Loadout name is missing", {
        description: "Give your loadout a name before finishing.",
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
        weapons: selectedWeapons.map((weapon) => ({
          ...weapon,
          attachments: Object.fromEntries(
            Object.entries(weapon.attachments).filter(
              ([, name]) => name !== ANY_ATTACHMENT_VALUE,
            ),
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
          navigate(`/${gameId}/l/${loadout.id}`);
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
    ? `/${gameId}/l/${createdLoadoutId}`
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
      link.download = `${createdLoadoutId}-loadout-qr.png`;
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
    setOpenAttachmentType(null);
    setWeaponSearchOpen(false);
    setWeaponSearchQuery("");
    setAttachmentError(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleWeapon = (weapon: Weapon) => {
    setSelectedWeapons((prev) => {
      if (prev.some((w) => w.id === weapon.id)) {
        return prev.filter((w) => w.id !== weapon.id);
      }
      return [{ ...weapon, attachments: {} }];
    });
  };

  // attachmentName is "" when the ToggleGroup reports its active item was clicked again
  // (Radix's single-select deselect) -- clear the slot instead of setting an empty value.
  const setWeaponAttachment = (
    weaponId: string,
    slot: string,
    attachmentName: string,
  ) => {
    setSelectedWeapons((prev) =>
      prev.map((w) => {
        if (w.id !== weaponId) return w;
        const next = { ...w.attachments };
        if (!attachmentName) {
          delete next[slot];
        } else {
          next[slot] = attachmentName;
        }
        return { ...w, attachments: next };
      }),
    );
  };

  const togglePerk = (perk: string) => {
    if (selectedPerks.includes(perk)) {
      setSelectedPerks(selectedPerks.filter((p) => p !== perk));
    } else if (selectedPerks.length < 3) {
      setSelectedPerks([...selectedPerks, perk]);
    }
  };

  const toggleEquipment = (equipment: string) => {
    if (selectedEquipment.includes(equipment)) {
      setSelectedEquipment(selectedEquipment.filter((e) => e !== equipment));
    } else if (selectedEquipment.length < 2) {
      setSelectedEquipment([...selectedEquipment, equipment]);
    }
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
            ? { ...catalogWeapon, attachments: ref.attachments }
            : null;
        })
        .filter((w): w is SelectedWeapon => w !== null),
    );
    setPendingWeaponRefs(null);
  }, [weapons, pendingWeaponRefs]);

  const meta = gameMeta[gameId] ?? gameMeta.mw4;

  if (loading) {
    return (
      <AppLayout
        selectedGame={gameId}
        onGameSelect={(id) => navigate(`/${id}/create`)}
        breadcrumb={
          <>
            <BreadcrumbLink to={explorePath(gameId)}>
              {meta.short}
            </BreadcrumbLink>
            <BreadcrumbSpacer />
            <span className="">{editId ? "Edit Loadout" : "New Loadout"}</span>
          </>
        }
      >
        <LoadoutBuilderSkeleton />
      </AppLayout>
    );
  }

  const attachmentsByType = attachments.reduce<Record<string, Attachment[]>>(
    (acc, a) => {
      (acc[a.type] ??= []).push(a);
      return acc;
    },
    {},
  );
  const attachmentTypes = Object.keys(attachmentsByType);

  const weaponTypes = sortWeaponCategories(
    weapons
      .map((w) => w.typeShort || w.type)
      .filter((t): t is string => Boolean(t)),
  );

  // Only one weapon is ever selected at once (toggleWeapon always replaces the array
  // rather than appending), so the builder's preview/attachments UI just uses the first.
  const primaryWeapon = selectedWeapons[0];
  const primaryWeaponBadges: WeaponImageBadge[] = primaryWeapon
    ? Object.entries(primaryWeapon.attachments)
        .map(([type, name]): WeaponImageBadge | null => {
          const attachment = attachmentsByType[type]?.find(
            (a) => a.name === name,
          );
          if (!attachment) return null;
          return {
            key: attachment.id,
            typeSlug: attachment.typeSlug || type,
            label: attachment.name,
            iconUrl: attachment.imageUrl,
          };
        })
        .filter((badge): badge is WeaponImageBadge => badge !== null)
    : [];

  const filteredWeapons = weapons.filter((weapon) => {
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

  return (
    <AppLayout
      selectedGame={gameId}
      onGameSelect={(id) => navigate(`/${id}/create`)}
      breadcrumb={
        <>
          <BreadcrumbLink to={explorePath(gameId)}>{meta.short}</BreadcrumbLink>
          <BreadcrumbSpacer />
          <span className="">{editId ? "Edit Loadout" : "New Loadout"}</span>
        </>
      }
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Button
          onClick={() => navigate(explorePath(gameId))}
          variant="ghost"
          className="*:h-14 w-14"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <div className="flex flex-col flex-1 gap-1">
          <h1 className="text-[32px] leading-[40px] text-[#efedf1] font-semibold">
            {editId ? "Edit Loadout" : "New Loadout"}
          </h1>
          <p className="text-[14px] text-[#8d898a]">
            Pick your weapons, tune each build, then publish it for the
            community.
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
        <h2 className="text-[16px]  font-semibold">Loadout details</h2>
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
              aria-describedby={loadoutNameError ? "loadout-name-error" : undefined}
              placeholder="Enter a name for this loadout"
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
              <label className="text-[12px] pb-2 tracking-[0.5px] uppercase text-[#8d898a] font-semibold">
                Tag
              </label>
              <ToggleGroup
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
            <label className="text-[12px] tracking-[0.5px] uppercase text-[#8d898a] font-semibold">
              Description (optional)
            </label>
            <textarea
              value={loadoutDescription}
              onChange={(e) => setLoadoutDescription(e.target.value)}
              placeholder="Describe your strategy, playstyle, or tips..."
              rows={3}
              className="rounded-xl bg-white/[0.04] border border-white/[0.07] px-4 py-3 text-[14px]  placeholder:text-[#8d898a] outline-none focus:border-white/30 transition-colors resize-none"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[12px] tracking-[0.5px] uppercase text-[#8d898a] font-semibold">
              In-game loadout code (optional)
            </label>
            <input
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
                aria-describedby={videoError ? "loadout-video-error" : undefined}
                placeholder="Paste a TikTok, Instagram, or YouTube link"
                className="flex-1 bg-transparent text-[14px]  placeholder:text-[#8d898a] outline-none"
              />
            </div>
            {videoError && (
              <p id="loadout-video-error" className="text-[12px] text-[#ef9696]">
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
          <h2 className={cn("text-base", attachmentError && "text-[#ef9696]")}>Weapon</h2>
          {attachmentError && (
            <p className="text-xs text-[#ef9696]" role="alert">
              Choose {MIN_REQUIRED_ATTACHMENTS - selectedAttachmentCount} more attachment
              {MIN_REQUIRED_ATTACHMENTS - selectedAttachmentCount === 1 ? "" : "s"}
            </p>
          )}
        </div>

        {primaryWeapon && !pickingWeapon ? (
          <>
            <div className="flex flex-col items-center gap-3 pb-2">
              <WeaponImage
                imageUrl={primaryWeapon.imageUrl}
                variant="small"
                alt={primaryWeapon.name}
                weaponId={primaryWeapon.id}
                badges={primaryWeaponBadges}
                highlightSlugs={primaryWeaponBadges.map(
                  (badge) => badge.typeSlug,
                )}
              />
              {primaryWeapon.name}
              <Button variant="outline" onClick={() => setPickingWeapon(true)}>
                Change weapon
              </Button>
            </div>

            <h2 className="text-xs">Attachments</h2>

            {attachmentTypes.length === 0 ? (
              <p className="text-teritary">
                No attachments configured for this game yet.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {attachmentTypes.map((type) => {
                  const typeImageUrl = attachmentsByType[type][0]?.typeImageUrl;
                  const selectedName = primaryWeapon.attachments[type];
                  const isAnySelected = selectedName === ANY_ATTACHMENT_VALUE;
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
                        className={cn(
                          "h-12 px-4 rounded-xl border border-white/[0.12] flex items-center gap-2 text-left transition-colors hover:border-white/40",
                          selectedName && "bg-white/5",
                          attachmentError &&
                            !selectedName &&
                            "border-destructive/50 bg-destructive/[0.06] hover:border-destructive",
                        )}
                        aria-invalid={attachmentError && !selectedName}
                      >
                        <div className="flex gap-2 flex-1 flex-row">
                          {isAnySelected ? (
                            <span className="flex size-5 items-center justify-center font-mono text-xs text-teritary">
                              ∞
                            </span>
                          ) : !selectedName ? (
                            <Plus className="size-5 opacity-50" />
                          ) : null}

                          {typeImageUrl ? (
                            <img
                              src={typeImageUrl}
                              alt=""
                              className="size-5 opacity-80 object-contain"
                            />
                          ) : null}

                          {isAnySelected ? (
                            <>
                              Any
                              <span className="text-teritary font-normal">
                                {type}
                              </span>
                            </>
                          ) : selectedName ? (
                            <>
                              {selectedName}
                              <span className="text-teritary font-normal">
                                {type}
                              </span>
                            </>
                          ) : (
                            <span className="text-teritary">Add {type}</span>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-teritary shrink-0" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
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
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredWeapons.map((weapon) => {
                  const isSelected = selectedWeapons.some(
                    (w) => w.id === weapon.id,
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
            )}
          </>
        )}
      </Container>

      {primaryWeapon && openAttachmentType && (
        <ResponsiveDialog
          open
          onOpenChange={(open) => {
            if (!open) setOpenAttachmentType(null);
          }}
          title={openAttachmentType}
        >
          <AttachmentPickerList
            options={attachmentsByType[openAttachmentType]}
            selected={primaryWeapon.attachments[openAttachmentType]}
            allowAny={allowsAnyAttachment(openAttachmentType)}
            onSelect={(name) => {
              setWeaponAttachment(primaryWeapon.id, openAttachmentType, name);
              setOpenAttachmentType(null);
            }}
            onDeselect={() => {
              setWeaponAttachment(primaryWeapon.id, openAttachmentType, "");
              setOpenAttachmentType(null);
            }}
          />
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
              Choose at least {MIN_REQUIRED_ATTACHMENTS} specific attachments
              before finishing your loadout.
            </p>
            <p className="mt-2 text-sm leading-6 text-teritary">
              A specific attachment or an explicit “Any” choice both count
              toward the required total.
            </p>
          </div>

          <div className="rounded-xl border border-destructive/25 bg-destructive/[0.06] p-4">
            <div className="mb-3 flex items-center justify-between gap-4">
              <span className="text-sm text-secondary">
                Attachments selected
              </span>
              <span className="font-mono text-sm text-[#ef9696]">
                {selectedAttachmentCount}/{MIN_REQUIRED_ATTACHMENTS}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-destructive transition-[width] duration-300"
                style={{
                  width: `${Math.min(
                    100,
                    (selectedAttachmentCount / MIN_REQUIRED_ATTACHMENTS) * 100,
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
                Your loadout was created successfully
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-teritary">
                Download its QR code to share the build anywhere, or jump
                straight to your published loadout.
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
                View loadout
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

      {/* Perks and Equipment sections
      <div className="bg-[#121111] border border-[#201e1f] rounded-3xl p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <p className="text-[16px]  font-semibold">Perks</p>
          <span className="h-7 px-3 rounded-[10px] border border-white/[0.18] flex items-center text-[12px] ">
            {selectedPerks.length}/3 selected
          </span>
        </div>
        {availablePerks.length === 0 ? (
          <p className="text-[14px] text-[#8d898a]">No perks available for this game yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {availablePerks.map((perk) => (
              <Pill
                key={perk.id}
                label={perk.name}
                isSelected={selectedPerks.includes(perk.name)}
                onClick={() => togglePerk(perk.name)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="bg-[#121111] border border-[#201e1f] rounded-3xl p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <p className="text-[16px]  font-semibold">Equipment</p>
          <span className="h-7 px-3 rounded-[10px] border border-white/[0.18] flex items-center text-[12px] ">
            {selectedEquipment.length}/2 selected
          </span>
        </div>
        {availableEquipment.length === 0 ? (
          <p className="text-[14px] text-[#8d898a]">No equipment available for this game yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {availableEquipment.map((equipment) => (
              <Pill
                key={equipment.id}
                label={equipment.name}
                isSelected={selectedEquipment.includes(equipment.name)}
                onClick={() => toggleEquipment(equipment.name)}
              />
            ))}
          </div>
        )}
      </div>*/}
    </AppLayout>
  );
}
