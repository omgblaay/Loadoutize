import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import QRCode from "qrcode";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { getGameColor } from "../utils/gameColors";
import { gameMeta } from "../utils/games";
import { useAuth } from "./AuthContext";
import { AppLayout, useGameName } from "./AppLayout";
import { Button } from "./ui/button";
import { WeaponImage } from "./ui/WeaponImage";
import type { CardWeapon, CardTag, CardAttachment } from "./ui/LoadoutCard";
import { Tag } from "./ui/tag";
import { BreadcrumbLink, BreadcrumbSpacer } from "./ui/breadcrumb";
import { ReactionButton } from "./ui/reaction-button";
import { RatingRing } from "./ui/rating-ring";
import {
  Edit,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  Heart,
  Download,
  Puzzle,
  Crosshair,
  Icon,
  Copy,
  Check,
} from "lucide-react";
import * as React from "react";

interface Weapon {
  id: string;
  attachments?: Record<string, string>;
}

interface Loadout {
  id: string;
  gameId: string;
  userId: string;
  userName: string;
  name: string;
  description?: string;
  gameLoadoutCode?: string | null;
  weapons: Weapon[];
  perks?: string[];
  equipment?: string[];
  likes: number;
  dislikes: number;
  favorites: number;
  score: number;
  ratingPercent: number | null;
  liked: boolean;
  disliked: boolean;
  favorited: boolean;
  views: number;
  createdAt: string;
  tagId?: number | null;
}

type ReactionType = "like" | "dislike" | "favorite";

