import React from 'react';

// Real brand SVG logo components for use in block picker and embed placeholders

export const YouTubeLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.546 12 3.546 12 3.546s-7.505 0-9.377.504A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.504 9.376.504 9.376.504s7.505 0 9.377-.504a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" fill="#FF0000"/>
    <path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#fff"/>
  </svg>
);

export const VimeoLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M23.977 6.416c-.105 2.338-1.739 5.543-4.894 9.609C15.906 20.035 13.01 22 10.58 22c-1.5 0-2.77-1.39-3.81-4.17l-2.08-7.64C3.94 7.41 3.14 6.02 2.28 6.02c-.19 0-.84.39-1.97 1.18L0 6.78c1.24-1.09 2.46-2.18 3.66-3.27 1.65-1.43 2.89-2.18 3.72-2.26 1.95-.19 3.15 1.15 3.6 4.01.49 3.09.83 5.01 1.01 5.76.56 2.55 1.18 3.82 1.86 3.82.53 0 1.32-.83 2.37-2.49 1.05-1.67 1.62-2.94 1.7-3.82.15-1.45-.42-2.18-1.7-2.18-.61 0-1.23.14-1.87.42 1.24-4.07 3.61-6.05 7.11-5.93 2.6.08 3.82 1.76 3.67 5.05z" fill="#1AB7EA"/>
  </svg>
);

export const TikTokLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.3 0 .59.04.86.11V9a6.27 6.27 0 0 0-.86-.06 6.33 6.33 0 0 0-6.33 6.33A6.33 6.33 0 0 0 9.49 22a6.33 6.33 0 0 0 6.33-6.33V9.22a8.16 8.16 0 0 0 4.77 1.53v-3.4a4.85 4.85 0 0 1-1-.66z" fill="#000"/>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.3 0 .59.04.86.11V9a6.27 6.27 0 0 0-.86-.06 6.33 6.33 0 0 0-6.33 6.33A6.33 6.33 0 0 0 9.49 22a6.33 6.33 0 0 0 6.33-6.33V9.22a8.16 8.16 0 0 0 4.77 1.53v-3.4a4.85 4.85 0 0 1-1-.66z" fill="#25F4EE" style={{ mixBlendMode: 'multiply' }}/>
    <path d="M16.82 2h-1v.44a4.83 4.83 0 0 0 3.77 4.25 4.85 4.85 0 0 1-2.77-4.69z" fill="#FE2C55"/>
  </svg>
);

export const InstagramLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="ig1" cx="30%" cy="107%" r="150%">
        <stop offset="0%" stopColor="#fdf497"/>
        <stop offset="5%" stopColor="#fdf497"/>
        <stop offset="45%" stopColor="#fd5949"/>
        <stop offset="60%" stopColor="#d6249f"/>
        <stop offset="90%" stopColor="#285AEB"/>
      </radialGradient>
    </defs>
    <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#ig1)"/>
    <circle cx="12" cy="12" r="4.5" stroke="#fff" strokeWidth="1.5" fill="none"/>
    <circle cx="17.5" cy="6.5" r="1.2" fill="#fff"/>
  </svg>
);

export const SpotifyLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="12" fill="#1DB954"/>
    <path d="M17.9 10.9c-2.8-1.6-7.3-1.8-10-1-.4.1-.9-.1-1-.5-.1-.4.1-.9.5-1 3-.9 8.1-.7 11.3 1.2.4.2.5.7.3 1.1-.2.3-.7.4-1.1.2zm-.8 2.7c-.2.3-.6.4-.9.2-2.3-1.4-5.8-1.8-8.5-1-.3.1-.7-.1-.8-.4-.1-.3.1-.7.4-.8 3.1-.9 6.9-.5 9.6 1.1.3.2.4.6.2.9zm-1 2.6c-.2.2-.5.3-.7.2-2-.1.2-4.6-1.5-7.1-.8-.3.1-.6-.1-.7-.4-.1-.3.1-.6.4-.7 2.5-.8 5.5-.5 7.7 1 .2.2.3.5.1.7z" fill="#fff"/>
  </svg>
);

export const FigmaLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 24c2.2 0 4-1.8 4-4v-4H8c-2.2 0-4 1.8-4 4s1.8 4 4 4z" fill="#0ACF83"/>
    <path d="M4 12c0-2.2 1.8-4 4-4h4v8H8c-2.2 0-4-1.8-4-4z" fill="#A259FF"/>
    <path d="M4 4c0-2.2 1.8-4 4-4h4v8H8C5.8 8 4 6.2 4 4z" fill="#F24E1E"/>
    <path d="M12 0h4c2.2 0 4 1.8 4 4s-1.8 4-4 4h-4V0z" fill="#FF7262"/>
    <path d="M20 12c0 2.2-1.8 4-4 4s-4-1.8-4-4 1.8-4 4-4 4 1.8 4 4z" fill="#1ABCFE"/>
  </svg>
);

