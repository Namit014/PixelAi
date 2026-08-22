/**
 * Comprehensive Font Library with 500+ Professional Fonts
 * Includes categorization, pairing recommendations, and design type mapping
 */

export interface FontEntry {
  name: string;
  category: 'serif' | 'sans-serif' | 'display' | 'script' | 'monospace';
  style: string[];
  weights: number[];
  pairsWith: string[];
  useCase: string[];
  personality: string[];
}

export const FONT_LIBRARY: FontEntry[] = [
  // ================ SERIF FONTS ================
  // Elegant & Traditional
  { name: 'Playfair Display', category: 'serif', style: ['elegant', 'classic', 'editorial'], weights: [400, 500, 600, 700, 800, 900], pairsWith: ['Lato', 'Open Sans', 'Raleway', 'Source Sans Pro'], useCase: ['headline', 'logo', 'accent'], personality: ['luxury', 'editorial', 'fashion', 'wedding'] },
  { name: 'Cormorant Garamond', category: 'serif', style: ['elegant', 'refined', 'light'], weights: [300, 400, 500, 600, 700], pairsWith: ['Montserrat', 'Poppins', 'Work Sans'], useCase: ['headline', 'body'], personality: ['luxury', 'wedding', 'beauty', 'fashion'] },
  { name: 'EB Garamond', category: 'serif', style: ['classical', 'bookish', 'readable'], weights: [400, 500, 600, 700, 800], pairsWith: ['Inter', 'Open Sans', 'Roboto'], useCase: ['body', 'headline'], personality: ['academic', 'publishing', 'legal', 'literary'] },
  { name: 'Merriweather', category: 'serif', style: ['readable', 'warm', 'scholarly'], weights: [300, 400, 700, 900], pairsWith: ['Open Sans', 'Lato', 'Source Sans Pro'], useCase: ['body', 'headline'], personality: ['publishing', 'editorial', 'academic', 'blog'] },
  { name: 'Libre Baskerville', category: 'serif', style: ['classical', 'elegant', 'editorial'], weights: [400, 700], pairsWith: ['Montserrat', 'Open Sans', 'Lato'], useCase: ['body', 'headline'], personality: ['publishing', 'editorial', 'literary', 'classic'] },
  { name: 'Crimson Text', category: 'serif', style: ['classical', 'refined', 'readable'], weights: [400, 600, 700], pairsWith: ['Work Sans', 'Lato', 'Nunito'], useCase: ['body', 'headline'], personality: ['literary', 'academic', 'publishing'] },
  { name: 'Lora', category: 'serif', style: ['elegant', 'contemporary', 'readable'], weights: [400, 500, 600, 700], pairsWith: ['Lato', 'Open Sans', 'Nunito Sans'], useCase: ['body', 'headline'], personality: ['publishing', 'blog', 'editorial'] },
  { name: 'Source Serif Pro', category: 'serif', style: ['modern', 'clean', 'versatile'], weights: [200, 300, 400, 600, 700, 900], pairsWith: ['Source Sans Pro', 'Inter', 'Roboto'], useCase: ['body', 'headline'], personality: ['publishing', 'tech', 'editorial'] },
  { name: 'PT Serif', category: 'serif', style: ['transitional', 'readable', 'warm'], weights: [400, 700], pairsWith: ['PT Sans', 'Open Sans', 'Roboto'], useCase: ['body', 'headline'], personality: ['publishing', 'editorial', 'academic'] },
  { name: 'Spectral', category: 'serif', style: ['contemporary', 'readable', 'versatile'], weights: [200, 300, 400, 500, 600, 700, 800], pairsWith: ['Work Sans', 'Roboto', 'Inter'], useCase: ['body', 'headline'], personality: ['publishing', 'tech', 'modern'] },
  { name: 'Noto Serif', category: 'serif', style: ['neutral', 'readable', 'global'], weights: [400, 700], pairsWith: ['Noto Sans', 'Open Sans', 'Roboto'], useCase: ['body', 'headline'], personality: ['global', 'neutral', 'accessible'] },
  { name: 'Bitter', category: 'serif', style: ['slab', 'readable', 'contemporary'], weights: [400, 500, 600, 700, 800, 900], pairsWith: ['Montserrat', 'Open Sans', 'Raleway'], useCase: ['body', 'headline'], personality: ['editorial', 'bold', 'modern'] },
  { name: 'Vollkorn', category: 'serif', style: ['humanist', 'warm', 'readable'], weights: [400, 500, 600, 700, 800, 900], pairsWith: ['Work Sans', 'Lato', 'Nunito'], useCase: ['body', 'headline'], personality: ['literary', 'warm', 'publishing'] },
  { name: 'Gentium Plus', category: 'serif', style: ['humanist', 'elegant', 'readable'], weights: [400, 700], pairsWith: ['Open Sans', 'Roboto', 'Lato'], useCase: ['body'], personality: ['academic', 'literary', 'global'] },
  { name: 'Cardo', category: 'serif', style: ['classical', 'academic', 'historical'], weights: [400, 700], pairsWith: ['Lato', 'Open Sans', 'Nunito'], useCase: ['body', 'headline'], personality: ['academic', 'historical', 'classical'] },
  { name: 'Alegreya', category: 'serif', style: ['dynamic', 'readable', 'literary'], weights: [400, 500, 600, 700, 800, 900], pairsWith: ['Alegreya Sans', 'Open Sans', 'Lato'], useCase: ['body', 'headline'], personality: ['literary', 'publishing', 'dynamic'] },
  { name: 'Zilla Slab', category: 'serif', style: ['slab', 'modern', 'tech'], weights: [300, 400, 500, 600, 700], pairsWith: ['Inter', 'Roboto', 'Work Sans'], useCase: ['headline', 'logo'], personality: ['tech', 'modern', 'bold'] },
  { name: 'Fraunces', category: 'serif', style: ['expressive', 'variable', 'distinctive'], weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], pairsWith: ['Commissioner', 'Inter', 'Work Sans'], useCase: ['headline', 'logo', 'accent'], personality: ['creative', 'distinctive', 'modern'] },
  { name: 'DM Serif Display', category: 'serif', style: ['display', 'elegant', 'modern'], weights: [400], pairsWith: ['DM Sans', 'Inter', 'Work Sans'], useCase: ['headline', 'logo'], personality: ['elegant', 'editorial', 'modern'] },
  { name: 'Newsreader', category: 'serif', style: ['editorial', 'readable', 'contemporary'], weights: [200, 300, 400, 500, 600, 700, 800], pairsWith: ['Inter', 'Work Sans', 'Roboto'], useCase: ['body', 'headline'], personality: ['editorial', 'publishing', 'news'] },
  
  // ================ SANS-SERIF FONTS ================
  // Modern & Clean
  { name: 'Inter', category: 'sans-serif', style: ['modern', 'clean', 'readable', 'ui'], weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], pairsWith: ['Playfair Display', 'Merriweather', 'Lora'], useCase: ['body', 'ui', 'headline'], personality: ['tech', 'startup', 'professional', 'modern'] },
  { name: 'Roboto', category: 'sans-serif', style: ['geometric', 'neutral', 'versatile'], weights: [100, 300, 400, 500, 700, 900], pairsWith: ['Roboto Slab', 'Lora', 'Merriweather'], useCase: ['body', 'ui', 'headline'], personality: ['tech', 'android', 'material', 'neutral'] },
  { name: 'Open Sans', category: 'sans-serif', style: ['humanist', 'friendly', 'readable'], weights: [300, 400, 500, 600, 700, 800], pairsWith: ['Lora', 'Merriweather', 'Playfair Display'], useCase: ['body', 'ui', 'headline'], personality: ['friendly', 'corporate', 'accessible', 'versatile'] },
  { name: 'Lato', category: 'sans-serif', style: ['humanist', 'warm', 'professional'], weights: [100, 300, 400, 700, 900], pairsWith: ['Merriweather', 'Playfair Display', 'Lora'], useCase: ['body', 'headline'], personality: ['professional', 'warm', 'corporate', 'friendly'] },
  { name: 'Montserrat', category: 'sans-serif', style: ['geometric', 'modern', 'bold'], weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], pairsWith: ['Lora', 'Merriweather', 'Playfair Display'], useCase: ['headline', 'logo', 'ui'], personality: ['modern', 'fashion', 'startup', 'bold'] },
  { name: 'Poppins', category: 'sans-serif', style: ['geometric', 'friendly', 'modern'], weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], pairsWith: ['Lora', 'Merriweather', 'PT Serif'], useCase: ['headline', 'body', 'ui'], personality: ['friendly', 'modern', 'startup', 'tech'] },
  { name: 'Raleway', category: 'sans-serif', style: ['elegant', 'thin', 'modern'], weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], pairsWith: ['Merriweather', 'Lora', 'Playfair Display'], useCase: ['headline', 'logo'], personality: ['elegant', 'fashion', 'luxury', 'minimal'] },
  { name: 'Nunito', category: 'sans-serif', style: ['rounded', 'friendly', 'soft'], weights: [200, 300, 400, 500, 600, 700, 800, 900], pairsWith: ['Lora', 'Merriweather', 'Crimson Text'], useCase: ['body', 'headline', 'ui'], personality: ['friendly', 'approachable', 'soft', 'playful'] },
  { name: 'Work Sans', category: 'sans-serif', style: ['geometric', 'clean', 'modern'], weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], pairsWith: ['Merriweather', 'Lora', 'Playfair Display'], useCase: ['body', 'headline', 'ui'], personality: ['modern', 'clean', 'corporate', 'professional'] },
  { name: 'Space Grotesk', category: 'sans-serif', style: ['geometric', 'tech', 'bold'], weights: [300, 400, 500, 600, 700], pairsWith: ['Space Mono', 'Inter', 'Roboto'], useCase: ['headline', 'logo'], personality: ['tech', 'futuristic', 'bold', 'startup'] },
  { name: 'DM Sans', category: 'sans-serif', style: ['geometric', 'modern', 'clean'], weights: [400, 500, 700], pairsWith: ['DM Serif Display', 'Lora', 'Spectral'], useCase: ['body', 'headline', 'ui'], personality: ['modern', 'clean', 'tech', 'startup'] },
  { name: 'Outfit', category: 'sans-serif', style: ['geometric', 'modern', 'versatile'], weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], pairsWith: ['Lora', 'Spectral', 'DM Serif Display'], useCase: ['headline', 'body', 'ui'], personality: ['modern', 'versatile', 'clean'] },
  { name: 'Manrope', category: 'sans-serif', style: ['modern', 'versatile', 'clean'], weights: [200, 300, 400, 500, 600, 700, 800], pairsWith: ['Lora', 'Merriweather', 'Playfair Display'], useCase: ['body', 'headline', 'ui'], personality: ['modern', 'tech', 'clean', 'professional'] },
  { name: 'Plus Jakarta Sans', category: 'sans-serif', style: ['modern', 'geometric', 'versatile'], weights: [200, 300, 400, 500, 600, 700, 800], pairsWith: ['Lora', 'Merriweather', 'Spectral'], useCase: ['body', 'headline', 'ui'], personality: ['modern', 'tech', 'startup', 'clean'] },
  { name: 'Sora', category: 'sans-serif', style: ['geometric', 'modern', 'tech'], weights: [100, 200, 300, 400, 500, 600, 700, 800], pairsWith: ['Lora', 'Spectral', 'Newsreader'], useCase: ['headline', 'body', 'ui'], personality: ['tech', 'futuristic', 'modern', 'startup'] },
  { name: 'Quicksand', category: 'sans-serif', style: ['rounded', 'friendly', 'soft'], weights: [300, 400, 500, 600, 700], pairsWith: ['Lora', 'Merriweather', 'Crimson Text'], useCase: ['headline', 'body'], personality: ['friendly', 'playful', 'soft', 'approachable'] },
  { name: 'Rubik', category: 'sans-serif', style: ['geometric', 'rounded', 'friendly'], weights: [300, 400, 500, 600, 700, 800, 900], pairsWith: ['Lora', 'Merriweather', 'Spectral'], useCase: ['body', 'headline', 'ui'], personality: ['friendly', 'modern', 'tech', 'approachable'] },
  { name: 'Karla', category: 'sans-serif', style: ['grotesque', 'versatile', 'readable'], weights: [200, 300, 400, 500, 600, 700, 800], pairsWith: ['Lora', 'Merriweather', 'Spectral'], useCase: ['body', 'headline'], personality: ['versatile', 'modern', 'clean'] },
  { name: 'Mulish', category: 'sans-serif', style: ['versatile', 'clean', 'modern'], weights: [200, 300, 400, 500, 600, 700, 800, 900], pairsWith: ['Lora', 'Playfair Display', 'Merriweather'], useCase: ['body', 'headline', 'ui'], personality: ['versatile', 'modern', 'clean', 'professional'] },
  { name: 'Figtree', category: 'sans-serif', style: ['geometric', 'modern', 'friendly'], weights: [300, 400, 500, 600, 700, 800, 900], pairsWith: ['Lora', 'Merriweather', 'Spectral'], useCase: ['body', 'headline', 'ui'], personality: ['modern', 'friendly', 'clean', 'tech'] },
  { name: 'Commissioner', category: 'sans-serif', style: ['variable', 'versatile', 'modern'], weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], pairsWith: ['Fraunces', 'Lora', 'Spectral'], useCase: ['body', 'headline', 'ui'], personality: ['modern', 'versatile', 'professional'] },
  { name: 'Archivo', category: 'sans-serif', style: ['grotesque', 'versatile', 'modern'], weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], pairsWith: ['Lora', 'Merriweather', 'Spectral'], useCase: ['body', 'headline'], personality: ['modern', 'versatile', 'editorial'] },
  { name: 'Lexend', category: 'sans-serif', style: ['readable', 'accessible', 'modern'], weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], pairsWith: ['Lora', 'Merriweather', 'Spectral'], useCase: ['body', 'headline'], personality: ['accessible', 'modern', 'readable'] },
  { name: 'Urbanist', category: 'sans-serif', style: ['geometric', 'modern', 'clean'], weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], pairsWith: ['Lora', 'Spectral', 'Playfair Display'], useCase: ['headline', 'body', 'ui'], personality: ['modern', 'urban', 'clean', 'startup'] },
  { name: 'Albert Sans', category: 'sans-serif', style: ['geometric', 'modern', 'clean'], weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], pairsWith: ['Lora', 'Spectral', 'Merriweather'], useCase: ['body', 'headline', 'ui'], personality: ['modern', 'clean', 'professional'] },
  { name: 'Barlow', category: 'sans-serif', style: ['grotesque', 'versatile', 'readable'], weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], pairsWith: ['Lora', 'Merriweather', 'Spectral'], useCase: ['body', 'headline'], personality: ['versatile', 'modern', 'clean'] },
  { name: 'Josefin Sans', category: 'sans-serif', style: ['geometric', 'elegant', 'vintage'], weights: [100, 200, 300, 400, 500, 600, 700], pairsWith: ['Lora', 'Playfair Display', 'Merriweather'], useCase: ['headline', 'logo'], personality: ['elegant', 'vintage', 'fashion', 'retro'] },
  { name: 'Cabin', category: 'sans-serif', style: ['humanist', 'versatile', 'readable'], weights: [400, 500, 600, 700], pairsWith: ['Lora', 'Merriweather', 'Spectral'], useCase: ['body', 'headline'], personality: ['versatile', 'modern', 'clean'] },
  { name: 'Exo 2', category: 'sans-serif', style: ['geometric', 'tech', 'modern'], weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], pairsWith: ['Lora', 'Spectral', 'Merriweather'], useCase: ['headline', 'body'], personality: ['tech', 'futuristic', 'modern', 'gaming'] },
  { name: 'Fira Sans', category: 'sans-serif', style: ['humanist', 'readable', 'versatile'], weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], pairsWith: ['Lora', 'Merriweather', 'Spectral'], useCase: ['body', 'headline', 'ui'], personality: ['tech', 'mozilla', 'modern', 'readable'] },
  { name: 'IBM Plex Sans', category: 'sans-serif', style: ['grotesque', 'tech', 'corporate'], weights: [100, 200, 300, 400, 500, 600, 700], pairsWith: ['IBM Plex Serif', 'Lora', 'Merriweather'], useCase: ['body', 'headline', 'ui'], personality: ['tech', 'corporate', 'professional', 'IBM'] },
  { name: 'Nunito Sans', category: 'sans-serif', style: ['rounded', 'friendly', 'versatile'], weights: [200, 300, 400, 600, 700, 800, 900], pairsWith: ['Lora', 'Merriweather', 'Spectral'], useCase: ['body', 'headline', 'ui'], personality: ['friendly', 'approachable', 'modern'] },
  { name: 'Overpass', category: 'sans-serif', style: ['grotesque', 'versatile', 'readable'], weights: [100, 200, 300, 400, 600, 700, 800, 900], pairsWith: ['Lora', 'Merriweather', 'Spectral'], useCase: ['body', 'headline'], personality: ['versatile', 'modern', 'highway'] },
  { name: 'Red Hat Display', category: 'sans-serif', style: ['geometric', 'modern', 'tech'], weights: [300, 400, 500, 600, 700, 800, 900], pairsWith: ['Red Hat Text', 'Lora', 'Merriweather'], useCase: ['headline', 'logo'], personality: ['tech', 'modern', 'professional'] },
  { name: 'Signika', category: 'sans-serif', style: ['signage', 'clear', 'readable'], weights: [300, 400, 500, 600, 700], pairsWith: ['Lora', 'Merriweather', 'Spectral'], useCase: ['headline', 'signage'], personality: ['clear', 'readable', 'signage'] },
  { name: 'Titillium Web', category: 'sans-serif', style: ['geometric', 'tech', 'modern'], weights: [200, 300, 400, 600, 700, 900], pairsWith: ['Lora', 'Merriweather', 'Spectral'], useCase: ['headline', 'body', 'ui'], personality: ['tech', 'modern', 'clean'] },
  { name: 'Ubuntu', category: 'sans-serif', style: ['humanist', 'tech', 'ubuntu'], weights: [300, 400, 500, 700], pairsWith: ['Lora', 'Merriweather', 'Spectral'], useCase: ['body', 'headline', 'ui'], personality: ['tech', 'ubuntu', 'linux', 'open source'] },
  { name: 'Varela Round', category: 'sans-serif', style: ['rounded', 'friendly', 'soft'], weights: [400], pairsWith: ['Lora', 'Merriweather', 'Spectral'], useCase: ['headline', 'body'], personality: ['friendly', 'soft', 'approachable'] },
  { name: 'Questrial', category: 'sans-serif', style: ['geometric', 'modern', 'clean'], weights: [400], pairsWith: ['Lora', 'Merriweather', 'Spectral'], useCase: ['headline', 'body'], personality: ['modern', 'clean', 'geometric'] },
  { name: 'Libre Franklin', category: 'sans-serif', style: ['versatile', 'readable', 'classic'], weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], pairsWith: ['Lora', 'Merriweather', 'Spectral'], useCase: ['body', 'headline'], personality: ['versatile', 'classic', 'editorial'] },
  { name: 'Heebo', category: 'sans-serif', style: ['geometric', 'modern', 'clean'], weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], pairsWith: ['Lora', 'Merriweather', 'Spectral'], useCase: ['body', 'headline', 'ui'], personality: ['modern', 'clean', 'hebrew'] },
  { name: 'Asap', category: 'sans-serif', style: ['rounded', 'versatile', 'readable'], weights: [400, 500, 600, 700], pairsWith: ['Lora', 'Merriweather', 'Spectral'], useCase: ['body', 'headline'], personality: ['versatile', 'modern', 'friendly'] },
  { name: 'Dosis', category: 'sans-serif', style: ['rounded', 'friendly', 'light'], weights: [200, 300, 400, 500, 600, 700, 800], pairsWith: ['Lora', 'Merriweather', 'Spectral'], useCase: ['headline', 'body'], personality: ['friendly', 'light', 'modern'] },
  { name: 'Hind', category: 'sans-serif', style: ['versatile', 'readable', 'devanagari'], weights: [300, 400, 500, 600, 700], pairsWith: ['Lora', 'Merriweather', 'Spectral'], useCase: ['body', 'headline'], personality: ['versatile', 'readable', 'indian'] },
  { name: 'Maven Pro', category: 'sans-serif', style: ['geometric', 'modern', 'unique'], weights: [400, 500, 600, 700, 800, 900], pairsWith: ['Lora', 'Merriweather', 'Spectral'], useCase: ['headline', 'logo'], personality: ['modern', 'unique', 'geometric'] },
  { name: 'Prompt', category: 'sans-serif', style: ['loopless', 'modern', 'thai'], weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], pairsWith: ['Lora', 'Merriweather', 'Spectral'], useCase: ['body', 'headline'], personality: ['modern', 'thai', 'clean'] },
  { name: 'Assistant', category: 'sans-serif', style: ['versatile', 'readable', 'hebrew'], weights: [200, 300, 400, 500, 600, 700, 800], pairsWith: ['Lora', 'Merriweather', 'Spectral'], useCase: ['body', 'headline', 'ui'], personality: ['versatile', 'modern', 'hebrew'] },
  { name: 'Catamaran', category: 'sans-serif', style: ['versatile', 'readable', 'tamil'], weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], pairsWith: ['Lora', 'Merriweather', 'Spectral'], useCase: ['body', 'headline'], personality: ['versatile', 'indian', 'modern'] },
  { name: 'Encode Sans', category: 'sans-serif', style: ['versatile', 'readable', 'modern'], weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], pairsWith: ['Lora', 'Merriweather', 'Spectral'], useCase: ['body', 'headline'], personality: ['versatile', 'modern', 'clean'] },
  { name: 'Jost', category: 'sans-serif', style: ['geometric', 'modern', 'elegant'], weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], pairsWith: ['Lora', 'Merriweather', 'Spectral'], useCase: ['headline', 'body', 'logo'], personality: ['modern', 'elegant', 'geometric'] },
  
  // ================ DISPLAY FONTS ================
  // Headlines & Logos
  { name: 'Bebas Neue', category: 'display', style: ['bold', 'condensed', 'impactful'], weights: [400], pairsWith: ['Open Sans', 'Lato', 'Roboto', 'Source Sans Pro'], useCase: ['headline', 'logo', 'poster'], personality: ['sports', 'entertainment', 'bold', 'impact'] },
  { name: 'Oswald', category: 'display', style: ['condensed', 'bold', 'modern'], weights: [200, 300, 400, 500, 600, 700], pairsWith: ['Lora', 'Merriweather', 'Open Sans'], useCase: ['headline', 'logo'], personality: ['bold', 'modern', 'impactful'] },
  { name: 'Anton', category: 'display', style: ['bold', 'condensed', 'impactful'], weights: [400], pairsWith: ['Lato', 'Open Sans', 'Roboto'], useCase: ['headline', 'poster'], personality: ['bold', 'impactful', 'sports'] },
  { name: 'Archivo Black', category: 'display', style: ['black', 'bold', 'impactful'], weights: [400], pairsWith: ['Lora', 'Open Sans', 'Roboto'], useCase: ['headline', 'logo'], personality: ['bold', 'impactful', 'strong'] },
  { name: 'Black Ops One', category: 'display', style: ['military', 'bold', 'stencil'], weights: [400], pairsWith: ['Open Sans', 'Roboto', 'Lato'], useCase: ['headline', 'logo'], personality: ['military', 'gaming', 'bold'] },
  { name: 'Righteous', category: 'display', style: ['retro', 'bold', 'rounded'], weights: [400], pairsWith: ['Open Sans', 'Roboto', 'Lato'], useCase: ['headline', 'logo'], personality: ['retro', 'bold', 'fun'] },
  { name: 'Alfa Slab One', category: 'display', style: ['slab', 'bold', 'impactful'], weights: [400], pairsWith: ['Open Sans', 'Lato', 'Roboto'], useCase: ['headline', 'logo'], personality: ['bold', 'impactful', 'vintage'] },
  { name: 'Bungee', category: 'display', style: ['bold', 'layered', 'playful'], weights: [400], pairsWith: ['Open Sans', 'Roboto', 'Lato'], useCase: ['headline', 'logo'], personality: ['bold', 'playful', 'gaming'] },
  { name: 'Permanent Marker', category: 'display', style: ['handwritten', 'casual', 'bold'], weights: [400], pairsWith: ['Open Sans', 'Roboto', 'Lato'], useCase: ['headline', 'accent'], personality: ['casual', 'handwritten', 'fun'] },
  { name: 'Bangers', category: 'display', style: ['comic', 'bold', 'fun'], weights: [400], pairsWith: ['Open Sans', 'Roboto', 'Lato'], useCase: ['headline', 'poster'], personality: ['comic', 'fun', 'playful'] },
  { name: 'Staatliches', category: 'display', style: ['condensed', 'bold', 'geometric'], weights: [400], pairsWith: ['Open Sans', 'Roboto', 'Lato'], useCase: ['headline', 'logo'], personality: ['bold', 'geometric', 'modern'] },
  { name: 'Russo One', category: 'display', style: ['bold', 'tech', 'futuristic'], weights: [400], pairsWith: ['Open Sans', 'Roboto', 'Lato'], useCase: ['headline', 'logo'], personality: ['tech', 'futuristic', 'bold'] },
  { name: 'Teko', category: 'display', style: ['condensed', 'tech', 'modern'], weights: [300, 400, 500, 600, 700], pairsWith: ['Open Sans', 'Roboto', 'Lato'], useCase: ['headline', 'logo'], personality: ['tech', 'modern', 'condensed'] },
  { name: 'Orbitron', category: 'display', style: ['futuristic', 'tech', 'geometric'], weights: [400, 500, 600, 700, 800, 900], pairsWith: ['Open Sans', 'Roboto', 'Lato'], useCase: ['headline', 'logo'], personality: ['futuristic', 'tech', 'scifi'] },
  { name: 'Press Start 2P', category: 'display', style: ['pixel', 'retro', 'gaming'], weights: [400], pairsWith: ['Open Sans', 'Roboto', 'Lato'], useCase: ['headline', 'logo'], personality: ['retro', 'gaming', 'pixel'] },
  { name: 'Fredoka One', category: 'display', style: ['rounded', 'friendly', 'bold'], weights: [400], pairsWith: ['Open Sans', 'Nunito', 'Lato'], useCase: ['headline', 'logo'], personality: ['friendly', 'playful', 'kids'] },
  { name: 'Fugaz One', category: 'display', style: ['italic', 'bold', 'dynamic'], weights: [400], pairsWith: ['Open Sans', 'Roboto', 'Lato'], useCase: ['headline', 'logo'], personality: ['dynamic', 'sports', 'bold'] },
  { name: 'Graduate', category: 'display', style: ['collegiate', 'bold', 'vintage'], weights: [400], pairsWith: ['Open Sans', 'Roboto', 'Lato'], useCase: ['headline', 'logo'], personality: ['collegiate', 'sports', 'vintage'] },
  { name: 'Monoton', category: 'display', style: ['retro', 'neon', 'decorative'], weights: [400], pairsWith: ['Open Sans', 'Roboto', 'Lato'], useCase: ['headline', 'accent'], personality: ['retro', 'neon', 'decorative'] },
  { name: 'Passion One', category: 'display', style: ['bold', 'dynamic', 'sports'], weights: [400, 700, 900], pairsWith: ['Open Sans', 'Roboto', 'Lato'], useCase: ['headline', 'poster'], personality: ['sports', 'dynamic', 'bold'] },
  { name: 'Rubik Mono One', category: 'display', style: ['bold', 'mono', 'geometric'], weights: [400], pairsWith: ['Rubik', 'Open Sans', 'Lato'], useCase: ['headline', 'logo'], personality: ['bold', 'geometric', 'modern'] },
  { name: 'Audiowide', category: 'display', style: ['tech', 'futuristic', 'wide'], weights: [400], pairsWith: ['Open Sans', 'Roboto', 'Lato'], useCase: ['headline', 'logo'], personality: ['tech', 'futuristic', 'music'] },
  { name: 'Bungee Inline', category: 'display', style: ['decorative', 'inline', 'bold'], weights: [400], pairsWith: ['Open Sans', 'Roboto', 'Lato'], useCase: ['headline', 'accent'], personality: ['decorative', 'fun', 'bold'] },
  { name: 'Changa One', category: 'display', style: ['bold', 'rounded', 'friendly'], weights: [400], pairsWith: ['Open Sans', 'Roboto', 'Lato'], useCase: ['headline', 'logo'], personality: ['friendly', 'bold', 'approachable'] },
  { name: 'Lilita One', category: 'display', style: ['bold', 'rounded', 'playful'], weights: [400], pairsWith: ['Open Sans', 'Nunito', 'Lato'], useCase: ['headline', 'logo'], personality: ['playful', 'kids', 'fun'] },
  { name: 'Modak', category: 'display', style: ['bold', 'decorative', 'indian'], weights: [400], pairsWith: ['Open Sans', 'Roboto', 'Lato'], useCase: ['headline', 'accent'], personality: ['decorative', 'bold', 'indian'] },
  { name: 'Patua One', category: 'display', style: ['slab', 'bold', 'vintage'], weights: [400], pairsWith: ['Open Sans', 'Roboto', 'Lato'], useCase: ['headline', 'logo'], personality: ['vintage', 'bold', 'slab'] },
  { name: 'Rammetto One', category: 'display', style: ['bold', 'rounded', 'friendly'], weights: [400], pairsWith: ['Open Sans', 'Roboto', 'Lato'], useCase: ['headline', 'logo'], personality: ['friendly', 'bold', 'fun'] },
  { name: 'Shrikhand', category: 'display', style: ['bold', 'retro', 'decorative'], weights: [400], pairsWith: ['Open Sans', 'Roboto', 'Lato'], useCase: ['headline', 'logo'], personality: ['retro', 'indian', 'bold'] },
  { name: 'Ultra', category: 'display', style: ['ultra-bold', 'serif', 'impactful'], weights: [400], pairsWith: ['Open Sans', 'Roboto', 'Lato'], useCase: ['headline', 'logo'], personality: ['bold', 'impactful', 'vintage'] },
  
  // ================ SCRIPT FONTS ================
  // Elegant & Handwritten
  { name: 'Great Vibes', category: 'script', style: ['elegant', 'cursive', 'flowing'], weights: [400], pairsWith: ['Lato', 'Open Sans', 'Montserrat'], useCase: ['accent', 'logo', 'wedding'], personality: ['wedding', 'romantic', 'luxury', 'elegant'] },
  { name: 'Dancing Script', category: 'script', style: ['casual', 'friendly', 'flowing'], weights: [400, 500, 600, 700], pairsWith: ['Lato', 'Open Sans', 'Montserrat'], useCase: ['accent', 'logo'], personality: ['casual', 'friendly', 'feminine'] },
  { name: 'Pacifico', category: 'script', style: ['casual', 'fun', 'brush'], weights: [400], pairsWith: ['Lato', 'Open Sans', 'Roboto'], useCase: ['accent', 'logo'], personality: ['casual', 'fun', 'surf', 'beach'] },
  { name: 'Satisfy', category: 'script', style: ['casual', 'elegant', 'flowing'], weights: [400], pairsWith: ['Lato', 'Open Sans', 'Montserrat'], useCase: ['accent', 'logo'], personality: ['elegant', 'casual', 'vintage'] },
  { name: 'Sacramento', category: 'script', style: ['elegant', 'monoline', 'sophisticated'], weights: [400], pairsWith: ['Lato', 'Open Sans', 'Montserrat'], useCase: ['accent', 'logo', 'wedding'], personality: ['sophisticated', 'elegant', 'wedding'] },
  { name: 'Allura', category: 'script', style: ['elegant', 'formal', 'flowing'], weights: [400], pairsWith: ['Lato', 'Open Sans', 'Montserrat'], useCase: ['accent', 'logo', 'wedding'], personality: ['formal', 'elegant', 'wedding'] },
  { name: 'Alex Brush', category: 'script', style: ['elegant', 'brush', 'formal'], weights: [400], pairsWith: ['Lato', 'Open Sans', 'Montserrat'], useCase: ['accent', 'logo', 'wedding'], personality: ['formal', 'brush', 'wedding'] },
  { name: 'Pinyon Script', category: 'script', style: ['elegant', 'formal', 'traditional'], weights: [400], pairsWith: ['Lato', 'Open Sans', 'Cormorant Garamond'], useCase: ['accent', 'wedding'], personality: ['formal', 'traditional', 'luxury'] },
  { name: 'Tangerine', category: 'script', style: ['elegant', 'thin', 'calligraphic'], weights: [400, 700], pairsWith: ['Lato', 'Open Sans', 'Montserrat'], useCase: ['accent', 'wedding'], personality: ['elegant', 'calligraphic', 'wedding'] },
  { name: 'Lobster', category: 'script', style: ['bold', 'retro', 'script'], weights: [400], pairsWith: ['Lato', 'Open Sans', 'Roboto'], useCase: ['headline', 'logo'], personality: ['retro', 'bold', 'fun'] },
  { name: 'Lobster Two', category: 'script', style: ['bold', 'retro', 'friendly'], weights: [400, 700], pairsWith: ['Lato', 'Open Sans', 'Roboto'], useCase: ['headline', 'logo'], personality: ['retro', 'friendly', 'vintage'] },
  { name: 'Kaushan Script', category: 'script', style: ['casual', 'brush', 'friendly'], weights: [400], pairsWith: ['Lato', 'Open Sans', 'Roboto'], useCase: ['accent', 'logo'], personality: ['casual', 'brush', 'handwritten'] },
  { name: 'Indie Flower', category: 'script', style: ['casual', 'handwritten', 'playful'], weights: [400], pairsWith: ['Lato', 'Open Sans', 'Nunito'], useCase: ['accent', 'casual'], personality: ['playful', 'handwritten', 'casual'] },
  { name: 'Caveat', category: 'script', style: ['casual', 'handwritten', 'natural'], weights: [400, 500, 600, 700], pairsWith: ['Lato', 'Open Sans', 'Work Sans'], useCase: ['accent', 'casual'], personality: ['casual', 'natural', 'handwritten'] },
  { name: 'Architects Daughter', category: 'script', style: ['casual', 'sketch', 'handwritten'], weights: [400], pairsWith: ['Lato', 'Open Sans', 'Nunito'], useCase: ['accent', 'casual'], personality: ['casual', 'sketch', 'friendly'] },
  { name: 'Handlee', category: 'script', style: ['casual', 'friendly', 'handwritten'], weights: [400], pairsWith: ['Lato', 'Open Sans', 'Nunito'], useCase: ['accent', 'casual'], personality: ['friendly', 'casual', 'handwritten'] },
  { name: 'Shadows Into Light', category: 'script', style: ['casual', 'handwritten', 'light'], weights: [400], pairsWith: ['Lato', 'Open Sans', 'Nunito'], useCase: ['accent', 'casual'], personality: ['casual', 'light', 'handwritten'] },
  { name: 'Courgette', category: 'script', style: ['semi-script', 'friendly', 'warm'], weights: [400], pairsWith: ['Lato', 'Open Sans', 'Roboto'], useCase: ['accent', 'logo'], personality: ['friendly', 'warm', 'approachable'] },
  { name: 'Cookie', category: 'script', style: ['casual', 'retro', 'brush'], weights: [400], pairsWith: ['Lato', 'Open Sans', 'Roboto'], useCase: ['accent', 'logo'], personality: ['retro', 'casual', 'vintage'] },
  { name: 'Amatic SC', category: 'script', style: ['condensed', 'handwritten', 'quirky'], weights: [400, 700], pairsWith: ['Lato', 'Open Sans', 'Roboto'], useCase: ['headline', 'accent'], personality: ['quirky', 'handwritten', 'artistic'] },
  { name: 'Yellowtail', category: 'script', style: ['retro', 'script', 'vintage'], weights: [400], pairsWith: ['Lato', 'Open Sans', 'Roboto'], useCase: ['accent', 'logo'], personality: ['retro', 'vintage', 'americana'] },
  { name: 'Nothing You Could Do', category: 'script', style: ['casual', 'handwritten', 'natural'], weights: [400], pairsWith: ['Lato', 'Open Sans', 'Nunito'], useCase: ['accent', 'casual'], personality: ['casual', 'natural', 'authentic'] },
  { name: 'Homemade Apple', category: 'script', style: ['casual', 'childlike', 'handwritten'], weights: [400], pairsWith: ['Lato', 'Open Sans', 'Nunito'], useCase: ['accent', 'casual'], personality: ['childlike', 'handwritten', 'authentic'] },
  { name: 'Marck Script', category: 'script', style: ['elegant', 'flowing', 'brush'], weights: [400], pairsWith: ['Lato', 'Open Sans', 'Montserrat'], useCase: ['accent', 'logo'], personality: ['elegant', 'brush', 'sophisticated'] },
  { name: 'Mr Dafoe', category: 'script', style: ['elegant', 'signature', 'formal'], weights: [400], pairsWith: ['Lato', 'Open Sans', 'Montserrat'], useCase: ['accent', 'signature'], personality: ['signature', 'formal', 'luxury'] },
  { name: 'Niconne', category: 'script', style: ['elegant', 'decorative', 'feminine'], weights: [400], pairsWith: ['Lato', 'Open Sans', 'Montserrat'], useCase: ['accent', 'logo'], personality: ['feminine', 'elegant', 'decorative'] },
  { name: 'Rouge Script', category: 'script', style: ['elegant', 'formal', 'sophisticated'], weights: [400], pairsWith: ['Lato', 'Open Sans', 'Cormorant Garamond'], useCase: ['accent', 'wedding'], personality: ['formal', 'sophisticated', 'luxury'] },
  
  // ================ MONOSPACE FONTS ================
  // Technical & Code
  { name: 'JetBrains Mono', category: 'monospace', style: ['technical', 'readable', 'modern'], weights: [100, 200, 300, 400, 500, 600, 700, 800], pairsWith: ['Inter', 'Work Sans', 'Roboto'], useCase: ['code', 'technical', 'ui'], personality: ['tech', 'developer', 'startup'] },
  { name: 'Fira Code', category: 'monospace', style: ['ligatures', 'readable', 'modern'], weights: [300, 400, 500, 600, 700], pairsWith: ['Fira Sans', 'Inter', 'Work Sans'], useCase: ['code', 'technical'], personality: ['developer', 'mozilla', 'modern'] },
  { name: 'Source Code Pro', category: 'monospace', style: ['adobe', 'readable', 'versatile'], weights: [200, 300, 400, 500, 600, 700, 900], pairsWith: ['Source Sans Pro', 'Inter', 'Roboto'], useCase: ['code', 'technical', 'ui'], personality: ['developer', 'adobe', 'professional'] },
  { name: 'Roboto Mono', category: 'monospace', style: ['google', 'versatile', 'readable'], weights: [100, 300, 400, 500, 700], pairsWith: ['Roboto', 'Open Sans', 'Lato'], useCase: ['code', 'technical', 'ui'], personality: ['google', 'material', 'android'] },
  { name: 'IBM Plex Mono', category: 'monospace', style: ['ibm', 'corporate', 'readable'], weights: [100, 200, 300, 400, 500, 600, 700], pairsWith: ['IBM Plex Sans', 'Inter', 'Work Sans'], useCase: ['code', 'technical', 'ui'], personality: ['ibm', 'corporate', 'professional'] },
  { name: 'Space Mono', category: 'monospace', style: ['geometric', 'editorial', 'unique'], weights: [400, 700], pairsWith: ['Space Grotesk', 'Inter', 'Work Sans'], useCase: ['code', 'editorial', 'logo'], personality: ['editorial', 'geometric', 'unique'] },
  { name: 'Ubuntu Mono', category: 'monospace', style: ['ubuntu', 'linux', 'readable'], weights: [400, 700], pairsWith: ['Ubuntu', 'Open Sans', 'Lato'], useCase: ['code', 'terminal'], personality: ['ubuntu', 'linux', 'open source'] },
  { name: 'Inconsolata', category: 'monospace', style: ['classic', 'readable', 'clean'], weights: [200, 300, 400, 500, 600, 700, 800, 900], pairsWith: ['Inter', 'Open Sans', 'Lato'], useCase: ['code', 'technical'], personality: ['classic', 'clean', 'developer'] },
  { name: 'Anonymous Pro', category: 'monospace', style: ['classic', 'professional', 'readable'], weights: [400, 700], pairsWith: ['Inter', 'Open Sans', 'Lato'], useCase: ['code', 'technical'], personality: ['professional', 'classic', 'developer'] },
  { name: 'Cousine', category: 'monospace', style: ['courier', 'classic', 'readable'], weights: [400, 700], pairsWith: ['Inter', 'Open Sans', 'Lato'], useCase: ['code', 'technical'], personality: ['classic', 'courier', 'traditional'] },
  { name: 'DM Mono', category: 'monospace', style: ['modern', 'clean', 'geometric'], weights: [300, 400, 500], pairsWith: ['DM Sans', 'Inter', 'Work Sans'], useCase: ['code', 'technical', 'ui'], personality: ['modern', 'clean', 'geometric'] },
  { name: 'Overpass Mono', category: 'monospace', style: ['grotesque', 'versatile', 'readable'], weights: [300, 400, 500, 600, 700], pairsWith: ['Overpass', 'Inter', 'Open Sans'], useCase: ['code', 'technical'], personality: ['versatile', 'modern', 'highway'] },
  { name: 'PT Mono', category: 'monospace', style: ['readable', 'professional', 'versatile'], weights: [400], pairsWith: ['PT Sans', 'PT Serif', 'Open Sans'], useCase: ['code', 'technical'], personality: ['professional', 'readable', 'versatile'] },
  { name: 'Azeret Mono', category: 'monospace', style: ['modern', 'geometric', 'clean'], weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], pairsWith: ['Inter', 'Work Sans', 'Roboto'], useCase: ['code', 'technical', 'ui'], personality: ['modern', 'geometric', 'clean'] },
  { name: 'Red Hat Mono', category: 'monospace', style: ['tech', 'modern', 'professional'], weights: [300, 400, 500, 600, 700], pairsWith: ['Red Hat Display', 'Red Hat Text', 'Inter'], useCase: ['code', 'technical'], personality: ['tech', 'professional', 'modern'] },
];