export function LoadoutPreview() {
  const { gameId = "mw4", loadoutId } = useParams<{ gameId: string; loadoutId: string }>();
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const [loadout, setLoadout] = useState<Loadout | null>(null);
  const [catalogWeapons, setCatalogWeapons] = useState<CardWeapon[]>([]);
  const [catalogAttachments, setCatalogAttachments] = useState<CardAttachment[]>([]);
  const [catalogTags, setCatalogTags] = useState<CardTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  useEffect(() => {
    if (gameId && loadoutId) {
      fetchLoadout();
    }
    // accessToken starts undefined and resolves after AuthContext loads --
    // refetch once it settles so liked/disliked/favorited reflect this viewer.
  }, [gameId, loadoutId, accessToken]);

  useEffect(() => {
    if (gameId && loadoutId) {
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

    fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/attachments`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    })
      .then((r) => r.json())
      .then((data) => setCatalogAttachments(data.attachments ?? []))
      .catch((error) => console.error("Error fetching attachments:", error));

    fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/tags`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    })
      .then((r) => r.json())
      .then((data) => setCatalogTags(data.tags ?? []))
      .catch((error) => console.error("Error fetching tags:", error));
  }, [gameId]);

  useEffect(() => {
    QRCode.toDataURL(window.location.href, { margin: 1, width: 208, color: { dark: "#fafafa", light: "#00000000" } })
      .then(setQrDataUrl)
      .catch((error: unknown) => console.error("Error generating QR code:", error));
  }, [gameId, loadoutId]);

  const fetchLoadout = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/loadouts`,
        { headers: { Authorization: `Bearer ${accessToken ?? publicAnonKey}` } }
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

  /** Performs the reaction toggle and resolves to whether `type` is now active, for ReactionButton's success animation. */
  const react = async (type: ReactionType): Promise<boolean> => {
    if (!accessToken) {
      alert("You must be logged in to react to loadouts");
      return false;
    }
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${gameId}/loadouts/${loadoutId}/react`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ type }),
        }
      );
      if (!response.ok) return false;
      const { loadout: updated } = await response.json();
      setLoadout(updated);
      return type === "like" ? updated.liked : type === "dislike" ? updated.disliked : updated.favorited;
    } catch (error) {
      console.error("Error reacting to loadout:", error);
      return false;
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

  const copyGameLoadoutCode = () => {
    if (!loadout?.gameLoadoutCode) return;
    navigator.clipboard.writeText(loadout.gameLoadoutCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const meta = gameMeta[gameId] ?? gameMeta.mw4;
  const { game: activeGame } = useGameName(gameId);
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
        <Button
          onClick={() => navigate(`/${gameId}/explore`)}
          className="h-11 px-5 rounded-xl bg-[#fafafa] text-[#161414] font-medium"
        >
          Back to Explore
        </Button>
      </div>
    );
  }

  const canEdit = user?.id === loadout.userId;
  const primaryWeapon = loadout.weapons?.[0];
  const primaryWeaponCatalog = catalogWeapons.find((w) => w.id === primaryWeapon?.id);
  const primaryWeaponImage = primaryWeaponCatalog?.imageUrl ?? null;
  const shareUrl = window.location.href;

  return (
    <AppLayout
      selectedGame={gameId}
      onGameSelect={(id) => navigate(`/${id}/explore`)}
      breadcrumb={
        <>
          <BreadcrumbLink to={`/${gameId}/explore`}>
            {activeGame?.logoUrl ? (
              <img src={activeGame.logoUrl} alt="" className="w-10 h-10 object-contain shrink-0" />
            ) : (
              <meta.icon className="w-4 h-4" />
            )}
          </BreadcrumbLink>
          {primaryWeaponCatalog && (
            <>
              <BreadcrumbSpacer />
              {primaryWeaponCatalog.type ? (
                <BreadcrumbLink
                  to={`/${gameId}/explore?category=${encodeURIComponent(primaryWeaponCatalog.type)}`}
                >
                  {primaryWeaponCatalog.typeShort || meta.short}
                </BreadcrumbLink>
              ) : (
                null
              )}
              <BreadcrumbSpacer />
              <BreadcrumbLink to={`/${gameId}/explore?category=${encodeURIComponent(primaryWeaponCatalog.name)}`}>
                {primaryWeaponCatalog.name}
              </BreadcrumbLink>
            </>
          )}
          <BreadcrumbSpacer />
          <span className="text-base">{loadout.name}</span>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Weapon build */}
        <div className="bg-[#121011] border border-[#201e1f] rounded-3xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            
              <RatingRing
                percent={loadout.ratingPercent}
                color="#01a059"
                size={64}
                className="border border-[#2a2829]"
                labelClassName="text-[14px] text-white font-medium"
              />
            
             <h1 className="text-xl wrap-anywhere">

              <span style={{ color: catalogTags.find((t) => t.id === loadout.tagId)?.color }} className="font-handwritten py-4 font-light">{catalogTags.find((t) => t.id === loadout.tagId)?.name}</span>
              {" "}
              <Tag
              color={""}
              className="inline relative top-[-5px]"
              link={
                primaryWeaponCatalog?.type
                  ? `/${gameId}/explore?category=${encodeURIComponent(primaryWeaponCatalog.type)}`
                  : undefined
              }
              >
              {primaryWeaponCatalog?.typeShort || meta.short}
              </Tag>
              <span className="font-base font-sans  text-teritary">{" "}{primaryWeaponCatalog?.name}</span>
              {" "}{loadout.name}
            </h1>
          </div>                
          <div className="flex flex-wrap items-center text-sm gap-1.5">
                   <span className="text-teritary">by</span> <span className=""> {loadout.userName}</span>
                </div>

          <div className="flex flex-col items-center gap-2 py-4">
            <div
              style={{ background: `radial-gradient(ellipse at center, ${accent}14, transparent 70%)` }}
            >
              <WeaponImage imageUrl={primaryWeaponImage} />
            </div>
          </div>

          <div className="flex flex-col w-full">
            {primaryWeapon?.attachments &&
              Object.entries(primaryWeapon.attachments).map(([slot, value]) => {
                const attachment = catalogAttachments.find((a) => a.type === slot && a.name === value);
                return (
                  <div key={slot} className="flex items-center gap-4 py-3 border-b border-white/5 w-full">
                    <div className="w-6 h-6 flex items-center justify-center shrink-0 overflow-hidden">
                      {attachment?.imageUrl ? (
                        <img src={attachment.imageUrl} alt={value} className="w-full opacity-50 h-full object-contain" />
                      ) : (
                        null
                      )}
                    </div>
                    <span className="text-[14px] text-[#8d898a] flex-1">{slot}</span>
                    <span className="text-[14px] text-[#fafafa] font-medium">{value}</span>
                  </div>
                );
              })}

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
        <div className="flex relative flex-col overflow-hidden gap-6">
                
          <div className="bg-[#121111] border border-[#201e1f] rounded-3xl overflow-hidden flex flex-col gap-5">
          <div className="p-6 flex flex-col gap-5">

            {/*<Tag color={loadout.tagId ? catalogTags.find((t) => t.id === loadout.tagId)?.color : undefined} 
              className="!font-handwritten py-4 font-light !text-lg">{catalogTags.find((t) => t.id === loadout.tagId)?.name}</Tag>
*/}
            {loadout.description && (
              <p className="text-body text-base">{loadout.description}</p>
            )}

          </div>
          <div className="flex items-center w-full">
            <ReactionButton
              icon={<ThumbsUp className="w-4 h-4" />}
              label={loadout.liked ? "Liked" : "Like"}
              count={loadout.likes}
              active={loadout.liked}
              accent="#01a059"
              onClick={() => react("like")}
              fillWidth
              square
              borderTopOnly
              className="flex-1 "
            />
            <ReactionButton
              icon={<ThumbsDown className="w-4 h-4" />}
              label={loadout.disliked ? "Disliked" : "Dislike"}
              count={loadout.dislikes}
              active={loadout.disliked}
              accent="#d00050"
              onClick={() => react("dislike")}
              fillWidth
              square
              borderTopOnly
              className="flex-1"
            />
          </div>
          </div>

          {loadout.gameLoadoutCode && (
            <div className="bg-[#121111] border border-[#201e1f] rounded-3xl p-6 flex flex-col gap-3">
              <h3 className="text-[12px] tracking-[0.5px] uppercase text-[#fafafa] font-medium">
                In-game loadout code
              </h3>
              <div className="flex items-center gap-3">
                <code className="flex-1 min-w-0 font-mono text-[14px] text-[#fafafa] bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3 break-all">
                  {loadout.gameLoadoutCode}
                </code>
                <Button onClick={copyGameLoadoutCode} variant="outline" size="icon" aria-label="Copy loadout code">
                  {codeCopied ? (
                    <Check className="w-4 h-4 text-[#01a059]" />
                  ) : (
                    <Copy className="w-4 h-4 text-[#fafafa]" />
                  )}
                </Button>
              </div>
            </div>
          )}

          <div className="bg-[#121111] border border-[#201e1f] rounded-3xl p-6 flex items-center gap-5 flex-wrap">
            {qrDataUrl && <img src={qrDataUrl} alt="QR code linking to this loadout" className="w-[104px] h-[104px] shrink-0" />}
            <div className="flex-1 min-w-[200px] flex flex-col gap-3">
              <h3 className="text-[12px] tracking-[0.5px] uppercase text-[#fafafa] font-medium">Share loadout</h3>
              <p className="text-[12px] text-[#8d898a] break-all">{shareUrl}</p>
              <Button
                onClick={downloadQr}
                variant="outline"
              >
                <Download className="w-4 h-4 text-[#fafafa]" />
                <span className="text-[14px] text-[#fafafa]">Download QR</span>
                <span className="text-[14px] text-[#bebcbc]">as PNG</span>
              </Button>
            </div>
          </div>

          {canEdit && (
            <div className="flex items-center gap-3">
              <Button
                onClick={() => navigate(`/${gameId}/create?edit=${loadoutId}`)}
                variant="secondary"
              >
                <Edit className="w-4 h-4" />
                Edit
              </Button>
              <Button
                onClick={deleteLoadout}>
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
