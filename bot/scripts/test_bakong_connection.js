require('dotenv').config();
const bakongService = require('../services/bakongService');

async function testBakong() {
  console.log('📡 Testing Bakong API Connection...');
  console.log('URL:', process.env.BAKONG_API_URL || 'https://api-bakong.nbc.gov.kh');
  
  // Test with a dummy MD5 (just to see if the API responds or rejects the token)
  const dummyQr = '00020101021252040000530384054040.015802KH5912MO MO6010PHNOM PENH6304ABCD';
  const result = await bakongService.checkTransaction(dummyQr);

  console.log('------------------------------------');
  console.log('RESULT:', JSON.stringify(result, null, 2));
  console.log('------------------------------------');

  if (result.message.includes('Token not configured')) {
    console.log('❌ ERROR: BAKONG_API_TOKEN is missing in .env');
  } else if (result.success || result.message.includes('not found')) {
    console.log('✅ SUCCESS: Bakong API responded properly (Token is valid).');
  } else {
    console.log('⚠️ WARNING: Bakong returned an error. Please check your Token permissions.');
  }
}

testBakong();
