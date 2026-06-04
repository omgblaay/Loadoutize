import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { getGameColor } from "../utils/gameColors";
import { ArrowLeft, Heart, Eye, User, Share2, Edit } from "lucide-react";
import { useAuth } from "./AuthContext";

interface Loadout {
  id: string;
  gameId: string;
  userId: string;
  userName: string;
  name: string;
  description?: string;
  weapons: any[];
  perks?: any[];
  equipment?: any[];
  likes: number;
  views: number;
  createdAt: string;
}

export function LoadoutPreview() {
  const { gameId, loadoutId } = useParams<{ gameId: string; loadoutId: string }>();
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const [loadout, setLoadout] = useState<Loadout | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (gameId && loadoutId) {
      fetchLoadout();
      incrementViews();
    }
  }, [gameId, loadoutId]);

  const fetchLoadout = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/loadouts`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );
      const data = await response.json();
      const found = data.loadouts?.find((l: any) => l.id === loadoutId);
      if (found) {
        setLoadout(found);
      }
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
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );
    } catch (error) {
      console.error("Error incrementing views:", error);
    }
  };

  const likeLoadout = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/loadouts/${loadoutId}/like`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const { loadout: updated } = await response.json();
        setLoadout(updated);
      }
    } catch (error) {
      console.error("Error liking loadout:", error);
    }
  };

  const copyShareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert("Link copied to clipboard!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950">
        <div className="text-white text-xl font-bold">Loading...</div>
      </div>
    );
  }

  if (!loadout) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950">
        <div className="text-center">
          <h1 className="text-2xl font-black text-white mb-4">Loadout Not Found</h1>
          <button
            onClick={() => navigate(`/game/${gameId}`)}
            className="bg-white text-neutral-900 font-bold py-3 px-6"
          >
            Back to Loadouts
          </button>
        </div>
      </div>
    );
  }

  const accentColor = getGameColor(gameId);
  const canEdit = user?.id === loadout.userId;

  return (
    <div className="min-h-screen bg-neutral-950">
      <header className="border-b border-neutral-800 bg-neutral-900 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(`/game/${gameId}`)}
              className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors font-medium"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={copyShareLink}
                className="flex items-center gap-2 px-4 py-2 border-2 border-neutral-700 hover:border-neutral-600 text-white font-bold transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
              {canEdit && (
                <button
                  onClick={() => navigate(`/game/${gameId}/builder?edit=${loadoutId}`)}
                  className="flex items-center gap-2 px-4 py-2 text-neutral-900 font-bold transition-opacity hover:opacity-90"
                  style={{ backgroundColor: accentColor.primary }}
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-5xl font-black text-white mb-4 tracking-tight">
            {loadout.name}
          </h1>
          <div className="flex items-center gap-6 mb-6">
            <div className="flex items-center gap-2 text-neutral-400">
              <div
                className="w-8 h-8 flex items-center justify-center"
                style={{ backgroundColor: accentColor.primary }}
              >
                <User className="w-4 h-4 text-neutral-900" />
              </div>
              <span className="font-semibold text-white">{loadout.userName}</span>
            </div>
            <div className="flex items-center gap-4 text-neutral-500">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                <span className="font-semibold">{loadout.views}</span>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4" />
                <span className="font-semibold">{loadout.likes}</span>
              </div>
            </div>
            <span className="text-neutral-500">
              {new Date(loadout.createdAt).toLocaleDateString()}
            </span>
          </div>
          {loadout.description && (
            <p className="text-xl text-neutral-400 leading-relaxed">
              {loadout.description}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {loadout.weapons && loadout.weapons.length > 0 && (
            <div className="bg-neutral-900 border-2 border-neutral-800 p-6">
              <h2
                className="text-xs font-black uppercase tracking-wider mb-4"
                style={{ color: accentColor.primary }}
              >
                Weapons
              </h2>
              <div className="space-y-4">
                {loadout.weapons.map((weapon: any, idx: number) => (
                  <div key={idx} className="bg-neutral-950 border border-neutral-800 p-4">
                    <h3 className="text-xl font-black text-white mb-2">{weapon.name}</h3>
                    <p className="text-sm text-neutral-400 mb-3">{weapon.type}</p>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-neutral-500">Damage</span>
                        <p className="text-white font-bold">{weapon.damage}</p>
                      </div>
                      <div>
                        <span className="text-neutral-500">Fire Rate</span>
                        <p className="text-white font-bold">{weapon.fireRate} RPM</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loadout.perks && loadout.perks.length > 0 && (
            <div className="bg-neutral-900 border-2 border-neutral-800 p-6">
              <h2
                className="text-xs font-black uppercase tracking-wider mb-4"
                style={{ color: accentColor.primary }}
              >
                Perks
              </h2>
              <div className="space-y-2">
                {loadout.perks.map((perk: string, idx: number) => (
                  <div key={idx} className="bg-neutral-950 border border-neutral-800 p-3">
                    <p className="font-bold text-white">{perk}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loadout.equipment && loadout.equipment.length > 0 && (
            <div className="bg-neutral-900 border-2 border-neutral-800 p-6">
              <h2
                className="text-xs font-black uppercase tracking-wider mb-4"
                style={{ color: accentColor.primary }}
              >
                Equipment
              </h2>
              <div className="space-y-2">
                {loadout.equipment.map((equip: string, idx: number) => (
                  <div key={idx} className="bg-neutral-950 border border-neutral-800 p-3">
                    <p className="font-bold text-white">{equip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-center">
          <button
            onClick={likeLoadout}
            className="flex items-center gap-3 px-8 py-4 border-2 border-neutral-700 hover:text-neutral-900 text-white font-black text-lg transition-all"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = accentColor.primary;
              e.currentTarget.style.borderColor = accentColor.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '';
              e.currentTarget.style.borderColor = '';
            }}
          >
            <Heart className="w-6 h-6" />
            Like This Loadout
          </button>
        </div>
      </main>
    </div>
  );
}
