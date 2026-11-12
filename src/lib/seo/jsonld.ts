import type { LoadoutVideo } from "@/lib/video";

export const SITE_URL = "https://loadoutize.com";

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbJsonLd(crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${SITE_URL}${crumb.path}`,
    })),
  };
}

// Only YouTube videos get VideoObject markup. TikTok and Instagram embeds
// don't provide the thumbnail and upload metadata Google requires.
export function videoJsonLd(
  video: LoadoutVideo,
  details: { name: string; description: string; uploadDate: string; url: string },
) {
  if (video.platform !== "youtube" || !video.thumbnailUrl || !details.uploadDate) return null;
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.title || details.name,
    description: details.description,
    thumbnailUrl: video.thumbnailUrl,
    uploadDate: details.uploadDate,
    contentUrl: video.url,
    url: `${SITE_URL}${details.url}`,
  };
}
