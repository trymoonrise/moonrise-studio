/**
 * Read actionable error text from worker API responses.
 */
(function (global) {
  async function readApiError(res, fallback) {
    const data = await res.json().catch(() => ({}));
    const message = String(data.error || data.message || fallback || "Request failed").trim();
    const err = new Error(message);
    err.code = data.code;
    err.status = res.status;
    return err;
  }

  global.StudioApiError = {
    read: readApiError,
  };
})(window);
