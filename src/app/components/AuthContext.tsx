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
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, nickname: string) => Promise<void>;
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

  useEffect(() => {
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
    localStorage.removeItem("access_token");
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, login, signup, logout, loading, refreshProfile }}>
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
