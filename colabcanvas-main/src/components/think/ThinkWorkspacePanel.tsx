import React, { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Globe, Link2, Image as ImageIcon, Video, FileText, Loader2, ExternalLink, Plus, Unlink, X, Download, Play, Clock, AlertCircle, Calendar, BarChart3, Send, Trash2, Monitor, Tablet, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import RumiBlackIcon from '@/assets/icons/rumi-black.svg?react';
import { InstagramLogo, TwitterLogo, TikTokLogo, FacebookLogo, LinkedInLogo, PinterestLogo } from '@/components/presentation/BrandLogos';
import { toast } from 'sonner';
import { isWebsiteJob as isWebsiteJobHelper, buildSitePreviewUrl } from '@/lib/websiteJob';
import { PublishLandingDialog } from './PublishLandingDialog';
import { WebsiteCodePanel } from './WebsiteCodePanel';

interface ThinkWorkspacePanelProps {
  activeItem: string;
  livePreviewUrl: string | null;
  activeJob: any;
  agentCursor: any;
  agentIsWorking: boolean;
  agentStatusText: string;
  registerSendCommand: any;
  isWebsiteJob: boolean;
  LiveCanvasPreviewComponent: React.ComponentType<any>;
  selectedBrand?: any;
}

interface StorageAsset {
  id: string;
  name: string;
  url: string;
  created_at: string;
  metadata?: any;
  source?: 'storage' | 'design_assets';
}

export function ThinkWorkspacePanel({
  activeItem,
  livePreviewUrl,
  activeJob,
  agentCursor,
  agentIsWorking,
  agentStatusText,
  registerSendCommand,
  isWebsiteJob,
  LiveCanvasPreviewComponent,
  selectedBrand,
}: ThinkWorkspacePanelProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  switch (activeItem) {
    case 'magic-cursor':
      return <MagicCursorPanel
        livePreviewUrl={livePreviewUrl}
        activeJob={activeJob}
        agentCursor={agentCursor}
        agentIsWorking={agentIsWorking}
        agentStatusText={agentStatusText}
        registerSendCommand={registerSendCommand}
        isWebsiteJob={isWebsiteJob}
        LiveCanvasPreviewComponent={LiveCanvasPreviewComponent}
      />;
    case 'landing-page':
      return <LandingPagePanel
        userId={user?.id}
        selectedBrand={selectedBrand}
        activeJob={activeJob}
        isWebsiteJob={isWebsiteJob}
      />;
    case 'connectors':
      return <ConnectorsPanel userId={user?.id} />;
    case 'image-studio':
      return <ImageStudioPanel userId={user?.id} />;
    case 'video-studio':
      return <VideoStudioPanel userId={user?.id} />;
    case 'document':
      return <DocumentPanel userId={user?.id} />;
    default:
      return <EmptyState />;
  }
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-center mx-auto mb-6">
          <RumiBlackIcon className="h-10 w-10" />
        </div>
        <h2 className="text-lg font-medium text-zinc-900 mb-2 font-instrument-serif">RUMI AI Designer</h2>
        <p className="text-sm text-zinc-500 leading-relaxed">
          Start a conversation in the chat panel and RUMI will bring your creative vision to life on this canvas.
        </p>
      </div>
    </div>
  );
}

function MagicCursorPanel({ livePreviewUrl, activeJob, agentCursor, agentIsWorking, agentStatusText, registerSendCommand, isWebsiteJob, LiveCanvasPreviewComponent }: any) {
  if (livePreviewUrl && activeJob) {
    return (
      <LiveCanvasPreviewComponent
        src={livePreviewUrl}
        cursorPos={agentCursor ? { x: agentCursor.x, y: agentCursor.y } : null}
        cursorLabel={agentCursor?.label}
        cursorClicking={agentCursor?.clicking}
        isWorking={agentIsWorking}
        statusText={agentStatusText}
        onRegisterSendCommand={registerSendCommand}
        onOpenFull={() => {
          if (!activeJob) return;
          if (isWebsiteJob) {
            const params = new URLSearchParams();
            params.set('jobId', activeJob.id);
            if (activeJob.project_id) params.set('projectId', activeJob.project_id);
            window.open(`/site-preview?${params.toString()}`, '_blank');
          } else if (activeJob.project_id) {
            window.open(`/canvas?projectId=${encodeURIComponent(activeJob.project_id)}`, '_blank');
          }
        }}
      />
    );
  }
  return <EmptyState />;
}

// ─── LANDING PAGE PANEL ──────────────────────────────────────────────────────

