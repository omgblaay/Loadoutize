import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import QRCode from "qrcode";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { getGameColor } from "../utils/gameColors";
import { gameMeta } from "../utils/games";
import { useAuth } from "./AuthContext";
import { AppLayout } from "./AppLayout";
import type { CardWeapon } from "./ui/LoadoutCard";
import {
  Edit,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  Heart,
  Download,
  Puzzle,
  Crosshair,
} from "lucide-react";

interface Weapon {
  id: string;
  name: string;
  type: string;
  attachments?: Record<string, string>;
}

interface Loadout {
  id: string;
  gameId: string;
  userId: string;
  userName: string;
  name: string;
  description?: string;
  weapons: Weapon[];
  perks?: string[];
  equipment?: string[];
  likes: number;
  views: number;
  createdAt: string;
}

export function LoadoutPreview() {
  const { gameId = "mw4", loadoutId } = useParams<{ gameId: string; loadoutId: string }>();
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const [loadout, setLoadout] = useState<Loadout | null>(null);
  const [catalogWeapons, setCatalogWeapons] = useState<CardWeapon[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (gameId && loadoutId) {
      fetchLoadout();
      incrementViews();
    }
  }, [gameId, loadoutId]);

  useEffect(() => {
    fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/weapons`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    })
      .then((r) => r.json())
      .then((data) => setCatalogWeapons(data.weapons ?? []))
      .catch((error) => console.error("Error fetching weapons:", error));
  }, [gameId]);

  useEffect(() => {
    QRCode.toDataURL(window.location.href, { margin: 1, width: 208, color: { dark: "#fafafa", light: "#00000000" } })
      .then(setQrDataUrl)
      .catch((error) => console.error("Error generating QR code:", error));
  }, [gameId, loadoutId]);

  const fetchLoadout = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/loadouts`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      const data = await response.json();
      const found = data.loadouts?.find((l: any) => l.id === loadoutId);
      if (found) setLoadout(found);
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
        { method: "POST", headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
    } catch (error) {
      console.error("Error incrementing views:", error);
    }
  };

  const likeLoadout = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/loadouts/${loadoutId}/like`,
        { method: "POST", headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      if (response.ok) {
        const { loadout: updated } = await response.json();
        setLoadout(updated);
      }
    } catch (error) {
      console.error("Error liking loadout:", error);
    }
  };

  const deleteLoadout = async () => {
    if (!accessToken) return;
    if (!confirm("Delete this loadout? This can't be undone.")) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/loadouts/${loadoutId}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (response.ok) {
        navigate(`/${gameId}/explore`);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete loadout");
      }
    } catch (error) {
      console.error("Error deleting loadout:", error);
    }
  };

  const downloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `${loadoutId}-qr.png`;
    a.click();
  };

  const meta = gameMeta[gameId] ?? gameMeta.mw4;
  const accent = getGameColor(gameId).primary;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0909]">
        <div className="text-[#efedf1]">Loading…</div>
      </div>
    );
  }

  if (!loadout) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0909] flex-col gap-4">
        <p className="text-[#efedf1] text-xl">Loadout not found.</p>
        <button
          onClick={() => navigate(`/${gameId}/explore`)}
          className="h-11 px-5 rounded-xl bg-[#fafafa] text-[#161414] font-medium"
        >
          Back to Explore
        </button>
      </div>
    );
  }

  const canEdit = user?.id === loadout.userId;
  const primaryWeapon = loadout.weapons?.[0];
  const primaryWeaponCatalog = catalogWeapons.find((w) => w.name === primaryWeapon?.name);
  const primaryWeaponImage = primaryWeaponCatalog?.imageUrl ?? null;
  const shareUrl = window.location.href;

  return (
    <AppLayout
      selectedGame={gameId}
      onGameSelect={(id) => navigate(`/${id}/explore`)}
      breadcrumb={
        <>
          <button
            onClick={() => navigate(`/${gameId}/explore`)}
            className="text-[#fafafa] hover:text-white transition-colors"
          >
            {meta.short}
          </button>
          {primaryWeapon && (
            <>
              <span className="text-[#5D5658]">/</span>
              {primaryWeapon.type ? (
                <button
                  onClick={() =>
                    navigate(`/${gameId}/explore?category=${encodeURIComponent(primaryWeapon.type)}`)
                  }
                  className="hover:text-[#fafafa] transition-colors"
                >
                  {primaryWeapon.type}
                </button>
              ) : (
                <span>{primaryWeapon.type}</span>
              )}
              <span className="text-[#5D5658]">/</span>
              <span>{primaryWeapon.name}</span>
            </>
          )}
          <span className="text-[#5D5658]">/</span>
          <span className="text-[#fafafa]">{loadout.name}</span>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Weapon build */}
        <div className="bg-[#121111] border border-[#201e1f] rounded-3xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <span className="h-7 px-2.5 rounded-[10px] border border-white/[0.18] bg-white/[0.02] flex items-center text-[12px] uppercase text-[#fafafa] tracking-[0.5px] font-medium">
              {primaryWeaponCatalog?.typeShort || "—"}
            </span>
            <p className="text-[22px] leading-[28px] font-semibold text-[#fafafa]">
              {primaryWeapon?.name ?? loadout.name}
            </p>
          </div>

          <div className="flex flex-col items-center gap-2 py-4">
            <div
              className="w-full max-w-[400px] h-[150px] rounded-xl flex items-center justify-center overflow-hidden"
              style={{ background: `radial-gradient(ellipse at center, ${accent}14, transparent 70%)` }}
            >
              {primaryWeaponImage ? (
                <img src={primaryWeaponImage} alt="" className="w-full h-full object-contain p-4" />
              ) : (
                <Crosshair className="w-10 h-10" style={{ color: `${accent}80` }} />
              )}
            </div>
          </div>

          <div className="flex flex-col w-full">
            {primaryWeapon?.attachments &&
              Object.entries(primaryWeapon.attachments).map(([slot, value]) => (
                <div key={slot} className="flex items-center gap-4 py-3 border-b border-white/5 w-full">
                  <div className="w-6 h-6 rounded-md bg-white/[0.02] border border-white/[0.18] flex items-center justify-center shrink-0">
                    <Puzzle className="w-3.5 h-3.5 text-[#8d898a]" />
                  </div>
                  <span className="text-[14px] text-[#8d898a] flex-1">{slot}</span>
                  <span className="text-[14px] text-[#fafafa] font-medium">{value}</span>
                </div>
              ))}

            {!primaryWeapon?.attachments &&
              (loadout.equipment ?? []).map((item, i) => (
                <div key={i} className="flex items-center gap-4 py-3 border-b border-white/5 w-full">
                  <div className="w-6 h-6 rounded-md bg-white/[0.02] border border-white/[0.18] flex items-center justify-center shrink-0">
                    <Puzzle className="w-3.5 h-3.5 text-[#8d898a]" />
                  </div>
                  <span className="text-[14px] text-[#8d898a] flex-1">Gear</span>
                  <span className="text-[14px] text-[#fafafa] font-medium">{item}</span>
                </div>
              ))}

            {!primaryWeapon?.attachments && !(loadout.equipment ?? []).length && (
              <p className="text-[14px] text-[#8d898a] py-2">No build details published for this loadout.</p>
            )}
          </div>
        </div>

        {/* Rating / share */}
        <div className="flex flex-col gap-6">
          <div className="bg-[#121111] border border-[#201e1f] rounded-3xl p-6 flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div
                className="relative shrink-0 w-16 h-16 rounded-full flex items-center justify-center border border-[#2a2829]"
                style={{
                  background: `conic-gradient(#01a059 ${Math.min(loadout.likes, 100) * 3.6}deg, rgba(255,255,255,0.1) 0deg)`,
                }}
              >
                <div className="absolute inset-[3px] rounded-full bg-[#201e1f] flex items-center justify-center">
                  <span className="text-[14px] text-white font-medium">{loadout.likes}</span>
                </div>
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <p className="text-[28px] leading-[36px] font-semibold text-[#fafafa]">
                  Does this setup still hold up?
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded-full border border-[#3f3c3d]"
                      style={{ backgroundImage: "linear-gradient(135deg, rgb(207,206,212), rgb(64,62,67))" }}
                    />
                    <span className="text-[12px] text-[#fafafa]">{loadout.userName}</span>
                  </div>
                </div>
              </div>
            </div>

            {loadout.description && (
              <p className="text-[14px] leading-[20px] text-[#bebcbc]">{loadout.description}</p>
            )}

            <div className="h-px w-full bg-white/[0.07]" />

            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={likeLoadout}
                className="h-[52px] px-3 rounded-xl border flex items-center gap-2"
                style={{ background: "rgba(1,160,89,0.12)", borderColor: "#01a059" }}
              >
                <ThumbsUp className="w-4 h-4 text-[#fafafa]" />
                <span className="text-[14px] text-[#fafafa]">Upvote</span>
                <span className="text-[14px] text-[#00e37e]">{loadout.likes}</span>
              </button>
              <button
                disabled
                className="h-[52px] px-4 rounded-xl border border-white/[0.18] flex items-center gap-2 opacity-50 cursor-not-allowed"
                title="Downvotes aren't tracked yet"
              >
                <ThumbsDown className="w-4 h-4 text-[#d00050]" />
                <span className="text-[14px] text-[#d00050]">0</span>
              </button>
              <p className="text-[12px] text-[#8d898a]">Total: {loadout.likes}</p>
              <button className="h-[52px] px-4 rounded-xl border border-white/[0.18] flex items-center gap-2 ml-auto">
                <Heart className="w-4 h-4 text-[#bebcbc]" />
                <span className="text-[14px] text-[#bebcbc]">Add to favorites</span>
              </button>
            </div>
          </div>

          <div className="bg-[#121111] border border-[#201e1f] rounded-3xl p-6 flex items-center gap-5 flex-wrap">
            {qrDataUrl && <img src={qrDataUrl} alt="QR code linking to this loadout" className="w-[104px] h-[104px] shrink-0" />}
            <div className="flex-1 min-w-[200px] flex flex-col gap-3">
              <p className="text-[12px] tracking-[0.5px] uppercase text-[#fafafa] font-medium">Share loadout</p>
              <p className="text-[12px] text-[#8d898a] break-all">{shareUrl}</p>
              <button
                onClick={downloadQr}
                className="h-10 px-3.5 rounded-xl border border-white/[0.18] flex items-center gap-2 w-fit"
              >
                <Download className="w-4 h-4 text-[#fafafa]" />
                <span className="text-[14px] text-[#fafafa]">Download QR</span>
                <span className="text-[14px] text-[#bebcbc]">as PNG</span>
              </button>
            </div>
          </div>

          {canEdit && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/${gameId}/create?edit=${loadoutId}`)}
                className="h-11 px-4 rounded-xl flex items-center gap-2 text-[#161414] font-medium flex-1 justify-center"
                style={{ background: accent }}
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={deleteLoadout}
                className="h-11 px-4 rounded-xl border border-white/[0.18] hover:border-red-500 text-[#bebcbc] hover:text-red-500 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
