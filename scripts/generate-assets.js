import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Squircle Background Gradient -->
    <radialGradient id="bgGlow" cx="35%" cy="25%" r="70%">
      <stop offset="0%" stop-color="#C27A1C" />
      <stop offset="28%" stop-color="#784109" />
      <stop offset="55%" stop-color="#141E34" />
      <stop offset="100%" stop-color="#070C1B" />
    </radialGradient>

    <!-- Metallic Gold Gradient for Shield & Arrow -->
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FCD34D" />
      <stop offset="35%" stop-color="#F59E0B" />
      <stop offset="75%" stop-color="#D97706" />
      <stop offset="100%" stop-color="#B45309" />
    </linearGradient>

    <!-- Gold Edge Highlight -->
    <linearGradient id="goldHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FEF3C7" />
      <stop offset="50%" stop-color="#F59E0B" />
      <stop offset="100%" stop-color="#92400E" />
    </linearGradient>

    <!-- Subtle Drop Shadow for Shield and Emblem -->
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#000000" flood-opacity="0.65" />
    </filter>
  </defs>

  <!-- 1. Squircle App Icon Tile -->
  <rect width="512" height="512" rx="116" ry="116" fill="url(#bgGlow)" />

  <!-- Inner border sheen -->
  <rect width="510" height="510" x="1" y="1" rx="115" ry="115" fill="none" stroke="#FFFFFF" stroke-opacity="0.08" stroke-width="2" />

  <!-- Emblem Group with Shadow -->
  <g filter="url(#shadow)">
    <!-- 2. Shield Frame Outline (Gold on Left/Top, White on Right/Bottom) -->
    <!-- Left Gold Half of Shield Rim -->
    <path d="M 256,126 
             C 215,130 188,142 178,148 
             C 174,166 172,210 178,252 
             C 188,310 230,344 256,356 
             L 256,340
             C 236,328 198,298 192,250 
             C 187,215 188,175 192,160 
             C 206,152 232,143 256,140 Z" 
          fill="url(#goldGrad)" />

    <!-- Right White Half of Shield Rim -->
    <path d="M 256,126 
             C 297,130 324,142 334,148 
             C 338,166 340,210 334,252 
             C 324,310 282,344 256,356 
             L 256,340
             C 276,328 314,298 320,250 
             C 325,215 324,175 320,160 
             C 306,152 280,143 256,140 Z" 
          fill="#FFFFFF" />

    <!-- 3. Liquor Bottle Silhouette (Warm Gold) -->
    <!-- Bottle Lip & Neck -->
    <path d="M 248,102 
             L 264,102 
             C 265,102 266,103 266,105
             L 266,112
             C 264,113 260,114 256,114
             C 252,114 248,113 246,112
             L 246,105
             C 246,103 247,102 248,102 Z"
          fill="url(#goldGrad)" />
    
    <!-- Bottle Neck & Curved Shoulders & Body -->
    <path d="M 249,114
             L 263,114
             L 263,158
             C 263,170 274,182 282,194
             C 287,202 289,214 289,228
             L 289,295
             L 264,295
             L 248,295
             L 223,295
             L 223,228
             C 223,214 225,202 230,194
             C 238,182 249,170 249,158 Z"
          fill="url(#goldGrad)" />

    <!-- Bottle Left Specular Highlight -->
    <path d="M 251,120 L 253,120 L 253,158 C 253,168 245,178 238,188 C 233,196 230,206 230,222 L 230,270 L 226,270 L 226,224 C 226,204 229,193 234,185 C 242,174 251,164 251,154 Z"
          fill="#FEF3C7" opacity="0.6" />

    <!-- 4. Rising Financial Bar Chart (Crisp White Columns) -->
    <!-- Column 1 (Left-Center) -->
    <rect x="238" y="246" width="13" height="74" rx="2" fill="#FFFFFF" />
    
    <!-- Column 2 (Center) -->
    <rect x="256" y="222" width="14" height="98" rx="2" fill="#FFFFFF" />
    
    <!-- Column 3 (Right-Center) -->
    <rect x="275" y="196" width="14" height="124" rx="2" fill="#FFFFFF" />

    <!-- Column 4 (Rightmost) -->
    <rect x="294" y="174" width="13" height="106" rx="2" fill="#FFFFFF" />

    <!-- 5. Upward Growth Arrow (Gold Zigzag trendline slashing across) -->
    <!-- Trendline polygon with sharp faceted chevron arrow pointing up-right -->
    <path d="M 182,254
             L 224,218
             L 248,272
             L 348,150
             L 338,142
             L 378,134
             L 364,174
             L 354,166
             L 254,286
             L 224,234
             L 190,264 Z"
          fill="url(#goldGrad)" stroke="#78350F" stroke-width="1.5" stroke-linejoin="round" />

    <!-- Arrow faceted highlight -->
    <path d="M 186,256 L 224,222 L 251,275 L 350,154 L 374,136 L 354,166 L 254,286 Z"
          fill="#FEF3C7" opacity="0.4" />
  </g>

  <!-- 6. Brand Typography: "BAZU POS" -->
  <g id="brandText" filter="url(#shadow)">
    <!-- BAZU in Warm Amber Gold -->
    <text x="238" y="415" 
          text-anchor="end"
          font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', 'Montserrat', 'Inter', sans-serif" 
          font-size="44" 
          font-weight="900" 
          letter-spacing="2" 
          fill="#F59E0B">BAZU</text>
    
    <!-- POS in Crisp White -->
    <text x="252" y="415" 
          text-anchor="start"
          font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', 'Montserrat', 'Inter', sans-serif" 
          font-size="44" 
          font-weight="900" 
          letter-spacing="2" 
          fill="#FFFFFF">POS</text>
  </g>
</svg>`;

async function main() {
  const publicDir = path.resolve('public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Write base SVG
  fs.writeFileSync(path.join(publicDir, 'bazupos-logo.svg'), svgContent.trim());
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent.trim());
  console.log('Saved SVG files.');

  const svgBuffer = Buffer.from(svgContent);

  // 1. Standard 512x512 PNG
  await sharp(svgBuffer)
    .resize(512, 512)
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'pwa-512x512.png'));
  console.log('Generated pwa-512x512.png');

  // 2. Standard 192x192 PNG
  await sharp(svgBuffer)
    .resize(192, 192)
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'pwa-192x192.png'));
  console.log('Generated pwa-192x192.png');

  // 3. Apple Touch Icon (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Generated apple-touch-icon.png');

  // 4. Favicon 32x32 PNG
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));

  await sharp(svgBuffer)
    .resize(48, 48)
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'));
  console.log('Generated favicon.ico and favicon.png');

  // 5. Maskable Icon (safe zone: 80% with 10% outer bleed)
  // Create padded version for Android maskable icon
  const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
    <!-- Solid dark background bleed for adaptive shapes -->
    <rect width="512" height="512" fill="#0A1124" />
    <g transform="translate(51, 51) scale(0.8)">
      ${svgContent.replace('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">', '').replace('</svg>', '')}
    </g>
  </svg>`;

  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));
  console.log('Generated pwa-maskable-512x512.png');
}

main().catch((err) => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
