import crypto from 'crypto';

// ─────────────────────────────────────────────────────────
// KEY PAIR GENERATION — runs on user's device only
// Private key NEVER leaves the device.
// ─────────────────────────────────────────────────────────
export function generateRSAKeyPair(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding:  { type: 'spki',  format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { publicKey, privateKey };
}

// ─────────────────────────────────────────────────────────
// ENCRYPT OTP — runs on Bank's server using public key
// Adds HMAC signature to prevent SMS spoofing
// ─────────────────────────────────────────────────────────
export function encryptOTP(otp: string, publicKeyPem: string, bankId: string, bankSecret: string): string {
  // Generate HMAC signature of the OTP so the app knows it's authentic
  const otpSignature = crypto.createHmac('sha256', bankSecret).update(otp).digest('hex');

  const payload = JSON.stringify({
    otp,
    bankId,
    otpSignature,
    timestamp: Math.floor(Date.now() / 1000),
    nonce: crypto.randomBytes(16).toString('hex'),
  });

  const encrypted = crypto.publicEncrypt(
    { key: publicKeyPem, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
    Buffer.from(payload)
  );

  return encrypted.toString('base64');
}

// ─────────────────────────────────────────────────────────
// DECRYPT OTP — runs on user's device using private key
// Used by the TrueIdentity mobile app
// ─────────────────────────────────────────────────────────
export function decryptOTP(encryptedBase64: string, privateKeyPem: string): any {
  const decrypted = crypto.privateDecrypt(
    { key: privateKeyPem, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
    Buffer.from(encryptedBase64, 'base64')
  );

  const payload = JSON.parse(decrypted.toString());

  // OTP expires after 60 seconds — prevents replay attacks
  const age = Math.floor(Date.now() / 1000) - payload.timestamp;
  if (age > 60) throw new Error('OTP_EXPIRED');

  return payload; // Returns full payload including bankId and signature for verification
}

// ─────────────────────────────────────────────────────────
// HASH PUBLIC KEY — creates the key fingerprint
// ─────────────────────────────────────────────────────────
export function generateKeyFingerprint(publicKeyPem: string): string {
  return crypto.createHash('sha256').update(publicKeyPem).digest('hex');
}
