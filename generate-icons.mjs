import sharp from 'sharp'

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6c63ff"/>
      <stop offset="100%" style="stop-color:#4834d4"/>
    </linearGradient>
  </defs>
  
  <!-- רקע -->
  <rect width="100" height="100" rx="22" fill="url(#bg)"/>
  
  <!-- מוח - צד שמאל -->
  <path d="M50 22 C38 22 28 30 28 42 C28 48 30 52 34 56 C32 58 31 61 32 64 C33 68 37 70 41 69 C42 72 45 74 48 74 L50 74 L50 22Z" fill="white" opacity="0.95"/>
  
  <!-- מוח - צד ימין -->
  <path d="M50 22 C62 22 72 30 72 42 C72 48 70 52 66 56 C68 58 69 61 68 64 C67 68 63 70 59 69 C58 72 55 74 52 74 L50 74 L50 22Z" fill="white" opacity="0.85"/>
  
  <!-- קו אמצע מוח -->
  <line x1="50" y1="24" x2="50" y2="72" stroke="#6c63ff" stroke-width="1.5" opacity="0.4"/>
  
  <!-- קמטי מוח שמאל -->
  <path d="M36 36 Q42 32 44 38" stroke="#6c63ff" stroke-width="1.5" fill="none" opacity="0.3"/>
  <path d="M32 48 Q38 44 40 50" stroke="#6c63ff" stroke-width="1.5" fill="none" opacity="0.3"/>
  <path d="M34 58 Q40 55 41 61" stroke="#6c63ff" stroke-width="1.5" fill="none" opacity="0.3"/>
  
  <!-- קמטי מוח ימין -->
  <path d="M64 36 Q58 32 56 38" stroke="#4834d4" stroke-width="1.5" fill="none" opacity="0.3"/>
  <path d="M68 48 Q62 44 60 50" stroke="#4834d4" stroke-width="1.5" fill="none" opacity="0.3"/>
  <path d="M66 58 Q60 55 59 61" stroke="#4834d4" stroke-width="1.5" fill="none" opacity="0.3"/>
  
  <!-- שעון - עיגול -->
  <circle cx="72" cy="72" r="16" fill="#ff6584"/>
  <circle cx="72" cy="72" r="13" fill="white"/>
  
  <!-- חוגים של השעון -->
  <line x1="72" y1="63" x2="72" y2="72" stroke="#4834d4" stroke-width="2" stroke-linecap="round"/>
  <line x1="72" y1="72" x2="79" y2="76" stroke="#ff6584" stroke-width="1.5" stroke-linecap="round"/>
  
  <!-- נקודת מרכז שעון -->
  <circle cx="72" cy="72" r="1.5" fill="#4834d4"/>
  
  <!-- סימוני שעות -->
  <circle cx="72" cy="61" r="1" fill="#6c63ff" opacity="0.5"/>
  <circle cx="72" cy="83" r="1" fill="#6c63ff" opacity="0.5"/>
  <circle cx="61" cy="72" r="1" fill="#6c63ff" opacity="0.5"/>
  <circle cx="83" cy="72" r="1" fill="#6c63ff" opacity="0.5"/>
</svg>`

const svgBuffer = Buffer.from(svg)

await sharp(svgBuffer).resize(192, 192).png().toFile('public/icon-192.png')
await sharp(svgBuffer).resize(512, 512).png().toFile('public/icon-512.png')

console.log('Icons created!')
