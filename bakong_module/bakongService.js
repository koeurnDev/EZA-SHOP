const crypto = require('crypto');
const fetch = require('node-fetch'); 
const https = require('https');

class BakongService {
  constructor() {
    this.apiUrl = process.env.BAKONG_API_URL || 'https://api-bakong.nbc.gov.kh';
    this.token = process.env.BAKONG_API_TOKEN;
    
    this.agent = new https.Agent({
      keepAlive: true,
      maxSockets: 100,
      keepAliveMsecs: 60000
    });

    this.commonHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9,kh;q=0.8',
      'Content-Type': 'application/json'
    };
  }

  generateMd5(qrString) {
    return crypto.createHash('md5').update(qrString).digest('hex');
  }

  async checkTransaction(qrString) {
    if (!this.token) return { success: false, message: 'API Token missing' };
    const md5 = this.generateMd5(qrString);
    try {
      const response = await fetch(`${this.apiUrl}/v1/check_transaction_by_md5`, {
        method: 'POST',
        agent: this.agent,
        headers: { ...this.commonHeaders, 'Authorization': `Bearer ${this.token}` },
        body: JSON.stringify({ md5 })
      });
      const responseText = await response.text();
      const result = JSON.parse(responseText);
      const responseCode = result.responseCode !== undefined ? result.responseCode : result.status?.code;
      if (responseCode === 0) return { success: true, data: result.data, message: 'PAID' };
      return { success: false, isStale: (result.errorCode === 15), message: 'UNPAID' };
    } catch (error) {
      return { success: false, message: 'Network Error' };
    }
  }

  async checkHealth() {
    if (!this.token) return { success: false, message: 'Config missing' };
    try {
      const response = await fetch(`${this.apiUrl}/v1/check_transaction_by_md5`, {
        method: 'POST',
        agent: this.agent,
        headers: { ...this.commonHeaders, 'Authorization': `Bearer ${this.token}` },
        body: JSON.stringify({ md5: '36e47644e7e64d364e4ed284f86feb9b' })
      });
      const responseText = await response.text();
      const result = JSON.parse(responseText);
      const responseCode = result.responseCode !== undefined ? result.responseCode : result.status?.code;
      const errorCode = result.errorCode !== undefined ? result.errorCode : result.status?.errorCode;
      return (responseCode === 0 || errorCode === 1) ? { success: true } : { success: false };
    } catch (error) {
      return { success: false, message: 'Bakong Offline' };
    }
  }
}

module.exports = new BakongService();
