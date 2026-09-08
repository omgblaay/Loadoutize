import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { LOCKED_GAME_ID } from "../utils/games";
import { AppLayout } from "./AppLayout";
import { usePageTitle } from "../hooks/usePageTitle";
import { Skeleton } from "./ui/skeleton";
import { cn } from "./ui/utils";
import { Upload } from "lucide-react";
import { FilterPill, FilterPillGroup } from "./ui/filter-pill";
import { ROLE_TAG_META, ROLE_TAG_ORDER, type RoleTag } from "../utils/roles";
import { Button } from "./ui/button";
import { InstagramIcon, TiktokIcon, TwitchIcon, YoutubeIcon, KickIcon } from "@/assets/icons/socials";
import { CompactPageHeader } from "./ui/compact-page-header";
import { PasswordStrengthMeter } from "./ui/password-strength";
import { PASSWORD_MIN_LENGTH, isPasswordStrong } from "../utils/password";
import { explorePath } from "../utils/routes";

const NICKNAME_PATTERN = /^[a-z0-9_-]{3,20}$/;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_GIF_BYTES = 2 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

const LINK_FIELDS: { key: "tiktok" | "instagram" | "youtube" | "twitch" | "kick"; label: string; icon: any }[] = [
  { key: "tiktok", label: "TikTok", icon: TiktokIcon },
  { key: "instagram", label: "Instagram", icon: InstagramIcon },
  { key: "youtube", label: "YouTube", icon: YoutubeIcon },
  { key: "twitch", label: "Twitch", icon: TwitchIcon },
  { key: "kick", label: "Kick", icon: KickIcon },
];

function SettingsSkeleton() {
  const block = "bg-white/[0.06]";

  return (
    <>
      <div className="flex flex-col gap-1">
        <Skeleton className={cn("h-9 w-40", block)} />
        <Skeleton className={cn("h-4 w-72 max-w-full", block)} />
      </div>

      <div className="bg-[#121111] border border-[#201e1f] rounded-3xl p-6 flex flex-col gap-5">
        <Skeleton className={cn("h-5 w-20", block)} />
        <div className="flex items-center gap-5">
          <Skeleton className={cn("w-20 h-20 rounded-2xl", block)} />
          <div className="flex flex-col gap-2">
            <Skeleton className={cn("h-11 w-40 rounded-xl", block)} />
            <Skeleton className={cn("h-3 w-56 max-w-full", block)} />
          </div>
        </div>
      </div>

      <div className="bg-[#121111] border border-[#201e1f] rounded-3xl p-6 flex flex-col gap-5">
        <Skeleton className={cn("h-5 w-20", block)} />
        <div className="flex flex-col gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className={cn("h-3 w-16", block)} />
              <Skeleton className={cn("h-12 rounded-xl", block)} />
            </div>
          ))}
          <div className="flex flex-col gap-2">
            <Skeleton className={cn("h-3 w-16", block)} />
            <div className="flex gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className={cn("h-8 w-20 rounded-full", block)} />
              ))}
            </div>
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className={cn("h-3 w-16", block)} />
              <Skeleton className={cn("h-12 rounded-xl", block)} />
            </div>
          ))}
          <Skeleton className={cn("h-11 w-32 rounded-xl", block)} />
        </div>
      </div>

      <div className="bg-[#121111] border border-[#201e1f] rounded-3xl p-6 flex flex-col gap-5">
        <Skeleton className={cn("h-5 w-24", block)} />
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Skeleton className={cn("h-3 w-28", block)} />
            <Skeleton className={cn("h-12 rounded-xl", block)} />
          </div>
          <Skeleton className={cn("h-11 w-40 rounded-xl", block)} />
        </div>
      </div>
    </>
  );
}

