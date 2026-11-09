import {
  attachmentDisplayName,
  attachmentImageUrl,
  type PresentableAttachment,
} from "@/lib/attachmentPresentation";
import { cn } from "@/lib/utils";

export function AttachmentIcon({
  attachment,
  className,
}: {
  attachment: PresentableAttachment;
  className?: string;
}) {
  const imageUrl = attachmentImageUrl(attachment);
  if (imageUrl) {
    return <img src={imageUrl} alt="" loading="lazy" className={cn("size-5 shrink-0 object-contain", className)} />;
  }
  return <span aria-label={`${attachmentDisplayName(attachment)} image unavailable`}
    className={cn("inline-flex size-5 shrink-0 items-center justify-center text-[10px] font-semibold text-teritary", className)}>
    {attachmentDisplayName(attachment).slice(0, 2).toUpperCase()}
  </span>;
}
