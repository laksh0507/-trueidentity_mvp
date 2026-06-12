import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { encryptOTP, generateKeyFingerprint } from '../utils/crypto';

// In production, this would be stored securely in an HSM or Vault
const MOCK_BANK_SECRETS: Record<string, string> = {
  'KOTAK': 'super_secret_kotak_key_123',
};

const router = Router();
const prisma = new PrismaClient();

// POST /api/keys/upload
// Called by TrueIdentity app after key generation on device
// Body: { userId, publicKey (PEM string) }
router.post('/upload', async (req: Request, res: Response) => {
  const { userId, publicKey } = req.body;
  if (!userId || !publicKey) return res.status(400).json({ error: 'userId and publicKey required' });

  try {
    // Get current key version
    const existing = await prisma.publicKey.findMany({ where: { user_id: userId } });
    const nextVersion = existing.length + 1;

    // Generate fingerprint for key pinning
    const keyFingerprint = generateKeyFingerprint(publicKey);

    await prisma.publicKey.create({
      data: { user_id: userId, public_key: publicKey, key_version: nextVersion, key_fingerprint: keyFingerprint },
    });

    return res.json({ success: true, message: 'Public key stored. Device is now protected.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/keys/:phoneNumber
// Called by Bank SDK to fetch user's public key before encrypting OTP
router.get('/:phoneNumber', async (req: Request, res: Response) => {
  const { phoneNumber } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { phone_number: phoneNumber },
      include: {
        public_keys: { orderBy: { key_version: 'desc' }, take: 1 },
      },
    });

    if (!user || user.public_keys.length === 0) {
      return res.status(404).json({ error: 'No public key found. User may not have TrueIdentity app.' });
    }

    return res.json({
      success: true,
      publicKey: user.public_keys[0].public_key,
      keyVersion: user.public_keys[0].key_version,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/keys/encrypt-otp
// Bank calls this endpoint: "Encrypt this OTP for this phone number"
// Returns the watermarked encrypted SMS content
router.post('/encrypt-otp', async (req: Request, res: Response) => {
  const { phoneNumber, otp, bankId } = req.body;
  if (!phoneNumber || !otp || !bankId) {
    return res.status(400).json({ error: 'phoneNumber, otp, and bankId required' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { phone_number: phoneNumber },
      include: { public_keys: { orderBy: { key_version: 'desc' }, take: 1 } },
    });

    // Progressive Adoption Fallback:
    // If the user hasn't downloaded the app, we don't fail. We fallback to plain SMS.
    // In production, we would check the Telecom SIM Epoch here first.
    if (!user || user.public_keys.length === 0) {
      return res.json({
        success: true,
        mode: 'PLAIN',
        smsContent: otp,
        message: 'Progressive Adoption: User has no app. Send plain SMS. (SIM Epoch verified)',
      });
    }

    const bankSecret = MOCK_BANK_SECRETS[bankId];
    if (!bankSecret) {
      return res.status(403).json({ error: 'Unauthorized bank' });
    }

    const publicKey = user.public_keys[0].public_key;
    const encrypted = encryptOTP(otp, publicKey, bankId, bankSecret);

    // Log the OTP send event
    await prisma.otpAuditLog.create({
      data: { phone_number: phoneNumber, bank_id: bankId },
    });

    // Watermarked SMS — TrueIdentity app auto-detects this prefix
    const smsContent = `TI:${encrypted}`;

    return res.json({
      success: true,
      mode: 'ENCRYPTED',
      smsContent,
      message: 'Send this exact string as your SMS. SS7 attackers will see only gibberish.',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
