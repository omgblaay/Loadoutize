# Frontend architecture

Loadoutize organizes UI using atomic design. Classify a component by its responsibility and reuse, rather than its line count. Routing stays in `src/app/App.tsx`; reusable UI lives in `src/components/`.

## Layers

| Layer | Responsibility | Examples |
| --- | --- | --- |
| Atoms | Basic visual elements and primitive controls | `Button`, `Input`, `Tag`, `RatingRing`, `Logo`, `NavIcon` |
| Molecules | Small combinations of elements that perform one interaction | `SearchBar`, `PasswordStrengthMeter`, `ResponsiveDialog`, `WeaponImage`, `Pagination` |
| Organisms | Substantial reusable sections with a domain or navigation purpose | `LoadoutCard`, `WeaponCard`, `SideNav`, `TopNavBar`, `HomeExplorePreview`, `LoadoutWall` |
| Templates | Layout shells that arrange sections and accept page content | `AppLayout` |
| Pages | Route-level screens that connect data, state, and layouts | `Home`, `Explore`, `LoadoutBuilder`, `Settings`, `Join` |

Radix wrappers that expose a basic visual primitive belong in atoms. Composed menus, dialogs, forms, and similar interaction patterns belong in molecules. The generic `Sidebar` is an organism; the application's `SideNav` is a separate organism.

The `fire/` and `icons3d/` directories hold implementation files for atomic visual effects. Their geometry, shader, and local type files remain colocated with the rendering components. Existing page-specific helpers may stay private to a page until they are reused.

## Dependencies

Import from the same layer or a lower layer. Atoms must not import molecules, organisms, templates, or pages; reusable sections must not import route screens. `App.tsx` composes the pages and global providers.

Use direct imports so a dependency's location is explicit:

```tsx
import { Button } from "@/components/atoms/Button";
import { LoadoutCard } from "@/components/organisms/LoadoutCard";
import { AppLayout } from "@/components/templates/AppLayout";
import type { Loadout } from "@/types/loadout";
```

Shared data types belong in `src/types/`, rather than being exported from a screen for reusable components to import. Shared hooks belong in `src/hooks/`; for example, `useGameName` serves both the layout and pages. `AuthProvider` and its `useAuth` hook live in `src/providers/`.

Utilities and shared metadata belong in `src/lib/`. Shared promotional text lives in `showcaseSlides.ts`, while `LoadoutWall` and `JoinShowcase` own its presentation. Backend code remains in `supabase/functions/server/`; the generated Supabase configuration remains in `utils/supabase/`.

## Naming

- Use PascalCase for React component files: `Button.tsx`, `TopNavBar.tsx`, `AppLayout.tsx`.
- Prefer a component's primary export as its filename. Related primitives may share a file, such as `Dialog`, `DialogContent`, and `DialogTitle` in `Dialog.tsx`.
- Use `useCamelCase` for hooks: `useIsMobile.ts`.
- Use descriptive camelCase for utility, metadata, and shared type files: `gameColors.ts`, `showcaseSlides.ts`, `loadout.ts`.
- Keep routes independent of filenames; moving a page should not change its URL.
- Use the `@/` alias for shared source imports. Keep the optional component-preview glob relative so Vite can discover it.

## Adding components

Start with the smallest appropriate layer and compose existing lower-level components. Promote a repeated page section into an organism when it has a reusable purpose. Avoid creating one-line wrappers solely to fill a layer.

`components.json` points shadcn at the current styles, utility, hook, and component locations, with atoms as the generation destination. After generating a composed component, classify it into the appropriate layer, use PascalCase filenames, and update its imports before committing. The generator does not enforce the architecture automatically.

## Verification

Run `npm run build` after moving components or changing imports. Tailwind scans all of `src/`, so all atomic layers are included. Dynamic 3D imports must retain their lazy-loading behavior.

`src/components/pages/ComponentTest.tsx` is an optional, Git-ignored local preview. Its absence must not break a production build. No automated test suite or full TypeScript checking command is currently configured.
