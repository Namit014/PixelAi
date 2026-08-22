import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface PageLoaderProps {
  text?: string;
}

export const PageLoader = ({ text = 'Loading...' }: PageLoaderProps) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton for instant structure */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border/40">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-64 rounded-2xl" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </header>
      
      {/* Center loader */}
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="mt-4 text-muted-foreground text-sm">{text}</p>
      </div>
    </div>
  );
};

export default PageLoader;
