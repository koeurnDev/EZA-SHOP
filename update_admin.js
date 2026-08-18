const fs = require('fs');
const path = 'd:/Vibe Lifestyle/eza-worker/src/routes/admin.ts';
let content = fs.readFileSync(path, 'utf8');

const importReplacement = `import { getUploadUrl } from '../utils/cloudflare';\nimport { sendCustomerStatusNotification } from '../utils/telegram';`;
content = content.replace(`import { getUploadUrl } from '../utils/cloudflare';`, importReplacement);

const newBlock = `      // --- TELEGRAM NOTIFICATION ---
      if (targetUserId) {
        let additionalText = '';
        if (validationResult.data.status === 'delivered') {
           const pointsToAward = Math.floor(parseFloat(updatedOrder[0].gross_total || updatedOrder[0].total));
           if (pointsToAward > 0) {
              additionalText += \`🎁 អបអរសាទរ! លោកអ្នកទទួលបាន \${pointsToAward} ពិន្ទុពីការបញ្ជាទិញនេះ។\\n\`;
           }
           if (referralBonusGiven) {
              additionalText += \`🎉 លោកអ្នកទទួលបាន 10 ពិន្ទុបន្ថែមពីការណែនាំមិត្តភ័ក្តិ! ប្រើ Link ណែនាំ ដើម្បីទទួលបានពិន្ទុបន្ថែមទៀត!\`;
           }
        }

        c.executionCtx.waitUntil(
          sendCustomerStatusNotification(c.env, {
            userId: targetUserId,
            orderCode: updatedOrder[0].order_code,
            phone: updatedOrder[0].phone,
            address: updatedOrder[0].address,
            province: updatedOrder[0].province,
            note: updatedOrder[0].note,
            items: typeof updatedOrder[0].items === 'string' ? JSON.parse(updatedOrder[0].items) : updatedOrder[0].items,
            grossTotal: updatedOrder[0].gross_total || updatedOrder[0].total,
            createdAt: updatedOrder[0].created_at
          }, validationResult.data.status, additionalText)
        );
      }`;

const regex = /\s*\/\/\s*---\s*TELEGRAM NOTIFICATION\s*---[\s\S]*?console\.error\('Failed to send TG notify', tgErr\);\s*}\s*}/;
content = content.replace(regex, '\n' + newBlock);
fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated admin.ts');
