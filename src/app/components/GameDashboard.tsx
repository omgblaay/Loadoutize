import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useAuth } from "./AuthContext";
import { AuthModal } from "./AuthModal";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { getGameColor } from "../utils/gameColors";
import { ArrowLeft, Plus, Trash2, Edit, Heart, Eye, User } from "lucide-react";

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

export function GameDashboard() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const [activeTab, setActiveTab] = useState<"all" | "mine">("all");
  const [loadouts, setLoadouts] = useState<Loadout[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (gameId) {
      fetchLoadouts();
    }
  }, [gameId, activeTab, accessToken]);

  const fetchLoadouts = async () => {
    try {
      const endpoint = activeTab === "mine"
        ? `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/my-loadouts`
        : `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/loadouts`;

      const headers: HeadersInit = {
        Authorization: `Bearer ${activeTab === "mine" && accessToken ? accessToken : publicAnonKey}`,
      };

      const response = await fetch(endpoint, { headers });
      const data = await response.json();

      if (data.loadouts) {
        const sorted = [...data.loadouts].sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setLoadouts(sorted);
      }
    } catch (error) {
      console.error("Error fetching loadouts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLoadout = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    navigate(`/game/${gameId}/builder`);
  };

  const deleteLoadout = async (loadoutId: string) => {
    if (!accessToken) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/loadouts/${loadoutId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        setLoadouts(loadouts.filter((l) => l.id !== loadoutId));
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete loadout");
      }
    } catch (error) {
      console.error("Error deleting loadout:", error);
    }
  };

  const likeLoadout = async (loadoutId: string) => {
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
        const { loadout } = await response.json();
        setLoadouts(loadouts.map(l => l.id === loadoutId ? loadout : l));
      }
    } catch (error) {
      console.error("Error liking loadout:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A]">
        <div className="text-white text-xl font-bold">Loading...</div>
      </div>
    );
  }

  const canEdit = (loadout: Loadout) => user?.id === loadout.userId;
  const accentColor = getGameColor(gameId);

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <header className="border-b border-white/5 bg-[#141414] sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors font-medium text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </button>
            <button
              onClick={handleCreateLoadout}
              className="font-semibold py-2 px-6 transition-all flex items-center gap-2 text-black rounded-md text-sm hover:opacity-90"
              style={{ backgroundColor: accentColor.primary }}
            >
              <Plus className="w-4 h-4" />
              Create Loadout
            </button>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                {gameId?.replace(/([A-Z])/g, ' $1').trim() || gameId}
              </h1>
              <p className="text-neutral-500 text-sm font-medium">
                {loadouts.length} loadout{loadouts.length !== 1 ? 's' : ''} available
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-5 py-1.5 font-semibold transition-all rounded-md text-sm ${
                  activeTab === "all"
                    ? "bg-white text-black"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                All Loadouts
              </button>
              <button
                onClick={() => {
                  if (!user) {
                    setShowAuthModal(true);
                    return;
                  }
                  setActiveTab("mine");
                }}
                className={`px-5 py-1.5 font-semibold transition-all rounded-md text-sm ${
                  activeTab === "mine"
                    ? "bg-white text-black"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                My Loadouts
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-8 py-12">
        {loadouts.length === 0 ? (
          <div className="bg-white/[0.02] border border-white/5 p-20 text-center rounded-lg">
            <p className="text-neutral-500 text-sm">
              {activeTab === "mine"
                ? "You haven't created any loadouts yet."
                : "No loadouts available yet. Be the first to create one!"}
            </p>
          </div>
        ) : (
          <div className="bg-white/[0.02] border border-white/5 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left py-3 px-6 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Rank</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Loadout</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Description</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Likes</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Views</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Created</th>
                  {canEdit(loadouts[0]) && (
                    <th className="text-right py-3 px-6 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {loadouts.map((loadout, idx) => (
                  <tr
                    key={loadout.id}
                    onClick={() => navigate(`/game/${gameId}/loadout/${loadout.id}`)}
                    className="border-b border-white/5 hover:bg-white/[0.02] cursor-pointer transition-colors"
                  >
                    <td className="py-4 px-6">
                      <span className="text-neutral-500 font-semibold text-sm">{idx + 1}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <img src={`https://ui-avatars.com/api/?name=${loadout.userName}&background=random&size=32`} alt="" className="w-8 h-8 rounded-full" />
                        <div>
                          <div className="text-white font-semibold text-sm mb-0.5">{loadout.name}</div>
                          <div className="text-neutral-500 text-xs font-medium">{loadout.userName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 max-w-xs">
                      <p className="text-neutral-400 text-sm line-clamp-1">
                        {loadout.description || 'No description'}
                      </p>
                    </td>
                    <td className="py-4 px-6">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          likeLoadout(loadout.id);
                        }}
                        className="flex items-center gap-1.5 text-neutral-400 hover:text-white transition-colors"
                      >
                        <Heart className="w-4 h-4" />
                        <span className="text-sm font-semibold">{loadout.likes}</span>
                      </button>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5 text-neutral-400">
                        <Eye className="w-4 h-4" />
                        <span className="text-sm font-semibold">{loadout.views}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-neutral-500 text-xs font-medium">
                        {new Date(loadout.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </td>
                    {canEdit(loadout) && (
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/game/${gameId}/builder?edit=${loadout.id}`);
                            }}
                            className="w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded-md transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5 text-neutral-400" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteLoadout(loadout.id);
                            }}
                            className="w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded-md transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-neutral-400 hover:text-red-500" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}