function LandingPagePanel({
  userId,
  selectedBrand,
  activeJob,
  isWebsiteJob,
}: {
  userId?: string;
  selectedBrand?: any;
  activeJob?: any;
  isWebsiteJob?: boolean;
}) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [manuallySelectedJob, setManuallySelectedJob] = useState<any>(null);
  const [breakpoint, setBreakpoint] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);

  // The selected job follows this priority:
  // 1. Manual selection (user clicked a card) — only valid until user clears it
  // 2. The parent's activeJob if it is a website job (LIVE preview)
  // 3. null (show gallery)
  const selectedJob = useMemo(() => {
    if (manuallySelectedJob) return manuallySelectedJob;
    if (activeJob && isWebsiteJob) return activeJob;
    return null;
  }, [manuallySelectedJob, activeJob, isWebsiteJob]);

  useEffect(() => {
    if (!userId) return;
    let mounted = true;

    const fetchJobs = async () => {
      const { data } = await (supabase as any)
        .from('rumi_autonomous_jobs')
        .select('id, objective, state, project_id, created_at, checkpoint')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (!mounted) return;
      setJobs(data || []);
      setLoading(false);
    };
    fetchJobs();

    // Subscribe to realtime updates so the gallery + live preview stay fresh.
    const channel = supabase
      .channel(`landing-page-jobs-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rumi_autonomous_jobs',
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          const updated = payload.new;
          if (!updated || !mounted) return;
          setJobs(prev => {
            const idx = prev.findIndex((j: any) => j.id === updated.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = updated;
              return next;
            }
            return [updated, ...prev];
          });
        },
      )
      .subscribe();

    return () => { mounted = false; supabase.removeChannel(channel); };
  }, [userId]);

  // ─── Inline website element edits: listen for postMessage from preview iframe ───
  useEffect(() => {
    const onMessage = async (e: MessageEvent) => {
      const msg = e.data;
      if (!msg || msg.source !== 'WEBSITE_PREVIEW' || msg.type !== 'EDIT_ELEMENT') return;
      const targetId = manuallySelectedJob?.id || (activeJob && isWebsiteJob ? activeJob.id : null);
      if (!targetId) return;
      const { sectionIndex, fieldPath, instruction, manualText } = msg;
      try {
        const { data, error } = await supabase.functions.invoke('edit-landing-section', {
          body: { jobId: targetId, sectionIndex, fieldPath, instruction, manualText },
        });
        if (error) throw error;
        const iframe = previewIframeRef.current;
        if (iframe?.contentWindow && data?.updatedSection) {
          iframe.contentWindow.postMessage(
            { source: 'RUMI_AGENT', command: 'website_update_section', payload: { sectionIndex, section: data.updatedSection }, actionId: `inline-edit-${Date.now()}` },
            '*',
          );
        }
        toast.success('Updated');
      } catch (err: any) {
        toast.error(err?.message || 'Edit failed');
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [manuallySelectedJob?.id, activeJob, isWebsiteJob]);

  // Build brand params for iframe
  const brandParams = useMemo(() => {
    if (!selectedBrand) return '';
    const params = new URLSearchParams();
    const snapshot = selectedBrand.brand_system_snapshot;
    if (snapshot) {
      const colors = (snapshot as any)?.colors || (snapshot as any)?.palette;
      if (colors) {
        if (colors.primary) params.set('brandPrimary', colors.primary.replace('#', ''));
        if (colors.accent) params.set('brandAccent', colors.accent.replace('#', ''));
        if (colors.secondary) params.set('brandSecondary', colors.secondary.replace('#', ''));
      }
    }
    const typo = (snapshot as any)?.typography;
    if (typo?.primary?.fontFamily) {
      params.set('brandFont', typo.primary.fontFamily);
    }
    params.set('editable', 'true');
    const str = params.toString();
    return str ? `&${str}` : '';
  }, [selectedBrand]);

  if (loading) return <LoadingState label="Loading landing pages..." />;

  const websiteJobs = jobs.filter(j => isWebsiteJobHelper(j));

  const breakpointWidths = { desktop: '100%', tablet: '768px', mobile: '375px' };

  if (selectedJob) {
    const isLive = activeJob?.id === selectedJob.id && isWebsiteJob &&
      selectedJob.state !== 'COMPLETE' && selectedJob.state !== 'FAILED' && selectedJob.state !== 'CANCELLED';
    const previewUrl = buildSitePreviewUrl({
      jobId: selectedJob.id,
      projectId: selectedJob.project_id,
      brandParams,
    });
    const obj = (selectedJob.objective || {}) as any;
    const cp = (selectedJob.checkpoint || {}) as any;
    const hasSections = Boolean(cp.websiteResult?.siteData?.sections?.length);

    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-200 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setManuallySelectedJob(null)}
              className="w-7 h-7 rounded-lg hover:bg-zinc-100 flex items-center justify-center transition-colors shrink-0"
              title="Back to gallery"
            >
              <X className="h-4 w-4 text-zinc-500" />
            </button>
            <span className="text-sm font-medium text-zinc-900 truncate">{obj.goal || 'Landing Page'}</span>
            {isLive && (
              <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-emerald-400 text-[10px] font-medium text-emerald-600">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400/60 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                Live
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {(['desktop', 'tablet', 'mobile'] as const).map((bp) => {
              const Icon = bp === 'desktop' ? Monitor : bp === 'tablet' ? Tablet : Smartphone;
              return (
                <button
                  key={bp}
                  onClick={() => setBreakpoint(bp)}
                  title={bp.charAt(0).toUpperCase() + bp.slice(1)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${breakpoint === bp ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-zinc-100'}`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
            <div className="w-px h-5 bg-zinc-200 mx-1" />
            <button
              onClick={() => window.open(previewUrl, '_blank')}
              className="h-8 px-3 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-xs font-medium text-zinc-700 flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open
            </button>
            <button
              onClick={() => setPublishDialogOpen(true)}
              className="h-8 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-white flex items-center gap-1.5 transition-colors"
            >
              <Link2 className="h-3.5 w-3.5" /> Publish
            </button>
          </div>
        </div>
        <div className="flex-1 flex bg-zinc-50 overflow-hidden">
          <div className="flex-1 flex items-start justify-center p-4 overflow-auto">
            <div
              className="bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 h-full relative"
              style={{ width: breakpointWidths[breakpoint], maxWidth: '100%' }}
            >
              {isLive && !hasSections && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/95 pointer-events-none">
                  <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                  <p className="text-sm text-zinc-600 font-medium">Generating page structure…</p>
                  <p className="text-xs text-zinc-400">Sections will stream in as they're built</p>
                </div>
              )}
              <iframe
                ref={previewIframeRef}
                src={previewUrl}
                className="w-full h-full border-0"
                title="Landing Page Preview"
              />
            </div>
          </div>
          <div className="w-[340px] shrink-0 border-l border-zinc-200 bg-white overflow-hidden">
            <WebsiteCodePanel jobId={selectedJob.id} iframeRef={previewIframeRef} />
          </div>
        </div>
        <PublishLandingDialog
          open={publishDialogOpen}
          onClose={() => setPublishDialogOpen(false)}
          jobId={selectedJob.id}
          defaultTitle={obj.goal || (cp.websiteResult?.siteData?.siteTitle as string) || 'Landing Page'}
          defaultMeta={(cp.websiteResult?.siteData?.metaDescription as string) || ''}
        />
      </div>
    );
  }

  if (websiteJobs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-center mx-auto mb-4">
            <Globe className="h-8 w-8 text-zinc-400" />
          </div>
          <h3 className="text-base font-medium text-zinc-900 mb-2">No landing pages yet</h3>
          <p className="text-sm text-zinc-500 mb-4">Ask RUMI to generate a landing page in the chat panel using Execute Autonomously mode.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-zinc-900">Landing Pages</h2>
        <span className="text-xs text-zinc-400">{websiteJobs.length} page{websiteJobs.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {websiteJobs.map((job) => {
          const obj = (job.objective || {}) as any;
          const previewUrl = buildSitePreviewUrl({
            jobId: job.id,
            projectId: job.project_id,
            brandParams,
          });
          return (
            <motion.button
              key={job.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setManuallySelectedJob(job)}
              className="group bg-white border border-zinc-200 rounded-xl overflow-hidden hover:shadow-md transition-all text-left"
            >
              <div className="w-full aspect-video bg-zinc-50 relative overflow-hidden">
                <iframe
                  src={previewUrl}
                  className="w-[200%] h-[200%] border-0 pointer-events-none origin-top-left"
                  style={{ transform: 'scale(0.5)' }}
                  title="Preview"
                  tabIndex={-1}
                />
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-zinc-900 truncate">{obj.goal || 'Landing Page'}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${job.state === 'COMPLETE' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                    {job.state === 'COMPLETE' ? '✓ Complete' : '● In progress'}
                  </span>
                  <ExternalLink className="h-3 w-3 text-zinc-300 group-hover:text-zinc-500 transition-colors" />
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ─── CONNECTORS PANEL (SOCIAL HUB) ──────────────────────────────────────────

const PLATFORM_CONFIG = [
  { name: 'Instagram', platform: 'instagram', icon: InstagramLogo, description: 'Connect your Instagram Business account' },
  { name: 'Facebook', platform: 'facebook', icon: FacebookLogo, description: 'Connect your Facebook Pages' },
  { name: 'LinkedIn', platform: 'linkedin', icon: LinkedInLogo, description: 'Connect your LinkedIn profile' },
  { name: 'Pinterest', platform: 'pinterest', icon: PinterestLogo, description: 'Share pins and boards' },
  { name: 'X (Twitter)', platform: 'twitter', icon: TwitterLogo, description: 'Post and schedule tweets' },
  { name: 'TikTok', platform: 'tiktok', icon: TikTokLogo, description: 'Coming soon', comingSoon: true },
];

const platformIcons: Record<string, React.ComponentType<any>> = {
  instagram: InstagramLogo,
  facebook: FacebookLogo,
  linkedin: LinkedInLogo,
  pinterest: PinterestLogo,
  twitter: TwitterLogo,
  tiktok: TikTokLogo,
};

function ConnectorsPanel({ userId }: { userId?: string }) {
  return (
    <Tabs defaultValue="connections" className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-0 shrink-0">
        <h2 className="text-lg font-medium text-zinc-900 mb-3">Social Hub</h2>
        <TabsList className="w-full justify-start gap-4 border-b border-zinc-200 pb-0 rounded-none">
          <TabsTrigger value="connections" className="data-[state=active]:border-b-2 data-[state=active]:border-zinc-900 rounded-none pb-2">
            <Link2 className="h-3.5 w-3.5 mr-1.5" /> Connections
          </TabsTrigger>
          <TabsTrigger value="calendar" className="data-[state=active]:border-b-2 data-[state=active]:border-zinc-900 rounded-none pb-2">
            <Calendar className="h-3.5 w-3.5 mr-1.5" /> Content
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:border-b-2 data-[state=active]:border-zinc-900 rounded-none pb-2">
            <BarChart3 className="h-3.5 w-3.5 mr-1.5" /> Analytics
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="connections" className="flex-1 overflow-y-auto m-0">
        <ConnectionsTab userId={userId} />
      </TabsContent>
      <TabsContent value="calendar" className="flex-1 overflow-y-auto m-0">
        <ContentCalendarTab userId={userId} />
      </TabsContent>
      <TabsContent value="analytics" className="flex-1 overflow-y-auto m-0">
        <AnalyticsTab userId={userId} />
      </TabsContent>
    </Tabs>
  );
}

// ── Connections Tab
interface ConnectorInfo {
  platform: string;
  platform_username?: string;
}

function ConnectionsTab({ userId }: { userId?: string }) {
  const [connectors, setConnectors] = useState<ConnectorInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadConnectors = async () => {
    if (!userId) return;
    const { data } = await (supabase as any)
      .from('social_connectors')
      .select('platform, platform_username')
      .eq('user_id', userId)
      .eq('status', 'connected');
    setConnectors(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadConnectors();

    // Listen for postMessage from OAuth popup
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'social-oauth-result') {
        if (event.data.result === 'success') {
          toast.success(`${event.data.detail || 'Account'} connected!`);
          loadConnectors();
        } else {
          toast.error(`Connection failed: ${event.data.detail || 'Unknown error'}`);
        }
      }
    };
    window.addEventListener('message', handler);

    // Also handle URL params for full-redirect fallback
    const params = new URLSearchParams(window.location.search);
    const socialAuth = params.get('social_auth');
    if (socialAuth === 'success') {
      toast.success(`${params.get('platform') || 'Account'} connected!`);
      loadConnectors();
      const url = new URL(window.location.href);
      url.searchParams.delete('social_auth');
      url.searchParams.delete('platform');
      window.history.replaceState({}, '', url.toString());
    } else if (socialAuth === 'error') {
      toast.error(`Failed to connect: ${params.get('message') || 'Connection failed'}`);
      const url = new URL(window.location.href);
      ['social_auth', 'platform', 'message'].forEach(k => url.searchParams.delete(k));
      window.history.replaceState({}, '', url.toString());
    }

    return () => window.removeEventListener('message', handler);
  }, [userId]);

  const handleConnect = async (platform: string) => {
    if (!userId) return;

    // Lock OAuth to production domain only
    const allowedOrigins = ['https://app.letscolab.tech', 'https://letscolab.in', 'http://localhost:5173', 'http://localhost:3000'];
    if (!allowedOrigins.some(o => window.location.origin.startsWith(o))) {
      toast.error('Social connections must be set up from app.letscolab.tech. Please open the app from your custom domain.');
      return;
    }

    setActionLoading(platform);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await supabase.functions.invoke('social-oauth-initiate', {
        body: { platform, origin: window.location.origin },
      });

      if (res.error) throw res.error;
      const { authUrl, error: funcError } = res.data;
      if (funcError) {
        toast.error(funcError);
        return;
      }
      if (authUrl) {
        // Open OAuth in a popup window
        const w = 600, h = 700;
        const left = window.screenX + (window.outerWidth - w) / 2;
        const top = window.screenY + (window.outerHeight - h) / 2;
        window.open(authUrl, 'social-oauth', `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no`);
      }
    } catch (e: any) {
      toast.error(`Failed to connect: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisconnect = async (platform: string) => {
    if (!userId) return;
    setActionLoading(platform);
    try {
      const { error } = await (supabase as any)
        .from('social_connectors')
        .delete()
        .eq('user_id', userId)
        .eq('platform', platform);
      if (error) throw error;
      setConnectors(prev => prev.filter(p => p.platform !== platform));
      toast.success(`${platform} disconnected`);
    } catch (e: any) {
      toast.error(`Failed to disconnect: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <LoadingState label="Loading connectors..." />;

  const connectedPlatforms = connectors.map(c => c.platform);

  return (
    <div className="p-6">
      <p className="text-sm text-zinc-500 mb-6">Connect your social media accounts to publish content directly from RUMI.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PLATFORM_CONFIG.map((c) => {
          const connectorInfo = connectors.find(conn => conn.platform === c.platform);
          const isConnected = !!connectorInfo;
          const isLoading = actionLoading === c.platform;
          const IconComponent = c.icon;
          return (
            <div key={c.platform} className="bg-white border border-zinc-200 rounded-xl p-4 flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 shrink-0"><IconComponent className="w-8 h-8" /></div>
                <div>
                  <p className="text-sm font-medium text-zinc-900">{c.name}</p>
                  <p className="text-xs text-zinc-400">{c.description}</p>
                </div>
              </div>
              {isConnected ? (
                <div className="flex items-center gap-2 mt-auto">
                  <div className="flex-1">
                    <span className="text-xs text-emerald-600 font-medium">✓ Connected</span>
                    {connectorInfo.platform_username && (
                      <p className="text-[10px] text-zinc-400 mt-0.5 truncate">{connectorInfo.platform_username}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs text-zinc-400 hover:text-red-500 h-7 px-2" onClick={() => handleDisconnect(c.platform)} disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlink className="h-3 w-3" />}
                  </Button>
                </div>
              ) : (c as any).comingSoon ? (
                <span className="text-xs text-zinc-400 mt-auto">Coming Soon</span>
              ) : (
                <Button variant="outline" size="sm" className="mt-auto text-xs" onClick={() => handleConnect(c.platform)} disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Link2 className="h-3 w-3 mr-1" />}
                  Connect
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Content Calendar Tab
function ContentCalendarTab({ userId }: { userId?: string }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [composePlatform, setComposePlatform] = useState('instagram');
  const [composeText, setComposeText] = useState('');
  const [composeSchedule, setComposeSchedule] = useState('');
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const { data } = await supabase
        .from('social_posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      setPosts(data || []);
      setLoading(false);
    };
    load();
  }, [userId]);

  const handlePublish = async () => {
    if (!composeText.trim()) return;
    setPublishing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await supabase.functions.invoke('social-publish', {
        body: {
          platform: composePlatform,
          content_text: composeText,
          scheduled_at: composeSchedule || undefined,
        },
      });

      if (res.error) throw res.error;
      const result = res.data;
      if (result?.post) {
        setPosts(prev => [result.post, ...prev]);
        toast.success(result.success ? 'Post published!' : `Post saved as ${result.post.status}`);
        if (result.error) toast.info(result.error);
      }
      setShowCompose(false);
      setComposeText('');
      setComposeSchedule('');
    } catch (e: any) {
      toast.error(e.message || 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async (postId: string) => {
    const { error } = await supabase.from('social_posts').delete().eq('id', postId);
    if (!error) {
      setPosts(prev => prev.filter(p => p.id !== postId));
      toast.success('Post deleted');
    }
  };

  if (loading) return <LoadingState label="Loading content..." />;

  const statusColors: Record<string, string> = {
    draft: 'bg-zinc-100 text-zinc-600',
    scheduled: 'bg-blue-50 text-blue-600',
    published: 'bg-emerald-50 text-emerald-600',
    failed: 'bg-red-50 text-red-500',
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-zinc-500">{posts.length} post{posts.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={() => setShowCompose(true)} className="text-xs gap-1.5">
          <Plus className="h-3.5 w-3.5" /> New Post
        </Button>
      </div>

      {/* Compose Modal */}
      <AnimatePresence>
        {showCompose && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white border border-zinc-200 rounded-xl p-4 mb-4 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-3">
              <select
                value={composePlatform}
                onChange={e => setComposePlatform(e.target.value)}
                className="text-sm border border-zinc-200 rounded-lg px-2 py-1.5 bg-white"
              >
                {PLATFORM_CONFIG.filter(p => !(p as any).comingSoon).map(p => (
                  <option key={p.platform} value={p.platform}>{p.name}</option>
                ))}
              </select>
              <input
                type="datetime-local"
                value={composeSchedule}
                onChange={e => setComposeSchedule(e.target.value)}
                className="text-sm border border-zinc-200 rounded-lg px-2 py-1.5 bg-white flex-1"
                placeholder="Schedule (optional)"
              />
            </div>
            <textarea
              value={composeText}
              onChange={e => setComposeText(e.target.value)}
              placeholder="Write your post content..."
              rows={4}
              className="w-full text-sm border border-zinc-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-1 focus:ring-zinc-300"
            />
            <div className="flex items-center justify-end gap-2 mt-3">
              <Button variant="ghost" size="sm" onClick={() => setShowCompose(false)} className="text-xs">Cancel</Button>
              <Button size="sm" onClick={handlePublish} disabled={publishing || !composeText.trim()} className="text-xs gap-1.5">
                {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                {composeSchedule ? 'Schedule' : 'Publish Now'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {posts.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">No posts yet. Create one or ask RUMI to generate content.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => {
            const PlatformIcon = platformIcons[post.platform] || Globe;
            return (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white border border-zinc-200 rounded-xl p-4 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 shrink-0 mt-0.5">
                    <PlatformIcon className="w-8 h-8" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-900 line-clamp-2">{post.content_text}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize ${statusColors[post.status] || statusColors.draft}`}>
                        {post.status}
                      </span>
                      {post.scheduled_at && post.status === 'scheduled' && (
                        <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {new Date(post.scheduled_at).toLocaleString()}
                        </span>
                      )}
                      {post.post_url && (
                        <a href={post.post_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5">
                          <ExternalLink className="h-2.5 w-2.5" /> View
                        </a>
                      )}
                      {post.error_message && (
                        <span className="text-[10px] text-red-400 truncate max-w-[200px]" title={post.error_message}>
                          {post.error_message}
                        </span>
                      )}
                      <span className="text-[10px] text-zinc-400 ml-auto">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(post.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center transition-colors shrink-0">
                    <Trash2 className="h-3.5 w-3.5 text-zinc-300 hover:text-red-400" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Analytics Tab
function AnalyticsTab({ userId }: { userId?: string }) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      try {
        const res = await supabase.functions.invoke('social-analytics');
        if (res.data) setAnalytics(res.data);
      } catch (e) {
        console.error('Analytics error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  if (loading) return <LoadingState label="Loading analytics..." />;

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-center">
          <BarChart3 className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">No analytics data available yet.</p>
        </div>
      </div>
    );
  }

  const { summary, suggestions } = analytics;

  return (
    <div className="p-6 overflow-y-auto">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white border border-zinc-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-semibold text-zinc-900">{summary?.totalPosts || 0}</p>
          <p className="text-xs text-zinc-500 mt-1">Total Posts</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-semibold text-emerald-600">{summary?.publishedPosts || 0}</p>
          <p className="text-xs text-zinc-500 mt-1">Published</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-semibold text-blue-600">{summary?.totalEngagement || 0}</p>
          <p className="text-xs text-zinc-500 mt-1">Engagement</p>
        </div>
      </div>

      {/* Platform Breakdown */}
      {summary?.platformStats && Object.keys(summary.platformStats).length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-zinc-900 mb-3">Platform Breakdown</h3>
          <div className="space-y-2">
            {Object.entries(summary.platformStats).map(([platform, stats]: [string, any]) => {
              const PlatformIcon = platformIcons[platform];
              return (
                <div key={platform} className="bg-white border border-zinc-200 rounded-xl p-3 flex items-center gap-3">
                  {PlatformIcon && <div className="w-6 h-6 shrink-0"><PlatformIcon className="w-6 h-6" /></div>}
                  <span className="text-sm font-medium text-zinc-900 capitalize flex-1">{platform}</span>
                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    <span>{stats.posts} posts</span>
                    <span>❤️ {stats.likes}</span>
                    <span>💬 {stats.comments}</span>
                    <span>🔄 {stats.shares}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Growth Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-zinc-900 mb-3 flex items-center gap-1.5">
            ✨ AI Growth Suggestions
          </h3>
          <div className="space-y-2">
            {suggestions.map((suggestion: string, i: number) => (
              <div key={i} className="bg-gradient-to-r from-zinc-50 to-white border border-zinc-200 rounded-xl p-3">
                <p className="text-sm text-zinc-700 leading-relaxed">{suggestion}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── IMAGE STUDIO PANEL ─────────────────────────────────────────────────────

function ImageStudioPanel({ userId }: { userId?: string }) {
  const [images, setImages] = useState<StorageAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<StorageAsset | null>(null);

  useEffect(() => {
    if (!userId) return;
    const fetchImages = async () => {
      const allImages: StorageAsset[] = [];

      const { data: dbAssets } = await supabase
        .from('design_assets')
        .select('id, file_path, signed_url, mime_type, created_at, thumbnail_url')
        .eq('user_id', userId)
        .like('mime_type', 'image/%')
        .order('created_at', { ascending: false })
        .limit(50);

      if (dbAssets) {
        for (const asset of dbAssets) {
          const url = asset.signed_url || asset.thumbnail_url || '';
          if (url) {
            allImages.push({ id: asset.id, name: asset.file_path?.split('/').pop() || 'Design Asset', url, created_at: asset.created_at || '', source: 'design_assets' });
          }
        }
      }

      const { data: storageFiles } = await supabase.storage
        .from('design-tool-uploads')
        .list(`think/${userId}`, { limit: 50, sortBy: { column: 'created_at', order: 'desc' } });

      if (storageFiles && storageFiles.length > 0) {
        const imageFiles = storageFiles.filter(f => f.name.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i));
        for (const file of imageFiles.slice(0, 30)) {
          const { data: signedData } = await supabase.storage
            .from('design-tool-uploads')
            .createSignedUrl(`think/${userId}/${file.name}`, 3600);
          if (signedData?.signedUrl) {
            allImages.push({ id: file.id || file.name, name: file.name, url: signedData.signedUrl, created_at: file.created_at || '', source: 'storage' });
          }
        }
      }

      setImages(allImages);
      setLoading(false);
    };
    fetchImages();
  }, [userId]);

  if (loading) return <LoadingState label="Loading images..." />;

  if (images.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-center mx-auto mb-4">
            <ImageIcon className="h-8 w-8 text-zinc-400" />
          </div>
          <h3 className="text-base font-medium text-zinc-900 mb-2">No images yet</h3>
          <p className="text-sm text-zinc-500 mb-4">Upload images in chat or generate them with RUMI to see them here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-zinc-900">Image Studio</h2>
        <span className="text-xs text-zinc-400">{images.length} image{images.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="grid grid-cols-3 lg:grid-cols-4 gap-3">
        {images.map((img) => (
          <motion.button
            key={img.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setSelectedImage(img)}
            className="group relative aspect-square rounded-xl overflow-hidden border border-zinc-200 hover:shadow-md transition-all"
          >
            <img src={img.url} alt={img.name} className="w-full h-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-end p-2">
              <span className="text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 px-1.5 py-0.5 rounded truncate max-w-full">
                {img.name}
              </span>
            </div>
          </motion.button>
        ))}
      </div>

      {selectedImage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-8"
          onClick={() => setSelectedImage(null)}
        >
          <div className="absolute top-4 right-4 flex items-center gap-2" onClick={e => e.stopPropagation()}>
            <a href={selectedImage.url} download={selectedImage.name} target="_blank" rel="noopener noreferrer"
              className="h-9 px-4 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium flex items-center gap-2 backdrop-blur-sm transition-colors">
              <Download className="h-4 w-4" /> Download
            </a>
            <button onClick={() => setSelectedImage(null)}
              className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-sm transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          <img src={selectedImage.url} alt={selectedImage.name} className="max-w-full max-h-[80vh] rounded-xl object-contain" onClick={e => e.stopPropagation()} />
          <p className="text-white/60 text-xs mt-3">{selectedImage.name}</p>
        </motion.div>
      )}
    </div>
  );
}

// ─── VIDEO STUDIO PANEL ─────────────────────────────────────────────────────

function VideoStudioPanel({ userId }: { userId?: string }) {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    const fetchVideos = async () => {
      const { data } = await (supabase as any)
        .from('video_generation_jobs')
        .select('id, prompt, status, video_url, thumbnail_url, created_at, provider, duration')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30);
      setVideos(data || []);
      setLoading(false);
    };
    fetchVideos();
  }, [userId]);

  if (loading) return <LoadingState label="Loading videos..." />;

  if (videos.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-center mx-auto mb-4">
            <Video className="h-8 w-8 text-zinc-400" />
          </div>
          <h3 className="text-base font-medium text-zinc-900 mb-2">No videos yet</h3>
          <p className="text-sm text-zinc-500 mb-4">Ask RUMI to generate a video in the chat panel. Videos created on Canvas also appear here.</p>
        </div>
      </div>
    );
  }

  const statusConfig: Record<string, { color: string; label: string }> = {
    completed: { color: 'bg-emerald-50 text-emerald-600', label: '✓ Ready' },
    processing: { color: 'bg-blue-50 text-blue-600', label: '● Processing' },
    pending: { color: 'bg-amber-50 text-amber-600', label: '◷ Queued' },
    failed: { color: 'bg-red-50 text-red-500', label: '✕ Failed' },
  };

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-zinc-900">Video Studio</h2>
        <span className="text-xs text-zinc-400">{videos.length} video{videos.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.map((v) => {
          const st = statusConfig[v.status] || statusConfig.pending;
          const isPlaying = playingId === v.id;
          return (
            <motion.div key={v.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-zinc-200 rounded-xl overflow-hidden hover:shadow-md transition-all">
              <div className="w-full aspect-video bg-zinc-900 relative overflow-hidden">
                {v.status === 'completed' && v.video_url ? (
                  isPlaying ? (
                    <video src={v.video_url} className="w-full h-full object-cover" controls autoPlay onEnded={() => setPlayingId(null)} />
                  ) : (
                    <button onClick={() => setPlayingId(v.id)} className="w-full h-full relative group">
                      {v.thumbnail_url ? <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900" />}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                        <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center"><Play className="h-5 w-5 text-zinc-900 ml-0.5" /></div>
                      </div>
                    </button>
                  )
                ) : v.status === 'processing' ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center"><Loader2 className="h-8 w-8 text-blue-400 animate-spin mx-auto mb-2" /><p className="text-xs text-zinc-400">Generating...</p></div>
                  </div>
                ) : v.status === 'failed' ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center"><AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" /><p className="text-xs text-red-400">Generation failed</p></div>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Clock className="h-8 w-8 text-zinc-600" /></div>
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-zinc-900 truncate">{v.prompt || 'Video'}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                  <span className="text-[10px] text-zinc-400">{new Date(v.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── DOCUMENT PANEL ─────────────────────────────────────────────────────────

function DocumentPanel({ userId }: { userId?: string }) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!userId) return;
    const fetchDocs = async () => {
      const allDocs: any[] = [];

      const { data: presentations } = await supabase
        .from('presentations')
        .select('id, title, created_at, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (presentations) {
        for (const p of presentations) {
          allDocs.push({ id: p.id, title: p.title || 'Untitled Presentation', type: 'presentation', date: p.updated_at || p.created_at, action: () => navigate(`/cosmo?presentationId=${p.id}`) });
        }
      }

      const { data: storageFiles } = await supabase.storage
        .from('design-tool-uploads')
        .list(`think/${userId}`, { limit: 50, sortBy: { column: 'created_at', order: 'desc' } });

      if (storageFiles) {
        const docFiles = storageFiles.filter(f => f.name.match(/\.(html|md)$/i));
        for (const file of docFiles.slice(0, 20)) {
          const { data: signedData } = await supabase.storage
            .from('design-tool-uploads')
            .createSignedUrl(`think/${userId}/${file.name}`, 3600);
          const isPresentation = file.name.includes('presentation');
          const isPdf = file.name.includes('pdf');
          allDocs.push({
            id: file.id || file.name,
            title: file.name.replace(/^\d+-/, '').replace(/\.(html|md)$/, '').replace(/-/g, ' '),
            type: isPresentation ? 'presentation' : isPdf ? 'pdf' : 'document',
            date: file.created_at || '',
            action: () => { if (signedData?.signedUrl) window.open(signedData.signedUrl, '_blank'); },
          });
        }
      }

      setDocuments(allDocs);
      setLoading(false);
    };
    fetchDocs();
  }, [userId]);

  if (loading) return <LoadingState label="Loading documents..." />;

  if (documents.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-zinc-400" />
          </div>
          <h3 className="text-base font-medium text-zinc-900 mb-2">No documents yet</h3>
          <p className="text-sm text-zinc-500 mb-4">Ask RUMI to create presentations, documents, or PDFs in the chat panel.</p>
        </div>
      </div>
    );
  }

  const typeIcons: Record<string, { icon: string; color: string }> = {
    presentation: { icon: '📊', color: 'bg-blue-50' },
    document: { icon: '📄', color: 'bg-zinc-50' },
    pdf: { icon: '📕', color: 'bg-red-50' },
  };

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-zinc-900">Documents & Presentations</h2>
        <span className="text-xs text-zinc-400">{documents.length} item{documents.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="space-y-2">
        {documents.map((doc) => {
          const typeInfo = typeIcons[doc.type] || typeIcons.document;
          return (
            <motion.button key={doc.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              onClick={doc.action}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-zinc-200 hover:shadow-sm hover:bg-zinc-50 transition-all text-left">
              <div className={`w-10 h-10 rounded-lg ${typeInfo.color} flex items-center justify-center shrink-0 text-lg`}>{typeInfo.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 truncate capitalize">{doc.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-500 font-medium capitalize">{doc.type}</span>
                  <span className="text-xs text-zinc-400">{doc.date ? new Date(doc.date).toLocaleDateString() : ''}</span>
                </div>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ─── LOADING STATE ──────────────────────────────────────────────────────────

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <Loader2 className="h-6 w-6 text-zinc-400 animate-spin mx-auto mb-3" />
        <p className="text-sm text-zinc-500">{label}</p>
      </div>
    </div>
  );
}
