import { useState, useEffect } from 'react';
import { usePresentationStore } from '@/stores/presentationStore';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Globe, Monitor, FileText, Code, Save, Loader2, ExternalLink, Copy, Check, Link2,
} from 'lucide-react';
import { PanelSection } from './panel-primitives';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const PUBLISH_MODES = [
  { id: 'presentation', label: 'Presentation', icon: Monitor, desc: 'Standard slide deck' },
  { id: 'landing-page', label: 'Landing Page', icon: Globe, desc: 'Scrollable single-page site' },
  { id: 'multi-page', label: 'Multi-Page', icon: FileText, desc: 'Each slide is a page' },
  { id: 'embed', label: 'Embed', icon: Code, desc: 'Embeddable iframe widget' },
];

export function PublishSettings() {
  const presentationId = usePresentationStore((s) => s.id);
  const title = usePresentationStore((s) => s.title);
  const slides = usePresentationStore((s) => s.slides);
  const designTokens = usePresentationStore((s) => s.designTokens);
  const themeId = usePresentationStore((s) => s.themeId);

  const [publishMode, setPublishMode] = useState('presentation');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [ogImageUrl, setOgImageUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load existing settings & check for existing share token
  useEffect(() => {
    if (!presentationId || loaded) return;
    const load = async () => {
      const { data } = await supabase
        .from('presentations')
        .select('publish_mode, meta_title, meta_description, og_image_url, share_token')
        .eq('id', presentationId)
        .single();
      if (data) {
        setPublishMode((data as any).publish_mode || 'presentation');
        setMetaTitle((data as any).meta_title || '');
        setMetaDescription((data as any).meta_description || '');
        setOgImageUrl((data as any).og_image_url || '');
        if ((data as any).share_token) {
          setPublishedUrl(`${window.location.origin}/cosmo/view/${(data as any).share_token}`);
        }
      }
      setLoaded(true);
    };
    load();
  }, [presentationId, loaded]);

  const handleSave = async () => {
    if (!presentationId) return;
    setSaving(true);
    const { error } = await supabase
      .from('presentations')
      .update({
        publish_mode: publishMode,
        meta_title: metaTitle || null,
        meta_description: metaDescription || null,
        og_image_url: ogImageUrl || null,
      } as any)
      .eq('id', presentationId);
    setSaving(false);
    if (error) {
      toast.error('Failed to save settings');
    } else {
      toast.success('Publish settings saved');
    }
  };

  const handlePublish = async () => {
    if (!presentationId) return;
    setPublishing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if already has a share_token
      const { data: existing } = await supabase
        .from('presentations')
        .select('share_token')
        .eq('id', presentationId)
        .single();

      const existingToken = (existing as any)?.share_token;

      // Update presentation with latest data
      const shareToken = existingToken || crypto.randomUUID().slice(0, 12);
      const { error } = await supabase
        .from('presentations')
        .update({
          title,
          theme_id: themeId,
          design_tokens: designTokens as any,
          slides: slides as any,
          share_token: shareToken,
          is_public: true,
        } as any)
        .eq('id', presentationId);

      if (error) throw error;

      const url = `${window.location.origin}/cosmo/view/${shareToken}`;
      setPublishedUrl(url);
      toast.success(existingToken ? 'Published version updated!' : 'Presentation published!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  const handleCopy = async () => {
    if (!publishedUrl) return;
    await navigator.clipboard.writeText(publishedUrl);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const charCountTitle = metaTitle.length;
  const charCountDesc = metaDescription.length;

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-0">
        {/* Publish Link Section */}
        <PanelSection title="Publish">
          {publishedUrl ? (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/30 border border-border">
                <Globe className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="text-[9px] text-foreground truncate flex-1 font-mono">{publishedUrl}</span>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCopy} variant="outline" size="sm" className="flex-1 h-7 text-[10px] gap-1.5">
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied' : 'Copy Link'}
                </Button>
                <Button
                  onClick={() => window.open(publishedUrl, '_blank')}
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] gap-1.5"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open
                </Button>
              </div>
              <Button
                onClick={handlePublish}
                disabled={publishing}
                size="sm"
                className="w-full h-7 text-[10px]"
              >
                {publishing ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Save className="w-3 h-3 mr-1.5" />}
                Update Published Version
              </Button>
            </div>
          ) : (
            <Button
              onClick={handlePublish}
              disabled={publishing || !presentationId}
              className="w-full h-8 text-xs gap-1.5"
              size="sm"
            >
              {publishing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />}
              Publish & Get Link
            </Button>
          )}
        </PanelSection>

        {/* Publish Mode */}
        <PanelSection title="Publish Mode">
          <div className="grid grid-cols-2 gap-2">
            {PUBLISH_MODES.map((mode) => {
              const Icon = mode.icon;
              const isActive = publishMode === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => setPublishMode(mode.id)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-colors text-center',
                    isActive
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-[9px] font-medium">{mode.label}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[9px] text-muted-foreground mt-1">
            {PUBLISH_MODES.find((m) => m.id === publishMode)?.desc}
          </p>
        </PanelSection>

        {/* SEO Settings */}
        <PanelSection title="SEO">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[9px] text-muted-foreground">Page Title</label>
              <span className={cn('text-[8px]', charCountTitle > 60 ? 'text-destructive' : 'text-muted-foreground')}>
                {charCountTitle}/60
              </span>
            </div>
            <Input
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              placeholder={title || 'Page title for search engines'}
              className="h-7 text-[10px] bg-muted/30 border-0"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[9px] text-muted-foreground">Meta Description</label>
              <span className={cn('text-[8px]', charCountDesc > 160 ? 'text-destructive' : 'text-muted-foreground')}>
                {charCountDesc}/160
              </span>
            </div>
            <Textarea
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              placeholder="Describe this page for search engines..."
              className="text-[10px] bg-muted/30 border-0 min-h-[48px] resize-none"
            />
          </div>

          <div>
            <label className="text-[9px] text-muted-foreground block mb-1">OG Image URL</label>
            <Input
              value={ogImageUrl}
              onChange={(e) => setOgImageUrl(e.target.value)}
              placeholder="https://... (auto-generated from first slide if empty)"
              className="h-7 text-[10px] bg-muted/30 border-0"
            />
          </div>
        </PanelSection>

        {/* SEO Preview */}
        <PanelSection title="Search Preview" defaultOpen={false}>
          <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
            <div className="text-[11px] font-medium text-blue-600 truncate">
              {metaTitle || title || 'Untitled Presentation'}
            </div>
            <div className="text-[9px] text-green-700 truncate">
              colabcanvas.lovable.app/cosmo/view/...
            </div>
            <div className="text-[9px] text-muted-foreground line-clamp-2">
              {metaDescription || 'No description set. Add a meta description for better search visibility.'}
            </div>
          </div>
        </PanelSection>

        {/* Save Button */}
        <div className="pt-3">
          <Button
            onClick={handleSave}
            disabled={saving || !presentationId}
            className="w-full h-8 text-xs"
            size="sm"
          >
            {saving ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Save className="w-3 h-3 mr-1.5" />}
            Save Publish Settings
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}
