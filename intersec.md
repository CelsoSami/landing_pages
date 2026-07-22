<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <defs>
    <radialGradient id="bg" cx="65%" cy="50%" r="85%">
      <stop offset="0%" stop-color="#0a1a0a"/>
      <stop offset="60%" stop-color="#050f05"/>
      <stop offset="100%" stop-color="#020402"/>
    </radialGradient>
    <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="4" result="b1"/>
      <feGaussianBlur stdDeviation="9" in="SourceGraphic" result="b2"/>
      <feGaussianBlur stdDeviation="16" in="SourceGraphic" result="b3"/>
      <feMerge>
        <feMergeNode in="b3"/>
        <feMergeNode in="b2"/>
        <feMergeNode in="b1"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="glowSoft" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="6" result="b1"/>
      <feMerge>
        <feMergeNode in="b1"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <linearGradient id="fadeR" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00ff41" stop-opacity="0"/>
      <stop offset="40%" stop-color="#00ff41" stop-opacity="1"/>
      <stop offset="100%" stop-color="#00ff41" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="fadeD" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#00ff41" stop-opacity="0"/>
      <stop offset="50%" stop-color="#00ff41" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#00ff41" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <!-- Fundo -->
  <rect width="1920" height="1080" fill="url(#bg)"/>
  <!-- ============================================ -->
  <!-- BORDA EXTERNA -->
  <!-- ============================================ -->
  <g filter="url(#glow)">
    <line x1="40" y1="40" x2="1880" y2="40" stroke="#00ff41" stroke-width="5" opacity="0.5"/>
    <line x1="40" y1="1040" x2="1880" y2="1040" stroke="#00ff41" stroke-width="5" opacity="0.5"/>
    <line x1="40" y1="40" x2="40" y2="1040" stroke="#00ff41" stroke-width="5" opacity="0.5"/>
    <line x1="1880" y1="40" x2="1880" y2="1040" stroke="#00ff41" stroke-width="5" opacity="0.5"/>
  </g>
  <!-- Cantos -->
  <g filter="url(#glow)" stroke="#00ff41" fill="none" stroke-width="5.5" opacity="0.7">
    <polyline points="20,20 20,110"/>
    <polyline points="20,20 110,20"/>
    <circle cx="20" cy="20" r="5" fill="#00ff41"/>
    <polyline points="1900,20 1900,110"/>
    <polyline points="1900,20 1810,20"/>
    <circle cx="1900" cy="20" r="5" fill="#00ff41"/>
    <polyline points="20,1060 20,970"/>
    <polyline points="20,1060 110,1060"/>
    <circle cx="20" cy="1060" r="5" fill="#00ff41"/>
    <polyline points="1900,1060 1900,970"/>
    <polyline points="1900,1060 1810,1060"/>
    <circle cx="1900" cy="1060" r="5" fill="#00ff41"/>
  </g>
  <!-- ============================================ -->
  <!-- LINHA DE MEIO DE CAMPO -->
  <!-- ============================================ -->
  <line x1="960" y1="40" x2="960" y2="1040" stroke="#00ff41" stroke-width="5" filter="url(#glow)" opacity="0.5"/>
  <!-- ============================================ -->
  <!-- CIRCULO CENTRAL (mesma espessura da borda) -->
  <!-- ============================================ -->
  <circle cx="960" cy="540" r="150" fill="none" stroke="#00ff41" stroke-width="5" filter="url(#glow)" opacity="0.45"/>
  <circle cx="960" cy="540" r="5" fill="#00ff41" filter="url(#glow)" opacity="0.5"/>
</svg>
