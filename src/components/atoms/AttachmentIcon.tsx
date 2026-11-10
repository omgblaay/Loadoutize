import {
  attachmentDisplayName,
  attachmentImageUrl,
  type PresentableAttachment,
} from "@/lib/attachmentPresentation";
import { cn } from "@/lib/utils";
import { APEX_ICON_FILTER } from "@/lib/apexAttachmentIcon";

export function AttachmentIcon({
  attachment,
  className,
  tintApex = false,
}: {
  attachment: PresentableAttachment;
  className?: string;
  tintApex?: boolean;
}) {
  const imageUrl = attachmentImageUrl(attachment);
  if (imageUrl) {
    return <img src={imageUrl} alt="" loading="lazy" className={cn("size-6 shrink-0 object-contain", className)} style={tintApex ? { filter: APEX_ICON_FILTER } : undefined} />;
  }
  return <span aria-label={`${attachmentDisplayName(attachment)} image unavailable`}
    className={cn("inline-flex size-6 shrink-0 items-center justify-center text-xs font-semibold text-teritary", tintApex && "text-amber-300", className)}>
    {attachmentDisplayName(attachment).slice(0, 2).toUpperCase()}
  </span>;
}
