/**
 * Minimal stubs so moonrise-website Business Finder runs inside Moonrise Studio.
 */
(function (global) {
  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v == null ? fallback : v;
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        /* ignore */
      }
    },
  };

  global.RepSession = global.RepSession || {
    get() {
      return { id: "studio", name: "Studio" };
    },
    getId() {
      return "studio";
    },
    getName() {
      return "Studio";
    },
  };

  global.RepStorage = global.RepStorage || {
    key(k) {
      return "ms_" + k;
    },
    loadItem(k) {
      return store.get(this.key(k), null);
    },
    saveItem(k, v) {
      store.set(this.key(k), v);
    },
    flushSync() {
      return Promise.resolve();
    },
  };

  global.LeadSync = global.LeadSync || {
    saveBuildingLocalSnapshot() {},
    clearBuildingLocalSnapshot() {},
    markLeadBuilding() {
      return Promise.resolve();
    },
    savePendingLocalSnapshot() {},
    clearPendingLocalSnapshot() {},
  };

  global.SiteDialog = global.SiteDialog || {
    alert({ message }) {
      window.alert(message || "");
      return Promise.resolve();
    },
  };

  global.SiteLock = global.SiteLock || {
    whenUnlocked(fn) {
      try {
        fn();
      } catch (e) {
        console.warn(e);
      }
    },
  };

  global.SiteOwner = global.SiteOwner || {
    isSiteOwner() {
      return true;
    },
  };

  global.QuickPrompt = global.QuickPrompt || {
    isConfigured() {
      return false;
    },
    isConnectivityError() {
      return false;
    },
    run() {
      return Promise.reject(new Error("Quick Prompt is not configured in Studio"));
    },
  };

  global.RepProfilePhoto = global.RepProfilePhoto || null;

  // Pending island on website — keep empty no-op hooks if dashboard-pending is absent
  global.DashboardPending = global.DashboardPending || {
    refresh() {},
    init() {},
  };
})(window);