export const SlackLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5.042 15.166a2.528 2.528 0 0 1-2.52 2.521A2.528 2.528 0 0 1 0 15.166a2.528 2.528 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.528 2.528 0 0 1 2.521-2.52 2.528 2.528 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.521v-6.313z" fill="#E01E5A"/>
    <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0"/>
    <path d="M18.958 8.834a2.528 2.528 0 0 1 2.52-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.52V8.834zm-1.271 0a2.528 2.528 0 0 1-2.521 2.521 2.528 2.528 0 0 1-2.521-2.521V2.522A2.528 2.528 0 0 1 15.166 0a2.528 2.528 0 0 1 2.521 2.522v6.312z" fill="#2EB67D"/>
    <path d="M15.166 18.958a2.528 2.528 0 0 1 2.521 2.52A2.528 2.528 0 0 1 15.166 24a2.528 2.528 0 0 1-2.521-2.522v-2.52h2.521zm0-1.271a2.528 2.528 0 0 1-2.521-2.521 2.528 2.528 0 0 1 2.521-2.521h6.313A2.528 2.528 0 0 1 24 15.166a2.528 2.528 0 0 1-2.521 2.521h-6.313z" fill="#ECB22E"/>
  </svg>
);

export const FacebookLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 12c0-6.627-5.373-12-12-12S0 5.373 0 12c0 5.99 4.388 10.954 10.125 11.854V15.47H7.078V12h3.047V9.356c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.875V12h3.328l-.532 3.47h-2.796v8.385C19.612 22.954 24 17.99 24 12z" fill="#1877F2"/>
    <path d="M16.671 15.47L17.203 12h-3.328V9.75c0-.95.465-1.875 1.956-1.875h1.514V4.922s-1.374-.235-2.686-.235c-2.741 0-4.533 1.662-4.533 4.669V12H7.078v3.47h3.047v8.385a12.09 12.09 0 003.75 0V15.47h2.796z" fill="#fff"/>
  </svg>
);

export const LinkedInLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="4" fill="#0A66C2"/>
    <path d="M7.5 10v7.5h-2.5V10h2.5zm-1.25-4a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM9.5 10h2.4l.1 1.03h.05C12.5 10.4 13.6 9.8 15 9.8c2.7 0 3.2 1.78 3.2 4.1v4.6h-2.5v-4.1c0-.97-.02-2.22-1.35-2.22-1.35 0-1.56 1.06-1.56 2.15v4.17H10.3V10h-.8z" fill="#fff"/>
  </svg>
);

export const PinterestLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="12" fill="#E60023"/>
    <path d="M12 5.5c-3.87 0-7 2.8-7 6.25 0 2.65 1.58 5 3.93 5.84-.05-.49-.1-1.24.02-1.78.11-.48.7-2.98.7-2.98s-.18-.36-.18-.88c0-.83.48-1.44 1.07-1.44.51 0 .75.38.75.83 0 .51-.32 1.27-.49 1.97-.14.59.3 1.07.88 1.07 1.06 0 1.87-1.12 1.87-2.73 0-1.43-1.03-2.43-2.5-2.43-1.7 0-2.7 1.28-2.7 2.6 0 .52.2.96.44 1.23.05.06.06.11.04.19-.04.18-.14.59-.16.67-.03.11-.09.13-.2.08-.75-.35-1.22-1.44-1.22-2.32 0-1.89 1.37-3.63 3.96-3.63 2.08 0 3.7 1.49 3.7 3.47 0 2.07-1.3 3.73-3.11 3.73-.61 0-1.18-.32-1.37-.69l-.37 1.42c-.14.53-.51 1.19-.76 1.59.57.18 1.17.27 1.8.27 3.87 0 7-2.8 7-6.25S15.87 5.5 12 5.5z" fill="#fff"/>
  </svg>
);

export const TwitterLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="#000"/>
  </svg>
);

export const GoogleDriveLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7.71 3.5L1.15 15l2.79 4.84L10.5 8.34 7.71 3.5z" fill="#0066DA"/>
    <path d="M22.85 15L16.29 3.5H9.14l6.57 11.5h7.14z" fill="#00AC47"/>
    <path d="M8.14 15L3.94 19.84h16.12L22.85 15H8.14z" fill="#EA4335"/>
    <path d="M8.14 15h7.14l-2.78-4.84L8.14 15z" fill="#00832D"/>
    <path d="M3.94 19.84l4.2-4.84L5.35 10.16 1.15 15l2.79 4.84z" fill="#2684FC"/>
    <path d="M15.71 15l2.79-4.84L16.29 3.5l-6.57 11.5h6z" fill="#FFBA00"/>
  </svg>
);

