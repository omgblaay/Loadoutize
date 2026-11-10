(() => {
  const PANEL_ID = "loadoutize-youtube-panel";
  let activeVideoId = null;
  let requestNumber = 0;
  let result = null;
  let scheduled = false;

  function currentVideoId() {
    if (location.pathname !== "/watch") return null;
    const id = new URLSearchParams(location.search).get("v");
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  }

  function removePanel() {
    document.getElementById(PANEL_ID)?.remove();
  }

  function render() {
    const title = document.querySelector("ytd-watch-metadata #title");
    if (!title || !result?.length) {
      removePanel();
      return;
    }

    let panel = document.getElementById(PANEL_ID);
    if (panel?.previousElementSibling === title) return;
    removePanel();
    panel = document.createElement("section");
    panel.id = PANEL_ID;
    panel.setAttribute("aria-label", "Loadoutize weapon configs for this video");

    const heading = document.createElement("div");
    heading.className = "loadoutize-heading";
    const brand = document.createElement("strong");
    brand.textContent = "LOADOUTIZE";
    const count = document.createElement("span");
    count.textContent = `${result.length} weapon config${result.length === 1 ? "" : "s"} from this video`;
    heading.append(brand, count);
    panel.append(heading);

    const list = document.createElement("div");
    list.className = "loadoutize-list";
    for (const loadout of result) {
      if (typeof loadout?.id !== "string" || typeof loadout?.name !== "string") continue;
      const link = document.createElement("a");
      link.className = "loadoutize-link";
      link.href = `https://loadoutize.com/cfg/${encodeURIComponent(loadout.id)}`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      const text = document.createElement("span");
      text.className = "loadoutize-link-text";
      const name = document.createElement("strong");
      name.textContent = loadout.name;
      text.append(name);
      if (typeof loadout.userName === "string" && loadout.userName) {
        const author = document.createElement("small");
        author.textContent = `by ${loadout.userName}`;
        text.append(author);
      }
      const arrow = document.createElement("span");
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "↗";
      link.append(text, arrow);
      list.append(link);
    }
    panel.append(list);
    title.insertAdjacentElement("afterend", panel);
  }

  function update() {
    const videoId = currentVideoId();
    if (videoId !== activeVideoId) {
      activeVideoId = videoId;
      result = null;
      removePanel();
      const request = ++requestNumber;
      if (videoId) {
        chrome.runtime.sendMessage({ type: "LOADOUTIZE_LOOKUP", videoId })
          .then((response) => {
            if (request !== requestNumber || currentVideoId() !== videoId) return;
            if (response?.error) console.warn("Loadoutize lookup:", response.error);
            result = response?.loadouts ?? [];
            render();
          })
          .catch((error) => console.warn("Loadoutize lookup:", error));
      }
    } else if (result?.length) {
      render();
    }
  }

  function scheduleUpdate() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      update();
    }, 100);
  }

  document.addEventListener("yt-navigate-finish", scheduleUpdate);
  window.addEventListener("popstate", scheduleUpdate);
  new MutationObserver(scheduleUpdate).observe(document.documentElement, { childList: true, subtree: true });
  update();
})();
