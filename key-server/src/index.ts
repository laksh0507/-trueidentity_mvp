require('dotenv').config();
import express from 'express';
import cors from 'cors';
import usersRouter from './routes/users';
import keysRouter from './routes/keys';
import decryptRouter from './routes/decrypt';

const app = express();
app.use(cors());
app.use(express.json());

// ─── Routes ────────────────────────────────────────────
app.use('/api/users', usersRouter);
app.use('/api/keys', keysRouter);
app.use('/api/decrypt', decryptRouter);

// ─── Health check ──────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'TrueIdentity Key Server' }));

const PORT = process.env.PORT || 4002;
app.listen(PORT, () => {
  console.log(`
🔐 TrueIdentity SecureOTP Key Server
======================================
🚀 Running on:     http://localhost:${PORT}
📡 Register user:  POST /api/users/register
📡 Upload key:     POST /api/keys/upload
📡 Get public key: GET  /api/keys/:phoneNumber
📡 Encrypt OTP:    POST /api/keys/encrypt-otp   ← Banks use this
📡 Decrypt OTP:    POST /api/decrypt/otp         ← App does this on-device
📡 Health:         GET  /health
======================================
⚠️  SS7 attackers intercepting SMS will see only gibberish.
`);
});
