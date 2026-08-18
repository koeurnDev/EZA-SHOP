const { neon } = require('@neondatabase/serverless');
const sql = neon('postgresql://neondb_owner:npg_NBl0F4jPJaoO@ep-sparkling-waterfall-aztxjqz9-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');
sql`SELECT user_id, user_name, role FROM users`.then(r => console.log(r)).catch(console.error);