export function Settings() {
  usePageTitle("Loadoutize • Settings");
  const navigate = useNavigate();
  const { user, accessToken, loading: authLoading, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const nicknameInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [roleTag, setRoleTag] = useState<RoleTag>("player");
  const [links, setLinks] = useState<Record<string, string>>({});
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [nameError, setNameError] = useState("");
  const [nicknameError, setNicknameError] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/home");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!accessToken) return;
    fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.profile) return;
        setName(data.profile.name ?? "");
        setNickname(data.profile.nickname ?? "");
        setRoleTag(data.profile.roleTag ?? "player");
        setAvatarUrl(data.profile.avatarUrl ?? null);
        setLinks(
          Object.fromEntries(Object.entries(data.profile.links ?? {}).map(([k, v]) => [k, (v as string) ?? ""]))
        );
      })
      .catch((error) => console.error("Error fetching profile:", error))
      .finally(() => setLoading(false));
  }, [accessToken]);

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !accessToken) return;

    setAvatarError("");
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setAvatarError("Avatar must be a PNG, JPEG, WEBP, or GIF image");
      return;
    }
    const maxBytes = file.type === "image/gif" ? MAX_GIF_BYTES : MAX_IMAGE_BYTES;
    if (file.size > maxBytes) {
      setAvatarError(`File too large -- max ${Math.round(maxBytes / 1024 / 1024)}MB`);
      return;
    }

    setUploadingAvatar(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/users/me/avatar`,
        { method: "POST", headers: { Authorization: `Bearer ${accessToken}` }, body: form }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to upload avatar");
      setAvatarUrl(data.profile.avatarUrl);
      await refreshProfile();
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const saveProfile = async () => {
    if (!accessToken) return;
    setNameError("");
    setNicknameError("");

    if (!name.trim()) {
      setNameError("Name is required");
      nameInputRef.current?.focus();
      return;
    }
    if (!NICKNAME_PATTERN.test(nickname)) {
      setNicknameError("Nickname must be 3-20 characters: lowercase letters, numbers, - or _");
      nicknameInputRef.current?.focus();
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/users/me`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ name, nickname, roleTag, links }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        const message = data.error || "Failed to save profile";
        // The server reports validation failures as plain messages, not a
        // field code -- both known messages ("Nickname must be 3-20...",
        // "That nickname is already taken") mention the field by name, so
        // route the message (and focus) to the input it's actually about
        // instead of a generic banner the user has to go hunting from.
        if (/nickname/i.test(message)) {
          setNicknameError(message);
          nicknameInputRef.current?.focus();
        } else if (/name/i.test(message)) {
          setNameError(message);
          nameInputRef.current?.focus();
        } else {
          toast.error(message);
        }
        return;
      }
      await refreshProfile();
      toast.success("Profile saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    if (!accessToken) return;
    setPasswordError("");

    if (!isPasswordStrong(newPassword)) {
      setPasswordError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters and include a number and a special character`);
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setPasswordSaving(true);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/auth/v1/user`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          apikey: publicAnonKey,
        },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error_description || data.msg || "Failed to change password");
      setNewPassword("");
      setConfirmNewPassword("");
      toast.success("Password updated");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setPasswordSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <AppLayout
        selectedGame={LOCKED_GAME_ID}
        onGameSelect={(id) => navigate(explorePath(id))}
      >
        <SettingsSkeleton />
      </AppLayout>
    );
  }

  return (
    <AppLayout
      selectedGame={LOCKED_GAME_ID}
      onGameSelect={(id) => navigate(explorePath(id))}
    >
      <div className="flex flex-col gap-1">
        <h1 className="text-[32px] leading-[40px] text-[#efedf1] font-semibold">Settings</h1>
        <p className="text-[14px] text-[#8d898a]">Manage your public profile and account.</p>
      </div>
      <CompactPageHeader
        title="Settings"
        actions={
          <Button size="sm" onClick={saveProfile} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        }
      />

      <div className="bg-[#121111] border border-[#201e1f] rounded-3xl p-6 flex flex-col gap-5">
        <h2>Profile</h2>
                <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl border border-white/10 overflow-hidden flex items-center justify-center shrink-0 bg-white/[0.04]">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-semibold text-[#fafafa]">{name?.[0]?.toUpperCase() ?? "U"}</span>
            )}
          </div>
          <div className="flex flex-col gap-2 items-start">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleAvatarSelect}
              className="hidden"
            />
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              variant="secondary"
              size="sm"
            >
              <Upload className="size-4" />
              {uploadingAvatar ? "Uploading…" : "Upload image"}
            </Button>
            <p className="text-[12px] text-[#8d898a]">PNG, JPEG, WEBP, or GIF. Max 5MB (2MB for GIFs).</p>
            {avatarError && <p className="text-[12px] text-[#ef9696]">{avatarError}</p>}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[12px] tracking-[0.5px] uppercase text-[#8d898a] font-semibold">Name</label>
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError("");
              }}
              aria-invalid={!!nameError}
              className={cn(
                "h-12 rounded-xl border px-4 text-[14px] text-[#fafafa] placeholder:text-[#8d898a] outline-none transition-colors",
                nameError
                  ? "bg-[#241214] border-[#d4183d] focus:border-[#d4183d]"
                  : "bg-white/[0.04] border-white/[0.07] focus:border-white/30"
              )}
            />
            {nameError && <p className="text-[12px] text-[#ef9696]">{nameError}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[12px] tracking-[0.5px] uppercase text-[#8d898a] font-semibold">Nickname</label>
            <input
              ref={nicknameInputRef}
              type="text"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value.toLowerCase());
                if (nicknameError) setNicknameError("");
              }}
              pattern="[a-z0-9_-]{3,20}"
              aria-invalid={!!nicknameError}
              className={cn(
                "h-12 rounded-xl border px-4 text-[14px] font-mono text-[#fafafa] placeholder:text-[#8d898a] placeholder:font-sans outline-none transition-colors",
                nicknameError
                  ? "bg-[#241214] border-[#d4183d] focus:border-[#d4183d]"
                  : "bg-white/[0.04] border-white/[0.07] focus:border-white/30"
              )}
            />
            {nicknameError ? (
              <p className="text-[12px] text-[#ef9696]">{nicknameError}</p>
            ) : (
              <p className="text-[12px] text-[#8d898a]">Your public profile: /u/{nickname || "…"}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[12px] tracking-[0.5px] uppercase text-[#8d898a] font-semibold">
              You are a...
            </label>
            <FilterPillGroup type="single" value={roleTag} onValueChange={(v) => v && setRoleTag(v as RoleTag)}>
              {ROLE_TAG_ORDER.map((tag) => (
                <FilterPill key={tag} value={tag} size="sm">
                  {ROLE_TAG_META[tag].label}
                </FilterPill>
              ))}
            </FilterPillGroup>
          </div>

          {LINK_FIELDS.map(({ key, label, icon: Icon }) => (
            <div key={key} className="flex flex-col gap-2">
              <label className="text-[12px] tracking-[0.5px] uppercase text-[#8d898a] font-semibold">{label}</label>
              <div className="h-12 rounded-xl bg-white/[0.04] border border-white/[0.07] px-4 flex items-center gap-2 focus-within:border-white/30 transition-colors">
                <Icon className="w-4 h-4 shrink-0" />
                <input
                  type="text"
                  value={links[key] ?? ""}
                  onChange={(e) => setLinks((prev) => ({ ...prev, [key]: e.target.value }))}
                  placeholder="Your nickname"
                  className="flex-1 bg-transparent text-[14px] text-[#fafafa] placeholder:text-[#8d898a] outline-none"
                />
              </div>
            </div>
          ))}

          <Button
            onClick={saveProfile}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </div>

      <div className="bg-[#121111] border border-[#201e1f] rounded-3xl p-6 flex flex-col gap-5">
        <h2>Password</h2>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[12px] tracking-[0.5px] uppercase text-[#8d898a] font-semibold">
              New password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (passwordError) setPasswordError("");
              }}
              minLength={PASSWORD_MIN_LENGTH}
              placeholder={`Minimum ${PASSWORD_MIN_LENGTH} characters`}
              aria-invalid={!!passwordError}
              className={cn(
                "h-12 rounded-xl border px-4 text-[14px] text-[#fafafa] placeholder:text-[#8d898a] outline-none transition-colors",
                passwordError
                  ? "bg-[#241214] border-[#d4183d] focus:border-[#d4183d]"
                  : "bg-white/[0.04] border-white/[0.07] focus:border-white/30"
              )}
            />
            <PasswordStrengthMeter password={newPassword} />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[12px] tracking-[0.5px] uppercase text-[#8d898a] font-semibold">
              Confirm new password
            </label>
            <input
              type="password"
              value={confirmNewPassword}
              onChange={(e) => {
                setConfirmNewPassword(e.target.value);
                if (passwordError) setPasswordError("");
              }}
              minLength={PASSWORD_MIN_LENGTH}
              placeholder="Re-enter new password"
              className="h-12 rounded-xl border px-4 text-[14px] text-[#fafafa] placeholder:text-[#8d898a] outline-none transition-colors bg-white/[0.04] border-white/[0.07] focus:border-white/30"
            />
            {confirmNewPassword && confirmNewPassword !== newPassword && (
              <p className="text-[14px] text-[#ef9696]">Passwords do not match</p>
            )}
          </div>

          {passwordError && <p className="text-[14px] text-[#ef9696]">{passwordError}</p>}

          <Button
            onClick={savePassword}
            disabled={passwordSaving || !newPassword}
          >
            {passwordSaving ? "Saving…" : "Change password"}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
