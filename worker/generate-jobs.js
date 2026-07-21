/**
 * Generation job helpers - idempotent /generate and in-flight dedupe.
 */
const ACTIVE_JOB_MS = Number(process.env.GENERATE_ACTIVE_JOB_MS || 15 * 60 * 1000);
const POLL_MS = Number(process.env.GENERATE_POLL_MS || 2000);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jobAgeMs(job) {
  const t = new Date(job?.created_at || 0).getTime();
  if (!Number.isFinite(t)) return Infinity;
  return Date.now() - t;
}

function isActiveJob(job) {
  if (!job) return false;
  if (job.status !== "running" && job.status !== "pending") return false;
  return jobAgeMs(job) <= ACTIVE_JOB_MS;
}

async function findJobByRequestId(supabase, userId, requestId) {
  const rid = String(requestId || "").trim();
  if (!rid || !userId) return null;
  const { data, error } = await supabase
    .from("generation_jobs")
    .select("id,status,project_id,result_html,error,created_at,prompt")
    .eq("user_id", userId)
    .eq("prompt->>requestId", rid)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn("findJobByRequestId", error.message);
    return null;
  }
  return data || null;
}

async function findActiveRunningJob(supabase, userId) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from("generation_jobs")
    .select("id,status,project_id,result_html,error,created_at,prompt")
    .eq("user_id", userId)
    .in("status", ["pending", "running"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn("findActiveRunningJob", error.message);
    return null;
  }
  if (!data || !isActiveJob(data)) return null;
  return data;
}

async function markStaleRunningJobs(supabase, userId) {
  if (!userId) return;
  const cutoff = new Date(Date.now() - ACTIVE_JOB_MS).toISOString();
  try {
    await supabase
      .from("generation_jobs")
      .update({
        status: "failed",
        error: "Generation timed out on the server.",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("status", "running")
      .lt("created_at", cutoff);
  } catch (e) {
    console.warn("markStaleRunningJobs", e.message);
  }
}

async function loadProjectHtml(supabase, projectId) {
  if (!projectId) return "";
  const { data } = await supabase.from("projects").select("html").eq("id", projectId).maybeSingle();
  return String(data?.html || "");
}

async function buildDonePayload(supabase, job, getBalance, userId) {
  let html = String(job?.result_html || "");
  const projectId = job?.project_id || null;
  if (projectId && !html.trim()) {
    html = await loadProjectHtml(supabase, projectId);
  }
  const balance = await getBalance(supabase, userId);
  const presetCount = Number(job?.prompt?.presetCount) || undefined;
  return {
    projectId,
    html,
    presetCount,
    credits: balance,
    creditsUsed: 0,
    resumed: true,
  };
}

async function waitForGenerationJob(supabase, jobId, getBalance, userId, maxMs) {
  const deadline = Date.now() + (maxMs || ACTIVE_JOB_MS);
  while (Date.now() < deadline) {
    const { data: job, error } = await supabase
      .from("generation_jobs")
      .select("id,status,project_id,result_html,error,created_at,prompt")
      .eq("id", jobId)
      .maybeSingle();
    if (error) {
      console.warn("waitForGenerationJob", error.message);
      break;
    }
    if (!job) break;
    if (job.status === "done") {
      return { ok: true, payload: await buildDonePayload(supabase, job, getBalance, userId) };
    }
    if (job.status === "failed") {
      return { ok: false, error: job.error || "Generation failed" };
    }
    await sleep(POLL_MS);
  }
  return { ok: false, inProgress: true, jobId };
}

async function resolveExistingGeneration(supabase, userId, requestId, getBalance) {
  await markStaleRunningJobs(supabase, userId);

  const rid = String(requestId || "").trim();
  if (rid) {
    const byId = await findJobByRequestId(supabase, userId, rid);
    if (byId?.status === "done") {
      return { action: "return", payload: await buildDonePayload(supabase, byId, getBalance, userId) };
    }
    if (isActiveJob(byId)) {
      const waited = await waitForGenerationJob(supabase, byId.id, getBalance, userId, ACTIVE_JOB_MS);
      if (waited.ok) return { action: "return", payload: waited.payload };
      if (waited.inProgress) {
        return {
          action: "poll",
          jobId: byId.id,
          requestId: rid,
        };
      }
      if (waited.error) return { action: "error", error: waited.error };
    }
  }

  const active = await findActiveRunningJob(supabase, userId);
  if (active) {
    const activeRid = String(active.prompt?.requestId || "").trim();
    if (rid && activeRid && rid === activeRid) {
      const waited = await waitForGenerationJob(supabase, active.id, getBalance, userId, ACTIVE_JOB_MS);
      if (waited.ok) return { action: "return", payload: waited.payload };
      if (waited.inProgress) {
        return {
          action: "poll",
          jobId: active.id,
          requestId: activeRid,
        };
      }
      if (waited.error) return { action: "error", error: waited.error };
    }
    return {
      action: "blocked",
      jobId: active.id,
      requestId: activeRid || rid || null,
    };
  }

  return { action: "create" };
}

async function failGenerationJob(supabase, jobId, message) {
  if (!jobId) return;
  try {
    await supabase
      .from("generation_jobs")
      .update({
        status: "failed",
        error: String(message || "Generation failed").slice(0, 500),
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  } catch (e) {
    console.warn("failGenerationJob", e.message);
  }
}

module.exports = {
  ACTIVE_JOB_MS,
  POLL_MS,
  findJobByRequestId,
  findActiveRunningJob,
  markStaleRunningJobs,
  waitForGenerationJob,
  buildDonePayload,
  resolveExistingGeneration,
  failGenerationJob,
};
