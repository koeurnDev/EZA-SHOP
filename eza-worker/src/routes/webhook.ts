import { Hono } from 'hono';
import { createDb } from '../db/connection';
import { orders } from '../db/schema';
import { eq } from 'drizzle-orm';
import { sendCustomerStatusNotification } from '../utils/telegram';
import type { Env, Variables } from '../types';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * GET /api/webhook/status
 * Check current Telegram webhook status
 */
app.get('/status', async (c) => {
  const botToken = c.env.BOT_TOKEN;
  if (!botToken) return c.json({ success: false, error: 'BOT_TOKEN missing' }, 500);

  const res = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
  const data = await res.json();
  return c.json({ success: true, webhookInfo: data });
});

/**
 * GET /api/webhook/setup
 * Automatically configure Telegram webhook to this worker
 */
app.get('/setup', async (c) => {
  const botToken = c.env.BOT_TOKEN;
  if (!botToken) return c.json({ success: false, error: 'BOT_TOKEN missing' }, 500);

  const workerUrl = new URL(c.req.url).origin;
  const webhookUrl = `${workerUrl}/api/webhook/telegram`;

  const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}&allowed_updates=${encodeURIComponent(JSON.stringify(["message","callback_query"]))}`);
  const data = await res.json();
  return c.json({ success: true, targetUrl: webhookUrl, result: data });
});

/**
 * POST /api/webhook/telegram
 * Handles incoming Telegram updates
 */
app.post('/telegram', async (c) => {
  try {
    const update = await c.req.json();
    const botToken = c.env.BOT_TOKEN;

    if (!botToken) {
      console.warn('BOT_TOKEN is missing for webhook');
      return c.json({ success: true }); // Telegram requires 200 OK
    }

    if (update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text.trim();

      if (text === '/start') {
        const welcomeMessage = `សួស្ដី! សូមស្វាគមន៍មកកាន់ *Vibe Lifestyle* 🛍️\n\nសូមចុចប៊ូតុងខាងក្រោមដើម្បីចូលមើលទំនិញ និងបញ្ជាទិញដោយផ្ទាល់ក្នុងកម្មវិធីរបស់យើងដោយងាយស្រួល!`;
        
        c.executionCtx.waitUntil(
          fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: welcomeMessage,
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [[
                  // Use VITE_BOT_USERNAME or BOT_USERNAME from env, fallback to vibe_lifestyle_bot
                  { text: '🛍️ បើកហាង (Open Shop)', url: `https://t.me/${c.env.BOT_USERNAME || 'vibe_lifestyle_bot'}` } 
                ]]
              }
            })
          }).catch(err => console.error('Webhook /start error', err))
        );
      } else if (text === '/help') {
        const helpMessage = `ប្រសិនបើលោកអ្នកត្រូវការជំនួយ សូមទាក់ទងមកកាន់ប្រអប់សាររបស់ Admin ឬផ្ញើសារចូលក្នុងគ្រុបដោយផ្ទាល់។ សូមអរគុណ! 🙏`;
        c.executionCtx.waitUntil(
          fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: helpMessage,
              parse_mode: 'Markdown'
            })
          }).catch(err => console.error('Webhook /help error', err))
        );
      }
    }

    if (update.callback_query) {
      const callbackQueryId = update.callback_query.id;
      const data = update.callback_query.data;
      const message = update.callback_query.message;
      const chatId = message?.chat?.id;
      const messageId = message?.message_id;

      if (data === 'ignore') {
        c.executionCtx.waitUntil(
          fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackQueryId,
              text: 'ការបញ្ជាទិញនេះត្រូវបានចាត់ចែងរួចហើយ!'
            })
          }).catch(err => console.error('Answer callback ignore error', err))
        );
        return c.json({ success: true });
      }

      if (data && (data.startsWith('approve_order_') || data.startsWith('reject_order_'))) {
        const isApprove = data.startsWith('approve_order_');
        const prefix = isApprove ? 'approve_order_' : 'reject_order_';
        const orderCode = data.slice(prefix.length).replace(/^#/, '').trim();

        // 1. Answer callback query immediately with pop-up banner
        c.executionCtx.waitUntil(
          fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackQueryId,
              text: isApprove ? `✅ បានអនុម័តការបញ្ជាទិញ #${orderCode} ជោគជ័យ!` : `❌ បានបដិសេធវិក័យប័ត្រ #${orderCode}!`,
              show_alert: false
            })
          }).catch(err => console.error('Answer callback error', err))
        );

        // 2. Update database
        const db = createDb(c.env);
        const newStatus = isApprove ? 'paid' : 'pending';
        // If we reject, we clear the receipt_url so they can upload again.
        const updatedOrder = await db.update(orders)
          .set({ 
            status: newStatus,
            ...(isApprove ? {} : { receipt_url: null }) 
          })
          .where(eq(orders.order_code, orderCode))
          .returning();

        if (isApprove && updatedOrder.length > 0 && updatedOrder[0].user_id) {
          c.executionCtx.waitUntil(
            sendCustomerStatusNotification(c.env, {
              userId: updatedOrder[0].user_id,
              orderCode: updatedOrder[0].order_code,
              phone: updatedOrder[0].phone,
              address: updatedOrder[0].address,
              province: updatedOrder[0].province,
              note: updatedOrder[0].note,
              items: typeof updatedOrder[0].items === 'string' ? JSON.parse(updatedOrder[0].items) : updatedOrder[0].items,
              grossTotal: updatedOrder[0].gross_total || updatedOrder[0].total,
              receiptUrl: updatedOrder[0].receipt_url,
              createdAt: updatedOrder[0].created_at
            }, newStatus)
          );
        }

        // 3. Edit message reply markup to show the result button
        if (chatId && messageId) {
          c.executionCtx.waitUntil(
            fetch(`https://api.telegram.org/bot${botToken}/editMessageReplyMarkup`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                reply_markup: {
                  inline_keyboard: [
                    [
                      { 
                        text: isApprove ? '✅ បានអនុម័តរួចរាល់ (Approved)' : '❌ បានបដិសេធរួចរាល់ (Rejected)', 
                        callback_data: 'ignore' 
                      }
                    ]
                  ]
                }
              })
            }).catch(err => console.error('Edit message markup error', err))
          );
        }
      }
    }

    // Always respond 200 OK to Telegram to acknowledge receipt
    return c.json({ success: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    return c.json({ success: true });
  }
});

export default app;
