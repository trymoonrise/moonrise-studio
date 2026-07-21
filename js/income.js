/**
 * Creator income from paid client sites - 90% of sale price (@moonrise keeps 10%).
 */
(function (global) {
  const INCOME_RATE = 0.9;

  function formatIncome(n) {
    return (
      "$" +
      Number(n).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  function isPaidSale(project) {
    if (!project) return false;
    if (project.watermark_enabled === false) return true;
    return String(project.status || "").toLowerCase() === "paid";
  }

  function incomeFromProject(project) {
    const cents = Number(project?.price_cents);
    if (!Number.isFinite(cents) || cents <= 0) return 0;
    return Math.round(cents * INCOME_RATE) / 100;
  }

  function calcIncome(projects) {
    return (projects || [])
      .filter(isPaidSale)
      .reduce((sum, project) => sum + incomeFromProject(project), 0);
  }

  async function fetchUserIncome() {
    const user = await global.StudioAuth?.getUser?.();
    if (!user) return { income: 0, sales: 0 };
    const client = global.SiteSupabase?.getClient?.();
    if (!client) return { income: 0, sales: 0 };
    const { data, error } = await client
      .from("projects")
      .select("price_cents, watermark_enabled, status")
      .eq("user_id", user.id);
    if (error) throw error;
    const sales = (data || []).filter(isPaidSale);
    return { income: calcIncome(sales), sales: sales.length };
  }

  global.StudioIncome = {
    INCOME_RATE,
    formatIncome,
    isPaidSale,
    incomeFromProject,
    calcIncome,
    fetchUserIncome,
  };
})(window);
