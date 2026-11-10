# Loadoutize for YouTube

Shows public Loadoutize weapon configs linked to the current YouTube video, directly below the video title. If there is no match, it adds nothing to the page.

## Install locally

1. Open `chrome://extensions` in Chrome, Edge, Brave, or another Chromium browser.
2. Turn on **Developer mode**, choose **Load unpacked**, and select this directory.
3. Open or refresh a YouTube watch page with a video linked from a public Loadoutize weapon config.

The extension uses the existing public MW4 loadout list until the updated `make-server-6db475c7` function is deployed. Once deployed, it uses the narrower `/youtube/loadouts` lookup automatically.

The extension only runs on YouTube pages and only requests the Loadoutize Supabase host. It sends the 11-character YouTube video ID to the public lookup endpoint. It does not access YouTube account data.
