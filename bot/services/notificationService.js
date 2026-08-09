const Queue = require('bull');
const bot = require('../config/telegram');

const redisConnection = process.env.REDIS_URL
  ? { tls: process.env.REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined }
  : { host: '127.0.0.1', port: 6379 };

// ✅ Initialize notification queue (Redis connection)
const notificationQueue = process.env.REDIS_URL 
  ? new Queue('notifications', process.env.REDIS_URL, { redis: redisConnection.tls ? { tls: redisConnection.tls } : {} })
  : new Queue('notifications', { redis: redisConnection });
notificationQueue.on('error', (err) => {
  console.error('🔴 Notification Queue Error:', err.message || err);
});
notificationQueue.on('failed', (job, err) => {
  console.error(`❌ Notification Job Failed [${job.name}] id=${job.id}:`, err.message || err);
});

const safeSendTelegram = async (method, chatId, ...args) => {
  if (!bot || !bot.telegram) {
    throw new Error('Telegram bot not initialized');
  }
  const normalizedChatId = String(chatId);

  try {
    const chat = await bot.telegram.getChat(normalizedChatId);
    const chatInfo = `${chat.type}${chat.username ? ` @${chat.username}` : ''}${chat.first_name ? ` ${chat.first_name}` : ''}`;
    console.log(`ℹ️ Telegram chat verified: ${normalizedChatId} (${chatInfo})`);
  } catch (chatErr) {
    console.warn(`⚠️ Telegram getChat failed for ${normalizedChatId}:`, chatErr.description || chatErr.message || chatErr);
  }

  try {
    const result = await bot.telegram[method](normalizedChatId, ...args);
    console.log(`✅ Telegram ${method} success to ${normalizedChatId} msg_id=${result?.message_id || 'unknown'}`);
    return result;
  } catch (err) {
    console.error(`🔴 Telegram ${method} failed to ${normalizedChatId}:`, err.description || err.message || err);
    throw err;
  }
};

// ✅ Queue processor: Handle Telegram notifications in the background
notificationQueue.process(async (job) => {
  const { type, adminId, userId, order, items } = job.data;
  console.log(`ℹ️ Notification Worker: processing type=${type} adminId=${adminId} userId=${userId} orderCode=${order?.order_code || order?.id}`);
  try {
    if (bot) {
      const itemsList = (items || []).map(it => `- ${it.name} x ${it.quantity}`).join('\n');
      
      if (type === 'order_created') {
        const ticket = `🛒 *ការកម្ម៉ង់ថ្មី (New Order)*\n` +
                      `🆔 លេខសម្គាល់: \`${order.order_code}\`\n` +
                      `👤 អតិថិជន: *${order.user_name}*\n` +
                      `📝 ទំនិញ:\n${itemsList}\n\n` +
                      `💰 សរុប: *$${order.total}*`;
        await safeSendTelegram('sendMessage', adminId, ticket, { 
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '✅ បញ្ជាក់ការបង់ប្រាក់ (Confirm)', callback_data: `approve_order_${order.order_code}` }],
              [{ text: '❌ បដិសេធ (Reject)', callback_data: `reject_order_${order.order_code}` }]
            ]
          }
        });
        
        const userTicket = `🛒 *ការកម្ម៉ង់របស់អ្នកត្រូវបានទទួល!*\n` +
                          `🆔 លេខសម្គាល់: \`${order.order_code}\`\n` +
                          `💰 សរុប: *$${order.total}*`;
        await safeSendTelegram('sendMessage', userId, userTicket, { parse_mode: 'Markdown' });
      } else if (type === 'order_paid') {
        const ticket = `🎫 *វិក្កយបត្រកម្មង់ដែលបានបង់ប្រាក់*\n` +
                       `🆔 លេខសម្គាល់: \`${order.order_code}\`\n` +
                       `👤 អតិថិជន: *${order.user_name}*\n` +
                       `📦 ទំនិញ:\n${itemsList}\n` +
                       `💰 សរុប: *$${order.total}*`;
        console.log(`ℹ️ Telegram send payload: adminId=${adminId}, userId=${userId}`);
    await safeSendTelegram('sendMessage', adminId, ticket, { parse_mode: 'Markdown' });

        const userTicket = `✨ *វិក្កយបត្រកម្មង់ដែលបានបង់ប្រាក់*\n` +
                          `🆔 លេខសម្គាល់: \`${order.order_code}\`\n` +
                          `✅ ការបង់ប្រាក់ត្រូវបានបញ្ជាក់ជោគជ័យ! អរគុណសម្រាប់ការគាំទ្រពី MO MO Boutique។`;
    await safeSendTelegram('sendMessage', userId, userTicket, { parse_mode: 'Markdown' });
      } else if (type === 'reconciliation_success') {
        const ticket = `🔄 *ការផ្ទៀងផ្ទាត់ឡើងវិញបានជោគជ័យ (Reconciled)*\n` +
                       `🆔 លេខសម្គាល់: \`${order.order_code}\`\n` +
                       `👤 អតិថិជន: *${order.user_name}*\n` +
                       `✅ ប្រព័ន្ធបានឆែកឃើញការបង់ប្រាក់ដែលបាត់ដានកាលពីមុន។ អ័រឌឺត្រូវបានបញ្ជាក់ដោយស្វ័យប្រវត្តិ!`;
        await safeSendTelegram('sendMessage', adminId, ticket, { parse_mode: 'Markdown' });

        const userTicket = `✨ *ការបង់ប្រាក់របស់អ្នកត្រូវបានបញ្ជាក់ (Reconciled)*\n` +
                          `🆔 លេខសម្គាល់: \`${order.order_code}\`\n` +
                          `✅ ប្រព័ន្ធបានឆែកឃើញការបង់ប្រាក់របស់អ្នក។ អរគុណដែលបានរង់ចាំ!`;
        await safeSendTelegram('sendMessage', userId, userTicket, { parse_mode: 'Markdown' });
      } else if (type === 'receipt_uploaded') {
        const ticket = `🧾 *វិក្កយបត្របានបញ្ជូនពីអតិថិជន*\n` +
                       `🆔 លេខសម្គាល់: \`${order.order_code}\`\n` +
                       `👤 អតិថិជន: *${order.user_name}*\n` +
                       `💰 សរុប: *$${order.total}*\n\n` +
                       `👇 សូមពិនិត្យរូបភាពវិក្កយបត្រខាងក្រោម ឬ ក្នុង Admin Dashboard។`;
        await safeSendTelegram('sendPhoto', adminId, order.receipt_url, { 
          caption: ticket, 
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '✅ អនុម័ត (Approve)', callback_data: `approve_order_${order.order_code}` }],
              [{ text: '❌ បដិសេធ (Reject)', callback_data: `reject_order_${order.order_code}` }]
            ]
          }
        });
      }
    }
  } catch (e) {
    console.error('🔴 Notification Worker Fail:', e.message);
    throw e;
  }
});

