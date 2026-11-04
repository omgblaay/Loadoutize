import { lazy, Suspense, useEffect, type ComponentType, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from "react-router";
import { toast } from "sonner";
import { AuthProvider } from "@/providers/AuthProvider";
import { NotFound } from "@/components/pages/NotFound";
import { CookieConsent } from "@/components/organisms/CookieConsent";
import { Toaster } from "@/components/molecules/Toaster";
import { GAME_SELECTOR_ENABLED, LOCKED_GAME_ID } from "@/lib/games";
import { explorePath } from "@/lib/routes";
import { FULL_LOADOUTS_ENABLED } from "@/lib/contentVisibility";

// ComponentTest.tsx is gitignored (a local-only scratch/preview page) -- a
// normal static import of it breaks the build anywhere the file doesn't
// exist on disk, e.g. Vercel, which builds from the git checkout and never
// has it. import.meta.glob resolves it when present (local dev) and simply
// returns no match when absent, so the build never fails either way.
const componentTestModules = import.meta.glob<{ ComponentTest: ComponentType }>("../components/pages/ComponentTest.tsx");
const loadComponentTest = componentTestModules["../components/pages/ComponentTest.tsx"];
const ComponentTest = loadComponentTest ? lazy(() => loadComponentTest().then((m) => ({ default: m.ComponentTest }))) : null;
const Home = lazy(() => import("@/components/pages/Home").then((module) => ({ default: module.Home })));
const Explore = lazy(() => import("@/components/pages/Explore").then((module) => ({ default: module.Explore })));
const MetaView = lazy(() => import("@/components/pages/MetaView").then((module) => ({ default: module.MetaView })));
const CommunityView = lazy(() => import("@/components/pages/CommunityView").then((module) => ({ default: module.CommunityView })));
const LoadoutBuilder = lazy(() => import("@/components/pages/LoadoutBuilder").then((module) => ({ default: module.LoadoutBuilder })));
const LoadoutPreview = lazy(() => import("@/components/pages/LoadoutPreview").then((module) => ({ default: module.LoadoutPreview })));
const UserPage = lazy(() => import("@/components/pages/UserPage").then((module) => ({ default: module.UserPage })));
const LikedLoadouts = lazy(() => import("@/components/pages/LikedLoadouts").then((module) => ({ default: module.LikedLoadouts })));
const Settings = lazy(() => import("@/components/pages/Settings").then((module) => ({ default: module.Settings })));
const Join = lazy(() => import("@/components/pages/Join").then((module) => ({ default: module.Join })));
const AuthCallback = lazy(() => import("@/components/pages/AuthCallback").then((module) => ({ default: module.AuthCallback })));
const PrivacyPolicy = lazy(() => import("@/components/pages/PrivacyPolicy").then((module) => ({ default: module.PrivacyPolicy })));
const TermsOfService = lazy(() => import("@/components/pages/TermsOfService").then((module) => ({ default: module.TermsOfService })));
const WeaponMetaView = lazy(() =>
  import("@/components/pages/WeaponMetaView").then((module) => ({
    default: module.WeaponMetaView,
  })),
);
const WeaponMetaListView = lazy(() =>
  import("@/components/pages/WeaponMetaListView").then((module) => ({
    default: module.WeaponMetaListView,
  })),
);
const AttachmentMetaView = lazy(() =>
  import("@/components/pages/AttachmentMetaView").then((module) => ({
    default: module.AttachmentMetaView,
  })),
);
const AttachmentMetaListView = lazy(() =>
  import("@/components/pages/AttachmentMetaListView").then((module) => ({
    default: module.AttachmentMetaListView,
  })),
);
const PerkMetaListView = lazy(() =>
  import("@/components/pages/PerkMetaListView").then((module) => ({
    default: module.PerkMetaListView,
  })),
);

function GameRedirect() {
  const { gameId } = useParams();
  const target = !GAME_SELECTOR_ENABLED ? LOCKED_GAME_ID : gameId ?? LOCKED_GAME_ID;
  return <Navigate to={explorePath(target)} replace />;
}

function RouteLoading() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-[#0a0909] px-6 text-center text-sm text-[#bebcbc]"
      role="status"
      aria-live="polite"
    >
      Loading page…
    </div>
  );
}

function LegacyExploreRedirect() {
  const { gameId } = useParams();
  const location = useLocation();
  const target = !GAME_SELECTOR_ENABLED ? LOCKED_GAME_ID : gameId ?? LOCKED_GAME_ID;
  const params = Object.fromEntries(new URLSearchParams(location.search));
  delete params.game;
  return <Navigate to={explorePath(target, params)} replace />;
}

