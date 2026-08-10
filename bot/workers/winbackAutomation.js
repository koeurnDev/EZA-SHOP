const userRepository = require('../repositories/userRepository');
const bot = require('../config/telegram');

const winbackAutomation = {
  intervalId: null,

  start: () => {
    if (winbackAutomation.intervalId) return;

    console.log('🚀 [Win-back Automation] Background worker started...');
    
    // Run every 24 hours (86400000 ms)
    winbackAutomation.intervalId = setInterval(async () => {
      try {
        console.log('🔄 [Win-back Automation] Scanning for inactive users...');
        
        // Find users inactive for 30 days
        const inactiveUsers = await userRepository.findInactiveUsers(30);
        
        if (inactiveUsers.length === 0) {
          console.log('✅ [Win-back Automation] No inactive users found.');
          return;
        }

        console.log(`📦 [Win-back Automation] Found ${inactiveUsers.length} inactive users. Sending win-back messages...`);

        for (const user of inactiveUsers) {
          try {
            const message = `✨ **នឹកអ្នកណាស់!** ✨\n\nសួស្តី ${user.first_name || 'អតិថិជនជាទីស្រលាញ់'}! តាំងពីបានជួបគ្នាលើកមុន ហាងរបស់យើងមានឥវ៉ាន់ថ្មីៗ និងការបញ្ចុះតម្លៃជាច្រើន។\n\nចូលមកលេងម្តងនេះ កុំភ្លេចពិនិត្យមើលមុខទំនិញថ្មីៗណា៎! 🎉\n\n[ចុចទីនេះដើម្បីចូលមើលទំនិញ](https://t.me/${bot.botInfo?.username || 'MoMoShopBot'})`;

            // Send to Telegram user
            await bot.telegram.sendMessage(user.user_id, message, {
              parse_mode: 'Markdown'
            });

            // Mark as reminded
            await userRepository.markAsWinbackReminded(user.user_id);
            console.log(`✅ [Win-back Automation] Sent reminder to user ${user.user_id}`);

            // Sleep 1 second between messages
            await new Promise(r => setTimeout(r, 1000));
            
          } catch (msgErr) {
            console.error(`⚠️ [Win-back Automation] Failed to send to ${user.user_id}:`, msgErr.message);
          }
        }
      } catch (err) {
        console.error('🔴 [Win-back Automation] Error during cycle:', err.message);
      }
    }, 86400000); // 24 hours
  },

  stop: () => {
    if (winbackAutomation.intervalId) {
      clearInterval(winbackAutomation.intervalId);
      winbackAutomation.intervalId = null;
      console.log('🛑 [Win-back Automation] Worker stopped.');
    }
  }
};

module.exports = winbackAutomation;
