/**
 * MO-MO Offline Outbox Service (v2 - Principal Edition)
 * Features: Concurrent throttling, Jittered sync, and Persistence.
 * Now prevents "Thundering Herd" API crashes.
 */

const OUTBOX_KEY = 'momo_offline_outbox';
const SYNC_INTERVAL_MS = 1000; // Throttle: 1 request per second max during sync
const JITTER_RANGE_MS = 2000;  // Random initial delay to spread the load

let isSyncing = false;

const OfflineService = {
  queueRequest: (url, options) => {
    const outbox = OfflineService.getOutbox();
    const newRequest = {
      id: Date.now() + Math.random().toString(36).substring(7),
      url,
      options,
      timestamp: new Date().toISOString()
    };
    outbox.push(newRequest);
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox));
    console.log('📦 Request queued in outbox:', newRequest.id);
    return newRequest.id;
  },

  getOutbox: () => {
    try {
      const saved = localStorage.getItem(OUTBOX_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  },

  /**
   * Principal Logic: Serial Processing with Throttling, Jitter, & Cross-Tab Locks
   */
  syncOutbox: async (fetchWithRetry) => {
    if (isSyncing) return;

    const executeSync = async () => {
      isSyncing = true;
      try {
        const initialOutbox = OfflineService.getOutbox();
        if (initialOutbox.length === 0) return;

        // 🌪️ THUNDERING HERD PROTECTION: Add random jitter before starting sync
        const jitter = Math.floor(Math.random() * JITTER_RANGE_MS);
        console.log(`🔄 Sync starting in ${jitter}ms (Jitter active)...`);
        await new Promise(res => setTimeout(res, jitter));

        // Re-read outbox after jitter to ensure we have the latest state
        const currentOutbox = OfflineService.getOutbox();
        if (currentOutbox.length === 0) return;

        console.log(`🚀 Syncing ${currentOutbox.length} pending requests...`);
        
        for (const req of [...currentOutbox]) {
          try {
            const result = await fetchWithRetry(req.url, req.options);
            if (result.success) {
              // Atomic update of outbox
              const latestOutbox = OfflineService.getOutbox();
              const filtered = latestOutbox.filter(item => item.id !== req.id);
              localStorage.setItem(OUTBOX_KEY, JSON.stringify(filtered));
              console.log(`✅ Request ${req.id} synced successfully.`);
            } else {
              console.warn(`⏳ Request ${req.id} sync failed (Retrying later). Error:`, result.error);
            }
            
            // ⏱️ THROTTLE: Wait before next request to prevent API burst
            await new Promise(res => setTimeout(res, SYNC_INTERVAL_MS));
            
          } catch (e) {
            console.error(`❌ Global Sync failure for ${req.id}:`, e);
          }
        }
      } finally {
        isSyncing = false;
      }
    };

    // 🔒 Cross-Tab Locking: Ensure only one tab syncs at a time
    if (navigator.locks) {
      await navigator.locks.request('momo_sync_lock', { ifAvailable: true }, async (lock) => {
        if (!lock) {
          console.log('🔒 Another tab is currently syncing. Skipping.');
          return;
        }
        await executeSync();
      });
    } else {
      await executeSync(); // Fallback for browsers without Web Locks API
    }
  }
};

export default OfflineService;
