import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, RefreshCw, Download, Hash, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export interface ContentProposal {
  id: string;
  user_id: string;
  brand_id: string | null;
  session_id: string | null;
  content_type: string;
  title: string;
  copy_text: string | null;
  hashtags: string[] | null;
  image_url: string | null;
  image_prompt: string | null;
  platform_specs: { aspectRatio?: string; width?: number; height?: number };
  status: 'pending' | 'accepted' | 'rejected' | 'iterating';
  user_feedback: string | null;
  iteration_count: number;
  created_at: string;
}

interface ProposalCardProps {
  proposal: ContentProposal;
  onAccept: (id: string) => void;
  onReject: (id: string, feedback?: string) => void;
  onIterate: (id: string, feedback: string) => void;
  isIterating?: boolean;
}

const CONTENT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  instagram_post: { label: 'Instagram Post', color: 'bg-pink-500/10 text-pink-600 dark:text-pink-400' },
  instagram_story: { label: 'Instagram Story', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
  twitter_post: { label: 'Twitter/X Post', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  linkedin_post: { label: 'LinkedIn Post', color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400' },
  blog_header: { label: 'Blog Header', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  article_cover: { label: 'Article Cover', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
};

export function ProposalCard({ proposal, onAccept, onReject, onIterate, isIterating }: ProposalCardProps) {
  const [showIterateInput, setShowIterateInput] = useState(false);
  const [iterateFeedback, setIterateFeedback] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectFeedback, setRejectFeedback] = useState('');

  const typeInfo = CONTENT_TYPE_LABELS[proposal.content_type] || { label: proposal.content_type, color: 'bg-muted text-muted-foreground' };
  const isResolved = proposal.status === 'accepted' || proposal.status === 'rejected';

  const handleDownload = async () => {
    if (!proposal.image_url) return;
    try {
      const response = await fetch(proposal.image_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${proposal.title.replace(/\s+/g, '-').toLowerCase()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download failed:', e);
    }
  };

  const handleIterate = () => {
    if (iterateFeedback.trim()) {
      onIterate(proposal.id, iterateFeedback.trim());
      setIterateFeedback('');
      setShowIterateInput(false);
    }
  };

  const handleReject = () => {
    onReject(proposal.id, rejectFeedback.trim() || undefined);
    setRejectFeedback('');
    setShowRejectInput(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl border border-border bg-card overflow-hidden max-w-md",
        isResolved && "opacity-70"
      )}
    >
      {/* Image Preview */}
      {proposal.image_url && (
        <div className="relative aspect-square bg-muted overflow-hidden">
          <img
            src={proposal.image_url}
            alt={proposal.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {/* Content type badge */}
          <div className="absolute top-3 left-3">
            <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm", typeInfo.color)}>
              {typeInfo.label}
            </span>
          </div>
          {proposal.iteration_count > 0 && (
            <div className="absolute top-3 right-3">
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-accent/80 text-accent-foreground backdrop-blur-sm">
                v{proposal.iteration_count + 1}
              </span>
            </div>
          )}
        </div>
      )}

      {/* No image fallback */}
      {!proposal.image_url && (
        <div className="aspect-video bg-muted flex items-center justify-center">
          <div className="text-center p-4">
            <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", typeInfo.color)}>
              {typeInfo.label}
            </span>
            <p className="text-sm text-muted-foreground mt-3">Image generating...</p>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-3">
        <h4 className="font-semibold text-sm text-foreground leading-tight">{proposal.title}</h4>

        {proposal.copy_text && (
          <p className="text-sm text-muted-foreground leading-relaxed">{proposal.copy_text}</p>
        )}

        {/* Hashtags */}
        {proposal.hashtags && proposal.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {proposal.hashtags.map((tag, i) => (
              <span key={i} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground">
                <Hash className="w-3 h-3" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Status badge */}
        {isResolved && (
          <div className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
            proposal.status === 'accepted' ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"
          )}>
            {proposal.status === 'accepted' ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
            {proposal.status === 'accepted' ? 'Accepted' : 'Rejected'}
          </div>
        )}

        {/* Iterate Input */}
        {showIterateInput && (
          <div className="space-y-2">
            <Textarea
              value={iterateFeedback}
              onChange={(e) => setIterateFeedback(e.target.value)}
              placeholder="Describe what you'd like changed..."
              className="min-h-[60px] text-sm resize-none"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleIterate} disabled={!iterateFeedback.trim() || isIterating} className="gap-1">
                {isIterating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Iterate
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowIterateInput(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Reject Input */}
        {showRejectInput && (
          <div className="space-y-2">
            <Textarea
              value={rejectFeedback}
              onChange={(e) => setRejectFeedback(e.target.value)}
              placeholder="Optional: why doesn't this work?"
              className="min-h-[60px] text-sm resize-none"
            />
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={handleReject} className="gap-1">
                <X className="w-3 h-3" />
                Reject
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowRejectInput(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!isResolved && !showIterateInput && !showRejectInput && (
          <div className="flex items-center gap-2 pt-1">
            <Button size="sm" variant="default" onClick={() => onAccept(proposal.id)} className="gap-1.5 flex-1">
              <Check className="w-3.5 h-3.5" />
              Accept
            </Button>
            {proposal.image_url && (
              <Button size="sm" variant="outline" onClick={handleDownload} className="gap-1.5">
                <Download className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setShowIterateInput(true)} className="gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowRejectInput(true)} className="gap-1.5 text-muted-foreground">
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
