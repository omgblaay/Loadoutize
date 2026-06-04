import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router";
import { useAuth } from "./AuthContext";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { getGameColor } from "../utils/gameColors";
import { ArrowLeft, Save, Check } from "lucide-react";

interface Weapon {
  id: string;
  name: string;
  type: string;
  damage: number;
  fireRate: number;
}

export function LoadoutBuilder() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const { user, accessToken } = useAuth();

  const [loadoutName, setLoadoutName] = useState("");
  const [loadoutDescription, setLoadoutDescription] = useState("");
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [selectedWeapons, setSelectedWeapons] = useState<Weapon[]>([]);
  const [selectedPerks, setSelectedPerks] = useState<string[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate(`/game/${gameId}`);
    }
  }, [user, gameId, navigate]);

  const availablePerks = [
    "Ghost",
    "Quick Fix",
    "Scavenger",
    "Cold Blooded",
    "Ninja",
    "Gung-Ho",
    "Tracker",
    "Engineer",
  ];

  const availableEquipment = [
    "Frag Grenade",
    "Semtex",
    "Flashbang",
    "Smoke Grenade",
    "Stun Grenade",
    "Molotov",
  ];

  useEffect(() => {
    if (gameId) {
      fetchWeapons();
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
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );
      const data = await response.json();
      if (data.weapons) {
        setWeapons(data.weapons);
      }
    } catch (error) {
      console.error("Error fetching weapons:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadExistingLoadout = async () => {
    if (!accessToken) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/my-loadouts`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const data = await response.json();
      const loadout = data.loadouts?.find((l: any) => l.id === editId);
      if (loadout) {
        setLoadoutName(loadout.name);
        setLoadoutDescription(loadout.description || "");
        setSelectedWeapons(loadout.weapons || []);
        setSelectedPerks(loadout.perks || []);
        setSelectedEquipment(loadout.equipment || []);
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
    };

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
        navigate(`/game/${gameId}`);
      } else {
        const error = await response.json();
        console.error("Error saving loadout:", error);
        alert(error.error || "Failed to save loadout");
      }
    } catch (error) {
      console.error("Error saving loadout:", error);
      alert("Failed to save loadout");
    }
  };

  const toggleWeapon = (weapon: Weapon) => {
    if (selectedWeapons.some((w) => w.id === weapon.id)) {
      setSelectedWeapons(selectedWeapons.filter((w) => w.id !== weapon.id));
    } else if (selectedWeapons.length < 2) {
      setSelectedWeapons([...selectedWeapons, weapon]);
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950">
        <div className="text-white text-xl font-bold">Loading...</div>
      </div>
    );
  }

  const accentColor = getGameColor(gameId);

  return (
    <div className="min-h-screen bg-neutral-950">
      <header className="border-b border-neutral-800 bg-neutral-900 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(`/game/${gameId}`)}
              className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors font-medium"
            >
              <ArrowLeft className="w-5 h-5" />
              Cancel
            </button>
            <h1
              className="text-2xl font-black uppercase tracking-tight"
              style={{ color: accentColor.primary }}
            >
              {editId ? "Edit Loadout" : "New Loadout"}
            </h1>
            <button
              onClick={saveLoadout}
              className="font-bold py-3 px-6 transition-opacity hover:opacity-90 flex items-center gap-2 text-neutral-900"
              style={{ backgroundColor: accentColor.primary }}
            >
              <Save className="w-5 h-5" />
              {editId ? "Update" : "Publish"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="bg-neutral-900 border-2 border-neutral-800 p-8 mb-6">
          <h2
            className="text-xs font-black uppercase tracking-wider mb-4"
            style={{ color: accentColor.primary }}
          >
            Loadout Details
          </h2>
          <div className="space-y-6">
            <div>
              <label className="block mb-2 text-sm font-bold text-neutral-400">
                Name
              </label>
              <input
                type="text"
                value={loadoutName}
                onChange={(e) => setLoadoutName(e.target.value)}
                placeholder="Enter a name for this loadout"
                className="w-full bg-neutral-950 border-2 border-neutral-800 px-4 py-3 text-white font-medium placeholder-neutral-600 focus:outline-none transition-colors"
                style={{
                  ['--tw-ring-color' as any]: accentColor.primary,
                }}
                onFocus={(e) => e.target.style.borderColor = accentColor.primary}
                onBlur={(e) => e.target.style.borderColor = ''}
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-bold text-neutral-400">
                Description (Optional)
              </label>
              <textarea
                value={loadoutDescription}
                onChange={(e) => setLoadoutDescription(e.target.value)}
                placeholder="Describe your strategy, playstyle, or tips..."
                rows={4}
                className="w-full bg-neutral-950 border-2 border-neutral-800 px-4 py-3 text-white font-medium placeholder-neutral-600 focus:outline-none transition-colors resize-none"
                onFocus={(e) => e.target.style.borderColor = accentColor.primary}
                onBlur={(e) => e.target.style.borderColor = ''}
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-neutral-900 border-2 border-neutral-800 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2
                className="text-xs font-black uppercase tracking-wider"
                style={{ color: accentColor.primary }}
              >
                Weapons
              </h2>
              <span className="text-sm font-bold text-white">
                {selectedWeapons.length}/2 Selected
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {weapons.map((weapon) => {
                const isSelected = selectedWeapons.some(
                  (w) => w.id === weapon.id
                );
                return (
                  <button
                    key={weapon.id}
                    onClick={() => toggleWeapon(weapon)}
                    className={`text-left p-4 border-2 transition-all ${
                      isSelected
                        ? "text-neutral-900"
                        : "border-neutral-800 hover:border-neutral-700 text-white"
                    }`}
                    style={isSelected ? {
                      backgroundColor: accentColor.primary,
                      borderColor: accentColor.primary,
                    } : {}}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className={`text-lg font-black ${isSelected ? "text-neutral-900" : "text-white"}`}>
                        {weapon.name}
                      </h3>
                      {isSelected && (
                        <Check className="w-5 h-5 text-neutral-900" />
                      )}
                    </div>
                    <p className={`text-sm font-medium mb-3 ${isSelected ? "text-neutral-800" : "text-neutral-400"}`}>
                      {weapon.type}
                    </p>
                    <div className="flex gap-4 text-xs">
                      <div className={isSelected ? "text-neutral-800" : "text-neutral-500"}>
                        <span className="font-bold">DMG</span> {weapon.damage}
                      </div>
                      <div className={isSelected ? "text-neutral-800" : "text-neutral-500"}>
                        <span className="font-bold">RPM</span> {weapon.fireRate}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-neutral-900 border-2 border-neutral-800 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2
                className="text-xs font-black uppercase tracking-wider"
                style={{ color: accentColor.primary }}
              >
                Perks
              </h2>
              <span className="text-sm font-bold text-white">
                {selectedPerks.length}/3 Selected
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {availablePerks.map((perk) => {
                const isSelected = selectedPerks.includes(perk);
                return (
                  <button
                    key={perk}
                    onClick={() => togglePerk(perk)}
                    className={`p-4 border-2 font-bold text-sm transition-all ${
                      isSelected
                        ? "text-neutral-900"
                        : "border-neutral-800 hover:border-neutral-700 text-white"
                    }`}
                    style={isSelected ? {
                      backgroundColor: accentColor.primary,
                      borderColor: accentColor.primary,
                    } : {}}
                  >
                    {perk}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-neutral-900 border-2 border-neutral-800 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2
                className="text-xs font-black uppercase tracking-wider"
                style={{ color: accentColor.primary }}
              >
                Equipment
              </h2>
              <span className="text-sm font-bold text-white">
                {selectedEquipment.length}/2 Selected
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {availableEquipment.map((equipment) => {
                const isSelected = selectedEquipment.includes(equipment);
                return (
                  <button
                    key={equipment}
                    onClick={() => toggleEquipment(equipment)}
                    className={`p-4 border-2 font-bold text-sm transition-all ${
                      isSelected
                        ? "text-neutral-900"
                        : "border-neutral-800 hover:border-neutral-700 text-white"
                    }`}
                    style={isSelected ? {
                      backgroundColor: accentColor.primary,
                      borderColor: accentColor.primary,
                    } : {}}
                  >
                    {equipment}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
