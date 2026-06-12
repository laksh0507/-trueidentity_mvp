# TrueIdentity MVP: Zero-Trust Telecom Infrastructure

**"Bureau.id guesses if fraud happened. TrueIdentity prevents fraud before it happens."**

TrueIdentity is an enterprise-grade telecom identity and authentication infrastructure designed to replace legacy SMS-based OTPs and plain-text phone numbers. By combining **Hardware-Level Cryptography (RSA-2048)** with **Telecom-Level SIM Epoch Binding**, TrueIdentity mathematically eliminates the most dangerous fraud vectors in the world: SIM Swap Fraud, SS7 Interception, and Vishing.

## 🛑 The Industry Problem
Current authentication systems (like Twilio Authy) and fraud detection tools (like Bureau.id) are fundamentally flawed:
- **Bureau.id is Probabilistic:** It uses behavioral biometrics to "guess" if a SIM swap occurred *after* the fraudster has already intercepted the OTP. 
- **SMS is Unencrypted:** If a state-sponsored hacker or dark-web criminal executes an SS7 interception attack, they can read SMS OTPs in plain text without ever touching the victim's phone.
- **Identity is Spoofable:** On platforms like Truecaller, scammers can simply type "Kotak Fraud Support" as their name and trick innocent people.

## 🛡️ The TrueIdentity Solution (8 Problems Solved)

### Pillar 1: TrueIdentity Caller (Anti-Social Engineering)
1. **The Identity Spoofing Problem:** We use cryptographic signatures for caller ID. No one can fake their identity because the name on the screen is mathematically proven by the enterprise server.
2. **The Vishing / Scam Call Problem:** Scammers cannot trick users into believing they are from FedEx or a Bank. Unsigned calls are flagged as "Unverified," destroying social engineering vectors.

### Pillar 2: TrueIdentity SecureOTP (Anti-Interception)
3. **The SIM Swap Problem:** We check the exact microsecond the SIM was activated via Telecom APIs (`bound_sim_epoch`). Fraudsters cannot port numbers to intercept messages.
4. **The SS7 Interception Problem:** OTPs are encrypted via RSA-2048. The SMS travels over the network as unreadable gibberish.
5. **The Malware Screen-Recording Problem:** We enforce native OS `FLAG_SECURE`. Hackers cannot use malware to screenshot or record the decrypted OTP on the user's screen.

### Pillar 3: Infrastructure & Adoption (The Enterprise Wedge)
6. **The Bank Integration Problem:** Banks do not write complex cryptography. They write 1 line of code (`TrueIdentity.sendOTP()`), and our Gateway handles the routing and encryption serverside.
7. **The "Keypad Phone" Adoption Problem:** Progressive Adoption guarantees 100% bank coverage. Keypad users automatically fall back to plain SMS (still protected by SIM epoch).
8. **The Emergency Response Problem:** *Guardian Lock* provides an API-driven kill-switch to instantly brick a compromised SIM card in milliseconds.

## 🏗️ The Architecture
TrueIdentity is divided into a 3-part ecosystem:

1. **Key Server (Node.js / Express / Prisma)**
   - Acts as an intelligent gateway for enterprise banks.
   - Handles public key registration and generates SHA-256 Key Fingerprints to prevent server tampering.
   - Validates HMAC signatures from banks to prevent SMS spoofing.
   - Enforces Progressive Adoption fallback routing.

2. **Mobile App (React Native / Expo)**
   - Generates RSA-2048 keypairs natively on the device.
   - Stores the Private Key in the physical hardware chip (iOS Secure Enclave / Android Keystore).
   - Passively intercepts the `TI:` watermarked SMS, verifies the bank's signature, and decrypts the OTP in a Zero-Touch UI.

3. **Bank SDK (NPM Package)**
   - A drop-in replacement for standard SMS providers (Twilio). 

## 🚀 Getting Started

### 1. Run the Key Server
```bash
cd key-server
npm install
npx prisma db push
npx ts-node src/index.ts
```

### 2. Run the SecureOTP Demo (Simulates Bank + SS7 Intercept)
```bash
cd key-server
npx ts-node src/demo.ts
```

### 3. Run the Mobile App UI
```bash
cd mobile-app
npm install
npx expo start
```

## 🔐 Security Audit
This architecture has been audited and hardened against advanced enterprise threats:
- **NOTP Attack Protected:** via Android `FLAG_SECURE`.
- **Public Key Substitution Protected:** via SHA-256 Key Pinning.
- **SMS Watermark Spoofing Protected:** via HMAC-SHA256 OTP signatures.
- **Carrier API Timeout Protected:** via Progressive Adoption Fallback.
