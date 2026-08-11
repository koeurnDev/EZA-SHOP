const orderService = require('../services/orderService');
const cacheService = require('../services/cacheService');

/**
 * 🕵️ Payment Reconciler Worker (Distributed & Overlap-Safe)
 * Periodically scans the database for missed payments.
 */
class PaymentReconciler {
  constructor() {
    this.intervalMs = 15 * 60 * 1000; // 15 minutes
    this.timer = null;
    this.isProcessing = false;
  }

  start() {
    console.log('👷 Reconciler Worker: Initialized (Every 15m, Distributed Lock)');
    
    // Initial run after 30s to allow server to stabilize
    setTimeout(() => this.run(), 30000);

    this.timer = setInterval(() => {
      this.run();
    }, this.intervalMs);
  }

  async run() {
    if (this.isProcessing) {
      console.log('👷 Reconciler Worker: Previous run still in progress. Skipping...');
      return;
    }

    // 🛡️ Distributed Locking: Prevent multi-pod concurrent DB scans
    const lockKey = 'lock:worker:payment_reconciler';
    const lockAcquired = await cacheService.set(lockKey, 'locked', 900); // 15 min lock TTL
    if (!lockAcquired) {
      console.log('🔒 Reconciler Worker: Lock held by another instance. Skipping...');
      return;
    }

    this.isProcessing = true;
    try {
      await orderService.reconcileAllPending();
    } catch (err) {
      console.error('🔴 Reconciler Worker Error:', err.message);
    } finally {
      this.isProcessing = false;
      await cacheService.delete(lockKey).catch(() => {});
    }
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

module.exports = new PaymentReconciler();
