import type { ReactNode } from "react";
import { SeoAppShell } from "@/components/seo/SeoAppShell";

export default function SeoLayout({ children }: { children: ReactNode }) {
  return <SeoAppShell>{children}</SeoAppShell>;
}
