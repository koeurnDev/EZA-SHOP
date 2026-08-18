const fs = require('fs');
const path = 'd:/Vibe Lifestyle/eza-worker/src/routes/webhook.ts';
let content = fs.readFileSync(path, 'utf8');

const importReplacement = `import { createDb } from '../db/connection';\nimport { orders } from '../db/schema';\nimport { eq } from 'drizzle-orm';\nimport { sendCustomerStatusNotification } from '../utils/telegram';`;
content = content.replace(`import { createDb } from '../db/connection';\nimport { orders } from '../db/schema';\nimport { eq } from 'drizzle-orm';`, importReplacement);

const searchStr = `        // If we reject, we clear the receipt_url so they can upload again.
        await db.update(orders)
          .set({ 
            status: newStatus,
            ...(isApprove ? {} : { receipt_url: null }) 
          })
          .where(eq(orders.order_code, orderCode));`;

const newCode = `        // If we reject, we clear the receipt_url so they can upload again.
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
              createdAt: updatedOrder[0].created_at
            }, newStatus)
          );
        }`;

content = content.replace(searchStr, newCode);
fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated webhook.ts');
