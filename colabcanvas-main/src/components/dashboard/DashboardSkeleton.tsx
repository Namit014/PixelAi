import { Skeleton } from '@/components/ui/skeleton';

export const DashboardSkeleton = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero section - centered greeting + prompt */}
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-6">
        <Skeleton className="h-16 w-72 rounded-lg mb-4" />
        <Skeleton className="h-6 w-80 rounded-md mb-8" />
        <Skeleton className="h-[120px] w-full max-w-[614px] rounded-2xl" />
      </div>

      <div className="container max-w-7xl mx-auto px-8 py-10">
        {/* Category section */}
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 mb-16">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
          ))}
        </div>

        {/* Projects section */}
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-8 w-48" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>
        </div>
        <div className="flex flex-wrap gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="w-[320px]">
              <Skeleton className="aspect-video w-full rounded-lg mb-2" />
              <Skeleton className="h-4 w-32 mb-1" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
