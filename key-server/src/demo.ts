import fs from 'fs';

async function runDemo() {
  const base = 'http://localhost:4002/api';
  console.log('================================================');
  console.log('  TrueIdentity SecureOTP - SS7 Attack Demo');
  console.log('================================================\n');

  // Step 1: Register
  console.log('[STEP 1] Registering user +919876543210...');
  const regRes = await fetch(`${base}/users/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: '+919876543210' })
  });
  const regData: any = await regRes.json();
  console.log(regData.error ? `Already registered (which is fine!)` : `Registered successfully`);

  // Step 2: Encrypt OTP
  console.log('\n[STEP 2] Bank (KOTAK) requests OTP for +919876543210...');
  const encRes = await fetch(`${base}/keys/encrypt-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: '+919876543210', otp: '847291', bankId: 'KOTAK' })
  });
  const encData: any = await encRes.json();
  const smsContent = encData.smsContent;
  
  if (encData.mode === 'ENCRYPTED') {
    console.log('\n\x1b[35mEncrypted SMS Content:\x1b[0m', smsContent);
    console.log('\x1b[31m(An SS7 attacker intercepting this SMS sees ONLY the above - useless!)\x1b[0m');

    // Step 3: Decrypt OTP
    console.log('\n[STEP 3] Simulating TrueIdentity app decryption on user device...');
    const privateKey = fs.readFileSync('private.key', 'utf-8');
    
    const decRes = await fetch(`${base}/decrypt/otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ encryptedSms: smsContent, privateKey })
    });
    const decData: any = await decRes.json();

    if (decData.error) {
      console.error('\n❌ Decryption failed:', decData.error);
    } else {
      console.log(`\n\x1b[32m✅ OTP revealed to user: ${decData.otp}\x1b[0m`);
      console.log('================================================');
      console.log('  SS7 attack defeated. Bank fraud prevented.');
      console.log('================================================');
    }
  } else {
    // Progressive Adoption Fallback
    console.log('\n\x1b[33mProgressive Adoption Triggered:\x1b[0m', encData.message);
    console.log('\x1b[35mPlain SMS Content:\x1b[0m', smsContent);
    console.log('\x1b[31m(User has no app. SIM Swap is prevented by Epoch check, but SS7 is vulnerable.)\x1b[0m');
  }

  // Bonus Demo: The Feature Phone User
  console.log('\n\n--- BONUS DEMO: PROGRESSIVE ADOPTION (FEATURE PHONE) ---');
  console.log('Bank requests OTP for an unregistered feature phone (+911111111111)...');
  const fallbackRes = await fetch(`${base}/keys/encrypt-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: '+911111111111', otp: '123456', bankId: 'KOTAK' })
  });
  const fallbackData: any = await fallbackRes.json();
  console.log(`\x1b[33mServer Mode: ${fallbackData.mode}\x1b[0m`);
  console.log(`\x1b[32mAction: ${fallbackData.message}\x1b[0m`);
}

runDemo().catch(console.error);