export const PowerBILogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="10" width="4" height="11" rx="1" fill="#F2C811"/>
    <rect x="10" y="6" width="4" height="15" rx="1" fill="#F2C811"/>
    <rect x="17" y="3" width="4" height="18" rx="1" fill="#F2C811"/>
  </svg>
);

export const LoomLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="#625DF5"/>
    <polygon points="10,7 18,12 10,17" fill="#fff"/>
  </svg>
);

export const MiroLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="4" fill="#FFD02F"/>
    <path d="M7.5 4h2.2L12 9.5 14.3 4h2.2l-3.1 8L16.5 20h-2.2L12 14.5 9.7 20H7.5l3.1-8L7.5 4z" fill="#050038"/>
  </svg>
);

export const AirtableLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11.5 2.6L3 6.4v.8l8.5 3.8.4-.1L20.5 7V6.4L12 2.6h-.5z" fill="#FCB400"/>
    <path d="M12.5 12.2v9.2l8-3.6V8.6l-8 3.6z" fill="#18BFFF"/>
    <path d="M11.5 12.2v9.2l-8-3.6V8.6l8 3.6z" fill="#F82B60"/>
    <path d="M11.5 12.2L3 8.6v-.2l8.5 3.8.4-.1L20.5 8.5v.1l-8 3.6z" fill="#751AFF" fillOpacity="0.25"/>
  </svg>
);

export const CalendlyLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="4" width="20" height="18" rx="3" fill="#006BFF"/>
    <rect x="2" y="4" width="20" height="5" rx="3" fill="#0052CC"/>
    <circle cx="8" cy="14" r="1.5" fill="#fff"/>
    <circle cx="12" cy="14" r="1.5" fill="#fff"/>
    <circle cx="16" cy="14" r="1.5" fill="#fff"/>
    <rect x="7" y="2" width="2" height="4" rx="1" fill="#0052CC"/>
    <rect x="15" y="2" width="2" height="4" rx="1" fill="#0052CC"/>
  </svg>
);

export const TypeformLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="4" fill="#262627"/>
    <path d="M7 8h10v2H13v8h-2v-8H7V8z" fill="#fff"/>
  </svg>
);

// Map of embed type to logo component
export const BrandLogoMap: Record<string, React.FC<{ className?: string }>> = {
  youtube: YouTubeLogo,
  vimeo: VimeoLogo,
  tiktok: TikTokLogo,
  instagram: InstagramLogo,
  spotify: SpotifyLogo,
  figma: FigmaLogo,
  miro: MiroLogo,
  airtable: AirtableLogo,
  tweet: TwitterLogo,
  'google-drive': GoogleDriveLogo,
  powerbi: PowerBILogo,
  loom: LoomLogo,
  calendly: CalendlyLogo,
  typeform: TypeformLogo,
};

// Wrapper component that renders brand logo by embed type
export function BrandLogoIcon({ embedType, size = 32, color }: { embedType: string; size?: number; color?: string }) {
  const Logo = BrandLogoMap[embedType];
  if (Logo) {
    return <Logo className={`shrink-0`} />;
  }
  return null;
}

// Icon wrapper for use in blockPickerData (needs to match lucide icon interface)
function createBrandIconComponent(Logo: React.FC<{ className?: string }>) {
  const BrandIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Logo className={className} />
  );
  return BrandIcon;
}

export const YouTubeIcon = createBrandIconComponent(YouTubeLogo);
export const VimeoIcon = createBrandIconComponent(VimeoLogo);
export const TikTokIcon = createBrandIconComponent(TikTokLogo);
export const InstagramIcon = createBrandIconComponent(InstagramLogo);
export const SpotifyIcon = createBrandIconComponent(SpotifyLogo);
export const FigmaIcon = createBrandIconComponent(FigmaLogo);
export const SlackIcon = createBrandIconComponent(SlackLogo);
export const TwitterIcon = createBrandIconComponent(TwitterLogo);
export const GoogleDriveIcon = createBrandIconComponent(GoogleDriveLogo);
export const PowerBIIcon = createBrandIconComponent(PowerBILogo);
export const LoomIcon = createBrandIconComponent(LoomLogo);
export const MiroIcon = createBrandIconComponent(MiroLogo);
export const AirtableIcon = createBrandIconComponent(AirtableLogo);
export const CalendlyIcon = createBrandIconComponent(CalendlyLogo);
export const TypeformIcon = createBrandIconComponent(TypeformLogo);
export const FacebookIcon = createBrandIconComponent(FacebookLogo);
export const LinkedInIcon = createBrandIconComponent(LinkedInLogo);
export const PinterestIcon = createBrandIconComponent(PinterestLogo);
