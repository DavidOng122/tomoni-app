import fs from 'node:fs/promises';
import path from 'node:path';

const AVATAR_COUNT = 100;
const OUTPUT_DIR = path.resolve(process.cwd(), 'public/images/avatars');

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  console.log(`Generating ${AVATAR_COUNT} Notionist-style avatars into ${OUTPUT_DIR}...`);

  for (let i = 1; i <= AVATAR_COUNT; i++) {
    const paddedIndex = String(i).padStart(3, '0');
    const filename = `avatar-${paddedIndex}.svg`;
    const filepath = path.join(OUTPUT_DIR, filename);

    // Use deterministic seeds for distinct, varied Notionist characters
    const seed = `yorimi-candidate-${paddedIndex}-seed`;
    const url = `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(seed)}&scale=100`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const svgText = await response.text();
      await fs.writeFile(filepath, svgText, 'utf8');
      console.log(`[${i}/${AVATAR_COUNT}] Saved ${filename}`);
    } catch (err) {
      console.error(`Failed to fetch avatar ${filename}:`, err);
    }
  }

  console.log('Successfully generated all 100 avatars!');
}

main().catch(console.error);
