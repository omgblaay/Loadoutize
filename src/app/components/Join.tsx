import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "./AuthContext";
import { LogIn, UserPlus } from "lucide-react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { usePageTitle } from "../hooks/usePageTitle";
import { FilterPill, FilterPillGroup } from "./ui/filter-pill";
import { ROLE_TAG_META, ROLE_TAG_ORDER, type RoleTag } from "../utils/roles";
import { LOCKED_GAME_ID } from "../utils/games";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Logo } from "./ui/logo";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "./ui/carousel";
import { RatingRing } from "./ui/rating-ring";
import { Tag } from "./ui/tag";
import { cn } from "./ui/utils";
import { PASSWORD_MIN_LENGTH, isPasswordStrong } from "../utils/password";
import { PasswordStrengthMeter } from "./ui/password-strength";

export const SLIDES = [
  {
    title: "Build your perfect loadout",
    body: "Fine-tune every attachment and perk to match your playstyle.",
  },
  {
    title: "Track the meta",
    body: "See what top players are running before you drop in.",
  },
  {
    title: "Share with one link",
    body: "Publish your build and share it anywhere, instantly.",
  },
];

interface ShowcaseLoadout {
  id: string;
  name: string;
  typeShort: string | null;
  imageUrl: string;
  rating: number | null;
}

const SHOWCASE_COLUMN_COUNT = 3;
const SHOWCASE_TARGET_COUNT = 15;
const SHOWCASE_DIRECTIONS: Array<"up" | "down"> = ["up", "down", "up"];
const SHOWCASE_DURATIONS = [42, 48, 45];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function ShowcaseCard({ item, scale }: { item: ShowcaseLoadout; scale: number }) {
  return (
    <div
      className="w-44 shrink-0 rounded-xl border border-white/10 bg-[#161415] p-3 flex flex-col gap-2 shadow-[0_10px_24px_-14px_rgba(0,0,0,0.8)]"
      style={{ transform: `scale(${scale})` }}
    >
      <div className="flex items-center gap-2">
        <RatingRing percent={item.rating} size={22} innerClassName="border border-white/5" labelClassName="text-[8px] text-[#fafafa]" fallbackLabel="—" />
        <p className="text-xs font-semibold text-[#fafafa] truncate flex-1">{item.name}</p>
      </div>
      <div className="h-14 flex items-center justify-center">
        <img src={item.imageUrl} alt="" className="max-h-full max-w-full object-contain brightness-200 saturate-0 opacity-90" />
      </div>
      {item.typeShort && <Tag>{item.typeShort}</Tag>}
    </div>
  );
}

function MarqueeColumn({
  items,
  direction,
  duration,
  columnIndex,
}: {
  items: ShowcaseLoadout[];
  direction: "up" | "down";
  duration: number;
  columnIndex: number;
}) {
  if (items.length === 0) return null;
  // Doubled so a -50% translate loops seamlessly back to the start.
  const doubled = [...items, ...items];

  return (
    <div className="relative w-44 shrink-0 h-full overflow-hidden">
      <div
        className="flex flex-col gap-4"
        style={{
          animation: `${direction === "up" ? "marquee-up" : "marquee-down"} ${duration}s linear infinite`,
          willChange: "transform",
        }}
      >
        {doubled.map((item, i) => (
          <ShowcaseCard
            key={`${columnIndex}-${item.id}-${i}`}
            item={item}
            scale={0.9 + ((i * 37) % 20) / 100}
          />
        ))}
      </div>
    </div>
  );
}

