import { Skeleton } from '@/components/ui/skeleton';

export const BrandsSkeleton = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Gradient header skeleton */}
      <div className="w-full bg-background">
        <div className="container max-w-3xl mx-auto px-6 pt-16 pb-20 flex flex-col items-center">
          <Skeleton className="h-10 w-72 rounded-full mb-10" />
          <Skeleton className="h-10 w-64 rounded-lg mb-8" />
          <Skeleton className="h-12 w-full max-w-lg rounded-xl" />
        </div>
      </div>

      <div className="container max-w-7xl mx-auto px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-9 w-56 rounded-md" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i}>
              <div className="border border-border rounded-lg overflow-hidden bg-muted/30">
                <Skeleton className="h-40 w-full" />
                <div className="flex justify-between px-4 py-2.5 border-t border-border/50">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-8" />
                </div>
              </div>
              <div className="mt-2.5 px-1">
                <Skeleton className="h-4 w-24 mb-1.5" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
