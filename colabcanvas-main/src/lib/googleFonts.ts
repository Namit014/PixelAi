/**
 * Google Fonts Integration
 * Handles loading and management of Google Fonts
 */

export interface GoogleFont {
  family: string;
  variants: string[];
  category: string;
}

// Comprehensive font library organized by category
export const FONT_CATEGORIES: Record<string, string[]> = {
  'Sans Serif': [
    'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 
    'Raleway', 'Nunito', 'Work Sans', 'DM Sans', 'Outfit', 'Manrope',
    'Plus Jakarta Sans', 'Figtree', 'Sora', 'Lexend', 'Space Grotesk',
    'Rubik', 'Quicksand', 'Karla', 'Barlow', 'Mulish', 'Nunito Sans',
    'Exo 2', 'Fira Sans', 'Hind', 'Josefin Sans', 'Kanit', 'Mukta',
    'Noto Sans', 'Overpass', 'Oxygen', 'Questrial', 'Red Hat Display',
    'Saira', 'Sen', 'Urbanist', 'Varela Round', 'Yantramanav'
  ],
  'Serif': [
    'Playfair Display', 'Merriweather', 'Lora', 'Source Serif Pro',
    'Libre Baskerville', 'Crimson Text', 'EB Garamond', 'Cormorant',
    'PT Serif', 'Bitter', 'Domine', 'Frank Ruhl Libre', 'Spectral',
    'Noto Serif', 'Cardo', 'Gelasio', 'IBM Plex Serif', 'Unna',
    'Vollkorn', 'Alegreya', 'Amiri', 'Arvo', 'Bree Serif', 'Cambo',
    'DM Serif Display', 'Fauna One', 'Gilda Display', 'Halant'
  ],
  'Display': [
    'Bebas Neue', 'Anton', 'Righteous', 'Lobster', 'Abril Fatface',
    'Comfortaa', 'Fredoka', 'Audiowide', 'Bungee', 'Permanent Marker',
    'Orbitron', 'Press Start 2P', 'Bangers', 'Black Ops One', 'Bowlby One',
    'Chewy', 'Cinzel', 'Courgette', 'Creepster', 'Monoton', 'Passion One',
    'Poiret One', 'Russo One', 'Secular One', 'Sigmar One',
    'Special Elite', 'Staatliches', 'Titan One', 'Ultra'
  ],
  'Handwriting': [
    'Dancing Script', 'Caveat', 'Satisfy', 'Pacifico', 'Great Vibes',
    'Kaushan Script', 'Shadows Into Light', 'Sacramento', 'Allura',
    'Amatic SC', 'Cookie', 'Damion', 'Gloria Hallelujah', 'Homemade Apple',
    'Indie Flower', 'Kalam', 'Marck Script', 'Merienda', 'Mr Dafoe',
    'Nanum Brush Script', 'Norican', 'Nothing You Could Do', 'Petit Formal Script',
    'Pinyon Script', 'Rock Salt', 'Rouge Script', 'Yellowtail', 'Zeyada'
  ],
  'Monospace': [
    'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'IBM Plex Mono',
    'Space Mono', 'Roboto Mono', 'Ubuntu Mono', 'Inconsolata',
    'Anonymous Pro', 'Courier Prime', 'DM Mono', 'Major Mono Display',
    'Nanum Gothic Coding', 'Overpass Mono', 'PT Mono', 'Red Hat Mono',
    'Share Tech Mono', 'VT323'
  ]
};

// Flattened list of all fonts for easy access
export const ALL_FONTS: string[] = Object.values(FONT_CATEGORIES).flat();

// Popular fonts to preload (top 30)
export const POPULAR_FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat',
  'Poppins', 'Raleway', 'Nunito', 'Playfair Display', 'Merriweather',
  'PT Sans', 'Ubuntu', 'Oswald', 'Source Sans Pro', 'Quicksand',
  'Work Sans', 'Rubik', 'DM Sans', 'Space Grotesk', 'Outfit',
  'Bebas Neue', 'Anton', 'Dancing Script', 'Pacifico', 'Caveat',
  'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'Manrope', 'Lexend'
];

// Cache for loaded fonts
const loadedFonts = new Set<string>();

/**
 * Preload popular Google Fonts
 */
export const preloadPopularFonts = () => {
  const link = document.createElement('link');
  link.href = `https://fonts.googleapis.com/css2?${POPULAR_FONTS.map(f => `family=${f.replace(/ /g, '+')}:wght@300;400;500;600;700;800;900`).join('&')}&display=swap`;
  link.rel = 'stylesheet';
  document.head.appendChild(link);
  
  POPULAR_FONTS.forEach(font => loadedFonts.add(font));
};

/**
 * Load a specific Google Font dynamically
 */
export const loadGoogleFont = (fontFamily: string, weights: number[] = [300, 400, 500, 600, 700, 800, 900]): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (loadedFonts.has(fontFamily)) {
      resolve();
      return;
    }

    const weightStr = weights.join(';');
    const link = document.createElement('link');
    link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@${weightStr}&display=swap`;
    link.rel = 'stylesheet';
    
    link.onload = () => {
      loadedFonts.add(fontFamily);
      resolve();
    };
    
    link.onerror = () => {
      console.error(`Failed to load font: ${fontFamily}`);
      reject(new Error(`Failed to load font: ${fontFamily}`));
    };
    
    document.head.appendChild(link);
  });
};

/**
 * Get list of all available fonts
 */
export const getPopularFonts = (): string[] => {
  return ALL_FONTS;
};

/**
 * Get fonts organized by category
 */
export const getFontsByCategory = (): Record<string, string[]> => {
  return FONT_CATEGORIES;
};

/**
 * Search fonts by name
 */
export const searchFonts = (query: string): string[] => {
  const lowerQuery = query.toLowerCase();
  return ALL_FONTS.filter(font => font.toLowerCase().includes(lowerQuery));
};

/**
 * Check if a font is loaded
 */
export const isFontLoaded = (fontFamily: string): boolean => {
  return loadedFonts.has(fontFamily);
};

/**
 * Unload a font (remove from DOM)
 */
export const unloadFont = (fontFamily: string) => {
  const links = document.querySelectorAll('link[rel="stylesheet"]');
  links.forEach(link => {
    if ((link as HTMLLinkElement).href.includes(fontFamily.replace(/ /g, '+'))) {
      link.remove();
      loadedFonts.delete(fontFamily);
    }
  });
};

// Defer popular font preload to avoid blocking critical rendering path
if (typeof window !== 'undefined') {
  const deferredLoad = () => preloadPopularFonts();
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(deferredLoad, { timeout: 3000 });
  } else {
    setTimeout(deferredLoad, 1500);
  }
}
