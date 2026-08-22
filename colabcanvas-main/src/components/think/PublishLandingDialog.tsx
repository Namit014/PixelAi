import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Globe, Copy, ExternalLink, Loader2, Check, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface PublishLandingDialogProps {
  open: boolean;
  onClose: () => void;
  jobId: string;
  defaultTitle?: string;
  defaultMeta?: string;
}

interface PublishedPage {
  id: string;
  slug: string;
  custom_domain: string | null;
  title: string | null;
  meta_description: string | null;
  is_active: boolean;
}

export function PublishLandingDialog({ open, onClose, jobId, defaultTitle, defaultMeta }: PublishLandingDialogProps) {
  const [page, setPage] = useState<PublishedPage | null>(null);
  const [title, setTitle] = useState(defaultTitle || '');
  const [meta, setMeta] = useState(defaultMeta || '');
  const [customDomain, setCustomDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !jobId) return;
    let mounted = true;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from('published_landing_pages')
        .select('id, slug, custom_domain, title, meta_description, is_active')
        .eq('job_id', jobId)
        .order('published_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!mounted) return;
      if (data) {
        setPage(data as PublishedPage);
        setTitle((data as any).title || defaultTitle || '');
        setMeta((data as any).meta_description || defaultMeta || '');
        setCustomDomain((data as any).custom_domain || '');
      } else {
        setPage(null);
        setTitle(defaultTitle || '');
        setMeta(defaultMeta || '');
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [open, jobId, defaultTitle, defaultMeta]);

  const publicUrl = page ? `${window.location.origin}/l/${page.slug}` : '';

  const callPublish = async (action: 'publish' | 'update' | 'unpublish' | 'delete') => {
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not signed in');
      const body: Record<string, unknown> = { action, jobId };
      if (page) body.pageId = page.id;
      if (action === 'publish' || action === 'update') {
        body.title = title || defaultTitle;
        body.metaDescription = meta || defaultMeta;
        body.customDomain = customDomain.trim() || null;
      }
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/publish-landing-page`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Publish failed');

      if (action === 'unpublish') {
        toast.success('Page unpublished');
        setPage((p) => (p ? { ...p, is_active: false } : p));
      } else if (action === 'delete') {
        toast.success('Published page deleted');
        setPage(null);
      } else {
        toast.success(action === 'publish' ? 'Published!' : 'Updated');
        const next = data.page as { id: string; slug: string; custom_domain: string | null };
        setPage({
          id: next.id,
          slug: next.slug,
          custom_domain: next.custom_domain,
          title,
          meta_description: meta,
          is_active: true,
        });
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black/40 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-zinc-200 overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-zinc-700" />
              <h3 className="text-sm font-medium text-zinc-900">Publish landing page</h3>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-zinc-100 flex items-center justify-center">
              <X className="h-4 w-4 text-zinc-500" />
            </button>
          </div>

          {loading ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
            </div>
          ) : (
            <div className="p-5 space-y-4">
              {page?.is_active && publicUrl && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-emerald-700 font-medium">Live</p>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 text-xs text-zinc-900 truncate">{publicUrl}</code>
                    <button
                      onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success('Copied'); }}
                      className="w-7 h-7 rounded-md hover:bg-emerald-100 flex items-center justify-center"
                    >
                      <Copy className="h-3.5 w-3.5 text-emerald-700" />
                    </button>
                    <a
                      href={publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-7 h-7 rounded-md hover:bg-emerald-100 flex items-center justify-center"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-emerald-700" />
                    </a>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-zinc-600">Page title</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Acme — Launch Page" className="h-9 text-sm" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-zinc-600">Meta description</label>
                <Textarea value={meta} onChange={(e) => setMeta(e.target.value)} rows={2} placeholder="Short SEO description (max ~160 chars)" className="text-sm" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-zinc-600">Custom domain (optional)</label>
                <Input value={customDomain} onChange={(e) => setCustomDomain(e.target.value)} placeholder="launch.yourbrand.com" className="h-9 text-sm" />
                <p className="text-[10px] text-zinc-400">Point your domain via CNAME to your published trackable link. Verification UI is coming soon.</p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex gap-1">
                  {page && (
                    <>
                      {page.is_active ? (
                        <Button variant="ghost" size="sm" disabled={busy} onClick={() => callPublish('unpublish')} className="text-xs h-8 text-zinc-500">
                          Unpublish
                        </Button>
                      ) : null}
                      <Button variant="ghost" size="sm" disabled={busy} onClick={() => callPublish('delete')} className="text-xs h-8 text-red-500 gap-1">
                        <Trash2 className="h-3 w-3" /> Delete
                      </Button>
                    </>
                  )}
                </div>
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => callPublish(page ? 'update' : 'publish')}
                  className="text-xs h-8 gap-1.5"
                >
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  {page ? (page.is_active ? 'Update' : 'Republish') : 'Publish'}
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
