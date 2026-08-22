import { ShieldCheck, Star, Clock } from 'lucide-react';

export const TrustStrip = () => (
  <div className="flex flex-wrap items-center justify-center gap-6 py-4 px-6 rounded-2xl bg-zinc-50 border border-zinc-200">
    <div className="flex items-center gap-2 text-sm text-zinc-700">
      <ShieldCheck className="w-4 h-4 text-zinc-900" />
      <span><b className="text-zinc-900">Top 1%</b> vetted talent</span>
    </div>
    <div className="flex items-center gap-2 text-sm text-zinc-700">
      <Star className="w-4 h-4 text-zinc-900" />
      <span><b className="text-zinc-900">4.9★</b> avg performance</span>
    </div>
    <div className="flex items-center gap-2 text-sm text-zinc-700">
      <Clock className="w-4 h-4 text-zinc-900" />
      <span><b className="text-zinc-900">98%</b> on-time delivery</span>
    </div>
  </div>
);
