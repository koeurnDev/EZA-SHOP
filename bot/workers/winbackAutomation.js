const userRepository = require('../repositories/userRepository');
const cacheService = require('../services/cacheService');
const bot = require('../config/telegram');

const escapeMarkdown = (text) => {
  if (!text && text !== 0) return '';
  return String(text).replace(/([_*`\[])/g, '\\$1');
};

const winbackAutomation = {
  timer: null,
  isProcessing: false,
  intervalMs: 86400000, // 24 hours

  start: () => {
    if (winbackAutomation.timer) return;
    console.log('🚀 [Win-back Automation] Background worker started (Distributed & Safe)');

    // Run initial scan after 60s, then every 24 hours
    setTimeout(() => winbackAutomation.run(), 60000);
    winbackAutomation.timer = setInterval(() => winbackAutomation.run(), winbackAutomation.intervalMs);
  },

  run: async () => {
    if (winbackAutomation.isProcessing) {
      console.log('⏳ [Win-back Automation] Cycle in progress. Skipping...');
      return;
    }

    // 🛡️ Distributed Locking: Ensure only 1 worker instance runs across multi-container pods
    const lockKey = 'lock:worker:winback_automation';
    const lockAcquired = await cacheService.set(lockKey, 'locked', 7200); // 2 hr lock TTL
    if (!lockAcquired) {
      console.log('🔒 [Win-back Automation] Lock held by another instance. Skipping...');
      return;
    }

    winbackAutomation.isProcessing = true;
    try {
      console.log('🔄 [Win-back Automation] Scanning for inactive users...');
      const inactiveUsers = await userRepository.findInactiveUsers(30);

      if (inactiveUsers.length === 0) {
        console.log('✅ [Win-back Automation] No inactive users found.');
        return;
      }

      console.log(`📦 [Win-back Automation] Found ${inactiveUsers.length} inactive users. Processing...`);

      const botUsername = bot?.botInfo?.username || 'EzaShopBot';

      for (const user of inactiveUsers) {
        try {
          const safeName = escapeMarkdown(user.first_name || 'អតិថិជនជាទីស្រលាញ់');
          const message = `✨ *នឹកអ្នកណាស់!* ✨\n\n` +
                          `សួស្តី *${safeName}*! តាំងពីបានជួបគ្នាលើកមុន ហាងរបស់យើងមានឥវ៉ាន់ថ្មីៗ និងការបញ្ចុះតម្លៃជាច្រើន។\n\n` +
                          `ចូលមកលេងម្តងនេះ កុំភ្លេចពិនិត្យមើលមុខទំនិញថ្មីៗណា៎! 🎉\n\n` +
                          `[ចុចទីនេះដើម្បីចូលមើលទំនិញ](https://t.me/${botUsername})`;

          if (bot && bot.telegram) {
            await bot.telegram.sendMessage(user.user_id, message, { parse_mode: 'Markdown' });
          }

          await userRepository.markAsWinbackReminded(user.user_id);
          console.log(`✅ [Win-back Automation] Sent reminder to user ${user.user_id}`);

          await new Promise(r => setTimeout(r, 200)); // Non-blocking 200ms throttle
        } catch (msgErr) {
          console.error(`⚠️ [Win-back Automation] Failed to send to ${user.user_id}:`, msgErr.message);
        }
      }
    } catch (err) {
      console.error('🔴 [Win-back Automation] Error during cycle:', err.message);
    } finally {
      winbackAutomation.isProcessing = false;
      await cacheService.delete(lockKey).catch(() => {});
    }
  },

  stop: () => {
    if (winbackAutomation.timer) {
      clearInterval(winbackAutomation.timer);
      winbackAutomation.timer = null;
      console.log('🛑 [Win-back Automation] Worker stopped.');
    }
  }
};

module.exports = winbackAutomation;
