import CryptoJS from 'crypto-js';

const CLEANVERSE_API_KEY = 'REDACTED';
const CLEANVERSE_API_ID = 'REDACTED';
const BASE_URL = 'https://uatapi.cleanverse.com/api/cooperate';

// AES/CBC/PKCS5Padding with fixed zero IV
function encrypt(plaintext: string): string {
  const key = CryptoJS.enc.Base64.parse(CLEANVERSE_API_KEY);
  const iv = CryptoJS.lib.WordArray.create(new Uint8Array(16)); // 16 zero bytes
  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    iv,
    padding: CryptoJS.pad.Pkcs7,
    mode: CryptoJS.mode.CBC,
  });
  return encrypted.toString(); // Base64 ciphertext
}

function decrypt(ciphertext: string): string {
  const key = CryptoJS.enc.Base64.parse(CLEANVERSE_API_KEY);
  const iv = CryptoJS.lib.WordArray.create(new Uint8Array(16));
  const decrypted = CryptoJS.AES.decrypt(ciphertext, key, {
    iv,
    padding: CryptoJS.pad.Pkcs7,
    mode: CryptoJS.mode.CBC,
  });
  return decrypted.toString(CryptoJS.enc.Utf8);
}

export async function cleanverseRequest<T = any>(
  endpoint: string,
  body: Record<string, unknown>,
  encrypted = false
): Promise<{ code: string; data: T; message?: string }> {
  const url = `${BASE_URL}${endpoint}`;
  const payload = encrypted ? { data: encrypt(JSON.stringify(body)) } : body;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-id': CLEANVERSE_API_ID,
      ...(encrypted ? {} : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Cleanverse API error: ${res.status} ${res.statusText}`);
  }

  const responseText = await res.text();
  let responseJson: any;

  try {
    responseJson = JSON.parse(responseText);
  } catch {
    throw new Error(`Invalid JSON response from ${endpoint}`);
  }

  // If response contains encrypted data field, decrypt it
  if (responseJson.data && typeof responseJson.data === 'string' && responseJson.data.length > 100) {
    try {
      responseJson.data = JSON.parse(decrypt(responseJson.data));
    } catch {
      // Response data might not be encrypted
    }
  }

  return responseJson;
}

export { BASE_URL, CLEANVERSE_API_ID, CLEANVERSE_API_KEY, encrypt, decrypt };