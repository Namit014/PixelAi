import { useState } from 'react';
import { usePresentationStore } from '@/stores/presentationStore';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Check, Globe, Lock, Loader2, Code, ExternalLink, Link2, Download, FileImage, FileText, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareDialog({ open, onOpenChange }: Props) {
  const title = usePresentationStore((s) => s.title);
  const slides = usePresentationStore((s) => s.slides);
  const designTokens = usePresentationStore((s) => s.designTokens);
  const themeId = usePresentationStore((s) => s.themeId);
  const presentationId = usePresentationStore((s) => s.id);

  const [isPublic, setIsPublic] = useState(true);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<'pdf' | 'png' | 'pptx' | null>(null);
  const [exportProgress, setExportProgress] = useState(0);
  const [isFreeUser, setIsFreeUser] = useState(true);

  // Check subscription on mount
  useState(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase.from('credits').select('subscription_tier').eq('user_id', data.user.id).single().then(({ data: credits }) => {
          if (credits && credits.subscription_tier !== 'free') setIsFreeUser(false);
        });
      }
    });
  });

  const handleExport = async (format: 'pdf' | 'png' | 'pptx') => {
    if (slides.length === 0) { toast.error('No slides to export'); return; }
    setExportingFormat(format);
    setExportProgress(0);
    try {
      const { captureSlideAsImage } = await import('./ExportPresentationDialog');
      if (format === 'png') {
        for (let i = 0; i < slides.length; i++) {
          setExportProgress(Math.round(((i + 1) / slides.length) * 100));
          const dataUrl = await captureSlideAsImage(slides[i], designTokens, 1920, 1080, isFreeUser);
          const link = document.createElement('a');
          link.download = `${title}-slide-${i + 1}.png`;
          link.href = dataUrl;
          link.click();
        }
        toast.success(`Exported ${slides.length} slides as PNG`);
      } else if (format === 'pdf') {
        const { default: jsPDF } = await import('jspdf');
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1920, 1080] });
        for (let i = 0; i < slides.length; i++) {
          setExportProgress(Math.round(((i + 1) / slides.length) * 100));
          if (i > 0) pdf.addPage([1920, 1080], 'landscape');
          const dataUrl = await captureSlideAsImage(slides[i], designTokens, 1920, 1080, isFreeUser);
          pdf.addImage(dataUrl, 'PNG', 0, 0, 1920, 1080);
        }
        pdf.save(`${title}.pdf`);
        toast.success('Exported as PDF');
      } else if (format === 'pptx') {
        const pptxgenjs = await import('pptxgenjs');
        const pptx = new pptxgenjs.default();
        pptx.layout = 'LAYOUT_WIDE';
        for (let i = 0; i < slides.length; i++) {
          setExportProgress(Math.round(((i + 1) / slides.length) * 100));
          const pptxSlide = pptx.addSlide();
          const dataUrl = await captureSlideAsImage(slides[i], designTokens, 1920, 1080, isFreeUser);
          pptxSlide.addImage({ data: dataUrl, x: 0, y: 0, w: '100%', h: '100%' });
        }
        await pptx.writeFile({ fileName: `${title}.pptx` });
        toast.success('Exported as PPTX');
      }
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(`Export failed: ${error.message}`);
    } finally {
      setExportingFormat(null);
      setExportProgress(0);
    }
  };

  const generateShareLink = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Please sign in to share'); setSaving(false); return; }

      const newShareToken = crypto.randomUUID().slice(0, 12);

      // Capture first slide as OG image
      let ogImageUrl: string | null = null;
      if (slides.length > 0) {
        try {
          const { captureSlideAsImage } = await import('./ExportPresentationDialog');
          const dataUrl = await captureSlideAsImage(slides[0], designTokens, 1200, 630, false);
          // Convert data URL to blob
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const ogPath = `${user.id}/og-${newShareToken}.png`;
          const { error: uploadErr } = await supabase.storage
            .from('design-assets')
            .upload(ogPath, blob, { contentType: 'image/png', upsert: true });
          if (!uploadErr) {
            const { data: publicData } = supabase.storage.from('design-assets').getPublicUrl(ogPath);
            ogImageUrl = publicData.publicUrl;
          }
        } catch (e) {
          console.warn('OG image capture failed:', e);
        }
      }

      const metaDescription = `${slides.length} slides • Created with Colab`;
      const payload = {
        user_id: user.id,
        title,
        theme_id: themeId,
        design_tokens: designTokens as any,
        slides: slides as any,
        share_token: newShareToken,
        is_public: isPublic,
        meta_title: title,
        meta_description: metaDescription,
        og_image_url: ogImageUrl,
      };

      let data: any;

      if (presentationId) {
        const { data: d, error } = await supabase
          .from('presentations')
          .update({
            title: payload.title,
            theme_id: payload.theme_id,
            design_tokens: payload.design_tokens,
            slides: payload.slides,
            is_public: payload.is_public,
            meta_title: payload.meta_title,
            meta_description: payload.meta_description,
            og_image_url: payload.og_image_url,
          })
          .eq('id', presentationId)
          .select('id, share_token')
          .single();
        if (error) throw error;
        data = d;
      } else {
        const { data: d, error } = await supabase
          .from('presentations')
          .insert(payload)
          .select('id, share_token')
          .single();
        if (error) throw error;
        data = d;
      }

      const url = `${window.location.origin}/cosmo/view/${data.share_token}`;
      setShareUrl(url);
      setShareToken(data.share_token);
      toast.success('Share link generated!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate link');
    }
    setSaving(false);
  };

  const copyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const embedCode = shareUrl
    ? `<iframe src="${shareUrl}" width="960" height="540" frameborder="0" allowfullscreen style="border-radius:8px;box-shadow:0 4px 24px rgba(0,0,0,0.1)"></iframe>`
    : '';

  const copyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
    setCopiedEmbed(true);
    toast.success('Embed code copied!');
    setTimeout(() => setCopiedEmbed(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-lg">Share "{title}"</DialogTitle>
          <DialogDescription className="text-sm">{slides.length} slides</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="share" className="w-full">
          <TabsList className="w-full rounded-none border-b bg-transparent h-auto p-0 px-6">
            <TabsTrigger value="share" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2.5 text-sm">
              <Link2 className="w-3.5 h-3.5 mr-1.5" /> Share
            </TabsTrigger>
            <TabsTrigger value="export" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2.5 text-sm">
              <Download className="w-3.5 h-3.5 mr-1.5" /> Export
            </TabsTrigger>
            <TabsTrigger value="embed" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2.5 text-sm">
              <Code className="w-3.5 h-3.5 mr-1.5" /> Embed
            </TabsTrigger>
          </TabsList>

          {/* ── Share Tab ── */}
          <TabsContent value="share" className="px-6 py-4 space-y-4 mt-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isPublic ? <Globe className="w-4 h-4 text-muted-foreground" /> : <Lock className="w-4 h-4 text-muted-foreground" />}
                <Label className="text-sm">Anyone with the link can view</Label>
              </div>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            </div>

            {shareUrl ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input value={shareUrl} readOnly className="text-sm font-mono bg-muted/50" />
                  <Button onClick={copyLink} variant="outline" size="icon" className="shrink-0">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(shareUrl, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Present from Link
                </Button>
              </div>
            ) : (
              <Button onClick={generateShareLink} disabled={saving} className="w-full">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link2 className="w-4 h-4 mr-2" />}
                Generate Share Link
              </Button>
            )}

            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                Advanced settings
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                <p className="text-xs text-muted-foreground">
                  {presentationId ? 'Sharing updates your existing link.' : 'A snapshot of your current presentation will be saved.'}
                </p>
              </CollapsibleContent>
            </Collapsible>
          </TabsContent>

          {/* ── Export Tab ── */}
          <TabsContent value="export" className="px-6 py-4 space-y-3 mt-0">
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start gap-3 h-12" onClick={() => handleExport('pdf')} disabled={exportingFormat !== null}>
                <FileText className="w-5 h-5 text-red-500" />
                <div className="text-left">
                  <div className="text-sm font-medium">Export as PDF</div>
                  <div className="text-[11px] text-muted-foreground">{exportingFormat === 'pdf' ? `Exporting... ${exportProgress}%` : 'Best for sharing & printing'}</div>
                </div>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 h-12" onClick={() => handleExport('png')} disabled={exportingFormat !== null}>
                <FileImage className="w-5 h-5 text-blue-500" />
                <div className="text-left">
                  <div className="text-sm font-medium">Export as PNG</div>
                  <div className="text-[11px] text-muted-foreground">{exportingFormat === 'png' ? `Exporting... ${exportProgress}%` : 'Individual slide images'}</div>
                </div>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 h-12" onClick={() => handleExport('pptx')} disabled={exportingFormat !== null}>
                <Eye className="w-5 h-5 text-orange-500" />
                <div className="text-left">
                  <div className="text-sm font-medium">Export as PPTX</div>
                  <div className="text-[11px] text-muted-foreground">{exportingFormat === 'pptx' ? `Exporting... ${exportProgress}%` : 'Editable in PowerPoint'}</div>
                </div>
              </Button>
            </div>
          </TabsContent>

          {/* ── Embed Tab ── */}
          <TabsContent value="embed" className="px-6 py-4 space-y-3 mt-0">
            {shareUrl ? (
              <>
                <div className="relative">
                  <pre className="p-3 bg-muted rounded-lg text-[11px] font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap break-all">
                    {embedCode}
                  </pre>
                  <Button
                    onClick={copyEmbed}
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7"
                  >
                    {copiedEmbed ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Paste this code into your website's HTML to embed the presentation.
                </p>
              </>
            ) : (
              <div className="text-center py-6 space-y-3">
                <Code className="w-8 h-8 mx-auto text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Generate a share link first to get your embed code.
                </p>
                <Button onClick={generateShareLink} disabled={saving} size="sm">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Generate Link
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Bottom bar */}
        <div className="border-t px-6 py-3 flex items-center justify-between bg-muted/30">
          <span className="text-[11px] text-muted-foreground">{slides.length} slides • {isPublic ? 'Public' : 'Private'}</span>
          {shareUrl && (
            <Button onClick={copyLink} variant="ghost" size="sm" className="text-xs h-7 gap-1.5">
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              Copy link
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
