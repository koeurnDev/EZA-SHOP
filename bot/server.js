require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const app = require('./app');
const pool = require('./config/database');
const { connectRedis } = require('./config/redis');
const bot = require('./config/telegram');
const paymentReconciler = require('./workers/paymentReconciler');
const marketingAutomation = require('./workers/marketingAutomation');
const winbackAutomation = require('./workers/winbackAutomation');
const keepAliveWorker = require('./workers/keepAliveWorker');

let isShuttingDown = false;

// 🛡️ Production Error Handling: Graceful exit on uncaught exceptions so PM2 resets corrupt process state
process.on('uncaughtException', (err) => {
  console.error('🔥 CRITICAL UNCAUGHT EXCEPTION:', err);
  if (isShuttingDown) return;
  isShuttingDown = true;

  // Set hard fallback exit timeout
  setTimeout(() => {
    console.error('🔴 Forcing process exit after uncaught exception timeout');
    process.exit(1);
  }, 3000).unref();

  try {
    bot.stop('UNCAUGHT_EXCEPTION');
    pool.end();
  } catch (e) {}

  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

const validateEnv = () => {
  const required = [
    'BOT_TOKEN', 'DATABASE_URL', 
    'WEBAPP_URL', 'SUPERADMIN_ID'
  ];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    console.error('🔴 CRITICAL: Missing required environment variables:', missing.join(', '));
    process.exit(1);
  }

  if (!process.env.SESSION_SECRET) {
    console.warn('⚠️ WARNING: SESSION_SECRET is not set. Falling back to BOT_TOKEN-derived session secret. Set SESSION_SECRET for stronger production security.');
  } else if (process.env.SESSION_SECRET.length < 32) {
    console.warn('⚠️ WARNING: SESSION_SECRET is too short (< 32 chars). Increased risk of brute force.');
  }
};

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    validateEnv();
    
    // 1. Initial Database Connection Check with Exponential Backoff
    console.log('⏳ Connecting to Database...');
    let client;
    let retries = 3;
    let delay = 1000;

    while (retries > 0) {
      try {
        client = await pool.connect();
        console.log('✅ DB Connected Successfully');
        client.release();
        break;
      } catch (err) {
        retries--;
        console.warn(`⚠️ DB Connection attempt failed (${err.message}). Retries left: ${retries}`);
        if (retries === 0) throw err;
        
        console.log(`🕒 Waiting ${delay}ms before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }

    // 2. Redis Connection (Async/Non-blocking)
    console.log('⏳ Connecting to Redis...');
    connectRedis();

    // 3. Telegram Bot Start (🛡️ Hardened: Non-blocking launch)
    console.log('⏳ Launching Telegram Bot...');
    bot.launch({
      dropPendingUpdates: true,
    })
      .then(() => console.log('🤖 Bot: Launched'))
      .catch(botErr => {
        console.error('⚠️ Bot Launch Warning:', botErr.message);
        console.log('ℹ️ Server is running for Webapp API despite Bot conflict.');
      });

    // Graceful Stop Signal Handlers
    process.once('SIGINT', () => {
      bot.stop('SIGINT');
      pool.end();
      process.exit(0);
    });
    process.once('SIGTERM', () => {
      bot.stop('SIGTERM');
      pool.end();
      process.exit(0);
    });

    // 4. Express Start
    console.log('⏳ Starting Express Server...');
    app.listen(PORT, () => {
      console.log(`🚀 Server: Running on port ${PORT}`);
      
      // 5. 🛡️ PM2 Cluster Safety: Only launch background workers on Primary Instance (#0)
      const instanceId = process.env.NODE_APP_INSTANCE;
      const isPrimaryWorkerInstance = instanceId === undefined || instanceId === '0';

      if (isPrimaryWorkerInstance) {
        console.log('👷 Background Worker Manager: Launching cron workers on Primary Instance (#0)...');
        paymentReconciler.start();
        marketingAutomation.start();
        winbackAutomation.start();
        keepAliveWorker.start();

        // Warm init cache on boot (first user gets fast response)
        const adminService = require('./services/adminService');
        adminService.getInitialData().catch(() => {});
      } else {
        console.log(`ℹ️ Worker Instance #${instanceId}: Skipping background cron startup (handled by Primary Instance #0).`);
      }
    });
  } catch (err) {
    console.error('🔴 Server Start Fail:', err.message);
    process.exit(1);
  }
};

startServer();