const sendTelegramNotification = async (type, adminId, userId, order, items) => {
  if (!bot) return;
  const itemsList = (items || []).map(it => `- ${it.name} x ${it.quantity}`).join('\n');

  if (type === 'order_created') {
    const ticket = `🛒 *ការកម្ម៉ង់ថ្មី (New Order)*\n` +
                  `🆔 លេខសម្គាល់: \`${order.order_code}\`\n` +
                  `👤 អតិថិជន: *${order.user_name}*\n` +
                  `📝 ទំនិញ:\n${itemsList}\n\n` +
                  `💰 សរុប: *$${order.total}*`;
    await safeSendTelegram('sendMessage', adminId, ticket, { 
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ បញ្ជាក់ការបង់ប្រាក់ (Confirm)', callback_data: `approve_order_${order.order_code}` }],
          [{ text: '❌ បដិសេធ (Reject)', callback_data: `reject_order_${order.order_code}` }]
        ]
      }
    });
    const userTicket = `🛒 *ការកម្ម៉ង់របស់អ្នកត្រូវបានទទួល!*\n` +
                      `🆔 លេខសម្គាល់: \`${order.order_code}\`\n` +
                      `💰 សរុប: *$${order.total}*`;
    await safeSendTelegram('sendMessage', userId, userTicket, { parse_mode: 'Markdown' });
  } else if (type === 'order_paid') {
    const ticket = `🎫 *វិក្កយបត្រកម្មង់ដែលបានបង់ប្រាក់*\n` +
                   `🆔 លេខសម្គាល់: \`${order.order_code}\`\n` +
                   `👤 អតិថិជន: *${order.user_name}*\n` +
                   `📦 ទំនិញ:\n${itemsList}\n` +
                   `💰 សរុប: *$${order.total}*`;
    await safeSendTelegram('sendMessage', adminId, ticket, { parse_mode: 'Markdown' });
    const userTicket = `✨ *វិក្កយបត្រកម្មង់ដែលបានបង់ប្រាក់*\n` +
                      `🆔 លេខសម្គាល់: \`${order.order_code}\`\n` +
                      `✅ ការបង់ប្រាក់ត្រូវបានបញ្ជាក់ជោគជ័យ! អរគុណសម្រាប់ការគាំទ្រពី MO MO Boutique។`;
    await safeSendTelegram('sendMessage', userId, userTicket, { parse_mode: 'Markdown' });
  } else if (type === 'reconciliation_success') {
    const ticket = `🔄 *ការផ្ទៀងផ្ទាត់ឡើងវិញបានជោគជ័យ (Reconciled)*\n` +
                   `🆔 លេខសម្គាល់: \`${order.order_code}\`\n` +
                   `👤 អតិថិជន: *${order.user_name}*\n` +
                   `✅ ប្រព័ន្ធបានឆែកឃើញការបង់ប្រាក់ដែលបាត់ដានកាលពីមុន។ អ័រឌឺត្រូវបានបញ្ជាក់ដោយស្វ័យ​ប្រវត្តិ!`;
    await safeSendTelegram('sendMessage', adminId, ticket, { parse_mode: 'Markdown' });
    const userTicket = `✨ *ការបង់ប្រាក់របស់អ្នកត្រូវបានបញ្ជាក់ (Reconciled)*\n` +
                      `🆔 លេខសម្គាល់: \`${order.order_code}\`\n` +
                      `✅ ប្រព័ន្ធបានឆែកឃើញការបង់ប្រាក់របស់អ្នក។ អរគុណដែលបានរង់ចាំ!`;
    await safeSendTelegram('sendMessage', userId, userTicket, { parse_mode: 'Markdown' });
  } else if (type === 'receipt_uploaded') {
    const ticket = `🧾 *វិក្កយបត្របានបញ្ជូនពីអតិថិជន*\n` +
                   `🆔 លេខសម្គាល់: \`${order.order_code}\`\n` +
                   `👤 អតិថិជន: *${order.user_name}*\n` +
                   `💰 សរុប: *$${order.total}*\n\n` +
                   `👇 សូមពិនិត្យរូបភាពវិក្កយបត្រខាងក្រោម ឬ ក្នុង Admin Dashboard.`;
    await safeSendTelegram('sendPhoto', adminId, order.receipt_url, { 
      caption: ticket, 
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ អនុម័ត (Approve)', callback_data: `approve_order_${order.order_code}` }],
          [{ text: '❌ បដិសេធ (Reject)', callback_data: `reject_order_${order.order_code}` }]
        ]
      }
    });
  }
};