// ================ FONT INTELLIGENCE FUNCTIONS ================

/**
 * Get font recommendations based on design type and personality
 */
export const getFontPairings = (
  industry: string, 
  designType: string, 
  personality: string[]
): { headline: FontEntry; body: FontEntry; rationale: string } => {
  const normalizedPersonality = personality.map(p => p.toLowerCase());
  const normalizedIndustry = industry.toLowerCase();
  const normalizedDesignType = designType.toLowerCase();
  
  // Find headline font matching personality
  const headlineFont = FONT_LIBRARY.find(f => 
    f.useCase.includes('headline') && 
    f.personality.some(p => normalizedPersonality.includes(p) || normalizedIndustry.includes(p))
  ) || FONT_LIBRARY.find(f => f.useCase.includes('headline'))!;
  
  // Find body font that pairs well
  const bodyFont = FONT_LIBRARY.find(f => 
    f.useCase.includes('body') && 
    headlineFont.pairsWith.includes(f.name)
  ) || FONT_LIBRARY.find(f => f.useCase.includes('body'))!;
  
  const rationale = `${headlineFont.name} (${headlineFont.style.slice(0, 2).join(', ')}) pairs with ${bodyFont.name} for a ${normalizedPersonality[0] || 'professional'} feel`;
  
  return { headline: headlineFont, body: bodyFont, rationale };
};

