import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router";
import { useAuth } from "./AuthContext";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { gameMeta } from "../utils/games";
import { AppLayout } from "./AppLayout";
import {
  ArrowLeft,
  Save,
  Plus,
  Search,
  ChevronRight,
  Check,
  X,
} from "lucide-react";
import { WeaponCard } from "./ui/WeaponCard";
import { WeaponImage, type WeaponImageBadge } from "./ui/WeaponImage";
import { Tag } from "./ui/tag";
import { BreadcrumbLink, BreadcrumbSpacer } from "./ui/breadcrumb";
import { FilterPill, FilterPillGroup } from "./ui/filter-pill";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import { ResponsiveDialog } from "./ui/responsive-dialog";
import { Skeleton } from "./ui/skeleton";
import { cn } from "./ui/utils";
import { detectVideoPlatform, VIDEO_PLATFORM_META } from "../utils/video";
import { Container } from "./ui/container";
import { Button } from "./ui/button";
import { getRecaptchaToken, RecaptchaNotice } from "./ui/recaptcha";

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

/** Searchable list shown inside the attachment ResponsiveDialog -- a fresh instance mounts each
 * time the dialog opens (the caller only renders it while a type is open), so its search query
 * resets for free instead of needing to be cleared manually. */
function AttachmentPickerList({
  options,
  selected,
  onSelect,
  onDeselect,
}: {
  options: Attachment[];
  selected: string | undefined;
  onSelect: (name: string) => void;
  onDeselect: () => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = options.filter((att) => att.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search attachments..."
        className="h-11 rounded-xl bg-white/[0.04] border border-white/[0.07] px-4 text-[14px] text-[#fafafa] placeholder:text-[#8d898a] outline-none focus:border-white/30 transition-colors"
      />

      {selected && (
        <button
          type="button"
          onClick={onDeselect}
          className="h-11 px-4 rounded-xl border border-[#d4183d]/30 flex items-center justify-between text-[14px] text-[#ef9696] hover:border-[#d4183d]/60 transition-colors"
        >
          Deselect {selected}
          <X className="w-4 h-4" />
        </button>
      )}

      <div className="flex flex-col gap-1 max-h-[min(60vh,420px)] overflow-y-auto -mx-1 px-1">
        {filtered.length === 0 ? (
          <p className="text-[14px] text-[#8d898a] py-4 text-center">No attachments match your search.</p>
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
                  isSelected ? "bg-[#fafafa] text-[#161414]" : "text-[#fafafa] hover:bg-white/[0.05]"
                )}
              >
                {att.imageUrl ? (
                  <img src={att.imageUrl} alt="" className="w-6 h-6 object-contain shrink-0" />
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
      title={disabled ? "Not available for the weapon category(ies) in this loadout" : undefined}
      className="h-auto min-w-0 py-2 px-4 bg-transparent hover:bg-transparent hover:text-inherit data-[state=on]:bg-transparent data-[state=on]:text-inherit data-[state=on]:hover:bg-transparent transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
      style={isSelected ? { background: `${tag.color}`, color: "#f1f1f1", outlineOffset: 2, borderRadius: 20, } : undefined}
    >
      {/* <div className="w-2 h-2 rounded-full" style={!isSelected ? { background: `${tag.color}`} : undefined}/> */}
      <p className="font-handwritten text-xl flex" style={{ color: isSelected ? "#ffffff" : tag.color }}>{tag.name}</p>
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
            <Skeleton key={i} className={cn("rounded-2xl aspect-square", block)} />
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
  const [pendingWeaponRefs, setPendingWeaponRefs] = useState<LoadoutWeaponRef[] | null>(null);
  const [weaponTypeFilter, setWeaponTypeFilter] = useState<string | null>(null);
  const [pickingWeapon, setPickingWeapon] = useState(false);
  const [openAttachmentType, setOpenAttachmentType] = useState<string | null>(null);
  const [weaponSearchOpen, setWeaponSearchOpen] = useState(false);
  const [weaponSearchQuery, setWeaponSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/${gameId}/explore`);
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
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
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
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
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
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
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
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
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
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
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
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const data = await response.json();
      const loadout = data.loadouts?.find((l: any) => l.id === editId);
      if (loadout) {
        setLoadoutName(loadout.name);
        setLoadoutDescription(loadout.description || "");
        setGameLoadoutCode(loadout.gameLoadoutCode || "");
        setVideoUrl(loadout.video?.url || "");
        setPendingWeaponRefs(
          (loadout.weapons || []).map((w: any) => ({ id: w.id, attachments: w.attachments ?? {} }))
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
    if (!loadoutName.trim()) {
      alert("Please enter a loadout name");
      return;
    }

    if (!accessToken) {
      alert("You must be logged in to save loadouts");
      return;
    }

    const trimmedVideoUrl = videoUrl.trim();
    if (trimmedVideoUrl && !detectVideoPlatform(trimmedVideoUrl)) {
      setVideoError("Video must be a TikTok, Instagram, or YouTube link");
      return;
    }
    setVideoError("");

    setSaving(true);
    try {
      const recaptchaToken = editId ? undefined : await getRecaptchaToken("create_loadout");

      const loadoutData = {
        name: loadoutName,
        description: loadoutDescription,
        gameLoadoutCode: gameLoadoutCode.trim() || null,
        videoUrl: trimmedVideoUrl || null,
        weapons: selectedWeapons,
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
        navigate(`/${gameId}/l/${loadout.id}`);
      } else {
        const error = await response.json();
        console.error("Error saving loadout:", error);
        alert(error.error || "Failed to save loadout");
      }
    } catch (error) {
      console.error("Error saving loadout:", error);
      alert("Failed to save loadout");
    } finally {
      setSaving(false);
    }
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
  const setWeaponAttachment = (weaponId: string, slot: string, attachmentName: string) => {
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
      })
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
      (w) => w.categoryId != null && tag.allowedWeaponCategoryIds.includes(w.categoryId)
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
          return catalogWeapon ? { ...catalogWeapon, attachments: ref.attachments } : null;
        })
        .filter((w): w is SelectedWeapon => w !== null)
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
            <BreadcrumbLink to={`/${gameId}/explore`}>{meta.short}</BreadcrumbLink>
            <BreadcrumbSpacer />
            <span className="text-[#fafafa]">{editId ? "Edit Loadout" : "New Loadout"}</span>
          </>
        }
      >
        <LoadoutBuilderSkeleton />
      </AppLayout>
    );
  }

  const attachmentsByType = attachments.reduce<Record<string, Attachment[]>>((acc, a) => {
    (acc[a.type] ??= []).push(a);
    return acc;
  }, {});
  const attachmentTypes = Object.keys(attachmentsByType);

  const weaponTypes = Array.from(new Set(weapons.map((w) => w.typeShort || w.type).filter((t): t is string => Boolean(t))));

  // Only one weapon is ever selected at once (toggleWeapon always replaces the array
  // rather than appending), so the builder's preview/attachments UI just uses the first.
  const primaryWeapon = selectedWeapons[0];
  const primaryWeaponBadges: WeaponImageBadge[] = primaryWeapon
    ? Object.entries(primaryWeapon.attachments)
      .map(([type, name]): WeaponImageBadge | null => {
        const attachment = attachmentsByType[type]?.find((a) => a.name === name);
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
    if (weaponTypeFilter && weapon.typeShort !== weaponTypeFilter && weapon.type !== weaponTypeFilter) {
      return false;
    }
    if (weaponSearchQuery.trim() && !weapon.name.toLowerCase().includes(weaponSearchQuery.trim().toLowerCase())) {
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
          <BreadcrumbLink to={`/${gameId}/explore`}>{meta.short}</BreadcrumbLink>
          <BreadcrumbSpacer />
          <span className="text-[#fafafa]">{editId ? "Edit Loadout" : "New Loadout"}</span>
        </>
      }
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Button
          onClick={() => navigate(`/${gameId}/explore`)}
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
            Pick your weapons, tune each build, then publish it for the community.
          </p>
        </div>
        <div className="flex items-center gap-3">

          <Button
            onClick={saveLoadout}
            disabled={saving}
            className="h-[52px] px-5 rounded-xl flex items-center gap-2 text-[#161414] font-medium disabled:opacity-60 bg-[#fafafa]"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving…" : editId ? "Update" : "Publish"}
          </Button>
        </div>
      </div>

      <Container>
        <h2 className="text-[16px] text-[#fafafa] font-semibold">Loadout details</h2>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[12px] tracking-[0.5px] uppercase text-[#8d898a] font-semibold">
              Name
            </label>
            <input
              type="text"
              value={loadoutName}
              onChange={(e) => setLoadoutName(e.target.value)}
              placeholder="Enter a name for this loadout"
              className="h-12 rounded-xl bg-white/[0.04] border border-white/[0.07] px-4 text-[14px] text-[#fafafa] placeholder:text-[#8d898a] outline-none focus:border-white/30 transition-colors"
            />
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
              className="rounded-xl bg-white/[0.04] border border-white/[0.07] px-4 py-3 text-[14px] text-[#fafafa] placeholder:text-[#8d898a] outline-none focus:border-white/30 transition-colors resize-none"
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
              className="h-12 rounded-xl bg-white/[0.04] border border-white/[0.07] px-4 text-[14px] font-mono text-[#fafafa] placeholder:text-[#8d898a] placeholder:font-sans outline-none focus:border-white/30 transition-colors"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[12px] tracking-[0.5px] uppercase text-[#8d898a] font-semibold">
              Attach a video (optional)
            </label>
            <div className="h-12 rounded-xl bg-white/[0.04] border border-white/[0.07] px-4 flex items-center gap-2 focus-within:border-white/30 transition-colors">
              {(() => {
                const platform = videoUrl.trim() ? detectVideoPlatform(videoUrl.trim()) : null;
                const Icon = platform ? VIDEO_PLATFORM_META[platform].icon : null;
                return Icon ? <Icon className="w-4 h-4 text-[#8d898a] shrink-0" /> : null;
              })()}
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => {
                  setVideoUrl(e.target.value);
                  setVideoError("");
                }}
                placeholder="Paste a TikTok, Instagram, or YouTube link"
                className="flex-1 bg-transparent text-[14px] text-[#fafafa] placeholder:text-[#8d898a] outline-none"
              />
            </div>
            {videoError && <p className="text-[12px] text-[#ef9696]">{videoError}</p>}
          </div>

        </div>
      </Container>

      <Container>
        <h2 className="text-[16px] text-[#fafafa] font-semibold">Select weapon</h2>

        {primaryWeapon && !pickingWeapon ? (
          <>
            <div className="flex flex-col items-center gap-3 pb-2">
              <WeaponImage
                imageUrl={primaryWeapon.imageUrl}
                variant="small"
                alt={primaryWeapon.name}
                weaponId={primaryWeapon.id}
                badges={primaryWeaponBadges}
                highlightSlugs={primaryWeaponBadges.map((badge) => badge.typeSlug)}
              />
              <Button variant="outline" onClick={() => setPickingWeapon(true)}>
                Change weapon
              </Button>
            </div>

            <h2 className="text-lg font-semibold">Attachments</h2>

            {attachmentTypes.length === 0 ? (
              <p className="text-[14px] text-teritary">No attachments configured for this game yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {attachmentTypes.map((type) => {
                  const typeImageUrl = attachmentsByType[type][0]?.typeImageUrl;
                  const selectedName = primaryWeapon.attachments[type];
                  return (
                    <div key={type} className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        {/* <div>
                          {typeImageUrl ? (
                            <img src={typeImageUrl} alt="" className="size-5 opacity-80 object-contain" />
                          ) : (
                            null
                          )}
                        </div>
                        <p className="uppercase text-secondary text-xs font-semibold">
                          {type}
                        </p> */}
                      </div>
                      <button
                        type="button"
                        onClick={() => setOpenAttachmentType(type)}
                        className="h-12 px-4 rounded-xl border border-white/[0.18] flex items-center gap-2 text-left transition-colors hover:border-white/40"
                      >
                        <div className="flex gap-2 flex-1 flex-row">
                        {selectedName ? (
                          null
                        ) :
                          <>
                            <Plus className="size-5 opacity-50" />
                          </>
                        }


                        {typeImageUrl ? (
                          <img src={typeImageUrl} alt="" className="size-5 opacity-80 object-contain" />
                        ) : (
                          null
                        )}


                        {selectedName ? (
                          <>
                            {selectedName}
                            <span className="text-teritary">{type}</span>
                          </>
                        ) : 
                        <span className="text-secondary">
                          Add {type}
                        </span>}

</div>
                        <ChevronRight className="w-4 h-4 text-[#8d898a] shrink-0" />
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
                className="h-11 rounded-xl bg-white/[0.04] border border-white/[0.07] px-4 text-[14px] text-[#fafafa] placeholder:text-[#8d898a] outline-none focus:border-white/30 transition-colors"
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
                    className="w-9 h-9 rounded-xl border border-white/[0.18] flex items-center justify-center text-[#fafafa] hover:bg-white/[0.05] transition-colors"
                    aria-label={weaponSearchOpen ? "Close search" : "Search weapons"}
                  >
                    {weaponSearchOpen ? <X className="w-4 h-4" /> : <Search className="size-4.5" />}
                  </button>
                </div>
                <FilterPillGroup
                  type="single"
                  value={weaponTypeFilter ?? ""}
                  onValueChange={(v) => setWeaponTypeFilter(v || null)}
                >
                  <FilterPill value="">
                    All
                  </FilterPill>
                  {weaponTypes.map((type) => (
                    <FilterPill key={type} value={type} className="uppercase">
                      {type}
                    </FilterPill>
                  ))}
                </FilterPillGroup>
              </div>
            )}

            {weapons.length === 0 ? (
              <p className="text-[14px] text-[#8d898a]">No weapons available for this game yet.</p>
            ) : filteredWeapons.length === 0 ? (
              <p className="text-[14px] text-[#8d898a]">No weapons match your filters.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredWeapons.map((weapon) => {
                  const isSelected = selectedWeapons.some((w) => w.id === weapon.id);
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

      {!editId && <RecaptchaNotice className="text-[12px] text-[#8d898a]" />}

      { /* Perks and Equipment sections
      <div className="bg-[#121111] border border-[#201e1f] rounded-3xl p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <p className="text-[16px] text-[#fafafa] font-semibold">Perks</p>
          <span className="h-7 px-3 rounded-[10px] border border-white/[0.18] flex items-center text-[12px] text-[#fafafa]">
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
          <p className="text-[16px] text-[#fafafa] font-semibold">Equipment</p>
          <span className="h-7 px-3 rounded-[10px] border border-white/[0.18] flex items-center text-[12px] text-[#fafafa]">
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
      </div>*/ }
    </AppLayout>
  );
}
