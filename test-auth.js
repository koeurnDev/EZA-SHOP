const crypto = require('crypto');

const botTokenNew = "8647443117:AAE8Xxix8MwmVEi4ALeZH2QEfwA8n8TB0Ic";
const botTokenOld = "8684685343:AAGIXVUo9KCs_exH9UKSdQuOkoY-rewaLaI";

const initData = "query_id=AAGTIPVRAwAAAJMg9VGSo_ah&user=%7B%22id%22%3A7817470099%2C%22first_name%22%3A%22%E1%9E%9F%E1%9F%8A%E1%9E%B6%E1%9E%94%20%E1%9E%80%E1%9E%BF%E1%9E%93%22%2C%22last_name%22%3A%22-%20Seab%20Koeurn%22%2C%22username%22%3A%22Seab_Koeurn%22%2C%22language_code%22%3A%22en%22%2C%22allows_write_to_pm%22%3Atrue%2C%22photo_url%22%3A%22https%3A%5C%2F%5C%2Ft.me%5C%2Fi%5C%2Fuserpic%5C%2F320%5C%2FdoChAlTadPrDePDkTFOXAJ5_JooL-CISV6MaLlaT9nrFRXAHxlettO2LdVZ89tJC.svg%22%7D&auth_date=1786984903&signature=KojYPMk-Ab5qFO6qIqEQ_6MrAGL3aamWAS_XrZSoifVVjaZAV0yBnWAQRksJEldaqypbSaMKr9lvWW_T4_bzAw&hash=e7175770dc67a9f2d524246eb12f5c1ed9f5157ecc960f14b62dced40cb20a7e";

function verify(token, name) {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  
  const checkString = Array.from(urlParams.entries())
    .filter(([key]) => key !== 'hash' && key !== 'signature')
    .sort(([a], [b]) => a[0].localeCompare(b[0]))
    .map(([key, val]) => `${key}=${val}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');

  console.log(`${name}: Expected ${hash}, got ${calculatedHash}`);
  if (calculatedHash === hash) {
    console.log(`MATCH FOR ${name}!`);
  }
}

verify(botTokenNew, "NEW TOKEN");
verify(botTokenOld, "OLD TOKEN");
