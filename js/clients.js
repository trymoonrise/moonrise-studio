/**
 * My clients — owner-managed contact registry.
 */
(function () {
  const QUERY_MS = 10000;
  const LOCAL_KEY = "ms_owner_clients_v1";
  const CLIENT_SELECT =
    "id, business_name, contact_name, phone, website, notes, price, preference, rep, source, created_at, updated_at";
  const PRICE_OPTIONS = ["$500", "$700", "$1,000", "$1,500"];
  const SOURCE_LABELS = {
    "confirmed-sale": "Confirmed sale",
    "pending-sale": "Pending sale",
    dismissed: "Dismissed",
    "lead-finder": "Business Finder",
    pending: "Pending",
    building: "Building",
    completed: "Completed",
    "quick-save": "Quick Save",
    "not-interested": "Unsuccessful",
    removed: "Removed",
    other: "Other",
  };
  const EXPORT_COLUMNS = [
    ["business_name", "Business"],
    ["contact_name", "Contact"],
    ["phone", "Phone"],
    ["website", "Website"],
    ["price", "Price"],
    ["preference", "Preference"],
    ["rep", "Rep"],
    ["status", "Status"],
    ["notes", "Notes"],
  ];

  let clients = [];
  let searchQuery = "";
  let editingId = null;
  let deleteTargetId = null;
  let deleteBusy = false;
  let started = false;

  const $ = (id) => document.getElementById(id);
  const esc = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const normHandle = (raw) => String(raw || "").replace(/^@/, "").trim().toLowerCase();
  const getSb = () => window.SiteSupabase?.getClient?.() || null;
  const withTimeout = (p, ms, label) =>
    Promise.race([
      p,
      new Promise((_, reject) => setTimeout(() => reject(new Error((label || "Request") + " timed out")), ms)),
    ]);
  const telHref = (raw) => {
    const d = String(raw || "").replace(/\D/g, "");
    return d.length < 7 ? "" : "tel:+" + (d.length === 10 ? "1" + d : d);
  };
  const siteUrl = (raw) => {
    const t = String(raw || "").trim();
    return !t ? "" : /^https?:\/\//i.test(t) ? t : "https://" + t.replace(/^\/+/, "");
  };
  const siteDisplay = (raw) =>
    String(raw || "")
      .trim()
      .replace(/^https?:\/\//i, "")
      .replace(/\/+$/, "");
  const sourceLabel = (v) => {
    const k = String(v || "").trim().toLowerCase();
    return SOURCE_LABELS[k] || (k ? k.replace(/-/g, " ") : "");
  };
  const normPrice = (raw) => {
    const t = String(raw || "").trim();
    if (!t) return "";
    const m = { 500: "$500", 700: "$700", 1000: "$1,000", 1500: "$1,500" };
    return m[t.replace(/\D/g, "")] || (PRICE_OPTIONS.includes(t) ? t : t);
  };
  const normPref = (raw) => {
    const t = String(raw || "").trim();
    const k = t.toLowerCase();
    if (k === "direct link" || k === "dl") return "Direct Link";
    if (k === "booking" || k === "bk") return "Booking";
    return t === "Direct Link" || t === "Booking" ? t : "";
  };
  const emptyCell = () => '<span class="ms-clients-muted">—</span>';
  const textCell = (v) => (String(v || "").trim() ? esc(v) : emptyCell());
  const statusTone = (v) => {
    const k = String(v || "").trim().toLowerCase();
    if (k === "confirmed-sale" || k === "completed") return "ok";
    if (k === "pending-sale" || k === "pending" || k === "building" || k === "quick-save") return "warn";
    if (k === "dismissed" || k === "not-interested" || k === "removed") return "muted";
    return "neutral";
  };
  const statusBadge = (v) => {
    const label = sourceLabel(v);
    if (!label) return emptyCell();
    return (
      '<span class="ms-clients-badge ms-clients-badge--' +
      statusTone(v) +
      '">' +
      esc(label) +
      "</span>"
    );
  };

  async function ensureOwner() {
    if (window.StudioOwner?.gateOwnerPage) return window.StudioOwner.gateOwnerPage("dashboard.html");
    const allowed = (window.SITE_CONFIG?.ownerHandles || ["moonrise"]).map(normHandle);
    try {
      const profile = await window.StudioAuth?.getProfile?.();
      if (allowed.includes(normHandle(profile?.handle))) return true;
      const user = await window.StudioAuth?.getUser?.();
      if (allowed.includes(normHandle(user?.user_metadata?.handle))) return true;
    } catch (_) {}
    location.replace("dashboard.html");
    return false;
  }

  function setBanner(id, msg, isError) {
    const el = $(id);
    if (!el) return;
    el.hidden = true;
    el.textContent = "";
    el.classList.remove("is-error");
    if (!msg) return;
    if (isError) {
      window.StudioToast?.error?.(msg);
      return;
    }
    el.hidden = false;
    el.textContent = msg;
  }

  function loadLocal() {
    try {
      const parsed = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveLocal(rows) {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(rows));
    } catch (e) {
      console.warn("Clients: local save failed", e);
    }
  }

  function setSelectOptions(select, options) {
    if (!select) return;
    select.innerHTML =
      '<option value="">—</option>' +
      (options || []).map((v) => '<option value="' + esc(v) + '">' + esc(v) + "</option>").join("");
  }

  function ensureSelect(select, value) {
    if (!select) return;
    const v = String(value || "").trim();
    if (!v) {
      select.value = "";
      return;
    }
    if (!Array.from(select.options).some((o) => o.value === v)) {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = v;
      select.appendChild(o);
    }
    select.value = v;
  }

  function resetForm() {
    const form = $("ms-client-form");
    editingId = null;
    form?.reset();
    setSelectOptions(form?.price, PRICE_OPTIONS);
    $("ms-client-submit").textContent = "Add client";
    setBanner("ms-client-form-status", "");
  }

  function openDialog(id, mode) {
    const dialog = $(id);
    if (!dialog) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    if (id === "ms-client-form-dialog") {
      const title = $("ms-client-form-title");
      if (mode !== "edit") {
        resetForm();
        if (title) title.textContent = "Client details";
      } else {
        $("ms-client-submit").textContent = "Save changes";
        if (title) title.textContent = "Client details";
      }
      setBanner("ms-client-form-status", "");
      setTimeout(() => $("ms-client-form")?.business_name?.focus(), 0);
    }
  }

  function closeDialog(id) {
    const dialog = $(id);
    if (!dialog) return;
    if (id === "ms-client-form-dialog") resetForm();
    if (id === "ms-client-delete-dialog") {
      deleteTargetId = null;
      deleteBusy = false;
      $("ms-client-delete-error").hidden = true;
      $("ms-client-delete-submit")?.removeAttribute("disabled");
    }
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  function readForm() {
    const f = $("ms-client-form");
    if (!f) return null;
    const business = f.business_name?.value.trim() || "";
    if (!business) return null;
    return {
      business_name: business,
      contact_name: f.contact_name?.value.trim() || "",
      phone: f.phone?.value.trim() || "",
      website: siteDisplay(f.website?.value.trim() || ""),
      notes: f.notes?.value.trim() || "",
      price: f.price?.value.trim() || "",
      preference: normPref(f.preference?.value),
      rep: f.rep?.value.trim() || "",
      source: f.source?.value.trim() || "",
    };
  }

  function fillForm(row) {
    const f = $("ms-client-form");
    if (!f || !row) return;
    f.business_name.value = row.business_name || "";
    f.contact_name.value = row.contact_name || "";
    f.phone.value = row.phone || "";
    f.website.value = siteDisplay(row.website);
    f.notes.value = row.notes || "";
    f.rep.value = row.rep || "";
    ensureSelect(f.price, normPrice(row.price));
    ensureSelect(f.preference, normPref(row.preference));
    ensureSelect(f.source, row.source || "");
  }

  function filteredRows() {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return clients.slice();
    return clients.filter((r) =>
      [r.business_name, r.contact_name, r.phone, r.website, r.notes, r.price, r.preference, r.rep, sourceLabel(r.source)]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }

  function renderClients() {
    const body = $("ms-clients-body");
    const empty = $("ms-clients-empty");
    const countEl = $("ms-clients-count");
    if (!body || !empty) return;

    const rows = filteredRows();
    if (countEl) countEl.textContent = clients.length === 1 ? "1 client" : clients.length ? clients.length + " clients" : "";

    if (!rows.length) {
      body.innerHTML = "";
      const searching = !!searchQuery.trim();
      empty.querySelector(".ms-clients-empty-title").textContent = searching ? "No matches" : "No clients yet";
      empty.querySelector(".ms-clients-empty-desc").textContent = searching
        ? "Try another name, phone, or domain."
        : "Save contact and sale details for businesses you close.";
      empty.hidden = false;
      return;
    }

    empty.hidden = true;
    body.innerHTML = rows
      .map((row) => {
        const id = esc(row.id);
        const phone = String(row.phone || "").trim();
        const tel = telHref(phone);
        const phoneCell = phone ? (tel ? '<a class="ms-clients-link" href="' + esc(tel) + '">' + esc(phone) + "</a>" : esc(phone)) : emptyCell();
        const web = String(row.website || "").trim();
        const webDisp = siteDisplay(web);
        const webUrl = siteUrl(web);
        const webCell = webDisp
          ? webUrl
            ? '<a class="ms-clients-link" href="' + esc(webUrl) + '" target="_blank" rel="noopener noreferrer">' + esc(webDisp) + "</a>"
            : esc(webDisp)
          : emptyCell();
        const notes = String(row.notes || "").trim();
        return (
          '<tr data-client-id="' +
          id +
          '"><th scope="row" class="ms-clients-business">' +
          esc(row.business_name || "—") +
          "</th><td>" +
          textCell(row.contact_name) +
          "</td><td>" +
          phoneCell +
          '</td><td class="ms-clients-website-cell">' +
          webCell +
          '</td><td class="ms-clients-price">' +
          textCell(row.price) +
          "</td><td>" +
          textCell(normPref(row.preference)) +
          "</td><td>" +
          textCell(row.rep) +
          "</td><td>" +
          statusBadge(row.source) +
          '</td><td class="ms-clients-notes-cell">' +
          (notes ? '<span class="ms-clients-notes" title="' + esc(notes) + '">' + esc(notes) + "</span>" : emptyCell()) +
          '</td><td class="ms-clients-actions-cell"><div class="ms-clients-row-actions">' +
          '<button type="button" class="ms-clients-row-btn" data-edit="' +
          id +
          '">Edit</button><button type="button" class="ms-clients-row-btn ms-clients-row-btn--danger" data-delete="' +
          id +
          '">Delete</button></div></td></tr>'
        );
      })
      .join("");
  }

  async function loadClients() {
    setBanner("ms-clients-status", "");
    const sb = getSb();
    if (!sb) {
      clients = loadLocal();
      renderClients();
      setBanner("ms-clients-status", "Saved on this device only · connect Supabase to sync across devices.");
      return;
    }
    try {
      let { data, error } = await withTimeout(
        sb.from("owner_clients").select(CLIENT_SELECT).order("business_name", { ascending: true }),
        QUERY_MS,
        "Loading clients"
      );
      if (error && /price|preference|rep|source|column.*does not exist/i.test(String(error.message || error))) {
        ({ data, error } = await withTimeout(
          sb.from("owner_clients").select("id, business_name, contact_name, phone, website, notes, created_at, updated_at").order("business_name", { ascending: true }),
          QUERY_MS,
          "Loading clients"
        ));
        if (!error && Array.isArray(data)) {
          data = data.map((r) => ({ ...r, price: "", preference: "", rep: "", source: "" }));
          setBanner("ms-clients-status", "Run supabase-owner-clients.sql to sync Price, Preference, Rep, and Status fields.");
        }
      }
      if (error) throw error;
      clients = Array.isArray(data) ? data : [];
      saveLocal(clients);
      renderClients();
    } catch (e) {
      clients = loadLocal();
      renderClients();
      setBanner("ms-clients-status", e?.message || "Could not load clients from Supabase.", true);
    }
  }

  async function persistClient(payload, id) {
    const sb = getSb();
    const now = new Date().toISOString();
    if (!sb) {
      const local = loadLocal();
      if (id) {
        const idx = local.findIndex((r) => String(r.id) === String(id));
        if (idx === -1) throw new Error("Client not found.");
        local[idx] = { ...local[idx], ...payload, updated_at: now };
      } else {
        local.push({ id: "local-" + Date.now(), ...payload, created_at: now, updated_at: now });
      }
      saveLocal(local);
      clients = local;
      return;
    }
    if (id) {
      const { data, error } = await sb.from("owner_clients").update({ ...payload, updated_at: now }).eq("id", id).select(CLIENT_SELECT).maybeSingle();
      if (error) throw error;
      const idx = clients.findIndex((r) => String(r.id) === String(id));
      if (idx !== -1 && data) clients[idx] = data;
      else await loadClients();
      saveLocal(clients);
      return;
    }
    const { error } = await sb.from("owner_clients").insert({ ...payload, updated_at: now });
    if (error) throw error;
    await loadClients();
  }

  async function removeClient(id) {
    const sb = getSb();
    if (!sb) {
      clients = loadLocal().filter((r) => String(r.id) !== String(id));
      saveLocal(clients);
      return;
    }
    const { error } = await sb.from("owner_clients").delete().eq("id", id);
    if (error) throw error;
    clients = clients.filter((r) => String(r.id) !== String(id));
    saveLocal(clients);
  }

  function exportRow(row) {
    return {
      business_name: String(row.business_name || "").trim(),
      contact_name: String(row.contact_name || "").trim(),
      phone: String(row.phone || "").trim(),
      website: siteDisplay(row.website),
      price: String(row.price || "").trim(),
      preference: String(row.preference || "").trim(),
      rep: String(row.rep || "").trim(),
      status: sourceLabel(row.source),
      notes: String(row.notes || "").trim(),
    };
  }

  function downloadExport(format) {
    const rows = clients
      .slice()
      .sort((a, b) => String(a.business_name || "").localeCompare(String(b.business_name || ""), undefined, { sensitivity: "base" }))
      .map(exportRow);
    if (!rows.length) return setBanner("ms-clients-status", "No saved clients to download.", true);

    const stamp = new Date().toISOString().slice(0, 10);
    const csvQ = (v) => {
      const t = String(v ?? "");
      return /[",\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
    };
    let filename = "my-clients-" + stamp;
    let content = "";
    let mime = "text/plain;charset=utf-8";

    if (format === "csv") {
      filename += ".csv";
      mime = "text/csv;charset=utf-8";
      content =
        EXPORT_COLUMNS.map((c) => csvQ(c[1])).join(",") +
        "\r\n" +
        rows.map((r) => EXPORT_COLUMNS.map((c) => csvQ(r[c[0]])).join(",")).join("\r\n");
    } else if (format === "txt") {
      filename += ".txt";
      content =
        "Saved clients — exported " +
        stamp +
        "\r\n\r\n" +
        rows
          .map((r, i) => {
            const lines = EXPORT_COLUMNS.map((c) => c[1] + ": " + (r[c[0]] || "—"));
            return i + 1 + ". " + (r.business_name || "Client") + "\r\n   " + lines.join("\r\n   ");
          })
          .join("\r\n\r\n");
    } else {
      filename += ".md";
      mime = "text/markdown;charset=utf-8";
      content =
        "# Saved clients\n\nExported " +
        stamp +
        " · " +
        rows.length +
        " client" +
        (rows.length === 1 ? "" : "s") +
        "\n\n| " +
        EXPORT_COLUMNS.map((c) => c[1]).join(" | ") +
        " |\n| " +
        EXPORT_COLUMNS.map(() => "---").join(" | ") +
        " |\n" +
        rows.map((r) => "| " + EXPORT_COLUMNS.map((c) => String(r[c[0]] || "—").replace(/\|/g, "\\|")).join(" | ") + " |").join("\n") +
        "\n";
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setBanner("ms-clients-status", "Downloaded " + filename);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = readForm();
    if (!payload) return setBanner("ms-client-form-status", "Business name is required.", true);
    const submit = $("ms-client-submit");
    submit?.setAttribute("disabled", "");
    setBanner("ms-client-form-status", "");
    try {
      const wasEdit = !!editingId;
      await persistClient(payload, editingId);
      closeDialog("ms-client-form-dialog");
      renderClients();
      setBanner("ms-clients-status", wasEdit ? "Client updated." : "Client added.");
    } catch (err) {
      setBanner("ms-client-form-status", err?.message || "Could not save client.", true);
    } finally {
      submit?.removeAttribute("disabled");
    }
  }

  async function submitDelete() {
    const id = deleteTargetId;
    if (!id || deleteBusy) return;
    deleteBusy = true;
    const submit = $("ms-client-delete-submit");
    submit?.setAttribute("disabled", "");
    $("ms-client-delete-error").hidden = true;
    setBanner("ms-clients-status", "");
    try {
      await removeClient(id);
      closeDialog("ms-client-delete-dialog");
      if (editingId && String(editingId) === String(id)) closeDialog("ms-client-form-dialog");
      renderClients();
      setBanner("ms-clients-status", "Client deleted.");
    } catch (err) {
      deleteBusy = false;
      submit?.removeAttribute("disabled");
      setBanner("ms-client-delete-error", err?.message || "Could not delete client.", true);
    }
  }

  function bindEvents() {
    $("ms-client-form")?.addEventListener("submit", handleSubmit);
    $("ms-clients-add")?.addEventListener("click", () => openDialog("ms-client-form-dialog", "add"));
    $("ms-client-cancel")?.addEventListener("click", () => closeDialog("ms-client-form-dialog"));
    $("ms-client-delete-cancel")?.addEventListener("click", () => closeDialog("ms-client-delete-dialog"));
    $("ms-client-delete-submit")?.addEventListener("click", submitDelete);
    $("ms-clients-download-csv")?.addEventListener("click", () => downloadExport("csv"));
    $("ms-clients-download-txt")?.addEventListener("click", () => downloadExport("txt"));
    $("ms-clients-download-md")?.addEventListener("click", () => downloadExport("md"));

    const search = $("ms-clients-search");
    const clear = $("ms-clients-search-clear");
    search?.addEventListener("input", () => {
      searchQuery = search.value || "";
      if (clear) clear.hidden = !searchQuery.trim();
      renderClients();
    });
    clear?.addEventListener("click", () => {
      searchQuery = "";
      search.value = "";
      clear.hidden = true;
      renderClients();
      search.focus();
    });

    $("ms-clients-body")?.addEventListener("click", (e) => {
      const editBtn = e.target.closest("[data-edit]");
      if (editBtn) {
        const row = clients.find((r) => String(r.id) === String(editBtn.getAttribute("data-edit")));
        if (!row) return;
        editingId = row.id;
        fillForm(row);
        openDialog("ms-client-form-dialog", "edit");
        return;
      }
      const delBtn = e.target.closest("[data-delete]");
      if (!delBtn) return;
      const row = clients.find((r) => String(r.id) === String(delBtn.getAttribute("data-delete")));
      if (!row) return;
      deleteTargetId = row.id;
      $("ms-client-delete-message").textContent =
        'Remove "' + (row.business_name || "this client") + '" from your client list? This cannot be undone.';
      openDialog("ms-client-delete-dialog");
    });

    ["ms-client-form-dialog", "ms-client-delete-dialog"].forEach((id) => {
      const dialog = $(id);
      dialog?.addEventListener("click", (e) => {
        if (e.target === dialog) closeDialog(id);
      });
      dialog?.addEventListener("cancel", (e) => {
        e.preventDefault();
        closeDialog(id);
      });
    });
  }

  async function init() {
    if (started) return;
    started = true;
    if (!(await ensureOwner())) return;
    setSelectOptions($("ms-client-form")?.price, PRICE_OPTIONS);
    bindEvents();
    await loadClients();
  }

  function start() {
    init().catch((e) => console.warn(e));
  }

  if (document.body.dataset.page !== "clients") return;
  if (document.body.dataset.msAuthFired === "1") start();
  else document.addEventListener("ms:auth-ready", start, { once: true });
  setTimeout(() => {
    if (!started) start();
  }, 2500);
})();
