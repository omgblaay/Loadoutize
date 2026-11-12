import { projectId } from "../../utils/supabase/info";

// Use the same APEX type icon in cards and in the builder when the API omits it.
const MW4_APEX_TYPE_IMAGE_URL = `https://${projectId}.supabase.co/storage/v1/object/public/cms-assets/35bfddeb-afd5-45ff-87f9-84c3775e2dd6.svg`;

export const APEX_ICON_FILTER = "brightness(0) saturate(100%) invert(82%) sepia(50%) saturate(752%) hue-rotate(346deg) brightness(102%) contrast(94%)";

export function apexAttachmentIconUrl(typeImageUrl: string | null | undefined, gameId: string) {
  return typeImageUrl || (gameId === "mw4" ? MW4_APEX_TYPE_IMAGE_URL : null);
}
