/**
 * Animated shimmer placeholders shown during generation.
 * Mimics nav + hero + features layout so the user sees structure forming.
 */
export function SkeletonShell() {
  return (
    <div className="min-h-screen w-full bg-white">
      <style>{`
        @keyframes wp-shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        .wp-skel {
          background: linear-gradient(90deg, hsl(0 0% 96%) 0%, hsl(0 0% 91%) 50%, hsl(0 0% 96%) 100%);
          background-size: 1000px 100%;
          animation: wp-shimmer 1.8s linear infinite;
        }
      `}</style>

      {/* Nav */}
      <div className="flex items-center justify-between px-12 py-6 border-b border-zinc-100">
        <div className="wp-skel h-7 w-32 rounded-md" />
        <div className="flex gap-6">
          <div className="wp-skel h-3 w-14 rounded" />
          <div className="wp-skel h-3 w-14 rounded" />
          <div className="wp-skel h-3 w-14 rounded" />
        </div>
        <div className="wp-skel h-9 w-28 rounded-full" />
      </div>

      {/* Hero */}
      <div className="px-12 py-20 grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-5">
          <div className="wp-skel h-3 w-24 rounded" />
          <div className="wp-skel h-14 w-full rounded-lg" />
          <div className="wp-skel h-14 w-4/5 rounded-lg" />
          <div className="wp-skel h-4 w-full rounded mt-4" />
          <div className="wp-skel h-4 w-3/4 rounded" />
          <div className="flex gap-3 pt-3">
            <div className="wp-skel h-12 w-36 rounded-full" />
            <div className="wp-skel h-12 w-32 rounded-full" />
          </div>
        </div>
        <div className="wp-skel aspect-square rounded-3xl" />
      </div>

      {/* Features */}
      <div className="px-12 py-16 grid md:grid-cols-3 gap-6">
        {[0, 1, 2].map(i => (
          <div key={i} className="space-y-3">
            <div className="wp-skel h-10 w-10 rounded-xl" />
            <div className="wp-skel h-5 w-2/3 rounded" />
            <div className="wp-skel h-3 w-full rounded" />
            <div className="wp-skel h-3 w-5/6 rounded" />
          </div>
        ))}
      </div>

      {/* Stats band */}
      <div className="px-12 py-12 grid grid-cols-4 gap-6 bg-zinc-50">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="space-y-2">
            <div className="wp-skel h-10 w-20 rounded" />
            <div className="wp-skel h-3 w-24 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
