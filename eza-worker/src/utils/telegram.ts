export type NotificationType = 'cash' | 'receipt_uploaded' | 'auto_verified';

export async function sendAdminOrderNotification(env: any, orderData: any, notificationType: NotificationType = 'cash') {
  if (!env.BOT_TOKEN || !env.SUPERADMIN_ID) return;

  try {
    const { orderCode, userName, phone, address, province, paymentMethod, items, grossTotal, receiptUrl, createdAt } = orderData;
    
    let itemsText = '';
    if (Array.isArray(items)) {
      itemsText = items.map((i: any) => {
        let variantText = '';
        const size = i.selectedSize || i.variant?.size;
        const color = i.selectedColor || i.variant?.color;
        if (size) variantText += ` Size: ${size}`;
        if (color) variantText += ` Color: ${color}`;
        return `- ${i.name} x${i.quantity}${variantText} ($${(i.price * i.quantity).toFixed(2)})`;
      }).join('\n');
    }

    let title = '';
    if (notificationType === 'cash') title = '🚚 មានការបញ្ជាទិញថ្មី! (New Cash Order)';
    else if (notificationType === 'receipt_uploaded') title = '🧾 អតិថិជនបានផ្ញើវិក័យប័ត្រ (Receipt Uploaded)';
    else if (notificationType === 'auto_verified') title = '✅ បង់ប្រាក់រួចរាល់ (Auto-Verified Paid Order)';
    
    // Format purchase date
    const dateObj = createdAt ? new Date(createdAt) : new Date();
    const formattedDate = dateObj.toLocaleString('en-GB', {
      timeZone: 'Asia/Phnom_Penh',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });

    // Avoid duplicating province or appending Phnom Penh when address already contains full location details
    const hasProvinceInAddress = (str: string, prov: string) => {
      if (!str || !prov) return false;
      const lower = str.toLowerCase();
      const pLower = prov.toLowerCase();
      if (lower.includes(pLower)) return true;
      // Also check Khmer province names if province is in English
      const kmProvinces: Record<string, string[]> = {
        'phnom penh': ['ភ្នំពេញ', 'phnom penh'],
        'koh kong': ['កោះកុង', 'koh kong'],
        'siem reap': ['សៀមរាប', 'siem reap'],
        'battambang': ['បាត់ដំបង', 'battambang'],
        'kampot': ['កំពត', 'kampot'],
        'kandal': ['កណ្តាល', 'កណ្ដាល', 'kandal'],
        'kampong cham': ['កំពង់ចាម', 'kampong cham'],
        'kampong speu': ['កំពង់ស្ពឺ', 'kampong speu'],
        'kampong chhnang': ['កំពង់ឆ្នាំង', 'kampong chhnang'],
        'kampong thom': ['កំពង់ធំ', 'kampong thom'],
        'preah sihanouk': ['ព្រះសីហនុ', 'កំពង់សោម', 'sihanouk'],
        'takeo': ['តាកែវ', 'takeo'],
        'svay rieng': ['ស្វាយរៀង', 'svay rieng'],
        'prey veng': ['ព្រៃវែង', 'prey veng'],
        'pursat': ['ពោធិ៍សាត់', 'pursat'],
        'kratie': ['ក្រចេះ', 'kratie'],
        'mondulkiri': ['មណ្ឌលគិរី', 'mondulkiri'],
        'ratanakiri': ['រតនគិរី', 'ratanakiri'],
        'stung treng': ['ស្ទឹងត្រែង', 'stung treng'],
        'tboung khmum': ['ត្បូងឃ្មុំ', 'tboung khmum'],
        'pailin': ['ប៉ៃលិន', 'pailin'],
        'kep': ['កែប', 'kep'],
        'preah vihear': ['ព្រះវិហារ', 'preah vihear'],
        'oddar meanchey': ['ឧត្តរមានជ័យ', 'oddar meanchey'],
      };
      const variants = kmProvinces[pLower];
      if (variants && variants.some(v => lower.includes(v))) return true;
      return false;
    };

    // If the address already has comprehensive Cambodian address info, don't append province
    const hasAnyProvince = (str: string) => {
      const anyKm = ['ភ្នំពេញ', 'កោះកុង', 'សៀមរាប', 'បាត់ដំបង', 'កំពត', 'កណ្តាល', 'កណ្ដាល', 'កំពង់ចាម', 'កំពង់ស្ពឺ', 'កំពង់ឆ្នាំង', 'កំពង់ធំ', 'ព្រះសីហនុ', 'តាកែវ', 'ស្វាយរៀង', 'ព្រៃវែង', 'ពោធិ៍សាត់', 'ក្រចេះ', 'មណ្ឌលគិរី', 'រតនគិរី', 'ស្ទឹងត្រែង', 'ត្បូងឃ្មុំ', 'ប៉ៃលិន', 'កែប', 'ព្រះវិហារ', 'ឧត្តរមានជ័យ'];
      return anyKm.some(k => str.includes(k));
    };

    let addressLine = address || '';
    if (province && !hasProvinceInAddress(address, province) && !hasAnyProvince(address)) {
      addressLine = addressLine ? `${addressLine}, ${province}` : province;
    }

    const adminMessage = `🔔 <b>${title}</b>\n\n` +
      `📦 <b>លេខកូដ៖</b> #${orderCode}\n` +
      `👤 <b>ឈ្មោះ៖</b> ${userName}\n` +
      `📅 <b>ថ្ងៃទិញ៖</b> ${formattedDate}\n` +
      `📞 <b>លេខទូរស័ព្ទ៖</b> ${phone}\n` +
      `📍 <b>ទីតាំង៖</b> ${addressLine}\n` +
      `💳 <b>បង់ប្រាក់៖</b> ${paymentMethod}\n\n` +
      `🛒 <b>ទំនិញ៖</b>\n${itemsText}` +
      `\n\n💰 <b>សរុប (Total)៖ $${parseFloat(grossTotal).toFixed(2)}</b>`;

    const replyMarkup = notificationType === 'receipt_uploaded' ? {
      inline_keyboard: [
        [
          { text: '✅ អនុម័ត (Approve)', callback_data: `approve_order_${orderCode}` },
          { text: '❌ បដិសេធ (Reject)', callback_data: `reject_order_${orderCode}` }
        ]
      ]
    } : undefined;

    // If receipt uploaded, send the receipt photo with caption
    if (notificationType === 'receipt_uploaded' && receiptUrl) {
      await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: env.SUPERADMIN_ID,
          photo: receiptUrl,
          caption: adminMessage,
          parse_mode: 'HTML',
          reply_markup: replyMarkup
        })
      });
    } else {
      await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: env.SUPERADMIN_ID,
          text: adminMessage,
          parse_mode: 'HTML',
          reply_markup: replyMarkup
        })
      });
    }
  } catch (err) {
    console.error('Failed to prepare Telegram notification:', err);
  }
}

