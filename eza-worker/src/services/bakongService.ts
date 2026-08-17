import crypto from 'node:crypto';

export class BakongService {
  private apiUrl: string;
  private token: string | null;

  constructor(env: any) {
    this.apiUrl = env.BAKONG_API_URL || 'https://api-bakong.nbc.gov.kh';
    this.token = env.BAKONG_API_TOKEN || null;
  }

  generateMd5(qrString: string): string {
    return crypto.createHash('md5').update(qrString).digest('hex');
  }

  async checkTransaction(qrString: string): Promise<{ success: boolean; data?: any; message: string; isStale?: boolean }> {
    if (!this.token) {
      return { success: false, message: 'Bakong API Token not configured' };
    }

    const md5 = this.generateMd5(qrString);
    const endpoint = `${this.apiUrl}/v1/check_transaction_by_md5`;

    try {
      console.log(`🔍 Bakong: Checking transaction MD5: ${md5}`);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
        body: JSON.stringify({ md5 })
      });

      const responseText = await response.text();
      let result: any;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error('🔴 Bakong API returned non-JSON response:', responseText.substring(0, 500));
        return { success: false, message: 'Bakong Gateway returned an invalid response (Blocked?)' };
      }

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

      const isStale = errorCode === 15;

      return { 
        success: false, 
        isStale,
        message: message 
      };
    } catch (error: any) {
      console.error('🔴 Bakong API Error:', error.message);
      return { success: false, message: 'Failed to communicate with Bakong network' };
    }
  }

  async checkHealth(): Promise<{ success: boolean; message: string }> {
    if (!this.token) return { success: false, message: 'Bakong API Token not configured' };
    
    const dummyMd5 = '36e47644e7e64d364e4ed284f86feb9b';
    const endpoint = `${this.apiUrl}/v1/check_transaction_by_md5`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ md5: dummyMd5 })
      });

      const responseText = await response.text();
      let result: any;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        return { success: false, message: 'Connectivity Blocked by Gateway' };
      }
      
      const responseCode = result.responseCode !== undefined ? result.responseCode : result.status?.code;
      const errorCode = result.errorCode !== undefined ? result.errorCode : result.status?.errorCode;

      if (responseCode === 0 || errorCode === 1) {
        return { success: true, message: 'Bakong Gateway is healthy' };
      } else {
        return { success: false, message: result.responseMessage || 'Bakong Gateway authentication failed' };
      }
    } catch (error) {
      return { success: false, message: 'Cannot reach Bakong Gateway' };
    }
  }
}
