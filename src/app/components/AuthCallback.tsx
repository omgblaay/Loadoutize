import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "./AuthContext";
import { projectId } from "../../../utils/supabase/info";
import { usePageTitle } from "../hooks/usePageTitle";
import { Loading } from "./ui/loading";
import { Loader2, Check, X as XIcon, Upload, UserPlus } from "lucide-react";
import { FilterPill, FilterPillGroup } from "./ui/filter-pill";
import { ROLE_TAG_META, ROLE_TAG_ORDER, type RoleTag } from "../utils/roles";

const NICKNAME_PATTERN = /^[a-z0-9_-]{3,20}$/;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_GIF_BYTES = 2 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

type NicknameStatus = "idle" | "invalid" | "checking" | "available" | "taken" | "error";

// Handles the redirect back from Supabase's Google OAuth flow: adopts the
// access token from the URL fragment, then either sends the user home (they
// already have a profile) or walks them through creating one.
export function AuthCallback() {
  usePageTitle("Loadoutize • Sign in");
  const navigate = useNavigate();
  const { accessToken, pendingOAuthAvatarUrl, loginWithAccessToken, completeProfile } = useAuth();
  const ranRef = useRef(false);

  const [phase, setPhase] = useState<"processing" | "onboarding" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState("");

  const [nickname, setNickname] = useState("");
  const [nicknameStatus, setNicknameStatus] = useState<NicknameStatus>("idle");
  const [roleTag, setRoleTag] = useState<RoleTag>("player");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const errorDescription = hash.get("error_description") || hash.get("error");
    const token = hash.get("access_token");

    // Drop the token/error out of the URL immediately so it doesn't linger in history.
    window.history.replaceState(null, "", window.location.pathname);

    if (errorDescription) {
      setErrorMessage(decodeURIComponent(errorDescription.replace(/\+/g, " ")));
      setPhase("error");
      return;
    }
    if (!token) {
      setErrorMessage("Missing sign-in details. Please try again.");
      setPhase("error");
      return;
    }

    loginWithAccessToken(token)
      .then((hasProfile) => {
        if (hasProfile) {
          navigate("/home", { replace: true });
        } else {
          setPhase("onboarding");
        }
      })
      .catch((err) => {
        setErrorMessage(err instanceof Error ? err.message : "Failed to sign in");
        setPhase("error");
      });
    // Intentionally run once -- loginWithAccessToken/navigate identity churn shouldn't re-trigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  const checkNickname = async (value: string): Promise<boolean> => {
    setNicknameStatus("checking");
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/nickname-available?nickname=${encodeURIComponent(value)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to check nickname");
      setNicknameStatus(data.available ? "available" : "taken");
      return !!data.available;
    } catch {
      setNicknameStatus("error");
      return false;
    }
  };

  const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase();
    setNickname(value);
    setNicknameStatus(value && !NICKNAME_PATTERN.test(value) ? "invalid" : "idle");
  };

  const handleNicknameBlur = () => {
    if (nickname && NICKNAME_PATTERN.test(nickname)) {
      checkNickname(nickname);
    }
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

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
    setAvatarFile(file);
  };

  const handleFinish = async () => {
    setSubmitError("");
    if (!NICKNAME_PATTERN.test(nickname)) {
      setNicknameStatus("invalid");
      return;
    }

    let available = nicknameStatus === "available";
    if (!available) {
      available = await checkNickname(nickname);
    }
    if (!available) return;

    setSubmitting(true);
    try {
      await completeProfile(nickname, avatarFile, roleTag);
      navigate("/home", { replace: true });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to finish registration");
    } finally {
      setSubmitting(false);
    }
  };

  if (phase === "processing") {
    return <Loading fullScreen label="Signing you in…" />;
  }

  if (phase === "error") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0909] px-4">
        <div className="bg-[#141414] border border-white/5 max-w-md w-full p-8 rounded-xl text-center flex flex-col gap-4">
          <h1 className="text-xl font-bold text-[#fafafa]">Sign-in failed</h1>
          <p className="text-neutral-400 text-sm">{errorMessage}</p>
          <button
            onClick={() => navigate("/home", { replace: true })}
            className="mt-2 self-center h-11 px-5 rounded-md bg-[#fafafa] text-black font-semibold text-sm"
          >
            Back to Loadoutize
          </button>
        </div>
      </div>
    );
  }

  const avatarSrc = avatarPreviewUrl ?? pendingOAuthAvatarUrl;
  const finishDisabled =
    submitting || !nickname || nicknameStatus === "checking" || nicknameStatus === "taken" || nicknameStatus === "invalid";

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a0909] px-4 py-10">
      <div className="bg-[#141414] border border-white/5 max-w-md w-full p-8 rounded-xl flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-[#fafafa] mb-2">Complete your profile</h1>
          <p className="text-neutral-400 font-medium text-sm">One last step before you're in.</p>
        </div>

        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl border border-white/10 overflow-hidden flex items-center justify-center shrink-0 bg-white/[0.04]">
            {avatarSrc ? (
              <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-semibold text-[#fafafa]">?</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleAvatarSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-10 px-4 rounded-md border border-white/[0.18] flex items-center gap-2 text-[#fafafa] text-sm"
            >
              <Upload className="w-4 h-4" />
              Change photo
            </button>
            <p className="text-xs text-neutral-500">PNG, JPEG, WEBP, or GIF. Max 5MB (2MB for GIFs).</p>
            {avatarError && <p className="text-xs text-[#ef9696]">{avatarError}</p>}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
            Nickname
          </label>
          <input
            type="text"
            value={nickname}
            onChange={handleNicknameChange}
            onBlur={handleNicknameBlur}
            minLength={3}
            maxLength={20}
            pattern="[a-z0-9_-]{3,20}"
            autoFocus
            className="w-full bg-white/[0.02] border border-white/5 px-4 py-2.5 text-[#fafafa] font-medium focus:border-white/20 focus:outline-none transition-all placeholder-neutral-600 rounded-md text-sm"
            placeholder="your-public-handle"
          />
          <p className="mt-1.5 text-xs text-neutral-500">
            Your public profile URL: /u/{nickname || "your-public-handle"}
          </p>
          <div className="mt-1.5 text-xs min-h-[16px]">
            {nicknameStatus === "checking" && (
              <span className="flex items-center gap-1.5 text-neutral-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Checking availability…
              </span>
            )}
            {nicknameStatus === "available" && (
              <span className="flex items-center gap-1.5 text-[#01a059]">
                <Check className="w-3.5 h-3.5" />
                Nickname is available
              </span>
            )}
            {nicknameStatus === "taken" && (
              <span className="flex items-center gap-1.5 text-[#ef9696]">
                <XIcon className="w-3.5 h-3.5" />
                Nickname is already taken
              </span>
            )}
            {nicknameStatus === "invalid" && nickname && (
              <span className="text-[#ef9696]">3-20 characters: lowercase letters, numbers, - or _</span>
            )}
            {nicknameStatus === "error" && <span className="text-[#ef9696]">Couldn't check availability</span>}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
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

        {submitError && (
          <div className="bg-red-950/20 border border-red-600/20 p-3 text-red-400 font-medium rounded-md text-sm">
            {submitError}
          </div>
        )}

        <button
          onClick={handleFinish}
          disabled={finishDisabled}
          className="w-full bg-[#fafafa] hover:bg-white/90 disabled:bg-white/10 text-black disabled:text-neutral-500 font-semibold py-2.5 transition-all flex items-center justify-center gap-2 rounded-md text-sm"
        >
          {submitting ? (
            "Finishing up…"
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              Finish registration
            </>
          )}
        </button>
      </div>
    </div>
  );
}
