import { PrismaClient } from '@prisma/client';
import { generateRSAKeyPair, generateKeyFingerprint } from '../utils/crypto';
import fs from 'fs';

const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding test user...');

  // Create a test user
  const user = await prisma.user.upsert({
    where: { phone_number: '+919876543210' },
    update: {},
    create: { phone_number: '+919876543210' },
  });

  // Generate key pair (simulating what the mobile app does on device)
  const { publicKey, privateKey } = generateRSAKeyPair();

  // Upload only public key to server
  const keyFingerprint = generateKeyFingerprint(publicKey);
  await prisma.publicKey.upsert({
    where: { user_id_key_version: { user_id: user.id, key_version: 1 } },
    update: { public_key: publicKey, key_fingerprint: keyFingerprint },
    create: { user_id: user.id, public_key: publicKey, key_version: 1, key_fingerprint: keyFingerprint },
  });

  fs.writeFileSync('private.key', privateKey);

  console.log('✅ Test user created: +919876543210');
  console.log('\n✅ PRIVATE KEY saved to "private.key" (for testing only)');

  await prisma.$disconnect();
}

seed().catch(console.error);
