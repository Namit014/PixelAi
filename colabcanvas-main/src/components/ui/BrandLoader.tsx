import colabLogo from '@/assets/colab-logo.svg';

interface BrandLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-20 h-20',
};

export const BrandLoader = ({ size = 'md', text, className = '' }: BrandLoaderProps) => {
  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <div className={`${sizeClasses[size]} animate-spin`} style={{ animationDuration: '1.5s' }}>
        <img src={colabLogo} alt="Loading" className="w-full h-full" />
      </div>
      {text && (
        <p className="text-sm text-muted-foreground animate-pulse">{text}</p>
      )}
    </div>
  );
};
