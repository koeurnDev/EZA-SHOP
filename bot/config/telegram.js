const { Telegraf, Markup } = require('telegraf');
const pool = require('./database');
const { HttpsProxyAgent } = require('https-proxy-agent');

if (!process.env.BOT_TOKEN) {
  console.error('🔴 BOT_TOKEN is missing. Bot cannot start.');
  process.exit(1);
}

const telegrafOptions = {};
if (process.env.PROXY_URL) {
  telegrafOptions.telegram = {
    agent: new HttpsProxyAgent(process.env.PROXY_URL)
  };
  console.log(`🔌 Using Proxy for Telegram Bot: ${process.env.PROXY_URL}`);
}

const bot = new Telegraf(process.env.BOT_TOKEN, telegrafOptions);

// --- Core Bot logic (formerly in bot.js) ---

// 1. Start Command
bot.start((ctx) => {
  ctx.reply(`សួស្តី ${ctx.from.first_name}! សូមស្វាគមន៍មកកាន់ MO MO Boutique 🛍️\n\nសូមចុចប៊ូតុងខាងក្រោមដើម្បីចូលមើលទំនិញថ្មីៗបាទ៖`, 
    Markup.inlineKeyboard([
      [Markup.button.webApp('Shop Now 🛍️', process.env.WEBAPP_URL)],
      [Markup.button.callback('មើលការកម្ម៉ង់ / Orders 📦', 'view_orders')]
    ])
  );
});

// 2. Order History Command
bot.command('orders', async (ctx) => {
  try {
    const userId = ctx.from.id.toString();
    const orders = await pool.query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5', [userId]);

    if (orders.rows.length === 0) {
      return ctx.reply('បងមិនទាន់មានការកុម្ម៉ង់នៅឡើយទេបាទ។ 🛍️');
    }

    let msg = '📦 *ការកម្ម៉ង់ ៥ ចុងក្រោយរបស់បង៖*\n\n';
    orders.rows.forEach(o => {
      const date = new Date(o.created_at).toLocaleDateString('km-KH');
      const statusIcon = o.status === 'paid' ? '✅' : o.status === 'shipped' ? '🚚' : o.status === 'processing' ? '📦' : o.status === 'pending' ? '⏳' : '❌';
      const statusText = o.status === 'paid' ? 'បានបង់ប្រាក់' : o.status === 'shipped' ? 'កំពុងដឹកជញ្ជូន' : o.status === 'processing' ? 'កំពុងរៀបចំ' : o.status === 'pending' ? 'រង់ចាំការបង់ប្រាក់' : 'បានលុប';
      const displayCode = o.order_code || o.id;
      
      msg += `${statusIcon} *\`${displayCode}\`*\n`;
      msg += `   ↳ ស្ថានភាព: ${statusText}\n`;
      msg += `   ↳ ថ្ងៃទី: ${date} | សរុប: $${o.total}\n\n`;
    });

    ctx.reply(msg, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('🔴 Bot Command Error:', err.message);
    ctx.reply('សុំទោស! មានបញ្ហាក្នុងការទាញយកទិន្នន័យ។');
  }
});

bot.action('view_orders', (ctx) => ctx.reply('សូមវាយពាក្យ /orders ដើម្បីមើលប្រវត្តិរូបបងបាទ។'));

// 4. Receipt Verification Handlers (Admin)
bot.action(/^approve_order_(.+)$/, async (ctx) => {
  try {
    const orderCode = ctx.match[1];
    const orderService = require('../services/orderService');
    const telegramUserId = ctx.from.id.toString();
    
    await orderService.confirmOrderPayment(orderCode, { id: telegramUserId }, false);
    
    const msg = ctx.update.callback_query.message;
    const appendText = `\n\n✅ អនុម័តដោយ: ${ctx.from.first_name}`;
    
    if (msg.photo || msg.caption !== undefined) {
      await ctx.editMessageCaption(`${msg.caption || ''}${appendText}`);
    } else if (msg.text) {
      await ctx.editMessageText(`${msg.text}${appendText}`);
    }
    
    await ctx.answerCbQuery('Approved Successfully!');
  } catch (err) {
    console.error('Approve Error:', err);
    await ctx.answerCbQuery(`Error: ${err.message}`, { show_alert: true });
  }
});

bot.action(/^reject_order_(.+)$/, async (ctx) => {
  try {
    const orderCode = ctx.match[1];
    
    // 🛡️ SECURITY FIX: Check if the user is the Super Admin
    if (String(ctx.from.id) !== String(process.env.SUPERADMIN_ID)) {
      return ctx.answerCbQuery('❌ Access Denied: Admin Only', { show_alert: true });
    }

    const res = await pool.query('UPDATE orders SET status = $1 WHERE order_code = $2 RETURNING user_id', ['cancelled', orderCode]);
    
    if (res.rowCount > 0) {
      const userId = res.rows[0].user_id;
      const userMsg = `❌ *វិក្កយបត្ររបស់អ្នកត្រូវបានបដិសេធ*\n` +
                      `🆔 លេខសម្គាល់: \`${orderCode}\`\n` +
                      `សូមពិនិត្យមើលវាឡើងវិញ ឬទាក់ទងមកកាន់យើងខ្ញុំ។`;
      if (userId) {
        await ctx.telegram.sendMessage(String(userId), userMsg, { parse_mode: 'Markdown' }).catch(console.error);
      }
    }
    
    const msg = ctx.update.callback_query.message;
    const appendText = `\n\n❌ បដិសេធដោយ: ${ctx.from.first_name}`;
    
    if (msg.photo || msg.caption !== undefined) {
      await ctx.editMessageCaption(`${msg.caption || ''}${appendText}`);
    } else if (msg.text) {
      await ctx.editMessageText(`${msg.text}${appendText}`);
    }
    
    await ctx.answerCbQuery('Rejected Successfully!');
  } catch (err) {
    console.error('Reject Error:', err);
    await ctx.answerCbQuery(`Error: ${err.message}`, { show_alert: true });
  }
});

// 5. Error Handling
bot.catch((err, ctx) => {
  console.error(`🔴 Bot Error for ${ctx.updateType}:`, err);
});

module.exports = bot;
