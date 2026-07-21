/**
 * Pending payouts - owner-only manual creator payout queue (@moonrise).
 */
(function () {
  const QUERY_MS = 15000;
  const PROJECT_SELECT =
    "id, user_id, business_name, status, watermark_enabled, price_cents, vercel_url, business_context, updated_at, created_at";
  const PAYMENT_SELECT =
    "id, user_id, project_id, amount_cents, currency, kind, status, stripe_session_id, stripe_payment_intent, created_at";
  const PAYOUT_METHOD_LABELS = {
    venmo: "Venmo",
    paypal: "PayPal",
    zelle: "Zelle",
    cashapp: "Cash App",
    applepay: "Apple Pay",
    googlepay: "Google Pay",
    bitcoin: "Bitcoin",
    other: "Other",
  };

  let rows = [];
  let view = "pending";
  let searchQuery = "";
  let started = false;
  let payoutsTableReady = true;

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

  function siteDisplay(raw) {
    return String(raw || "")
      .trim()
      .replace(/^https?:\/\//i, "")
      .replace(/\/+$/, "");
  }

  function siteUrl(raw) {
    const t = String(raw || "").trim();
    return !t ? "" : /^https?:\/\//i.test(t) ? t : "https://" + t.replace(/^\/+/, "");
  }

  function emptyCell() {
    return '<span class="ms-clients-muted">-</span>';
  }

  function formatMoney(cents) {
    const n = Number(cents);
    if (!Number.isFinite(n)) return "";
    return "$" + (n / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatDateTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function payoutMethodLabel(id) {
    const key = String(id || "")
      .trim()
      .toLowerCase();
    return PAYOUT_METHOD_LABELS[key] || (key ? key.charAt(0).toUpperCase() + key.slice(1) : "");
  }

  function readBusinessContext(project) {
    const ctx = project?.business_context;
    return ctx && typeof ctx === "object" && !Array.isArray(ctx) ? ctx : {};
  }

  function projectSiteUrl(project) {
    const direct = String(project?.vercel_url || "").trim();
    if (direct) return direct;
    const ctx = readBusinessContext(project);
    const custom = String(ctx.customDomain || "").trim();
    if (custom) return siteUrl(custom);
    const slug = String(ctx.vercelSlug || "").trim();
    if (slug) return "https://" + slug + ".vercel.app";
    return "";
  }

  function isGoLivePayment(payment, project) {
    if (!payment || !project) return false;
    if (String(payment.status || "").toLowerCase() !== "paid") return false;
    const kind = String(payment.kind || "").toLowerCase();
    if (kind && kind !== "go_live" && kind !== "site_hosting") return false;
    if (project.watermark_enabled === false) return true;
    return String(project.status || "").toLowerCase() === "paid";
  }

  function normalizePayoutProfile(raw) {
    if (window.MoonrisePayoutProfile?.normalizeProfile) {
      return window.MoonrisePayoutProfile.normalizeProfile(raw);
    }
    const p = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    return {
      email: String(p.email || "").trim(),
      phone: String(p.phone || "").trim(),
      payoutMethod: String(p.payoutMethod || p.payout_method || "").trim(),
      payoutHandle: String(p.payoutHandle || p.payout_handle || "").trim(),
    };
  }

  function setBanner(msg, isError) {
    const el = $("ms-payouts-status");
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

  function shareCents(amountCents) {
    const sale = Math.max(0, Number(amountCents) || 0);
    const creator = Math.round(sale * (window.StudioIncome?.INCOME_RATE || 0.9));
    return {
      sale_cents: sale,
      creator_share_cents: creator,
      platform_share_cents: Math.max(0, sale - creator),
    };
  }

  function buildRow({ payment, project, profile, payoutRecord }) {
    const shares = shareCents(
      payoutRecord?.sale_cents ?? payment?.amount_cents ?? project?.price_cents
    );
    const payoutProfile = normalizePayoutProfile(profile?.payout_profile || {});
    const ctx = readBusinessContext(project);
    const handle = String(profile?.handle || profile?.display_name || "")
      .replace(/^@/, "")
      .trim();
    const paidAt =
      ctx.paidAt ||
      payment?.created_at ||
      project?.updated_at ||
      project?.created_at ||
      "";
    const website = projectSiteUrl(project);

    return {
      project_id: project.id,
      payment_id: payment?.id || payoutRecord?.payment_id || null,
      creator_user_id: project.user_id,
      business_name: project.business_name || "Untitled business",
      category: String(ctx.category || ctx.categoryGroup || ctx.businessType || "").trim(),
      address: String(ctx.address || ctx.businessAddress || "").trim(),
      business_phone: String(ctx.phone || ctx.businessPhone || "").trim(),
      website,
      creator_handle: handle,
      creator_display_name: String(profile?.display_name || "").trim(),
      sale_cents: shares.sale_cents,
      creator_share_cents:
        payoutRecord?.creator_share_cents ?? shares.creator_share_cents,
      platform_share_cents:
        payoutRecord?.platform_share_cents ?? shares.platform_share_cents,
      payout_method:
        payoutRecord?.payout_method || payoutProfile.payoutMethod || "",
      payout_handle:
        payoutRecord?.payout_handle || payoutProfile.payoutHandle || "",
      payout_email: payoutRecord?.payout_email || payoutProfile.email || "",
      payout_phone: payoutRecord?.payout_phone || payoutProfile.phone || "",
      stripe_session_id: payment?.stripe_session_id || "",
      stripe_payment_intent: payment?.stripe_payment_intent || "",
      sold_at: paidAt,
      payout_status: String(payoutRecord?.status || "pending").toLowerCase(),
      paid_out_at: payoutRecord?.paid_out_at || "",
      paid_out_note: payoutRecord?.paid_out_note || "",
    };
  }

  function filteredRows() {
    const q = searchQuery.trim().toLowerCase();
    const pool = rows.filter((row) =>
      view === "paid" ? row.payout_status === "paid" : row.payout_status !== "paid"
    );
    if (!q) return pool;
    return pool.filter((row) =>
      [
        row.business_name,
        row.category,
        row.address,
        row.creator_handle,
        row.creator_display_name,
        payoutMethodLabel(row.payout_method),
        row.payout_handle,
        row.payout_email,
        row.payout_phone,
        siteDisplay(row.website),
        formatMoney(row.sale_cents),
        formatMoney(row.creator_share_cents),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }

  function updateSummary() {
    const pending = rows.filter((row) => row.payout_status !== "paid");
    const totalOwed = pending.reduce(
      (sum, row) => sum + (Number(row.creator_share_cents) || 0),
      0
    );
    if ($("ms-payouts-pending-count")) {
      $("ms-payouts-pending-count").textContent = String(pending.length);
    }
    if ($("ms-payouts-pending-total")) {
      $("ms-payouts-pending-total").textContent = formatMoney(totalOwed) || "$0.00";
    }
  }

  function renderRows() {
    const body = $("ms-payouts-body");
    const empty = $("ms-payouts-empty");
    const countEl = $("ms-payouts-count");
    if (!body || !empty) return;

    const visible = filteredRows();
    updateSummary();

    if (countEl) {
      countEl.textContent = visible.length
        ? visible.length + (visible.length === 1 ? " payout" : " payouts")
        : "";
    }

    if (!visible.length) {
      body.innerHTML = "";
      const searching = !!searchQuery.trim();
      empty.querySelector(".ms-clients-empty-title").textContent = searching
        ? "No matches"
        : view === "paid"
          ? "No paid payouts yet"
          : "Nothing pending";
      empty.querySelector(".ms-clients-empty-desc").textContent = searching
        ? "Try another business, creator, or payout method."
        : view === "paid"
          ? "Payouts you mark as paid will appear here."
          : "When a business pays to go live, the creator payout shows up here until you mark it paid.";
      empty.hidden = false;
      return;
    }

    empty.hidden = true;
    body.innerHTML = visible
      .map((row) => {
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

        const method = payoutMethodLabel(row.payout_method);
        const details = [row.payout_handle, row.category ? "Category: " + row.category : ""]
          .filter(Boolean)
          .join(" · ");

        const contactParts = [];
        if (row.payout_email) {
          contactParts.push(
            '<a class="ms-clients-link" href="mailto:' +
              esc(row.payout_email) +
              '">' +
              esc(row.payout_email) +
              "</a>"
          );
        }
        if (row.payout_phone) {
          contactParts.push(esc(row.payout_phone));
        }
        const contactCell = contactParts.length ? contactParts.join("<br>") : emptyCell();

        const actionCell =
          view === "paid"
            ? row.paid_out_at
              ? esc(formatDateTime(row.paid_out_at))
              : emptyCell()
            : '<button type="button" class="ms-btn ms-btn-secondary ms-payouts-mark-paid" data-project-id="' +
              esc(row.project_id) +
              '">Mark paid</button>';

        return (
          '<tr data-project-id="' +
          esc(row.project_id) +
          '"><td class="ms-payouts-when">' +
          (formatDateTime(row.sold_at) ? esc(formatDateTime(row.sold_at)) : emptyCell()) +
          '</td><th scope="row" class="ms-clients-business">' +
          esc(row.business_name) +
          (row.address
            ? '<span class="ms-payouts-subline">' + esc(row.address) + "</span>"
            : "") +
          '</th><td class="ms-clients-website-cell">' +
          webCell +
          '</td><td><span class="ms-clients-creator">' +
          (row.creator_handle ? "@" + esc(row.creator_handle) : emptyCell()) +
          (row.creator_display_name
            ? '<span class="ms-payouts-subline">' + esc(row.creator_display_name) + "</span>"
            : "") +
          '</td><td class="ms-clients-price">' +
          (formatMoney(row.sale_cents) ? esc(formatMoney(row.sale_cents)) : emptyCell()) +
          '</td><td class="ms-payouts-owed">' +
          esc(formatMoney(row.creator_share_cents)) +
          '</td><td>' +
          (method ? esc(method) : emptyCell()) +
          '</td><td class="ms-payouts-details">' +
          (details ? esc(details) : emptyCell()) +
          '</td><td class="ms-payouts-contact">' +
          contactCell +
          '</td><td class="ms-clients-actions-cell"><div class="ms-clients-row-actions">' +
          actionCell +
          "</div></td></tr>"
        );
      })
      .join("");
  }

  async function loadCreatorProfiles(sb, userIds) {
    const ids = [...new Set((userIds || []).filter(Boolean))];
    if (!ids.length) return new Map();
    const { data, error } = await withTimeout(
      sb.from("profiles").select("id, handle, display_name, payout_profile").in("id", ids),
      QUERY_MS,
      "Loading creators"
    );
    if (error) throw error;
    const map = new Map();
    (Array.isArray(data) ? data : []).forEach((row) => {
      if (row?.id) map.set(String(row.id), row);
    });
    return map;
  }

  async function loadPayoutRecords(sb, projectIds) {
    if (!projectIds.length) return new Map();
    if (!payoutsTableReady) return new Map();
    try {
      const { data, error } = await withTimeout(
        sb.from("creator_payouts").select("*").in("project_id", projectIds),
        QUERY_MS,
        "Loading payout records"
      );
      if (error) {
        if (/creator_payouts|schema cache|does not exist/i.test(String(error.message || error))) {
          payoutsTableReady = false;
          return new Map();
        }
        throw error;
      }
      const map = new Map();
      (Array.isArray(data) ? data : []).forEach((row) => {
        if (row?.project_id) map.set(String(row.project_id), row);
      });
      return map;
    } catch (e) {
      if (/creator_payouts|schema cache|does not exist/i.test(String(e?.message || e))) {
        payoutsTableReady = false;
        return new Map();
      }
      throw e;
    }
  }

  async function loadPayouts() {
    setBanner("");
    const sb = getSb();
    if (!sb) {
      rows = [];
      renderRows();
      setBanner("Connect Supabase to load payouts.", true);
      return;
    }

    try {
      const { data: payments, error: payError } = await withTimeout(
        sb
          .from("payments")
          .select(PAYMENT_SELECT)
          .eq("status", "paid")
          .not("project_id", "is", null)
          .order("created_at", { ascending: false }),
        QUERY_MS,
        "Loading payments"
      );
      if (payError) throw payError;

      const paymentList = Array.isArray(payments) ? payments : [];
      const projectIds = [
        ...new Set(paymentList.map((pay) => String(pay.project_id || "")).filter(Boolean)),
      ];
      if (!projectIds.length) {
        rows = [];
        renderRows();
        return;
      }

      const { data: projects, error: projectError } = await withTimeout(
        sb.from("projects").select(PROJECT_SELECT).in("id", projectIds),
        QUERY_MS,
        "Loading projects"
      );
      if (projectError) throw projectError;

      const projectMap = new Map();
      (Array.isArray(projects) ? projects : []).forEach((project) => {
        if (project?.id) projectMap.set(String(project.id), project);
      });

      const creatorIds = [...projectMap.values()].map((p) => p.user_id).filter(Boolean);
      const [profileMap, payoutMap] = await Promise.all([
        loadCreatorProfiles(sb, creatorIds),
        loadPayoutRecords(sb, projectIds),
      ]);

      const built = [];
      paymentList.forEach((payment) => {
        const project = projectMap.get(String(payment.project_id || ""));
        if (!isGoLivePayment(payment, project)) return;
        const payoutRecord = payoutMap.get(String(project.id)) || null;
        built.push(
          buildRow({
            payment,
            project,
            profile: profileMap.get(String(project.user_id || "")) || null,
            payoutRecord,
          })
        );
      });

      rows = built.sort((a, b) => String(b.sold_at || "").localeCompare(String(a.sold_at || "")));
      renderRows();
      if (!payoutsTableReady) {
        setBanner(
          "Payout tracking table is not ready yet. Run the latest Supabase migration, then refresh."
        );
      }
    } catch (e) {
      rows = [];
      renderRows();
      setBanner(e?.message || "Could not load payouts.", true);
    }
  }

  async function markPaid(projectId) {
    const row = rows.find((item) => String(item.project_id) === String(projectId));
    if (!row) return;
    const sb = getSb();
    if (!sb) {
      setBanner("Supabase is not connected.", true);
      return;
    }

    const note = window.prompt(
      "Optional note for this payout (reference number, date sent, etc.)",
      ""
    );
    if (note === null) return;

    const payload = {
      payment_id: row.payment_id,
      project_id: row.project_id,
      creator_user_id: row.creator_user_id,
      sale_cents: row.sale_cents,
      creator_share_cents: row.creator_share_cents,
      platform_share_cents: row.platform_share_cents,
      status: "paid",
      payout_method: row.payout_method || null,
      payout_handle: row.payout_handle || null,
      payout_email: row.payout_email || null,
      payout_phone: row.payout_phone || null,
      paid_out_at: new Date().toISOString(),
      paid_out_note: String(note || "").trim() || null,
    };

    try {
      if (!payoutsTableReady) {
        throw new Error("Payout tracking table is not ready yet.");
      }
      const { error } = await withTimeout(
        sb.from("creator_payouts").upsert(payload, { onConflict: "project_id" }),
        QUERY_MS,
        "Saving payout"
      );
      if (error) throw error;
      row.payout_status = "paid";
      row.paid_out_at = payload.paid_out_at;
      row.paid_out_note = payload.paid_out_note || "";
      renderRows();
      window.StudioToast?.success?.("Payout marked as paid.");
    } catch (e) {
      setBanner(e?.message || "Could not mark payout as paid.", true);
    }
  }

  function downloadCsv() {
    const visible = filteredRows();
    if (!visible.length) {
      setBanner("No payouts to export.", true);
      return;
    }
    const csvQ = (v) => {
      const t = String(v ?? "");
      return /[",\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
    };
    const cols = [
      ["sold_at", "Sold"],
      ["business_name", "Business"],
      ["category", "Category"],
      ["address", "Address"],
      ["website", "Live site"],
      ["creator_handle", "Creator"],
      ["sale_cents", "Sale"],
      ["creator_share_cents", "Owed (90%)"],
      ["payout_method", "Payout method"],
      ["payout_handle", "Payout details"],
      ["payout_email", "Payout email"],
      ["payout_phone", "Payout phone"],
      ["payout_status", "Status"],
      ["paid_out_at", "Paid out at"],
      ["stripe_session_id", "Stripe session"],
    ];
    const exportRows = visible.map((row) => ({
      sold_at: formatDateTime(row.sold_at),
      business_name: row.business_name,
      category: row.category,
      address: row.address,
      website: siteDisplay(row.website),
      creator_handle: row.creator_handle ? "@" + row.creator_handle : "",
      sale_cents: formatMoney(row.sale_cents),
      creator_share_cents: formatMoney(row.creator_share_cents),
      payout_method: payoutMethodLabel(row.payout_method),
      payout_handle: row.payout_handle,
      payout_email: row.payout_email,
      payout_phone: row.payout_phone,
      payout_status: row.payout_status,
      paid_out_at: row.paid_out_at ? formatDateTime(row.paid_out_at) : "",
      stripe_session_id: row.stripe_session_id,
    }));
    const stamp = new Date().toISOString().slice(0, 10);
    const content =
      cols.map((c) => csvQ(c[1])).join(",") +
      "\r\n" +
      exportRows.map((r) => cols.map((c) => csvQ(r[c[0]])).join(",")).join("\r\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "pending-payouts-" + stamp + ".csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function setView(next) {
    view = next === "paid" ? "paid" : "pending";
    document.querySelectorAll("[data-payout-view]").forEach((btn) => {
      const on = btn.getAttribute("data-payout-view") === view;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    renderRows();
  }

  function bindUi() {
    document.querySelectorAll("[data-payout-view]").forEach((btn) => {
      btn.addEventListener("click", () => setView(btn.getAttribute("data-payout-view")));
    });

    const search = $("ms-payouts-search");
    const clear = $("ms-payouts-search-clear");
    search?.addEventListener("input", () => {
      searchQuery = search.value || "";
      if (clear) clear.hidden = !searchQuery.trim();
      renderRows();
    });
    clear?.addEventListener("click", () => {
      searchQuery = "";
      if (search) search.value = "";
      clear.hidden = true;
      renderRows();
      search?.focus();
    });

    $("ms-payouts-download-csv")?.addEventListener("click", downloadCsv);
    $("ms-payouts-body")?.addEventListener("click", (e) => {
      const btn = e.target.closest(".ms-payouts-mark-paid");
      if (!btn) return;
      e.preventDefault();
      void markPaid(btn.getAttribute("data-project-id"));
    });
  }

  async function boot() {
    if (started) return;
    started = true;

    const allowed = await window.StudioOwner?.gateOwnerPage?.("dashboard.html");
    if (!allowed) return;

    bindUi();
    await loadPayouts();
  }

  if (document.body.dataset.msAuthFired === "1") void boot();
  else document.addEventListener("ms:auth-ready", () => void boot(), { once: true });
})();
