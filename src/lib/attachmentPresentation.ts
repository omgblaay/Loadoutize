export interface PresentableAttachment {
  name: string;
  type?: string | null;
  imageUrl?: string | null;
  stats?: { displayName?: string; imagePath?: string } | null;
}

export const attachmentDisplayName = (attachment: PresentableAttachment) =>
  attachment.stats?.displayName || attachment.name;

export const attachmentImageUrl = (attachment: PresentableAttachment) =>
  attachment.imageUrl || attachment.stats?.imagePath || null;

export const isApexAttachment = (attachment: Pick<PresentableAttachment, "type">) =>
  attachment.type?.trim().toLowerCase() === "apex";
