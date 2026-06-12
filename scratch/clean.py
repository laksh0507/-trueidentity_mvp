import re

with open('C:/Users/Admin/Desktop/otp/scratch/transcript.en.vtt', 'r', encoding='utf-8') as f:
    text = f.read()

# Remove timestamps
clean = re.sub(r'\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}.*\n', '', text)
# Remove VTT headers
clean = re.sub(r'WEBVTT.*\n', '', clean)
clean = re.sub(r'Kind: captions\nLanguage:.*\n', '', clean)
# Remove tags
clean = re.sub(r'<[^>]+>', '', clean)

lines = [line.strip() for line in clean.split('\n') if line.strip() and "align:start position" not in line]

dedup = []
for l in lines:
    if not dedup or dedup[-1] != l:
        dedup.append(l)

final_text = " ".join(dedup)
print(final_text[:3000])
print("\n--- SNIP ---\n")
print(final_text[3000:6000])
