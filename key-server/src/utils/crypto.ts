import crypto from 'crypto';
// @ts-ignore
import kyber from 'crystals-kyber';

// ─────────────────────────────────────────────────────────
// POST-QUANTUM KEY GENERATION (Kyber-1024)
// Generates keys that are mathematically secure against quantum computers
// ─────────────────────────────────────────────────────────
export function generateRSAKeyPair(): { publicKey: string; privateKey: string } {
  // We rename the internal logic but keep the function name so we don't break the DB schema/seed right now
  // This generates Kyber-1024 keys (Level 5 Security - highest NIST standard)
  const pk_sk = kyber.KeyGen1024();
  return {
    publicKey: Buffer.from(pk_sk[0]).toString('base64'),
    privateKey: Buffer.from(pk_sk[1]).toString('base64'),
  };
}

// ─────────────────────────────────────────────────────────
// ENCRYPT OTP — Post-Quantum Kyber + AES-256-GCM
// ─────────────────────────────────────────────────────────
export function encryptOTP(otp: string, publicKeyBase64: string, bankId: string, bankSecret: string): string {
  // 1. Generate HMAC signature (Anti-Spoofing)
  const otpSignature = crypto.createHmac('sha256', bankSecret).update(otp).digest('hex');

  const payload = JSON.stringify({
    otp,
    bankId,
    otpSignature,
    timestamp: Math.floor(Date.now() / 1000),
    nonce: crypto.randomBytes(16).toString('hex'),
  });

  // 2. Decode the user's Kyber Public Key
  const pkArray = new Uint8Array(Buffer.from(publicKeyBase64, 'base64'));

  // 3. Encapsulate a Shared Secret using Kyber-1024 (Quantum-Safe KEM)
  const c_ss = kyber.Encrypt1024(pkArray);
  const encapsulatedCiphertext = Buffer.from(c_ss[0]).toString('base64');
  const sharedSecret = Buffer.from(c_ss[1]); // 32-byte AES key

  // 4. Encrypt the actual OTP payload using AES-256-GCM
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', sharedSecret, iv);
  
  let encryptedPayload = cipher.update(payload, 'utf8', 'base64');
  encryptedPayload += cipher.final('base64');
  const authTag = cipher.getAuthTag().toString('base64');

  // The final SMS contains the Kyber ciphertext, the AES IV, AuthTag, and Payload
  const finalMessage = JSON.stringify({
    k: encapsulatedCiphertext,
    i: iv.toString('base64'),
    t: authTag,
    p: encryptedPayload
  });

  return Buffer.from(finalMessage).toString('base64');
}

// ─────────────────────────────────────────────────────────
// DECRYPT OTP — Runs on user's device
// ─────────────────────────────────────────────────────────
export function decryptOTP(encryptedBase64: string, privateKeyBase64: string): any {
  // 1. Parse the incoming SMS
  const decodedStr = Buffer.from(encryptedBase64, 'base64').toString('utf8');
  const msg = JSON.parse(decodedStr);

  const skArray = new Uint8Array(Buffer.from(privateKeyBase64, 'base64'));
  const cArray = new Uint8Array(Buffer.from(msg.k, 'base64'));

  // 2. Decapsulate the shared secret using Kyber-1024 Private Key
  const ssArray = kyber.Decrypt1024(cArray, skArray);
  const sharedSecret = Buffer.from(ssArray);

  // 3. Decrypt the payload using AES-256-GCM
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm', 
    sharedSecret, 
    Buffer.from(msg.i, 'base64')
  );
  decipher.setAuthTag(Buffer.from(msg.t, 'base64'));

  let decrypted = decipher.update(msg.p, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  const payload = JSON.parse(decrypted);

  // 4. Expiration check
  const age = Math.floor(Date.now() / 1000) - payload.timestamp;
  if (age > 60) throw new Error('OTP_EXPIRED');

  return payload;
}

// ─────────────────────────────────────────────────────────
// HASH PUBLIC KEY — Post-Quantum Fingerprint
// ─────────────────────────────────────────────────────────
export function generateKeyFingerprint(publicKeyBase64: string): string {
  return crypto.createHash('sha256').update(publicKeyBase64).digest('hex');
}