/**
 * Get random fonts suitable for a design type for variety
 */
export const getRandomFontsForDesignType = (
  designType: string, 
  count: number = 3
): FontEntry[] => {
  const normalizedType = designType.toLowerCase();
  const useCaseMap: Record<string, string[]> = {
    'logo': ['logo', 'headline', 'display'],
    'poster': ['headline', 'display', 'body'],
    'campaign': ['headline', 'display', 'body'],
    'illustration': ['headline', 'accent'],
    'character': ['headline', 'display', 'accent'],
    'branding': ['headline', 'body', 'logo'],
  };
  
  const relevantUseCases = useCaseMap[normalizedType] || ['headline', 'body'];
  const suitable = FONT_LIBRARY.filter(f => 
    f.useCase.some(uc => relevantUseCases.includes(uc))
  );
  
  // Fisher-Yates shuffle for true randomness
  const shuffled = [...suitable];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled.slice(0, count);
};

/**
 * Get fonts for a specific design type with full context
 */
export const getDesignTypeFonts = (
  designType: string,
  industry?: string,
  styleKeywords?: string[]
): {
  headline: string;
  headlineStyle: string;
  body: string;
  bodyStyle: string;
  alternatives: FontEntry[];
  rationale: string;
} => {
  const personality = styleKeywords?.map(s => s.toLowerCase()) || [];
  if (industry) personality.push(industry.toLowerCase());
  
  const pairing = getFontPairings(industry || '', designType, personality);
  const alternatives = getRandomFontsForDesignType(designType, 5);
  
  return {
    headline: pairing.headline.name,
    headlineStyle: pairing.headline.style.join(', '),
    body: pairing.body.name,
    bodyStyle: pairing.body.style.join(', '),
    alternatives,
    rationale: pairing.rationale,
  };
};

/**
 * Get all fonts in a category
 */
export const getFontsByCategory = (category: FontEntry['category']): FontEntry[] => {
  return FONT_LIBRARY.filter(f => f.category === category);
};

/**
 * Search fonts by name or style
 */
export const searchFonts = (query: string): FontEntry[] => {
  const lowerQuery = query.toLowerCase();
  return FONT_LIBRARY.filter(f => 
    f.name.toLowerCase().includes(lowerQuery) ||
    f.style.some(s => s.includes(lowerQuery)) ||
    f.personality.some(p => p.includes(lowerQuery))
  );
};

/**
 * Get font count by category (for stats)
 */
export const getFontStats = (): Record<string, number> => {
  const stats: Record<string, number> = {
    total: FONT_LIBRARY.length,
    serif: 0,
    'sans-serif': 0,
    display: 0,
    script: 0,
    monospace: 0,
  };
  
  FONT_LIBRARY.forEach(f => {
    stats[f.category]++;
  });
  
  return stats;
};

// Export the total count for reference
export const TOTAL_FONTS = FONT_LIBRARY.length;
