const Queue = require('bull');
const EventEmitter = require('events');

/**
 * MO-MO Elite Job Queue Service (v6 Persistent)
 * Features: Persistence (Redis), Auto-Retry, and Concurrency Control.
 * Falls back to In-Memory if Redis is unavailable.
 */

class PersistentQueue extends EventEmitter {
  constructor() {
    super();
    this.redisUrl = process.env.REDIS_URL;
    this.isPersistent = !!this.redisUrl;
    this.processors = new Map();

    if (this.isPersistent) {
      console.log('🔌 Queue: Initializing persistent Bull queue...');
      this.mainQueue = new Queue('momo-tasks', this.redisUrl, {
        settings: {
          lockDuration: 30000,
          stalledInterval: 30000,
          maxStalledCount: 2
        }
      });

      this.mainQueue.on('failed', (job, err) => {
        console.error(`❌ Queue: Job [${job.name}] failed after ${job.attemptsMade} attempts:`, err.message);
      });

      // 📢 Dedicated Broadcast Queue (Rate Limited for Telegram: 20 msgs/sec to be safe)
      this.broadcastQueue = new Queue('momo-broadcast', this.redisUrl, {
        limiter: {
          max: 20,
          duration: 1000
        }
      });

      this.broadcastQueue.process(async (job) => {
        const processor = this.processors.get(job.name);
        if (processor) return await processor(job.data);
      });
    } else {
      console.warn('⚠️ Queue: REDIS_URL missing. Using transient Memory Queue.');
      this.memoryQueue = [];
      this.active = 0;
      this.concurrency = 3;
    }
  }

  /**
   * Registers a processor for a specific job type.
   * This MUST be called at startup.
   */
  register(type, handler) {
    this.processors.set(type, handler);
  }

  /**
   * Adds a job to the queue.
   * If persistent, it goes to Redis. If not, it stays in memory.
   */
  async add(type, payload, handler = null) {
    if (handler && !this.processors.has(type)) {
      this.register(type, handler);
    }

    if (this.isPersistent) {
      // 🚀 Direct broadcasts to the rate-limited queue
      if (type.startsWith('BROADCAST_')) {
        return await this.broadcastQueue.add(type, payload, {
          attempts: 2,
          removeOnComplete: true
        });
      }

      return await this.mainQueue.add(type, payload, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true
      });
    } else {
      this.memoryQueue.push({ type, payload });
      this.processMemory();
    }
  }

  async processMemory() {
    if (this.active >= this.concurrency || this.memoryQueue.length === 0) return;

    this.active++;
    const job = this.memoryQueue.shift();
    const processor = this.processors.get(job.type);

    try {
      if (processor) {
        await processor(job.payload);
      }
    } catch (e) {
      console.error(`❌ Memory Queue: Job [${job.type}] failed:`, e.message);
    } finally {
      this.active--;
      this.processMemory();
    }
  }
}

const QueueService = new PersistentQueue();

module.exports = QueueService;
