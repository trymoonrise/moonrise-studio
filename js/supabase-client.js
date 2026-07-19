/**
 * Shared Supabase browser client with Auth session persistence.
 */
(function (global) {
  let client = null;

  function cfg() {
    const c = global.SITE_CONFIG || {};
    return {
      url: String(c.supabaseUrl || "").trim(),
      key: String(c.supabaseAnonKey || "").trim(),
    };
  }

  function canUse() {
    const { url, key } = cfg();
    return !!(url && key && global.supabase?.createClient);
  }

  function getClient() {
    if (client) return client;
    if (!canUse()) return null;
    const { url, key } = cfg();
    client = global.supabase.createClient(url, key, {
      auth: {
        storageKey: "moonrise-studio-auth",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: global.localStorage,
        // Implicit so email confirmation links return #access_token (server-side signup has no PKCE verifier).
        flowType: "implicit",
      },
    });
    return client;
  }

  global.SiteSupabase = { getClient, canUse };
})(window);
