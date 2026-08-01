require('dotenv').config({ path: './.env' });
const fetch = require('node-fetch');

async function diagnose() {
  console.log('🔍 Starting Bakong Diagnostic...');
  const url = process.env.BAKONG_API_URL || 'https://api-bakong.nbc.gov.kh';
  const token = process.env.BAKONG_API_TOKEN;

  if (!token) {
    console.error('❌ ERROR: BAKONG_API_TOKEN is missing in your .env file!');
    return;
  }

  console.log(`📡 Connecting to: ${url}`);
  console.log(`🔑 Using Token: ${token.substring(0, 10)}...`);

  try {
    const response = await fetch(`${url}/v1/check_transaction_by_md5`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ md5: '36e47644e7e64d364e4ed284f86feb9b' })
    });

    const result = await response.json();
    console.log('📩 Response received:', JSON.stringify(result));

    const errorCode = result.errorCode !== undefined ? result.errorCode : result.status?.errorCode;
    const responseCode = result.responseCode !== undefined ? result.responseCode : result.status?.code;

    if (responseCode === 0 || errorCode === 1) {
      console.log('✅ SUCCESS: Your Bakong Token is valid and working!');
    } else {
      console.error(`❌ FAILED: Bakong rejected your token. Error: ${result.responseMessage || result.status?.message}`);
    }
  } catch (err) {
    console.error('❌ ERROR: Could not reach Bakong API. Check your internet connection or URL.');
    console.error(err.message);
  }
}

diagnose();
