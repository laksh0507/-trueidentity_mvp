$base = "http://localhost:4002/api"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  TrueIdentity SecureOTP - SS7 Attack Demo" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Step 1: Register a user
Write-Host "`n[STEP 1] Registering user +919876543210..." -ForegroundColor Yellow
$reg = Invoke-RestMethod -Uri "$base/users/register" -Method Post `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"phoneNumber":"+919876543210"}'
Write-Host "Result: $($reg | ConvertTo-Json)" -ForegroundColor Green

# Step 2: Ask bank to encrypt an OTP for this user
Write-Host "`n[STEP 2] Bank (KOTAK) requests encrypted OTP for +919876543210..." -ForegroundColor Yellow
$enc = Invoke-RestMethod -Uri "$base/keys/encrypt-otp" -Method Post `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"phoneNumber":"+919876543210","otp":"847291","bankId":"KOTAK"}'

$smsContent = $enc.smsContent
Write-Host "Encrypted SMS Content: $smsContent" -ForegroundColor Magenta
Write-Host "(An SS7 attacker intercepting this SMS sees ONLY the above - useless!)" -ForegroundColor Red

# Step 3: Read private key from file
Write-Host "`n[STEP 3] Simulating TrueIdentity app decryption on user device..." -ForegroundColor Yellow
$privateKey = Get-Content -Raw -Path "private.key"

$decBody = @{
  encryptedSms = $smsContent
  privateKey   = $privateKey
} | ConvertTo-Json

$dec = Invoke-RestMethod -Uri "$base/decrypt/otp" -Method Post `
  -Headers @{"Content-Type"="application/json"} `
  -Body $decBody

Write-Host "`n✅ OTP revealed to user: $($dec.otp)" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  SS7 attack defeated. Bank fraud prevented." -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