const notificationService = {
  notifyOrderCreated: async (adminId, userId, order, items) => {
    console.log(`ℹ️ Direct notifyOrderCreated: adminId=${adminId} userId=${userId} orderCode=${order?.order_code}`);
    try {
      return await sendTelegramNotification('order_created', adminId, userId, order, items);
    } catch (directErr) {
      console.error('⚠️ Direct order_created notification failed, falling back to queue:', directErr.message || directErr);
      return notificationQueue.add({
        type: 'order_created', adminId, userId, order, items
      }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
    }
  },

  notifyOrderPaid: async (adminId, userId, order, items) => {
    console.log(`ℹ️ Direct notifyOrderPaid: adminId=${adminId} userId=${userId} orderCode=${order?.order_code}`);
    try {
      return await sendTelegramNotification('order_paid', adminId, userId, order, items);
    } catch (directErr) {
      console.error('⚠️ Direct order_paid notification failed, falling back to queue:', directErr.message || directErr);
      return notificationQueue.add({
        type: 'order_paid', adminId, userId, order, items
      }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
    }
  },

  sendLowStockAlert: async (adminId, product) => {
    if (!bot || !adminId) return;
    const msg = `⚠️ *LOW STOCK ALERT*\n\n` +
                `📦 ទំនិញ: *${product.name}*\n` +
                `📉 ចំនួននៅសល់: *${product.stock}* គ្រឿង\n\n` +
                `សូមប្រញាប់បន្ថែមស្តុកបាទ!`;
    await safeSendTelegram('sendMessage', adminId, msg, { parse_mode: 'Markdown' });
  },

  notifyReconciliationSuccess: async (adminId, userId, order) => {
    console.log(`ℹ️ Direct notifyReconciliationSuccess: adminId=${adminId} userId=${userId} orderCode=${order?.order_code}`);
    try {
      return await sendTelegramNotification('reconciliation_success', adminId, userId, order, []);
    } catch (directErr) {
      console.error('⚠️ Direct reconciliation notification failed, falling back to queue:', directErr.message || directErr);
      return notificationQueue.add({
        type: 'reconciliation_success', adminId, userId, order
      }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
    }
  },

  sendReceiptToAdmin: async (adminId, order) => {
    console.log(`ℹ️ Direct sendReceiptToAdmin: adminId=${adminId} orderUserId=${order?.user_id} orderCode=${order?.order_code}`);
    try {
      return await sendTelegramNotification('receipt_uploaded', adminId, order.user_id, order, []);
    } catch (directErr) {
      console.error('⚠️ Direct receipt notification failed, falling back to queue:', directErr.message || directErr);
      return notificationQueue.add({
        type: 'receipt_uploaded', adminId, userId: order.user_id, order
      }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
    }
  }
};

module.exports = notificationService;
