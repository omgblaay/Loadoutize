import { useState } from "react";
import { useAuth } from "./AuthContext";
import { X, LogIn, UserPlus } from "lucide-react";
import { projectId } from "../../../utils/supabase/info";
import { FilterPill, FilterPillGroup } from "./ui/filter-pill";
import { ROLE_TAG_META, ROLE_TAG_ORDER, type RoleTag } from "../utils/roles";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.48a5.54 5.54 0 0 1-2.4 3.63v3.02h3.88c2.27-2.09 3.56-5.17 3.56-8.84Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.96-2.9l-3.88-3.02c-1.08.72-2.46 1.15-4.08 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54V6.62H1.26a12 12 0 0 0 0 10.76l4.01-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.26 6.62l4.01 3.11C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  );
}

function continueWithGoogle() {
  const redirectTo = `${window.location.origin}/auth/callback`;
  window.location.href = `https://${projectId}.supabase.co/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [roleTag, setRoleTag] = useState<RoleTag>("player");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "signup" && !/^[a-z0-9_-]{3,20}$/.test(nickname)) {
      setError("Nickname must be 3-20 characters: lowercase letters, numbers, - or _");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        await signup(email, password, name, nickname, roleTag);
      } else {
        await login(email, password);
      }
      onClose();
      setEmail("");
      setPassword("");
      setName("");
      setNickname("");
      setRoleTag("player");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#141414] border border-white/5 max-w-md w-full mx-4 relative shadow-2xl rounded-xl overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded-md transition-colors z-10"
        >
          <X className="w-4 h-4 text-neutral-400" />
        </button>

        <div className="p-8 relative">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#fafafa] mb-2">
              {mode === "login" ? "Welcome Back" : "Create Account"}
            </h2>
            <p className="text-neutral-400 font-medium text-sm">
              {mode === "login"
                ? "Sign in to create and share loadouts"
                : "Join the LOADOUTIZE community"}
            </p>
          </div>

          <button
            type="button"
            onClick={continueWithGoogle}
            className="w-full bg-white hover:bg-white/90 text-black font-semibold py-2.5 transition-all flex items-center justify-center gap-2.5 rounded-md text-sm"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-white/5" />
            <span className="text-xs text-neutral-500 font-medium">OR</span>
            <div className="h-px flex-1 bg-white/5" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-white/[0.02] border border-white/5 px-4 py-2.5 text-[#fafafa] font-medium focus:border-white/20 focus:outline-none transition-all placeholder-neutral-600 rounded-md text-sm"
                  placeholder="Enter your name"
                />
              </div>
            )}

            {mode === "signup" && (
              <div>
                <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                  Nickname
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value.toLowerCase())}
                  required
                  minLength={3}
                  maxLength={20}
                  pattern="[a-z0-9_-]{3,20}"
                  className="w-full bg-white/[0.02] border border-white/5 px-4 py-2.5 text-[#fafafa] font-medium focus:border-white/20 focus:outline-none transition-all placeholder-neutral-600 rounded-md text-sm"
                  placeholder="your-public-handle"
                />
                <p className="mt-1.5 text-xs text-neutral-500">
                  Your public profile URL: /u/{nickname || "your-public-handle"}
                </p>
              </div>
            )}

            {mode === "signup" && (
              <div>
                <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                  You are a...
                </label>
                <FilterPillGroup
                  type="single"
                  value={roleTag}
                  onValueChange={(v) => v && setRoleTag(v as RoleTag)}
                >
                  {ROLE_TAG_ORDER.map((tag) => (
                    <FilterPill key={tag} value={tag} size="sm">
                      {ROLE_TAG_META[tag].label}
                    </FilterPill>
                  ))}
                </FilterPillGroup>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-white/[0.02] border border-white/5 px-4 py-2.5 text-[#fafafa] font-medium focus:border-white/20 focus:outline-none transition-all placeholder-neutral-600 rounded-md text-sm"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-white/[0.02] border border-white/5 px-4 py-2.5 text-[#fafafa] font-medium focus:border-white/20 focus:outline-none transition-all placeholder-neutral-600 rounded-md text-sm"
                placeholder="Minimum 6 characters"
              />
            </div>

            {error && (
              <div className="bg-red-950/20 border border-red-600/20 p-3 text-red-400 font-medium rounded-md text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#fafafa] hover:bg-white/90 disabled:bg-white/10 text-black disabled:text-neutral-500 font-semibold py-2.5 transition-all flex items-center justify-center gap-2 rounded-md text-sm"
            >
              {loading ? (
                "Please wait..."
              ) : mode === "login" ? (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Create Account
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError("");
              }}
              className="text-neutral-400 hover:text-[#fafafa] transition-colors font-medium text-sm"
            >
              {mode === "login"
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