export async function sendCustomerStatusNotification(env: any, orderData: any, newStatus: string, additionalText?: string) {
  if (!env.BOT_TOKEN || !orderData.userId) return;

  try {
    const { orderCode, phone, address, province, note, items, grossTotal, createdAt } = orderData;
    
    let itemsText = '';
    if (Array.isArray(items)) {
      itemsText = items.map((i: any) => {
        let variantText = '';
        const size = i.selectedSize || i.variant?.size;
        const color = i.selectedColor || i.variant?.color;
        if (size) variantText += ` size ${size}`;
        if (color) variantText += ` color ${color}`;
        return ` ${i.name} x${i.quantity}${variantText} ($${(i.price * i.quantity).toFixed(2)})`;
      }).join('\n');
    }

    const statusMap: Record<string, string> = {
      paid: 'បានបង់ប្រាក់រួចរាល់ 💸',
      processing: 'កំពុងរៀបចំអីវ៉ាន់ 📦',
      shipped: 'កំពុងដឹកជញ្ជូន 🚚',
      delivered: 'បានដឹកជញ្ជូនដល់ 🎁',
      cancelled: 'ត្រូវបានលុបចោល ❌',
    };

    const statusText = statusMap[newStatus] || newStatus;

    // Format date: 12/08/2026, 4:37:37 pm
    const dateObj = createdAt ? new Date(createdAt) : new Date();
    const formattedDate = dateObj.toLocaleString('en-GB', {
      timeZone: 'Asia/Phnom_Penh',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    }).replace(',', '');

    let userMessage = `សួស្តីបង! ការកម្ម៉ង់របស់បងលេខសម្គាល់៖ #${orderCode}\n` +
      `ការបរិច្ឆេទទិញ ${formattedDate}\n\n` +
      `🛍️ ទំនិញដែលបានទិញ៖\n${itemsText}\n` +
      `💰 តម្លៃសរុប៖ $${parseFloat(grossTotal).toFixed(2)}\n\n` +
      `ព័តមានសង្ខេប\n` +
      `📞 លេខទូរស័ព្ទ៖ ${phone}\n` +
      `📍 អាសយដ្ឋាន៖ ${address}, ${province}\n` +
      (note ? `📝 ចំណាំ៖ ${note}\n` : '') +
      `\n📌 ត្រូវបានប្តូរស្ថានភាពទៅជា៖ ${statusText}`;

    if (additionalText) {
      userMessage += `\n\n${additionalText}`;
    }

    await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: orderData.userId,
        text: userMessage,
      })
    });
  } catch (err) {
    console.error('Failed to send customer notification:', err);
  }
}
