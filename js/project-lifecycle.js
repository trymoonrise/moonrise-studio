/**
 * Project publish/delete helpers shared by Dashboard and Projects.
 */
(function (global) {
  function isClientPaidProject(project) {
    return project?.watermark_enabled === false;
  }

  function isLiveProject(project) {
    if (!project) return false;
    if (String(project.status || "").toLowerCase() === "published") return true;
    return !!String(project.vercel_url || "").trim();
  }

  function canDeleteProject(project) {
    return !isClientPaidProject(project);
  }

  function workerUrl() {
    if (typeof global.resolveWorkerUrl === "function") return global.resolveWorkerUrl();
    return String(global.SITE_CONFIG?.workerUrl || "").replace(/\/$/, "");
  }

  async function authHeaders() {
    const session = await global.StudioAuth?.getSession?.();
    if (!session?.access_token) throw new Error("Sign in required");
    return {
      "Content-Type": "application/json",
      Authorization: "Bearer " + session.access_token,
    };
  }

  async function unpublishProject(projectId) {
    const base = workerUrl();
    if (!base) throw new Error("Worker URL is not configured.");
    const headers = await authHeaders();
    const body = JSON.stringify({ projectId, action: "unpublish" });

    let res = await fetch(base + "/publish", { method: "POST", headers, body });
    if (res.status === 404) {
      res = await fetch(base + "/unpublish", { method: "POST", headers, body: JSON.stringify({ projectId }) });
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Could not unpublish project");
    return data;
  }

  global.StudioProjects = {
    isClientPaidProject,
    isLiveProject,
    canDeleteProject,
    unpublishProject,
  };
})(window);
