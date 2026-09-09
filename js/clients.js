/**
 * My clients - paid go-live businesses + manual entries.
 * Creators see their own clients. @moonrise sees all accumulated clients.
 * Remove hides project-linked rows from this view (site stays live).
 */
(function () {
  const QUERY_MS = 10000;
  const CLIENTS_CACHE_KEY = "ms_clients_cache_v3";
  const PROJECT_SELECT =
    "id, user_id, business_name, status, watermark_enabled, price_cents, vercel_url, business_context, updated_at, created_at";

  let clients = [];
  let searchQuery = "";
  let started = false;
  let isOwnerView = false;
  let removeTarget = null;

  const $ = (id) => document.getElementById(id);
  const esc = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const getSb = () => window.SiteSupabase?.getClient?.() || null;
  const withTimeout = (p, ms, label) =>
    Promise.race([
      p,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error((label || "Request") + " timed out")), ms)
      ),
    ]);

  const telHref = (raw) => {
    const d = String(raw || "").replace(/\D/g, "");
    return d.length < 7 ? "" : "tel:+" + (d.length === 10 ? "1" + d : d);
  };

  const siteDisplay = (raw) =>
    String(raw || "")
      .trim()
      .replace(/^https?:\/\//i, "")
      .replace(/\/+$/, "");

  const siteUrl = (raw) => {
    const t = String(raw || "").trim();
    return !t ? "" : /^https?:\/\//i.test(t) ? t : "https://" + t.replace(/^\/+/, "");
  };

  const emptyCell = () => '<span class="ms-clients-muted">-</span>';

  function formatMoney(cents) {
    const n = Number(cents);
    if (!Number.isFinite(n) || n < 0) return "";
    return "$" + (n / 100).toLocaleString("en-US", { maximumFractionDigits: 0 });
  }

  function parseMoneyToCents(raw) {
    const t = String(raw || "")
      .trim()
      .replace(/[$,\s]/g, "");
    if (!t) return null;
    const n = Number(t);
    if (!Number.isFinite(n) || n < 0) return NaN;
    return Math.round(n * 100);
  }

  function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function isPaidProjectRow(project) {
    if (!project) return false;
    if (project.watermark_enabled === false) return true;
    return String(project.status || "").toLowerCase() === "paid";
  }

  function statusLabel(row) {
    if (row.source === "manual") return "Manual";
    if (!row.has_paid) return "Unpaid";
    if (row.watermark_enabled === false) {
      return row.vercel_url ? "Live" : "Paid";
    }
    return row.vercel_url ? "Processing" : "Paid";
  }

  function statusTone(row) {
    if (row.source === "manual") return "neutral";
    if (!row.has_paid) return "warn";
    if (row.watermark_enabled === false) return "ok";
    return "warn";
  }

  function statusBadge(row) {
    const label = statusLabel(row);
    return (
      '<span class="ms-clients-badge ms-clients-badge--' +
      statusTone(row) +
      '">' +
      esc(label) +
      "</span>"
    );
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

  function phoneFromProject(project) {
    const ctx = project?.business_context;
    if (!ctx || typeof ctx !== "object") return "";
    return String(ctx.phone || ctx.businessPhone || "").trim();
  }

  function mapProject(project, payment, creatorHandle) {
    if (!project) return null;
    const amountFromPay = Number(payment?.amount_cents);
    const amountFromProject = Number(project.price_cents);
    const priceCents =
      Number.isFinite(amountFromPay) && amountFromPay > 0
        ? amountFromPay
        : Number.isFinite(amountFromProject) && amountFromProject >= 0
          ? amountFromProject
          : null;
    return {
      id: project.id,
      list_key: "project:" + project.id,
      source: "project",
      project_id: project.id,
      manual_id: null,
      user_id: project.user_id || "",
      creator_handle: creatorHandle || "",
      business_name: project.business_name || "Untitled business",
      phone: phoneFromProject(project),
      website: project.vercel_url || "",
      price_cents: priceCents,
      paid_at: payment?.created_at || project.updated_at || project.created_at,
      status: project.status,
      watermark_enabled: project.watermark_enabled,
      vercel_url: project.vercel_url || "",
      has_paid: true,
    };
  }

  function mapManual(row, creatorHandle) {
    if (!row) return null;
    return {
      id: row.id,
      list_key: "manual:" + row.id,
      source: "manual",
      project_id: null,
      manual_id: row.id,
      user_id: row.user_id || "",
      creator_handle: creatorHandle || "",
      business_name: row.business_name || "Untitled business",
      phone: String(row.phone || "").trim(),
      website: String(row.website || "").trim(),
      price_cents: Number.isFinite(Number(row.price_cents)) ? Number(row.price_cents) : null,
      paid_at: row.paid_at || row.created_at || null,
      status: "manual",
      watermark_enabled: null,
      vercel_url: String(row.website || "").trim(),
      has_paid: true,
    };
  }

  function syncOwnerChrome() {
    const title = $("ms-clients-section-title");
    const creatorCol = $("ms-clients-creator-col");
    const search = $("ms-clients-search");
    if (title) title.textContent = isOwnerView ? "All clients" : "Paid clients";
    if (creatorCol) creatorCol.hidden = !isOwnerView;
    if (search) {
      search.placeholder = isOwnerView
        ? "Search by business, creator, or site…"
        : "Search by business or site…";
    }
    document.body.classList.toggle("ms-clients-owner", !!isOwnerView);
  }

  function filteredRows() {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return clients.slice();
    return clients.filter((r) =>
      [
        r.business_name,
        r.creator_handle,
        r.phone,
        siteDisplay(r.website),
        formatMoney(r.price_cents),
        statusLabel(r),
      ]
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
    if (countEl) {
      countEl.textContent =
        clients.length === 1 ? "1 client" : clients.length ? clients.length + " clients" : "";
    }

    if (!rows.length) {
      body.innerHTML = "";
      const searching = !!searchQuery.trim();
      empty.querySelector(".ms-clients-empty-title").textContent = searching
        ? "No matches"
        : "No clients yet";
      empty.querySelector(".ms-clients-empty-desc").textContent = searching
        ? "Try another business name or site."
        : isOwnerView
          ? "Paid go-live checkouts across Moonrise will show up here. You can also add a client manually."
          : "When a business pays to remove the watermark on a live site, they show up here. You can also add a client manually.";
      empty.hidden = false;
      return;
    }

    empty.hidden = true;
    body.innerHTML = rows
      .map((row) => {
        const key = esc(row.list_key);
        const phone = String(row.phone || "").trim();
        const tel = telHref(phone);
        const phoneCell = phone
          ? tel
            ? '<a class="ms-clients-link" href="' + esc(tel) + '">' + esc(phone) + "</a>"
            : esc(phone)
          : emptyCell();
        const web = String(row.website || "").trim();
        const webDisp = siteDisplay(web);
        const webHref = siteUrl(web);
        const webCell = webDisp
          ? webHref
            ? '<a class="ms-clients-link" href="' +
              esc(webHref) +
              '" target="_blank" rel="noopener noreferrer">' +
              esc(webDisp) +
              "</a>"
            : esc(webDisp)
          : emptyCell();
        const paid = formatMoney(row.price_cents);
        const creatorCell = isOwnerView
          ? "<td>" +
            (row.creator_handle
              ? '<span class="ms-clients-creator">@' + esc(row.creator_handle) + "</span>"
              : emptyCell()) +
            "</td>"
          : "";
        const openBtn =
          row.source === "project" && row.project_id
            ? '<a class="ms-clients-row-btn" href="editor.html?project_id=' +
              encodeURIComponent(row.project_id) +
              '">Open</a>'
            : "";
        return (
          '<tr data-client-key="' +
          key +
          '"><th scope="row" class="ms-clients-business">' +
          esc(row.business_name || "-") +
          "</th>" +
          creatorCell +
          "<td>" +
          phoneCell +
          '</td><td class="ms-clients-website-cell">' +
          webCell +
          '</td><td class="ms-clients-price">' +
          (paid ? esc(paid) : emptyCell()) +
          "</td><td>" +
          (formatDate(row.paid_at) ? esc(formatDate(row.paid_at)) : emptyCell()) +
          "</td><td>" +
          statusBadge(row) +
          '</td><td class="ms-clients-actions-cell"><div class="ms-clients-row-actions">' +
          openBtn +
          '<button type="button" class="ms-clients-row-btn ms-clients-row-btn--danger ms-clients-remove" data-client-key="' +
          key +
          '">Remove</button></div></td></tr>'
        );
      })
      .join("");
  }

  async function loadCreatorHandles(sb, userIds) {
    const ids = [...new Set((userIds || []).filter(Boolean))];
    if (!ids.length) return new Map();
    try {
      const { data, error } = await withTimeout(
        sb.from("profiles").select("id, handle, display_name").in("id", ids),
        QUERY_MS,
        "Loading creators"
      );
      if (error) throw error;
      const map = new Map();
      (Array.isArray(data) ? data : []).forEach((row) => {
        const handle = String(row.handle || row.display_name || "")
          .replace(/^@/, "")
          .trim();
        if (row.id) map.set(String(row.id), handle);
      });
      return map;
    } catch (e) {
      console.warn("loadCreatorHandles", e);
      return new Map();
    }
  }

  function writeClientsCache(userId) {
    try {
      sessionStorage.setItem(
        CLIENTS_CACHE_KEY,
        JSON.stringify({
          clients,
          userId: String(userId || ""),
          ownerView: !!isOwnerView,
          at: Date.now(),
        })
      );
    } catch (_) {
      /* ignore */
    }
  }

  function paintClientsFromCache(currentUserId) {
    try {
      const raw = sessionStorage.getItem(CLIENTS_CACHE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!Array.isArray(data.clients)) return false;
      const uid = String(currentUserId || "");
      if (uid && data.userId && data.userId !== uid) {
        sessionStorage.removeItem(CLIENTS_CACHE_KEY);
        return false;
      }
      clients = data.clients;
      isOwnerView = !!data.ownerView;
      syncOwnerChrome();
      renderClients();
      return true;
    } catch (_) {
      return false;
    }
  }

  async function loadClients() {
    setBanner("ms-clients-status", "");
    const sb = getSb();
    if (!sb) {
      clients = [];
      renderClients();
      setBanner("ms-clients-status", "Connect Supabase to load paid clients.", true);
      return;
    }

    try {
      const user = await window.StudioAuth?.getUser?.();
      if (!user?.id) throw new Error("Sign in to see your clients.");

      isOwnerView = !!(await window.StudioOwner?.isSiteOwner?.());
      syncOwnerChrome();

      let payQuery = sb
        .from("payments")
        .select("project_id, user_id, amount_cents, status, created_at")
        .eq("status", "paid")
        .not("project_id", "is", null)
        .order("created_at", { ascending: false });
      if (!isOwnerView) payQuery = payQuery.eq("user_id", user.id);

      const { data: payments, error: payError } = await withTimeout(
        payQuery,
        QUERY_MS,
        "Loading payments"
      );
      if (payError) throw payError;

      const paymentByProject = new Map();
      (Array.isArray(payments) ? payments : []).forEach((pay) => {
        const key = String(pay.project_id || "");
        if (!key || paymentByProject.has(key)) return;
        paymentByProject.set(key, pay);
      });

      let projectQuery = sb
        .from("projects")
        .select(PROJECT_SELECT)
        .or("watermark_enabled.eq.false,status.eq.paid")
        .order("updated_at", { ascending: false });
      if (!isOwnerView) projectQuery = projectQuery.eq("user_id", user.id);

      const { data: paidProjects, error: projectError } = await withTimeout(
        projectQuery,
        QUERY_MS,
        "Loading clients"
      );
      if (projectError) throw projectError;

      const projectsById = new Map();
      (Array.isArray(paidProjects) ? paidProjects : []).forEach((project) => {
        if (project?.id) projectsById.set(String(project.id), project);
      });

      const missingIds = [...paymentByProject.keys()].filter((id) => !projectsById.has(id));
      if (missingIds.length) {
        let extraQuery = sb.from("projects").select(PROJECT_SELECT).in("id", missingIds);
        if (!isOwnerView) extraQuery = extraQuery.eq("user_id", user.id);
        const { data: extraProjects, error: extraError } = await withTimeout(
          extraQuery,
          QUERY_MS,
          "Loading paid projects"
        );
        if (extraError) throw extraError;
        (Array.isArray(extraProjects) ? extraProjects : []).forEach((project) => {
          if (project?.id) projectsById.set(String(project.id), project);
        });
      }

      const [{ data: hides, error: hideError }, { data: manuals, error: manualError }] =
        await Promise.all([
          withTimeout(
            sb.from("client_hides").select("project_id").eq("user_id", user.id),
            QUERY_MS,
            "Loading hidden clients"
          ),
          withTimeout(
            isOwnerView
              ? sb
                  .from("manual_clients")
                  .select(
                    "id, user_id, business_name, phone, website, price_cents, paid_at, created_at"
                  )
                  .order("paid_at", { ascending: false, nullsFirst: false })
              : sb
                  .from("manual_clients")
                  .select(
                    "id, user_id, business_name, phone, website, price_cents, paid_at, created_at"
                  )
                  .eq("user_id", user.id)
                  .order("paid_at", { ascending: false, nullsFirst: false }),
            QUERY_MS,
            "Loading manual clients"
          ),
        ]);

      if (hideError) {
        if (/relation .*client_hides.* does not exist|Could not find the table/i.test(hideError.message || "")) {
          console.warn("client_hides missing", hideError);
        } else {
          throw hideError;
        }
      }
      if (manualError) {
        if (/relation .*manual_clients.* does not exist|Could not find the table/i.test(manualError.message || "")) {
          console.warn("manual_clients missing", manualError);
        } else {
          throw manualError;
        }
      }

      const hiddenIds = new Set(
        (Array.isArray(hides) ? hides : [])
          .map((h) => String(h.project_id || ""))
          .filter(Boolean)
      );

      const creatorMap = isOwnerView
        ? await loadCreatorHandles(sb, [
            ...[...projectsById.values()].map((p) => p.user_id),
            ...(Array.isArray(manuals) ? manuals : []).map((m) => m.user_id),
          ])
        : new Map();

      const projectRows = [...projectsById.values()]
        .filter((project) => isPaidProjectRow(project) || paymentByProject.has(String(project.id)))
        .filter((project) => !hiddenIds.has(String(project.id)))
        .map((project) =>
          mapProject(
            project,
            paymentByProject.get(String(project.id)),
            creatorMap.get(String(project.user_id || "")) || ""
          )
        )
        .filter(Boolean);

      const manualRows = (Array.isArray(manuals) ? manuals : [])
        .map((row) => mapManual(row, creatorMap.get(String(row.user_id || "")) || ""))
        .filter(Boolean);

      clients = [...projectRows, ...manualRows].sort((a, b) =>
        String(b.paid_at || "").localeCompare(String(a.paid_at || ""))
      );

      renderClients();
      writeClientsCache(user.id);
    } catch (e) {
      clients = [];
      renderClients();
      setBanner("ms-clients-status", e?.message || "Could not load clients.", true);
    }
  }

  function downloadCsv() {
    if (!clients.length) {
      setBanner("ms-clients-status", "No paid clients to download.", true);
      return;
    }
    const csvQ = (v) => {
      const t = String(v ?? "");
      return /[",\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
    };
    const cols = isOwnerView
      ? [
          ["business_name", "Business"],
          ["creator_handle", "Creator"],
          ["phone", "Phone"],
          ["website", "Live site"],
          ["paid", "Paid"],
          ["paid_at", "Date"],
          ["status", "Status"],
        ]
      : [
          ["business_name", "Business"],
          ["phone", "Phone"],
          ["website", "Live site"],
          ["paid", "Paid"],
          ["paid_at", "Date"],
          ["status", "Status"],
        ];
    const rows = clients.map((r) => ({
      business_name: r.business_name,
      creator_handle: r.creator_handle ? "@" + r.creator_handle : "",
      phone: r.phone,
      website: siteDisplay(r.website),
      paid: formatMoney(r.price_cents),
      paid_at: formatDate(r.paid_at),
      status: statusLabel(r),
    }));
    const stamp = new Date().toISOString().slice(0, 10);
    const content =
      cols.map((c) => csvQ(c[1])).join(",") +
      "\r\n" +
      rows.map((r) => cols.map((c) => csvQ(r[c[0]])).join(",")).join("\r\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (isOwnerView ? "all-clients-" : "my-clients-") + stamp + ".csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function openAddDialog() {
    const dialog = $("ms-clients-add-dialog");
    const form = $("ms-clients-add-form");
    const err = $("ms-clients-add-error");
    if (!dialog || !form) return;
    form.reset();
    if (err) {
      err.hidden = true;
      err.textContent = "";
    }
    const date = $("ms-clients-add-date");
    if (date && !date.value) {
      date.value = new Date().toISOString().slice(0, 10);
    }
    dialog.showModal();
    $("ms-clients-add-name")?.focus();
  }

  function closeAddDialog() {
    $("ms-clients-add-dialog")?.close();
  }

  async function submitAddClient(e) {
    e?.preventDefault?.();
    const sb = getSb();
    const err = $("ms-clients-add-error");
    const submit = $("ms-clients-add-submit");
    if (!sb) {
      if (err) {
        err.hidden = false;
        err.textContent = "Supabase is not connected.";
      }
      return;
    }

    const name = String($("ms-clients-add-name")?.value || "").trim();
    const phone = String($("ms-clients-add-phone")?.value || "").trim();
    const website = String($("ms-clients-add-website")?.value || "").trim();
    const paidRaw = String($("ms-clients-add-paid")?.value || "").trim();
    const dateRaw = String($("ms-clients-add-date")?.value || "").trim();
    const cents = parseMoneyToCents(paidRaw);

    if (!name) {
      if (err) {
        err.hidden = false;
        err.textContent = "Business name is required.";
      }
      $("ms-clients-add-name")?.focus();
      return;
    }
    if (Number.isNaN(cents)) {
      if (err) {
        err.hidden = false;
        err.textContent = "Enter a valid paid amount, or leave it blank.";
      }
      $("ms-clients-add-paid")?.focus();
      return;
    }

    const user = await window.StudioAuth?.getUser?.();
    if (!user?.id) {
      if (err) {
        err.hidden = false;
        err.textContent = "Sign in to add a client.";
      }
      return;
    }

    const payload = {
      user_id: user.id,
      business_name: name,
      phone: phone || null,
      website: website || null,
      price_cents: cents,
      paid_at: dateRaw ? new Date(dateRaw + "T12:00:00").toISOString() : new Date().toISOString(),
    };

    if (submit) submit.disabled = true;
    if (err) {
      err.hidden = true;
      err.textContent = "";
    }

    try {
      const { data, error } = await withTimeout(
        sb.from("manual_clients").insert(payload).select("*").single(),
        QUERY_MS,
        "Saving client"
      );
      if (error) throw error;
      const row = mapManual(data, "");
      if (row) {
        clients = [row, ...clients.filter((c) => c.list_key !== row.list_key)].sort((a, b) =>
          String(b.paid_at || "").localeCompare(String(a.paid_at || ""))
        );
        renderClients();
        writeClientsCache(user.id);
      }
      closeAddDialog();
      window.StudioToast?.success?.("Client added.");
    } catch (ex) {
      if (err) {
        err.hidden = false;
        err.textContent = ex?.message || "Could not save client.";
      } else {
        window.StudioToast?.error?.(ex?.message || "Could not save client.");
      }
    } finally {
      if (submit) submit.disabled = false;
    }
  }

  function openRemoveDialog(row) {
    const dialog = $("ms-clients-remove-dialog");
    const message = $("ms-clients-remove-message");
    const error = $("ms-clients-remove-error");
    if (!dialog || !row) return;
    removeTarget = row;
    if (error) {
      error.hidden = true;
      error.textContent = "";
    }
    if (message) {
      const name = row.business_name || "this client";
      message.textContent =
        row.source === "manual"
          ? 'Remove "' + name + '" from your list? This deletes the manual entry.'
          : 'Remove "' + name + '" from your clients list? The live site stays online.';
    }
    dialog.showModal();
    $("ms-clients-remove-submit")?.focus();
  }

  function closeRemoveDialog() {
    removeTarget = null;
    $("ms-clients-remove-dialog")?.close();
  }

  async function confirmRemoveClient() {
    const sb = getSb();
    const error = $("ms-clients-remove-error");
    const submit = $("ms-clients-remove-submit");
    const row = removeTarget;
    if (!row) return;
    if (!sb) {
      if (error) {
        error.hidden = false;
        error.textContent = "Supabase is not connected.";
      }
      return;
    }

    const user = await window.StudioAuth?.getUser?.();
    if (!user?.id) {
      if (error) {
        error.hidden = false;
        error.textContent = "Sign in to remove a client.";
      }
      return;
    }

    if (submit) submit.disabled = true;
    if (error) {
      error.hidden = true;
      error.textContent = "";
    }

    try {
      if (row.source === "manual") {
        let del = sb.from("manual_clients").delete().eq("id", row.manual_id);
        if (!isOwnerView) del = del.eq("user_id", user.id);
        const { error: delError } = await withTimeout(del, QUERY_MS, "Removing client");
        if (delError) throw delError;
      } else {
        const { error: hideError } = await withTimeout(
          sb.from("client_hides").upsert(
            { user_id: user.id, project_id: row.project_id },
            { onConflict: "user_id,project_id" }
          ),
          QUERY_MS,
          "Hiding client"
        );
        if (hideError) throw hideError;
      }

      clients = clients.filter((c) => c.list_key !== row.list_key);
      renderClients();
      writeClientsCache(user.id);
      closeRemoveDialog();
      window.StudioToast?.success?.("Client removed.");
    } catch (ex) {
      if (error) {
        error.hidden = false;
        error.textContent = ex?.message || "Could not remove client.";
      } else {
        window.StudioToast?.error?.(ex?.message || "Could not remove client.");
      }
    } finally {
      if (submit) submit.disabled = false;
    }
  }

  function bindUi() {
    const search = $("ms-clients-search");
    const clear = $("ms-clients-search-clear");
    search?.addEventListener("input", () => {
      searchQuery = search.value || "";
      if (clear) clear.hidden = !searchQuery.trim();
      renderClients();
    });
    clear?.addEventListener("click", () => {
      searchQuery = "";
      if (search) search.value = "";
      clear.hidden = true;
      renderClients();
      search?.focus();
    });
    $("ms-clients-download-csv")?.addEventListener("click", downloadCsv);
    $("ms-clients-add")?.addEventListener("click", openAddDialog);
    $("ms-clients-add-cancel")?.addEventListener("click", closeAddDialog);
    $("ms-clients-add-form")?.addEventListener("submit", (e) => void submitAddClient(e));
    $("ms-clients-add-dialog")?.addEventListener("cancel", (e) => {
      e.preventDefault();
      closeAddDialog();
    });
    $("ms-clients-add-dialog")?.addEventListener("click", (e) => {
      if (e.target === $("ms-clients-add-dialog")) closeAddDialog();
    });

    $("ms-clients-body")?.addEventListener("click", (e) => {
      const btn = e.target.closest(".ms-clients-remove");
      if (!btn) return;
      e.preventDefault();
      const key = btn.getAttribute("data-client-key");
      const row = clients.find((c) => c.list_key === key);
      if (row) openRemoveDialog(row);
    });
    $("ms-clients-remove-cancel")?.addEventListener("click", closeRemoveDialog);
    $("ms-clients-remove-submit")?.addEventListener("click", () => void confirmRemoveClient());
    $("ms-clients-remove-dialog")?.addEventListener("cancel", (e) => {
      e.preventDefault();
      closeRemoveDialog();
    });
    $("ms-clients-remove-dialog")?.addEventListener("click", (e) => {
      if (e.target === $("ms-clients-remove-dialog")) closeRemoveDialog();
    });
  }

  async function boot() {
    if (started) return;
    started = true;
    bindUi();
    syncOwnerChrome();
    const user = await window.StudioAuth?.getUser?.().catch(() => null);
    paintClientsFromCache(user?.id);
    await loadClients();
  }

  if (document.body.dataset.msAuthFired === "1") void boot();
  else document.addEventListener("ms:auth-ready", () => void boot(), { once: true });
})();
