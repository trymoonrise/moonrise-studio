/**
 * MVP+ profile cosmetics — name color and avatar hat.
 */
(function (global) {
  const HAT_OPTIONS = [
    { id: "none", label: "None", glyph: "" },
    { id: "crown", label: "Crown", glyph: "👑" },
    { id: "cap", label: "Cap", glyph: "🧢" },
    { id: "top", label: "Top hat", glyph: "🎩" },
    { id: "cowboy", label: "Cowboy", glyph: "🤠" },
    { id: "moon", label: "Moon", glyph: "🌙" },
    { id: "sparkle", label: "Sparkle", glyph: "✨" },
  ];

  function normalizeBranding(raw) {
    const b =
      raw && typeof raw === "object" && !Array.isArray(raw) ? { ...raw } : {};
    const nameColor = String(b.name_color || b.nameColor || "").trim();
    const profileHat = String(b.profile_hat || b.profileHat || "none").trim() || "none";
    return {
      name_color: /^#[0-9a-fA-F]{6}$/.test(nameColor) ? nameColor : "",
      profile_hat: HAT_OPTIONS.some((h) => h.id === profileHat) ? profileHat : "none",
    };
  }

  function hatMeta(id) {
    return HAT_OPTIONS.find((h) => h.id === id) || HAT_OPTIONS[0];
  }

  function applyHat(wrap, hatId, hatElId) {
    if (!wrap) return;
    const id = hatElId || "ms-user-hat";
    const meta = hatMeta(hatId);
    let hatEl = wrap.querySelector("#" + id);
    if (!meta.glyph) {
      if (hatEl) hatEl.remove();
      return;
    }
    if (!hatEl) {
      hatEl = document.createElement("span");
      hatEl.id = id;
      hatEl.className = "ms-user-hat";
      hatEl.setAttribute("aria-hidden", "true");
      wrap.appendChild(hatEl);
    }
    hatEl.textContent = meta.glyph;
    hatEl.dataset.hat = meta.id;
  }

  function applyProfileCosmetics(branding, targets) {
    const b = normalizeBranding(branding);
    const nameEl = targets?.nameEl || document.getElementById("ms-user-name");
    const avatarWrap =
      targets?.avatarWrap || document.querySelector(".ms-user-avatar-wrap");

    if (nameEl) {
      nameEl.style.color = b.name_color || "";
    }
    applyHat(avatarWrap, b.profile_hat, targets?.hatElId || "ms-user-hat");
    return b;
  }

  function renderHatPicker(container, selectedId, onSelect) {
    if (!container) return;
    const selected = hatMeta(selectedId).id;
    container.innerHTML = "";
    HAT_OPTIONS.forEach((hat) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ms-mvp-hat-btn";
      btn.dataset.hat = hat.id;
      btn.setAttribute("aria-pressed", String(hat.id === selected));
      btn.title = hat.label;
      btn.innerHTML =
        '<span class="ms-mvp-hat-glyph" aria-hidden="true">' +
        (hat.glyph || "-") +
        '</span><span class="ms-mvp-hat-label">' +
        hat.label +
        "</span>";
      btn.addEventListener("click", () => {
        container.querySelectorAll(".ms-mvp-hat-btn").forEach((el) => {
          el.setAttribute("aria-pressed", String(el === btn));
        });
        onSelect?.(hat.id);
      });
      container.appendChild(btn);
    });
  }

  global.MoonriseMvpCosmetics = {
    HAT_OPTIONS,
    normalizeBranding,
    hatMeta,
    applyProfileCosmetics,
    renderHatPicker,
  };
})(window);
