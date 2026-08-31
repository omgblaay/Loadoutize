import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router";
import { useAuth } from "./AuthContext";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { getGameColor } from "../utils/gameColors";
import { gameMeta } from "../utils/games";
import { AppLayout } from "./AppLayout";
import { ArrowLeft, Save, Check, Puzzle } from "lucide-react";
import { WeaponTile } from "./ui/WeaponTile";
import { Tag } from "./ui/tag";
import { BreadcrumbLink, BreadcrumbSpacer } from "./ui/breadcrumb";

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


export function Pill({
  label,
  isSelected,
  accent,
  onClick,
}: {
  label: string;
  isSelected: boolean;
  accent: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="h-11 px-4 rounded-xl border text-[14px] font-medium transition-colors text-left"
      style={
        isSelected
          ? { background: accent, borderColor: accent, color: "#161414" }
          : { borderColor: "rgba(255,255,255,0.18)", color: "#fafafa" }
      }
    >
      {label}
    </button>
  );
}

function TagOption({
  tag,
  isSelected,
  disabled,
  onClick,
}: {
  tag: LoadoutTag;
  isSelected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? "Not available for the weapon category(ies) in this loadout" : undefined}
      className="transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
      style={isSelected ? { outline: `2px solid ${tag.color}`, outlineOffset: 2, borderRadius: 6 } : undefined}
    >
      <Tag color={tag.color}>{tag.name}</Tag>
    </button>
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

    const loadoutData = {
      name: loadoutName,
      description: loadoutDescription,
      weapons: selectedWeapons,
      perks: selectedPerks,
      equipment: selectedEquipment,
      tagId: selectedTagId,
    };

    setSaving(true);
    try {
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
        navigate(`/${gameId}/loadout/${loadout.id}`);
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
      if (prev.length >= 2) return prev;
      return [...prev, { ...weapon, attachments: {} }];
    });
  };

  const setWeaponAttachment = (weaponId: string, slot: string, attachmentName: string) => {
    setSelectedWeapons((prev) =>
      prev.map((w) => {
        if (w.id !== weaponId) return w;
        const next = { ...w.attachments };
        if (next[slot] === attachmentName) {
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

  const toggleTag = (tag: LoadoutTag) => {
    setSelectedTagId((prev) => (prev === tag.id ? null : tag.id));
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0909]">
        <div className="text-[#efedf1]">Loading…</div>
      </div>
    );
  }

  const accent = getGameColor(gameId).primary;
  const meta = gameMeta[gameId] ?? gameMeta.mw4;

  const attachmentsByType = attachments.reduce<Record<string, Attachment[]>>((acc, a) => {
    (acc[a.type] ??= []).push(a);
    return acc;
  }, {});
  const attachmentTypes = Object.keys(attachmentsByType);

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
        <div className="flex flex-col gap-1">
          <h1 className="text-[32px] leading-[40px] text-[#efedf1] font-semibold">
            {editId ? "Edit Loadout" : "New Loadout"}
          </h1>
          <p className="text-[14px] text-[#8d898a]">
            Pick your weapons, tune each build, then publish it for the community.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/${gameId}/explore`)}
            className="h-[52px] px-4 rounded-xl border border-white/[0.18] flex items-center gap-2 text-[#bebcbc] hover:text-[#efedf1] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Cancel
          </button>
          <button
            onClick={saveLoadout}
            disabled={saving}
            className="h-[52px] px-5 rounded-xl flex items-center gap-2 text-[#161414] font-medium disabled:opacity-60"
            style={{ background: accent }}
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving…" : editId ? "Update" : "Publish"}
          </button>
        </div>
      </div>

      <div className="bg-[#121111] border border-[#201e1f] rounded-3xl p-6 flex flex-col gap-5">
        <p className="text-[16px] text-[#fafafa] font-semibold">Loadout details</p>
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
        </div>
      </div>

      <div className="bg-[#121111] border border-[#201e1f] rounded-3xl p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <p className="text-[16px] text-[#fafafa] font-semibold">Weapons</p>
          <span className="h-7 px-3 rounded-[10px] border border-white/[0.18] flex items-center text-[12px] text-[#fafafa]">
            {selectedWeapons.length}/2 selected
          </span>
        </div>
        {weapons.length === 0 ? (
          <p className="text-[14px] text-[#8d898a]">No weapons available for this game yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {weapons.map((weapon) => {
              const isSelected = selectedWeapons.some((w) => w.id === weapon.id);
              return (
                <WeaponTile
                  key={weapon.id}
                  weapon={{
                    ...weapon,
                    typeShort: weapon.typeShort ?? undefined,
                    imageUrl: weapon.imageUrl ?? undefined,
                  }}
                  isSelected={isSelected}
                  disabled={!isSelected && selectedWeapons.length >= 2}
                  onToggle={() => toggleWeapon(weapon)}
                />
              );
            })}
          </div>
        )}
      </div>

      {selectedWeapons.map((weapon) => (
        <div key={weapon.id} className="bg-[#121111] border border-[#201e1f] rounded-3xl p-6 flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <span className="h-7 px-2.5 rounded-[10px] border border-white/[0.18] flex items-center text-[12px] uppercase text-[#fafafa] tracking-[0.5px]">
              {weapon.typeShort || "—"}
            </span>
            <p className="text-[16px] text-[#fafafa] font-semibold flex-1">{weapon.name} build</p>
          </div>

          {attachmentTypes.length === 0 ? (
            <p className="text-[14px] text-[#8d898a]">No attachments configured for this game yet.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {attachmentTypes.map((type) => (
                <div key={type} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-white/[0.02] border border-white/[0.18] flex items-center justify-center shrink-0">
                      <Puzzle className="w-3.5 h-3.5 text-[#8d898a]" />
                    </div>
                    <p className="text-[12px] tracking-[0.5px] uppercase text-[#8d898a] font-semibold">
                      {type}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {attachmentsByType[type].map((att) => (
                      <Pill
                        key={att.id}
                        label={att.name}
                        isSelected={weapon.attachments[type] === att.name}
                        accent={accent}
                        onClick={() => setWeaponAttachment(weapon.id, type, att.name)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {tags.length > 0 && (
        <div className="bg-[#121111] border border-[#201e1f] rounded-3xl p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <p className="text-[16px] text-[#fafafa] font-semibold">Tag</p>
            <span className="h-7 px-3 rounded-[10px] border border-white/[0.18] flex items-center text-[12px] text-[#fafafa]">
              {selectedTagId != null ? "1/1 selected" : "0/1 selected"}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <TagOption
                key={tag.id}
                tag={tag}
                isSelected={selectedTagId === tag.id}
                disabled={selectedTagId !== tag.id && !isTagAllowed(tag)}
                onClick={() => toggleTag(tag)}
              />
            ))}
          </div>
        </div>
      )}

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
                accent={accent}
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
                accent={accent}
                onClick={() => toggleEquipment(equipment.name)}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