export function LoadoutWall() {
  const [items, setItems] = useState<ShowcaseLoadout[]>([]);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${publicAnonKey}` };
    Promise.all([
      fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${LOCKED_GAME_ID}/loadouts`, { headers }).then((r) => r.json()),
      fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6db475c7/games/${LOCKED_GAME_ID}/weapons`, { headers }).then((r) => r.json()),
    ])
      .then(([loadoutsData, weaponsData]) => {
        const weaponById = new Map<string, any>((weaponsData.weapons ?? []).map((w: any) => [w.id, w]));
        const built: ShowcaseLoadout[] = (loadoutsData.loadouts ?? [])
          .map((l: any): ShowcaseLoadout | null => {
            const weapon = weaponById.get(l.weapons?.[0]?.id);
            if (!weapon?.imageUrl) return null;
            return {
              id: l.id,
              name: l.name,
              typeShort: weapon.typeShort ?? null,
              imageUrl: weapon.imageUrl,
              rating: l.ratingPercent ?? null,
            };
          })
          .filter((item: ShowcaseLoadout | null): item is ShowcaseLoadout => item !== null);
        setItems(shuffle(built));
      })
      .catch(() => {});
  }, []);

  const columns = useMemo(() => {
    const cols: ShowcaseLoadout[][] = Array.from({ length: SHOWCASE_COLUMN_COUNT }, () => []);
    if (items.length === 0) return cols;
    // items is already shuffled -- this just takes a random slice, repeating (via modulo) only as a
    // fallback if fewer than SHOWCASE_TARGET_COUNT real loadouts came back.
    Array.from({ length: SHOWCASE_TARGET_COUNT }, (_, i) => items[i % items.length]).forEach((item, i) => {
      cols[i % SHOWCASE_COLUMN_COUNT].push(item);
    });
    return cols;
  }, [items]);

  if (columns.every((col) => col.length === 0)) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 flex items-center justify-center gap-4" style={{ transform: "rotate(15deg) scale(1.4)" }}>
        {columns.map((col, i) => (
          <MarqueeColumn key={i} items={col} direction={SHOWCASE_DIRECTIONS[i]} duration={SHOWCASE_DURATIONS[i]} columnIndex={i} />
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0909] via-transparent to-[#0a0909]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0909] via-[#0a0909]/40 to-transparent" />
    </div>
  );
}

function JoinShowcase() {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  useEffect(() => {
    if (!api) return;
    const id = setInterval(() => api.scrollNext(), 5000);
    return () => clearInterval(id);
  }, [api]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0a0909]">
      <LoadoutWall />

      <div className="relative h-full flex flex-col justify-end p-12 xl:p-16">
        <Carousel setApi={setApi} opts={{ loop: true }} className="w-full max-w-lg">
          <CarouselContent>
            {SLIDES.map((slide) => (
              <CarouselItem key={slide.title}>
                <h2 className="text-3xl font-bold text-[#fafafa] mb-3">{slide.title}</h2>
                <p className="text-neutral-400 text-base leading-relaxed">{slide.body}</p>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        <div className="flex items-center gap-2 mt-8">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => api?.scrollTo(i)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === current ? "w-8 bg-[#fafafa]" : "w-1.5 bg-white/20"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
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

export function Join() {
  usePageTitle("Loadoutize • Join");
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || "/";

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [roleTag, setRoleTag] = useState<RoleTag>("player");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "signup") {
      if (!/^[a-z0-9_-]{3,20}$/.test(nickname)) {
        setError("Nickname must be 3-20 characters: lowercase letters, numbers, - or _");
        return;
      }
      if (!isPasswordStrong(password)) {
        setError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters and include a number and a special character`);
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        await signup(email, password, name, nickname, roleTag);
      } else {
        await login(email, password);
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex bg-[#0a0909]">
      <div className="w-full lg:w-1/2 flex flex-col overflow-y-auto">
        <div className="p-6 sm:p-10">
          <Link to="/" className="inline-flex items-center gap-1.5">
            <Logo />
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 sm:px-10 pb-10">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-[#fafafa] mb-2">
                {mode === "login" ? "Welcome Back" : "Create Account"}
              </h1>
              <p className="text-neutral-400 font-medium text-sm">
                {mode === "login"
                  ? "Sign in to create and share loadouts"
                  : "Join the LOADOUTIZE community"}
              </p>
            </div>

            <Button variant="secondary" className="w-full" onClick={continueWithGoogle}>
              <GoogleIcon />
              Continue with Google
            </Button>

            <div className="flex items-center gap-3 my-5">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-neutral-500 font-medium">OR</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div>
                  <Label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                    Name
                  </Label>
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Enter your name"
                  />
                </div>
              )}

              {mode === "signup" && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                    Nickname
                  </label>
                  <Input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value.toLowerCase())}
                    required
                    minLength={3}
                    maxLength={20}
                    pattern="[a-z0-9_-]{3,20}"
                    placeholder="@nick"
                  />
                  <p className="mt-1.5 text-xs text-neutral-500">
                    Your public profile /u/{nickname || "@nick"}
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
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                  Password
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={mode === "signup" ? PASSWORD_MIN_LENGTH : undefined}
                  placeholder={mode === "signup" ? `Minimum ${PASSWORD_MIN_LENGTH} characters` : "Enter your password"}
                />
                {mode === "signup" && <PasswordStrengthMeter password={password} />}
              </div>

              {mode === "signup" && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                    Confirm password
                  </label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={PASSWORD_MIN_LENGTH}
                    placeholder="Re-enter your password"
                  />
                  {confirmPassword && confirmPassword !== password && (
                    <p className="mt-1.5 text-xs text-[#ef9696]">Passwords do not match</p>
                  )}
                </div>
              )}

              {error && (
                <div className="bg-red-950/20 border border-red-600/20 p-3 text-red-400 font-medium rounded-md text-sm">
                  {error}
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full">
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
              </Button>

              {mode === "signup" && (
                <p className="text-center text-xs text-neutral-500">
                  By creating an account, you agree to our{" "}
                  <Link to="/terms" className="text-neutral-300 underline underline-offset-2 hover:text-[#fafafa]">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy" className="text-neutral-300 underline underline-offset-2 hover:text-[#fafafa]">
                    Privacy Policy
                  </Link>
                  .
                </p>
              )}
            </form>

            <div className="flex items-center gap-3 my-5">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-neutral-500 font-medium">                
                {mode === "login"
                  ? "Don't have an account?"
                  : "Already have an account?"}</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <div className="mt-6 text-center">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setMode(mode === "login" ? "signup" : "login");
                  setError("");
                }}
              >
                {mode === "login"
                  ? "Sign up"
                  : "Sign in"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden lg:block lg:w-1/2 border-l border-white/[0.06]">
        <JoinShowcase />
      </div>
    </div>
  );
}
