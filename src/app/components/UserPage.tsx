import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { ArrowLeft, Heart, Eye } from "lucide-react";

interface Loadout {
  id: string;
  gameId: string;
  userName: string;
  name: string;
  description?: string;
  weapons: any[];
  likes: number;
  views: number;
  createdAt: string;
}

const GAME_ORDER = ["blackops7", "warzone", "bf6", "thefinals"];

export function UserPage() {
  const { nickname } = useParams<{ nickname: string }>();
  const navigate = useNavigate();
  const [loadouts, setLoadouts] = useState<Loadout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (nickname) fetchUserLoadouts();
  }, [nickname]);

  const fetchUserLoadouts = async () => {
    try {
      const results = await Promise.all(
        GAME_ORDER.map((gameId) =>
          fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/loadouts`,
            { headers: { Authorization: `Bearer ${publicAnonKey}` } }
          ).then((r) => r.json())
        )
      );
      const all = results.flatMap((data) =>
        (data.loadouts ?? []).filter((l: Loadout) => l.userName === nickname)
      );
      setLoadouts(all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error) {
      console.error("Error fetching user loadouts:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A]">
        <div className="text-white text-xl font-bold">Loading...</div>
      </div>
    );
  }

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
          </div>
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl"
              style={{ backgroundImage: "linear-gradient(135deg, rgb(207,206,212) 0%, rgb(64,62,67) 100%)" }}
            >
              {nickname?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">{nickname}</h1>
              <p className="text-neutral-500 text-sm font-medium">
                {loadouts.length} loadout{loadouts.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-8 py-12">
        {loadouts.length === 0 ? (
          <div className="bg-white/[0.02] border border-white/5 p-20 text-center rounded-lg">
            <p className="text-neutral-500 text-sm">No loadouts found for this user.</p>
          </div>
        ) : (
          <div className="bg-white/[0.02] border border-white/5 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left py-3 px-6 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Game</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Loadout</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Description</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Likes</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Views</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody>
                {loadouts.map((loadout) => (
                  <tr
                    key={loadout.id}
                    onClick={() => navigate(`/${loadout.gameId}/loadout/${loadout.id}`)}
                    className="border-b border-white/5 hover:bg-white/[0.02] cursor-pointer transition-colors"
                  >
                    <td className="py-4 px-6">
                      <span className="text-neutral-400 text-xs font-semibold uppercase tracking-wide">{loadout.gameId}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-white font-semibold text-sm">{loadout.name}</div>
                    </td>
                    <td className="py-4 px-6 max-w-xs">
                      <p className="text-neutral-400 text-sm line-clamp-1">{loadout.description || "No description"}</p>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5 text-neutral-400">
                        <Heart className="w-4 h-4" />
                        <span className="text-sm font-semibold">{loadout.likes}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5 text-neutral-400">
                        <Eye className="w-4 h-4" />
                        <span className="text-sm font-semibold">{loadout.views}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-neutral-500 text-xs font-medium">
                        {new Date(loadout.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
