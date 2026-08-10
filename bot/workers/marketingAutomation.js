const orderRepository = require('../repositories/orderRepository');
const bot = require('../config/telegram');

const marketingAutomation = {
  intervalId: null,

  start: () => {
    if (marketingAutomation.intervalId) return;

    console.log('🚀 [Marketing Automation] Background worker started...');
    
    // Run every 1 hour (3600000 ms)
    marketingAutomation.intervalId = setInterval(async () => {
      try {
        console.log('🔄 [Marketing Automation] Scanning for abandoned carts...');
        
        // 1. Fetch pending orders older than 2 hours but newer than 24 hours
        const abandonedOrders = await orderRepository.findPendingOrders(24);
        
        if (abandonedOrders.length === 0) {
          console.log('✅ [Marketing Automation] No abandoned carts found.');
          return;
        }

        console.log(`📦 [Marketing Automation] Found ${abandonedOrders.length} abandoned orders. Sending reminders...`);

        // 2. Loop through and send Telegram messages
        for (const order of abandonedOrders) {
          try {
            // Parse items to describe them in the message
            const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
            let itemsDescription = '';
            
            if (Array.isArray(items)) {
              itemsDescription = items.map(item => `🔹 ${item.name} (x${item.quantity})`).join('\n');
            }

            const message = `⚠️ សួស្តី! ការកម្ម៉ង់របស់អ្នកមិនទាន់បានបង់ប្រាក់នៅឡើយទេ។

📦 **លេខវិក្កយបត្រ:** \`${order.order_code || order.id}\`
🛍️ **ទំនិញដែលបានកម្ម៉ង់:**
${itemsDescription}
💰 **សរុប:** $${parseFloat(order.total).toFixed(2)}

សូមធ្វើការបង់ប្រាក់ឥឡូវនេះ ដើម្បីឱ្យយើងរៀបចំអីវ៉ាន់ជូនអ្នក! 🙏`;

            // Send to Telegram user
            await bot.telegram.sendMessage(order.user_id, message, {
              parse_mode: 'Markdown'
            });

            // Mark as reminded in DB
            await orderRepository.markAsReminded(order.id);
            console.log(`✅ [Marketing Automation] Sent reminder for order ${order.order_code || order.id}`);

            // Sleep 1 second between messages to prevent Telegram rate limit
            await new Promise(r => setTimeout(r, 1000));
            
          } catch (msgErr) {
            console.error(`⚠️ [Marketing Automation] Failed to send to ${order.user_id}:`, msgErr.message);
          }
        }
      } catch (err) {
        console.error('🔴 [Marketing Automation] Error during cycle:', err.message);
      }
    }, 3600000); // 1 hour
  },

  stop: () => {
    if (marketingAutomation.intervalId) {
      clearInterval(marketingAutomation.intervalId);
      marketingAutomation.intervalId = null;
      console.log('🛑 [Marketing Automation] Worker stopped.');
    }
  }
};

module.exports = marketingAutomation;
