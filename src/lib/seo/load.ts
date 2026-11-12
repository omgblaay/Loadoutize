import { buildSeoContext, type SeoContext } from "./context";
import { getAttachments, getLoadouts, getWeapons } from "./data";

export async function loadSeoContext(): Promise<SeoContext> {
  const [weapons, loadouts, attachments] = await Promise.all([
    getWeapons(),
    getLoadouts(),
    getAttachments(),
  ]);
  return buildSeoContext(weapons, loadouts, attachments);
}
