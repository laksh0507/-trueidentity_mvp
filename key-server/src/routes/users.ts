import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// POST /api/users/register
// Called when user installs TrueIdentity app and completes epoch verification
router.post('/register', async (req: Request, res: Response) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) return res.status(400).json({ error: 'phoneNumber required' });

  try {
    const existing = await prisma.user.findUnique({ where: { phone_number: phoneNumber } });
    if (existing) {
      return res.status(409).json({ error: 'Already registered', userId: existing.id });
    }

    const user = await prisma.user.create({ data: { phone_number: phoneNumber } });

    return res.status(201).json({
      success: true,
      message: 'Registered. Now upload your public key.',
      userId: user.id,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/:phoneNumber
router.get('/:phoneNumber', async (req: Request, res: Response) => {
  const { phoneNumber } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: { phone_number: phoneNumber },
      select: { id: true, phone_number: true, status: true, created_at: true },
    });
    if (!user) return res.status(404).json({ error: 'Not found' });
    return res.json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
