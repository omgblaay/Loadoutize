import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { getGameColor } from "../utils/gameColors";
import { ArrowLeft, Heart, Eye, User, Share2, Edit } from "lucide-react";
import { useAuth } from "./AuthContext";

interface WeaponConfig {
  id: string;
  gameId: string;
  userId: string;
  userName: string;
  name: string;
  description?: string;
  weapon: any;
  attachments?: any[];
  likes: number;
  views: number;
  createdAt: string;
}

export function WeaponConfigPreview() {
  const { gameId, configId } = useParams<{ gameId: string; configId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [config, setConfig] = useState<WeaponConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (gameId && configId) {
      fetchConfig();
      incrementViews();
    }
  }, [gameId, configId]);

  const fetchConfig = async () => {
    try {
      // TODO: Implement actual API endpoint for weapon configs
      // For now, using mock data
      setConfig({
        id: configId!,
        gameId: gameId!,
        userId: "demo-user",
        userName: "ProGamer",
        name: "Long Range AR Build",
        description: "Optimized for long-range engagements with minimal recoil",
        weapon: {
          name: "XM4",
          type: "Assault Rifle",
          damage: 42,
          fireRate: 750,
        },
        attachments: [
          { type: "Optic", name: "ACOG 3x" },
          { type: "Muzzle", name: "Suppressor" },
          { type: "Barrel", name: "Extended Barrel" },
          { type: "Underbarrel", name: "Foregrip" },
          { type: "Magazine", name: "Extended Mag" },
        ],
        likes: 128,
        views: 542,
        createdAt: new Date().toISOString(),
      });
      setLoading(false);
    } catch (error) {
      console.error("Error fetching weapon config:", error);
      setLoading(false);
    }
  };

  const incrementViews = async () => {
    // TODO: Implement view increment
  };

  const likeConfig = async () => {
    // TODO: Implement like functionality
    if (config) {
      setConfig({ ...config, likes: config.likes + 1 });
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

  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950">
        <div className="text-center">
          <h1 className="text-2xl font-black text-white mb-4">Weapon Config Not Found</h1>
          <button
            onClick={() => navigate(`/game/${gameId}`)}
            className="bg-white text-neutral-900 font-bold py-3 px-6"
          >
            Back to Game
          </button>
        </div>
      </div>
    );
  }

  const accentColor = getGameColor(gameId);
  const canEdit = user?.id === config.userId;

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
                  onClick={() => navigate(`/game/${gameId}/weapon-builder?edit=${configId}`)}
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

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8">
          <div
            className="inline-block px-3 py-1 text-xs font-black uppercase tracking-wider mb-4"
            style={{ backgroundColor: accentColor.primary, color: '#141414' }}
          >
            Weapon Config
          </div>
          <h1 className="text-5xl font-black text-white mb-4 tracking-tight">
            {config.name}
          </h1>
          <div className="flex items-center gap-6 mb-6">
            <div className="flex items-center gap-2 text-neutral-400">
              <div
                className="w-8 h-8 flex items-center justify-center"
                style={{ backgroundColor: accentColor.primary }}
              >
                <User className="w-4 h-4 text-neutral-900" />
              </div>
              <span className="font-semibold text-white">{config.userName}</span>
            </div>
            <div className="flex items-center gap-4 text-neutral-500">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                <span className="font-semibold">{config.views}</span>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4" />
                <span className="font-semibold">{config.likes}</span>
              </div>
            </div>
            <span className="text-neutral-500">
              {new Date(config.createdAt).toLocaleDateString()}
            </span>
          </div>
          {config.description && (
            <p className="text-xl text-neutral-400 leading-relaxed">
              {config.description}
            </p>
          )}
        </div>

        <div className="bg-neutral-900 border-2 border-neutral-800 p-8 mb-6">
          <h2
            className="text-xs font-black uppercase tracking-wider mb-6"
            style={{ color: accentColor.primary }}
          >
            Base Weapon
          </h2>
          <div className="bg-neutral-950 border border-neutral-800 p-6">
            <h3 className="text-3xl font-black text-white mb-2">{config.weapon.name}</h3>
            <p className="text-lg text-neutral-400 mb-6">{config.weapon.type}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <span className="text-xs text-neutral-500 uppercase tracking-wider">Damage</span>
                <p className="text-2xl text-white font-black">{config.weapon.damage}</p>
              </div>
              <div>
                <span className="text-xs text-neutral-500 uppercase tracking-wider">Fire Rate</span>
                <p className="text-2xl text-white font-black">{config.weapon.fireRate}</p>
              </div>
            </div>
          </div>
        </div>

        {config.attachments && config.attachments.length > 0 && (
          <div className="bg-neutral-900 border-2 border-neutral-800 p-8 mb-8">
            <h2
              className="text-xs font-black uppercase tracking-wider mb-6"
              style={{ color: accentColor.primary }}
            >
              Attachments
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {config.attachments.map((attachment: any, idx: number) => (
                <div key={idx} className="bg-neutral-950 border border-neutral-800 p-4">
                  <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">
                    {attachment.type}
                  </p>
                  <p className="text-lg font-black text-white">{attachment.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-center">
          <button
            onClick={likeConfig}
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
            Like This Build
          </button>
        </div>
      </main>
    </div>
  );
}
