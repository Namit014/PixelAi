import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdminGetStartedCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  buttonText?: string;
  onButtonClick?: () => void;
  children?: ReactNode;
  variant?: 'default' | 'dashed';
}

export const AdminGetStartedCard = ({
  icon: Icon,
  title,
  description,
  buttonText,
  onButtonClick,
  children,
  variant = 'default',
}: AdminGetStartedCardProps) => {
  return (
    <div 
      className={`
        p-6 rounded-2xl transition-all
        ${variant === 'dashed' 
          ? 'border border-dashed border-zinc-800 bg-zinc-950 hover:border-zinc-700' 
          : 'bg-zinc-900 border border-zinc-800 hover:border-zinc-700'
        }
      `}
    >
      <div className="flex items-start gap-4">
        <div className="p-3 bg-zinc-800 rounded-xl">
          <Icon className="w-5 h-5 text-zinc-400" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-zinc-100 mb-1">
            {title}
          </h3>
          <p className="text-sm text-zinc-500 mb-4">
            {description}
          </p>
          
          {children}
          
          {buttonText && (
            <Button
              onClick={onButtonClick}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 h-9"
            >
              {buttonText}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
