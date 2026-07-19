(function () {
  const params = new URLSearchParams(location.search);
  const projectId = String(params.get("project") || params.get("projectId") || "").trim();

  const card = document.getElementById("cc-card");
  const errorEl = document.getElementById("cc-error");
  const hqSection = document.getElementById("cc-hq-section");
  const nameEl = document.getElementById("cc-name");
  const roleEl = document.getElementById("cc-role");
  const avatarEl = document.getElementById("cc-avatar");
  const linksEl = document.getElementById("cc-links");
  const saveBtn = document.getElementById("cc-save-contact");
  const shareBtn = document.getElementById("cc-share-contact");

  let contact = null;

  function workerBase() {
    const cloud = String(window.SITE_CONFIG?.workerUrl || "").replace(/\/$/, "");
    if (typeof window.resolveWorkerUrl === "function") {
      const resolved = String(window.resolveWorkerUrl() || "").replace(/\/$/, "");
      if (resolved) return resolved;
    }
    return cloud || "https://trymoonrise.com";
  }

  function showError(message) {
    if (errorEl) {
      errorEl.hidden = false;
      errorEl.textContent = message;
    }
  }

  function initials(name) {
    const parts = String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) return "CR";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function buildVCard(data) {
    return [
      "BEGIN:VCARD",
      "VERSION:3.0",
      "FN:" + String(data.name || "Creator"),
      "TITLE:" + String(data.subtitle || "Website creator"),
      data.phone ? "TEL;TYPE=CELL,VOICE:" + data.phone : "",
      data.email ? "EMAIL;TYPE=INTERNET:" + data.email : "",
      "NOTE:Moonrise website creator",
      "END:VCARD",
    ]
      .filter(Boolean)
      .join("\r\n");
  }

  function renderLinks(data) {
    if (!linksEl) return;
    linksEl.innerHTML = "";
    if (data.phone) {
      const li = document.createElement("li");
      li.innerHTML =
        '<a class="ms-help-vcard-link" href="tel:' +
        encodeURIComponent(data.phone.replace(/\s/g, "")) +
        '"><span class="ms-help-vcard-icon ms-help-vcard-icon--phone" aria-hidden="true"><img src="doc/iMessages.jpg" alt="" width="46" height="46"></span><span class="ms-help-vcard-link-text"><strong>Number</strong><em>' +
        (data.phoneDisplay || data.phone) +
        "</em></span></a>";
      linksEl.appendChild(li);
    }
    if (data.email) {
      const li = document.createElement("li");
      li.innerHTML =
        '<a class="ms-help-vcard-link" href="mailto:' +
        encodeURIComponent(data.email) +
        '"><span class="ms-help-vcard-icon ms-help-vcard-icon--email" aria-hidden="true"><img src="doc/Gmail.jpg" alt="" width="46" height="46"></span><span class="ms-help-vcard-link-text"><strong>Email</strong><em>' +
        data.email +
        "</em></span></a>";
      linksEl.appendChild(li);
    }
  }

  function render(data) {
    contact = data;
    if (nameEl) nameEl.textContent = data.name || "Creator";
    if (roleEl) roleEl.textContent = data.subtitle || "Website creator · site changes & updates";
    if (avatarEl) {
      avatarEl.textContent = initials(data.name);
      avatarEl.style.display = "grid";
      avatarEl.style.placeItems = "center";
      avatarEl.style.fontSize = "1.35rem";
      avatarEl.style.fontWeight = "700";
      avatarEl.style.color = "#2563eb";
      avatarEl.style.background = "#eff6ff";
    }
    renderLinks(data);
    if (card) card.hidden = false;
    if (hqSection) hqSection.hidden = false;
    document.title = (data.name || "Creator") + " · Moonrise";
  }

  saveBtn?.addEventListener("click", () => {
    if (!contact) return;
    const blob = new Blob([buildVCard(contact)], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (String(contact.name || "creator").replace(/[^\w\-]+/g, "-") || "creator") + ".vcf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    window.StudioToast?.success?.("Contact saved");
  });

  shareBtn?.addEventListener("click", async () => {
    if (!contact) return;
    const shareData = {
      title: contact.name || "Creator",
      text:
        (contact.name || "Creator") +
        "\n" +
        (contact.phoneDisplay || contact.phone || "") +
        "\n" +
        (contact.email || ""),
      url: location.href.split("#")[0],
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch (e) {
      if (e?.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(
        shareData.title + "\n" + shareData.text + "\n" + shareData.url
      );
      window.StudioToast?.success?.("Contact copied");
    } catch (_) {
      saveBtn?.click();
    }
  });

  async function start() {
    if (!projectId) {
      showError("Missing project link. Open this page from the website watermark.");
      return;
    }
    try {
      const res = await fetch(
        workerBase() + "/public-creator-contact?projectId=" + encodeURIComponent(projectId)
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not load creator contact");
      if (!data.creator) throw new Error("Creator contact is not available for this site");
      render(data.creator);
    } catch (e) {
      showError(e.message || "Could not load creator contact");
    }
  }

  start();
})();
