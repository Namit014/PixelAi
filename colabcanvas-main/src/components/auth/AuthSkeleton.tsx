import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { BrandLoader } from '@/components/ui/BrandLoader';
import headerGlow from '@/assets/header-glow.svg';

export const AuthSkeleton = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-white">
      {/* Top glow effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[2000px] pointer-events-none opacity-40">
        <img src={headerGlow} alt="" className="w-full h-auto" />
      </div>
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="mb-6">
            <BrandLoader size="lg" text="Loading..." />
          </div>
          <Skeleton className="h-9 w-64 mx-auto mb-2" />
          <Skeleton className="h-5 w-40 mx-auto" />
        </div>

        <Card className="border-0 shadow-none bg-card/95 backdrop-blur-sm">
          <CardContent className="space-y-4 pt-6">
            <Skeleton className="h-12 w-full rounded-lg" />
            
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-card px-3 text-muted-foreground">OR</span>
              </div>
            </div>

            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
