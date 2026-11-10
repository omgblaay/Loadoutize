(() => {
  const PANEL_ID = "loadoutize-youtube-panel";
  let activeVideoId = null;
  let requestNumber = 0;
  let result = null;
  let lookupError = false;
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
    if (!title || !activeVideoId || result === null) {
      removePanel();
      return;
    }

    let panel = document.getElementById(PANEL_ID);
    if (panel?.previousElementSibling === title) return;
    removePanel();
    panel = document.createElement("section");
    panel.id = PANEL_ID;
    panel.setAttribute("aria-label", "Loadoutize for this video");

    const heading = document.createElement("div");
    heading.className = "loadoutize-heading";
    const brand = document.createElement("img");
    brand.className = "loadoutize-logo";
    brand.src = chrome.runtime.getURL("logo.svg");
    brand.alt = "Loadoutize";
    const count = document.createElement("span");
    count.textContent = lookupError
      ? "LOOKUP UNAVAILABLE"
      : result.length
        ? `${result.length} LOADOUT${result.length === 1 ? "" : "S"} FOUND`
        : "NO LOADOUT YET";
    heading.append(brand, count);
    panel.append(heading);

    if (!result.length) {
      const empty = document.createElement("div");
      empty.className = "loadoutize-empty";
      const copy = document.createElement("div");
      copy.className = "loadoutize-empty-copy";
      const message = document.createElement("p");
      message.className = "loadoutize-empty-title";
      message.textContent = lookupError
        ? "Couldn't check for this video's loadout."
        : "This video's loadout isn't on Loadoutize yet.";
      copy.append(message);
      if (lookupError) {
        const detail = document.createElement("p");
        detail.className = "loadoutize-empty-detail";
        detail.textContent = "Please try again in a moment.";
        copy.append(detail);
      }
      empty.append(copy);
      if (!lookupError) {
        const create = document.createElement("a");
        create.className = "loadoutize-create";
        create.href = "https://loadoutize.com/create";
        create.target = "_blank";
        create.rel = "noopener noreferrer";
        create.textContent = "Create now";
        empty.append(create);
      }
      panel.append(empty);
      title.insertAdjacentElement("afterend", panel);
      return;
    }

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
      lookupError = false;
      removePanel();
      const request = ++requestNumber;
      if (videoId) {
        chrome.runtime.sendMessage({ type: "LOADOUTIZE_LOOKUP", videoId })
          .then((response) => {
            if (request !== requestNumber || currentVideoId() !== videoId) return;
            lookupError = Boolean(response?.error) || !Array.isArray(response?.loadouts);
            if (lookupError) console.warn("Loadoutize lookup:", response?.error ?? "Invalid lookup response");
            result = lookupError ? [] : response.loadouts;
            render();
          })
          .catch((error) => {
            if (request !== requestNumber || currentVideoId() !== videoId) return;
            console.warn("Loadoutize lookup:", error);
            lookupError = true;
            result = [];
            render();
          });
      }
    } else if (result !== null) {
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
