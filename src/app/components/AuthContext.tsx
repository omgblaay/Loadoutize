import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { projectId, publicAnonKey } from "/utils/supabase/info";

interface User {
  id: string;
  email: string;
  name: string;
  nickname: string | null;
  avatarUrl: string | null;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  /** Google's profile picture URL while the user is mid-onboarding (no profile yet); null otherwise. */
  pendingOAuthAvatarUrl: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, nickname: string) => Promise<void>;
  /** Adopts an already-issued Supabase access token (e.g. from an OAuth redirect) without a password grant. Resolves to whether the user already has a profile. */
  loginWithAccessToken: (token: string) => Promise<boolean>;
  /** Creates the `profiles` row for a user who authenticated but doesn't have one yet (Google onboarding). */
  completeProfile: (nickname: string, avatarFile: File | null) => Promise<void>;
  logout: () => void;
  loading: boolean;
  /** Re-fetches the profile fields (nickname/avatarUrl) onto the current user -- call after editing them in Settings. */
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Google's profile picture URL for a user mid-onboarding (no `profiles`
  // row yet) -- shown as the default avatar on the "complete your profile"
  // step. Cleared once that step is done.
  const [pendingOAuthAvatarUrl, setPendingOAuthAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    // /auth/callback adopts its own token via loginWithAccessToken -- running
    // checkSession() there too would race it (both mount-time effects mutate
    // the same user/accessToken state), and whichever resolves last wins,
    // potentially silently swapping back to a stale logged-in identity.
    if (window.location.pathname === "/auth/callback") {
      setLoading(false);
      return;
    }
    checkSession();
  }, []);

  // Profile fields (nickname/avatar) live in our own `profiles` table, not
  // Supabase Auth's user_metadata -- fetched separately right after we know
  // who's logged in, and merged onto the base auth user.
  const fetchProfile = async (token: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/users/me`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) return null;
      const { profile } = await response.json();
      return profile as { nickname: string; avatarUrl: string | null };
    } catch (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (!accessToken) return;
    const profile = await fetchProfile(accessToken);
    if (profile) {
      setUser((prev) => (prev ? { ...prev, nickname: profile.nickname, avatarUrl: profile.avatarUrl } : prev));
    }
  };

  const checkSession = async () => {
    try {
      const storedToken = localStorage.getItem("access_token");
      if (storedToken) {
        const response = await fetch(
          `https://${projectId}.supabase.co/auth/v1/user`,
          {
            headers: {
              Authorization: `Bearer ${storedToken}`,
              apikey: publicAnonKey,
            },
          }
        );
        if (response.ok) {
          const userData = await response.json();
          const profile = await fetchProfile(storedToken);
          setUser({
            id: userData.id,
            email: userData.email,
            name: userData.user_metadata?.name || userData.email.split("@")[0],
            nickname: profile?.nickname ?? null,
            avatarUrl: profile?.avatarUrl ?? null,
          });
          setAccessToken(storedToken);
        } else {
          localStorage.removeItem("access_token");
        }
      }
    } catch (error) {
      console.error("Error checking session:", error);
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, password: string, name: string, nickname: string) => {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/auth/signup`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ email, password, name, nickname }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to sign up");
    }

    await login(email, password);
  };

  const login = async (email: string, password: string) => {
    const response = await fetch(
      `https://${projectId}.supabase.co/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: publicAnonKey,
        },
        body: JSON.stringify({ email, password }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error_description || "Failed to log in");
    }

    const profile = await fetchProfile(data.access_token);
    setUser({
      id: data.user.id,
      email: data.user.email,
      name: data.user.user_metadata?.name || data.user.email.split("@")[0],
      nickname: profile?.nickname ?? null,
      avatarUrl: profile?.avatarUrl ?? null,
    });
    setAccessToken(data.access_token);
    localStorage.setItem("access_token", data.access_token);
  };

  const logout = () => {
    setUser(null);
    setAccessToken(null);
    setPendingOAuthAvatarUrl(null);
    localStorage.removeItem("access_token");
  };

  // Used after an OAuth redirect (e.g. Google): we already have a Supabase
  // access token from the URL fragment, so this just validates it and loads
  // the user the same way checkSession/login do -- no password grant. The
  // profile fetch is expected to 404 for a brand-new OAuth user; fetchProfile
  // already returns null in that case rather than throwing.
  const loginWithAccessToken = async (token: string) => {
    const response = await fetch(`https://${projectId}.supabase.co/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: publicAnonKey },
    });
    const userData = await response.json();
    if (!response.ok) {
      throw new Error(userData.error_description || userData.msg || "Failed to sign in");
    }

    const profile = await fetchProfile(token);
    setUser({
      id: userData.id,
      email: userData.email,
      name: userData.user_metadata?.name || userData.email.split("@")[0],
      nickname: profile?.nickname ?? null,
      avatarUrl: profile?.avatarUrl ?? null,
    });
    setPendingOAuthAvatarUrl(
      profile ? null : userData.user_metadata?.avatar_url || userData.user_metadata?.picture || null
    );
    setAccessToken(token);
    localStorage.setItem("access_token", token);
    return !!profile;
  };

  const completeProfile = async (nickname: string, avatarFile: File | null) => {
    if (!accessToken) throw new Error("Not signed in");

    const form = new FormData();
    form.append("nickname", nickname);
    if (avatarFile) form.append("file", avatarFile);

    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/auth/complete-profile`,
      { method: "POST", headers: { Authorization: `Bearer ${accessToken}` }, body: form }
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to complete profile");
    }

    setUser((prev) => (prev ? { ...prev, nickname: data.profile.nickname, avatarUrl: data.profile.avatarUrl } : prev));
    setPendingOAuthAvatarUrl(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        pendingOAuthAvatarUrl,
        login,
        signup,
        loginWithAccessToken,
        completeProfile,
        logout,
        loading,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
