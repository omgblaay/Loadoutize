import { Paperclip, Puzzle } from "lucide-react";
import {
  attachmentImageUrl,
  isApexAttachment,
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
  if (isApexAttachment(attachment)) {
    return <Puzzle aria-hidden="true" className={cn("size-5 shrink-0", className)} />;
  }
  const imageUrl = attachmentImageUrl(attachment);
  if (imageUrl) {
    return <img src={imageUrl} alt="" loading="lazy" className={cn("size-5 shrink-0 object-contain", className)} />;
  }
  return <Paperclip aria-hidden="true" className={cn("size-5 shrink-0 text-teritary", className)} />;
}
