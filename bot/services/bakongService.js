const crypto = require('crypto');
const fetch = require('node-fetch');
const https = require('https');

/**
 * Bakong Intelligence Service
 * Handles communication with the Bakong Open API for payment verification.
 */
class BakongService {
  constructor() {
    this.apiUrl = process.env.BAKONG_API_URL || 'https://api-bakong.nbc.gov.kh';
    this.token = process.env.BAKONG_API_TOKEN;
    
    // 🚀 Performance: Reuse connection to Bakong (Connection Pooling)
    // This saves ~200-500ms per request by skipping the SSL handshake.
    this.agent = new https.Agent({
      keepAlive: true,
      maxSockets: 100,
      keepAliveMsecs: 60000
    });

    this.commonHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9,kh;q=0.8',
      'Origin': 'https://tg-mini-app-bot-3fuz.onrender.com',
      'Referer': 'https://tg-mini-app-bot-3fuz.onrender.com/',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    };
    this.timeoutLimit = 8000; // ⚡ 8s timeout for external Gateway calls
  }

  // 🛡️ Resilience Helper: Ensure external network calls don't hang the thread
  async _withTimeout(promise, operationName) {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`TIMEOUT (${operationName})`)), this.timeoutLimit)
    );
    return Promise.race([promise, timeout]);
  }

  /**
   * Generates MD5 hash of the KHQR string as required by Bakong API
   */
  generateMd5(qrString) {
    return crypto.createHash('md5').update(qrString).digest('hex');
  }

  /**
   * Checks the status of a transaction with the Bakong Network
   * Returns: { success: boolean, data: object, message: string }
   */
  async checkTransaction(qrString) {
    if (!this.token) {
      return { success: false, message: 'Bakong API Token not configured' };
    }

    const md5 = this.generateMd5(qrString);
    const endpoint = `${this.apiUrl}/v1/check_transaction_by_md5`;

    try {
      console.log(`🔍 Bakong: Checking transaction MD5: ${md5}`);
      const response = await this._withTimeout(fetch(endpoint, {
        method: 'POST',
        agent: this.agent, // 🚀 Connection Reuse
        headers: {
          ...this.commonHeaders,
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ md5 })
      }), 'CHECK_TX');

      let result;
      const responseText = await response.text();
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error('🔴 Bakong API returned non-JSON response (WAF/Block?):', responseText.substring(0, 500));
        return { success: false, message: 'Bakong Gateway returned an invalid response (Blocked?)' };
      }
      
      if (process.env.NODE_ENV !== 'production' || true) { 
        console.log(`📡 Bakong API Response for ${md5}:`, JSON.stringify(result));
      }

      // 🛡️ Principal: Bakong API might return status in root or status object
      const responseCode = result.responseCode !== undefined ? result.responseCode : result.status?.code;
      const errorCode = result.errorCode !== undefined ? result.errorCode : result.status?.errorCode;
      const message = result.responseMessage || result.status?.message || 'Transaction not found or pending';

      if (responseCode === 0) {
        return { 
          success: true, 
          data: result.data, 
          message: 'Payment detected successfully' 
        };
      }

      // 🛡️ Identify Stale/Invalid Context (errorCode 15: Internal Error or Not Found)
      const isStale = errorCode === 15;

      return { 
        success: false, 
        isStale,
        message: message 
      };
    } catch (error) {
      console.error('🔴 Bakong API Error:', error.message);
      return { success: false, message: 'Failed to communicate with Bakong network' };
    }
  }

  async checkHealth() {
    // 🛡️ Health Check: Verifies if the Bakong API is reachable and Token is valid.
    // Optimized: Memory cache for 10 minutes to prevent slow order creation.
    if (this._healthCache && (Date.now() - this._healthLastCheck < 10 * 60 * 1000)) {
      return this._healthCache;
    }

    if (!this.token) return { success: false, message: 'Bakong API Token not configured' };
    
    const dummyMd5 = '36e47644e7e64d364e4ed284f86feb9b';
    const endpoint = `${this.apiUrl}/v1/check_transaction_by_md5`;

    try {
      const response = await this._withTimeout(fetch(endpoint, {
        method: 'POST',
        agent: this.agent,
        headers: {
          ...this.commonHeaders,
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ md5: dummyMd5 })
      }), 'CHECK_HEALTH');

      let result;
      const responseText = await response.text();
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error('🔴 Bakong Health Check returned non-JSON:', responseText.substring(0, 500));
        return { success: false, message: 'Connectivity Blocked by Gateway' };
      }
      
      const responseCode = result.responseCode !== undefined ? result.responseCode : result.status?.code;
      const errorCode = result.errorCode !== undefined ? result.errorCode : result.status?.errorCode;

      let status;
      if (responseCode === 0 || errorCode === 1) {
        status = { success: true, message: 'Bakong Gateway is healthy' };
      } else {
        status = { success: false, message: result.responseMessage || 'Bakong Gateway authentication failed' };
      }

      this._healthCache = status;
      this._healthLastCheck = Date.now();
      return status;
    } catch (error) {
      return { success: false, message: 'Cannot reach Bakong Gateway' };
    }
  }
}

module.exports = new BakongService();
