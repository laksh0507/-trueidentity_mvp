import { Router, Request, Response } from 'express';
import { decryptOTP } from '../utils/crypto';
import crypto from 'crypto';

const MOCK_BANK_SECRETS: Record<string, string> = {
  'KOTAK': 'super_secret_kotak_key_123',
};

const router = Router();

// POST /api/decrypt/otp
// This endpoint SIMULATES what the TrueIdentity mobile app does locally.
// In production, decryption happens on-device — private key never sent here.
// This endpoint is for DEMO/TESTING ONLY.
router.post('/otp', async (req: Request, res: Response) => {
  const { encryptedSms, privateKey } = req.body;

  if (!encryptedSms || !privateKey) {
    return res.status(400).json({ error: 'encryptedSms and privateKey required' });
  }

  try {
    // Strip the watermark prefix
    const encrypted = encryptedSms.startsWith('TI:')
      ? encryptedSms.slice(3)
      : encryptedSms;

    const payload = decryptOTP(encrypted, privateKey);
    const { otp, bankId, otpSignature } = payload;

    // Verify SMS authenticity (Anti-Spoofing)
    const bankSecret = MOCK_BANK_SECRETS[bankId];
    if (!bankSecret) throw new Error('UNKNOWN_BANK');

    const expectedSignature = crypto.createHmac('sha256', bankSecret).update(otp).digest('hex');
    if (expectedSignature !== otpSignature) {
      return res.status(403).json({ error: 'SMS SPOOFING DETECTED: Invalid signature.' });
    }

    return res.json({
      success: true,
      otp,
      bankId,
      message: 'OTP decrypted and signature verified successfully.',
    });
  } catch (err: any) {
    if (err.message === 'OTP_EXPIRED') {
      return res.status(410).json({ error: 'OTP has expired (> 60 seconds old).' });
    }
    return res.status(400).json({ error: 'Decryption failed. Wrong private key or corrupted message.' });
  }
});

export default router;
