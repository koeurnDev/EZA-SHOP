import { Hono } from 'hono';
import type { Env, Variables } from '../types';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

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
                  // Using WebApp URL if frontend is deployed. 
                  // If we don't know the URL, the user can still use the Bot's built-in menu button.
                  // But let's provide a fallback. If they have a bot, they usually set the Menu button.
                  // For the sake of safety, we'll try to use the generic attachment menu or ask them to click 'Menu'.
                  { text: '🛍️ បើកហាង (Open Shop)', url: `https://t.me/${update.message.chat.username ? update.message.chat.username : 'vibe_lifestyle_bot'}` } 
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

    // Always respond 200 OK to Telegram to acknowledge receipt
    return c.json({ success: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    return c.json({ success: true });
  }
});

export default app;
