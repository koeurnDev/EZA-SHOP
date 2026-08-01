const { BakongKHQR, IndividualInfo, khqrData } = require('bakong-khqr');
const khqr = new BakongKHQR();

const bakongId = 'seab_koeurn@bkrt';
const merchantName = 'MO MO';
const optionalData = {
  amount: 0.09,
  currency: khqrData.currency.usd,
  billNumber: 'MO-123456',
  expirationTimestamp: Date.now() + 15 * 60 * 1000,
  merchantCategoryCode: '5999'
};

const individualInfo = new IndividualInfo(
  bakongId,
  merchantName,
  'Phnom Penh',
  optionalData
);

const result = khqr.generateIndividual(individualInfo);
console.log(JSON.stringify(result, null, 2));
