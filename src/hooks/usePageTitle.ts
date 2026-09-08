import { useEffect } from "react";

/** Sets the browser tab title for the current page. Pass `null`/`undefined` to skip (e.g. while data is still loading). */
export function usePageTitle(title: string | null | undefined) {
  useEffect(() => {
    if (!title) return;
    document.title = title;
  }, [title]);
}