// Loadout links moved from /:gameId/loadout/:id to the shorter /:gameId/l/:id
// -- this keeps any already-shared /loadout/ link (Discord, QR codes, etc.)
// working instead of 404ing.
function LegacyLoadoutRedirect() {
  const { gameId, loadoutId } = useParams();
  if (!FULL_LOADOUTS_ENABLED) return <Navigate to={explorePath(gameId)} replace />;
  return <Navigate to={`/${gameId}/l/${loadoutId}`} replace />;
}

// Fires once per full page load (App only mounts once -- route changes don't
// remount it), so a refresh shows it again but navigating around the app
// doesn't spam it.
function BetaNotice() {
  useEffect(() => {
    toast.info("Loadoutize is in beta. Expect rough edges.", {
      description: (
        <span className="text-secondary">
          The design is still changing too — spacing, sizes, UX choices and layout will keep shifting.
          <br />
          <a
            href="https://blaay.framer.website/projects/loadoutize"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-primary underline-offset-2"
          >
            Read the case study
          </a>
        </span>
      ),
      duration: 12000,
      closeButton: true,
    });
  }, []);
  return null;
}

// Client-side navigation keeps the browser's scroll position by default, so
// without this, following a link while scrolled down lands on the new page
// at the same scroll offset instead of at the top.
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// While the game selector is disabled, any /:gameId/* route for a game other
// than LOCKED_GAME_ID redirects to its Modern Warfare 4 equivalent instead of
// rendering — so switching is off everywhere, not just hidden from the UI.
function GameLock({ children }: { children: ReactNode }) {
  const { gameId } = useParams();
  const location = useLocation();
  if (!GAME_SELECTOR_ENABLED && gameId !== LOCKED_GAME_ID) {
    const rest = location.pathname.split("/").slice(2).join("/");
    return <Navigate to={`/${LOCKED_GAME_ID}${rest ? `/${rest}` : ""}${location.search}`} replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-center" />
      <BetaNotice />
      <BrowserRouter>
        <ScrollToTop />
        <CookieConsent />
        <Suspense fallback={<RouteLoading />}>
          <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/u/:nickname" element={<UserPage />} />
          <Route path="/liked" element={<LikedLoadouts />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/join" element={<Join />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          {ComponentTest && (
            <Route
              path="/component-test"
              element={
                <ComponentTest />
              }
            />
          )}
          <Route path="/:gameId" element={<GameRedirect />} />
          <Route path="/:gameId/explore" element={<LegacyExploreRedirect />} />
          <Route
            path="/:gameId/meta"
            element={
              <GameLock>
                <MetaView />
              </GameLock>
            }
          />
          <Route
            path="/:gameId/meta/weapons"
            element={
              <GameLock>
                <WeaponMetaListView />
              </GameLock>
            }
          />
          <Route
            path="/:gameId/meta/weapongroup/:weaponGroup"
            element={
              <GameLock>
                <WeaponMetaListView />
              </GameLock>
            }
          />
          <Route
            path="/:gameId/meta/weapons/:weaponId"
            element={
              <GameLock>
                <WeaponMetaView />
              </GameLock>
            }
          />
          <Route
            path="/:gameId/meta/attachmentgroup/:attachmentGroup"
            element={
              <GameLock>
                <AttachmentMetaListView />
              </GameLock>
            }
          />
          <Route
            path="/:gameId/meta/attachments"
            element={
              <GameLock>
                <AttachmentMetaListView />
              </GameLock>
            }
          />
          <Route
            path="/:gameId/meta/attachments/:attachmentId"
            element={
              <GameLock>
                <AttachmentMetaView />
              </GameLock>
            }
          />
          <Route
            path="/:gameId/meta/perks"
            element={
              <GameLock>
                <PerkMetaListView />
              </GameLock>
            }
          />
          <Route
            path="/:gameId/community"
            element={
              <GameLock>
                <CommunityView />
              </GameLock>
            }
          />
          <Route
            path="/:gameId/create"
            element={
              <GameLock>
                <LoadoutBuilder />
              </GameLock>
            }
          />
          <Route
            path="/:gameId/l/:loadoutId"
            element={
              <GameLock>
                {FULL_LOADOUTS_ENABLED ? <LoadoutPreview /> : <Navigate to="/explore" replace />}
              </GameLock>
            }
          />
          <Route path="/:gameId/loadout/:loadoutId" element={<LegacyLoadoutRedirect />} />
          <Route
            path="/:gameId/weapon/:configId"
            element={
              <GameLock>
                <LoadoutPreview />
              </GameLock>
            }
          />
          <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
