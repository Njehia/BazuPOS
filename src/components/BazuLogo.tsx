import React from 'react';

interface BazuLogoProps {
  className?: string;
  size?: number | string;
  showText?: boolean;
}

/**
 * BazuPOS Official Brand Logo
 * 
 * Recreates the exact emblem and typography uploaded by the user:
 * - Rounded squircle tile with dark amber-to-midnight-navy gradient
 * - Gold and white heraldic shield
 * - Liquor bottle silhouette in warm gold
 * - White vertical rising bar chart columns
 * - Upward trending golden growth zigzag arrow slashing across
 * - "BAZU" in amber gold + "POS" in crisp white
 */
export const BazuLogo: React.FC<BazuLogoProps> = ({
  className = 'w-32 h-32',
  size,
  showText = true,
}) => {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <div
      className={`relative inline-block select-none aspect-square shrink-0 ${className}`}
      style={style}
      aria-label="Bazu POS Logo"
    >
      <svg
        viewBox="0 0 512 512"
        className="w-full h-full drop-shadow-xl"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Squircle Background Gradient */}
          <radialGradient id="bazuBgGlow" cx="35%" cy="25%" r="70%">
            <stop offset="0%" stopColor="#C27A1C" />
            <stop offset="28%" stopColor="#784109" />
            <stop offset="55%" stopColor="#141E34" />
            <stop offset="100%" stopColor="#070C1B" />
          </radialGradient>

          {/* Metallic Gold Gradient */}
          <linearGradient id="bazuGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FCD34D" />
            <stop offset="35%" stopColor="#F59E0B" />
            <stop offset="75%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>

          {/* Shield Drop Shadow */}
          <filter id="bazuShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#000000" floodOpacity="0.65" />
          </filter>
        </defs>

        {/* 1. Squircle App Icon Tile with Smooth Rounded Corners */}
        <rect width="512" height="512" rx="116" ry="116" fill="url(#bazuBgGlow)" />

        {/* Subtle Inner Highlight Rim */}
        <rect
          width="510"
          height="510"
          x="1"
          y="1"
          rx="115"
          ry="115"
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity="0.08"
          strokeWidth="2"
        />

        {/* 2. Central Emblem Group */}
        <g filter="url(#bazuShadow)">
          {/* Left Gold Shield Border Contour */}
          <path
            d="M 256,126 
               C 215,130 188,142 178,148 
               C 174,166 172,210 178,252 
               C 188,310 230,344 256,356 
               L 256,340
               C 236,328 198,298 192,250 
               C 187,215 188,175 192,160 
               C 206,152 232,143 256,140 Z"
            fill="url(#bazuGoldGrad)"
          />

          {/* Right White Shield Border Contour */}
          <path
            d="M 256,126 
               C 297,130 324,142 334,148 
               C 338,166 340,210 334,252 
               C 324,310 282,344 256,356 
               L 256,340
               C 276,328 314,298 320,250 
               C 325,215 324,175 320,160 
               C 306,152 280,143 256,140 Z"
            fill="#FFFFFF"
          />

          {/* Liquor Bottle Silhouette (Warm Gold) */}
          <path
            d="M 248,102 
               L 264,102 
               C 265,102 266,103 266,105
               L 266,112
               C 264,113 260,114 256,114
               C 252,114 248,113 246,112
               L 246,105
               C 246,103 247,102 248,102 Z"
            fill="url(#bazuGoldGrad)"
          />
          <path
            d="M 249,114
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
            fill="url(#bazuGoldGrad)"
          />

          {/* Bottle Specular Highlight */}
          <path
            d="M 251,120 L 253,120 L 253,158 C 253,168 245,178 238,188 C 233,196 230,206 230,222 L 230,270 L 226,270 L 226,224 C 226,204 229,193 234,185 C 242,174 251,164 251,154 Z"
            fill="#FEF3C7"
            opacity="0.6"
          />

          {/* Rising Financial Bar Chart (White Columns) */}
          <rect x="238" y="246" width="13" height="74" rx="2" fill="#FFFFFF" />
          <rect x="256" y="222" width="14" height="98" rx="2" fill="#FFFFFF" />
          <rect x="275" y="196" width="14" height="124" rx="2" fill="#FFFFFF" />
          <rect x="294" y="174" width="13" height="106" rx="2" fill="#FFFFFF" />

          {/* Upward Growth Arrow (Gold Zigzag trendline slashing across) */}
          <path
            d="M 182,254
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
            fill="url(#bazuGoldGrad)"
            stroke="#78350F"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M 186,256 L 224,222 L 251,275 L 350,154 L 374,136 L 354,166 L 254,286 Z"
            fill="#FEF3C7"
            opacity="0.4"
          />
        </g>

        {/* 3. Brand Typography: "BAZU POS" */}
        {showText && (
          <g id="brandText" filter="url(#bazuShadow)">
            <text
              x="238"
              y="415"
              textAnchor="end"
              fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', 'Montserrat', 'Inter', sans-serif"
              fontSize="44"
              fontWeight="900"
              letterSpacing="2"
              fill="#F59E0B"
            >
              BAZU
            </text>
            <text
              x="252"
              y="415"
              textAnchor="start"
              fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', 'Montserrat', 'Inter', sans-serif"
              fontSize="44"
              fontWeight="900"
              letterSpacing="2"
              fill="#FFFFFF"
            >
              POS
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};
