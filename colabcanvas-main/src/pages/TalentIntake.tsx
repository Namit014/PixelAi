import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Loader2, Send, Sparkles, ArrowRight, Paperclip, X, FolderOpen, Upload, ArrowLeft, AudioLines, Mic } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { notifyAiComplete } from '@/lib/notifications/aiNotify';
import { UnderstandingPanel } from '@/components/talent/UnderstandingPanel';
import { AttachmentPicker, type Attachment } from '@/components/talent/AttachmentPicker';

interface Msg { role: 'user' | 'ai'; content: string; quick_replies?: string[]; }

const TalentIntake = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const stateOpening = (location.state as any)?.opening as string | undefined;
  const storedOpening = typeof window !== 'undefined' ? localStorage.getItem('talentPrompt') ?? undefined : undefined;
  const opening = stateOpening ?? storedOpening;
  const seededAttachments = ((location.state as any)?.attachments ?? []) as Attachment[];

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState(opening ?? '');

  useEffect(() => {
    if (storedOpening) localStorage.removeItem('talentPrompt');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [extracted, setExtracted] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [assumptions, setAssumptions] = useState<string[]>([]);
  const [concerns, setConcerns] = useState<string[]>([]);
  const [confidence, setConfidence] = useState(0);
  const [readyToCurate, setReadyToCurate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [curating, setCurating] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>(seededAttachments);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const projectIdRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  const ensureProject = async () => {
    if (projectIdRef.current) return projectIdRef.current;
    const { data, error } = await supabase
      .from('talent_projects')
      .insert({ user_id: user!.id, brief: { opening }, status: 'intake' })
      .select('id')
      .single();
    if (error) throw error;
    projectIdRef.current = data.id;
    return data.id;
  };

  const send = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || busy || !user) return;
    const userMsg: Msg = { role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const projectId = await ensureProject();
      await supabase.from('talent_messages').insert({ project_id: projectId, user_id: user.id, role: 'user', content: text });

      const { data, error } = await supabase.functions.invoke('talent-intake', {
        body: { messages: next, brief: { opening, extracted }, attachments },
      });
      if (error) throw error;
      const d = data as any;
      if (d?.error) throw new Error(d.error);

      const ai: Msg = { role: 'ai', content: d.summary_for_user ?? 'Got it.', quick_replies: d.quick_replies };
      setMessages((m) => [...m, ai]);
      setExtracted(d.extracted ?? extracted);
      setRecommendations(d.recommendations ?? []);
      setAssumptions(d.assumptions ?? []);
      setConcerns(d.concerns ?? []);
      setConfidence(d.confidence ?? 0);
      setReadyToCurate(!!d.ready_to_curate);

      await supabase.from('talent_messages').insert({ project_id: projectId, user_id: user.id, role: 'ai', content: ai.content, metadata: d });
      await supabase.from('talent_projects').update({
        brief: { opening, last_user_message: text },
        extracted: d.extracted ?? extracted,
        reference_attachments: attachments as any,
      }).eq('id', projectId);
    } catch (e: any) {
      toast.error(e.message ?? 'AI request failed');
    } finally {
      setBusy(false);
    }
  };

  const skipQuestion = () => send('Figure it out for me — use your best judgement.');

  const curate = async (providerPreference: 'freelancer' | 'agency' | 'either' = 'either') => {
    if (!user || !projectIdRef.current) return;
    setCurating(true);
    try {
      const { data, error } = await supabase.functions.invoke('talent-curate-team', {
        body: { brief: { opening, messages }, extracted, provider_preference: providerPreference },
      });
      if (error) throw error;
      const d = data as any;
      if (d?.error) throw new Error(d.error);

      await supabase.from('talent_projects').update({
        title: d.project_title,
        team_composition: d.team_composition,
        timeline: d.timeline,
        pricing: d.pricing,
        explanation: d.explanation,
        provider_preference: providerPreference,
        status: 'proposal',
      } as any).eq('id', projectIdRef.current);

      notifyAiComplete({ source: 'think', message: 'Your team plan is ready', title: 'Team assembled' });
      navigate(`/talent/projects/${projectIdRef.current}`);
    } catch (e: any) {
      toast.error(e.message ?? 'Could not curate team');
    } finally {
      setCurating(false);
    }
  };

  const onAttach = (picks: Attachment[]) => setAttachments((a) => [...a, ...picks]);
  const removeAttachment = (i: number) => setAttachments((a) => a.filter((_, idx) => idx !== i));

  const onFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !user) return;
    setUploading(true);
    try {
      const projectId = await ensureProject();
      const uploaded: Attachment[] = [];
      for (const f of files) {
        if (f.size > 20 * 1024 * 1024) {
          toast.error(`${f.name} exceeds 20MB`);
          continue;
        }
        const path = `${user.id}/talent-refs/${projectId}/${Date.now()}-${f.name}`;
        const { error } = await supabase.storage.from('design-assets').upload(path, f);
        if (error) { toast.error(error.message); continue; }
        const { data: urlData } = supabase.storage.from('design-assets').getPublicUrl(path);
        uploaded.push({ type: 'upload', name: f.name, url: urlData.publicUrl });
      }
      if (uploaded.length) onAttach(uploaded);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const lastQuickReplies = messages.length > 0 && messages[messages.length - 1].role === 'ai'
    ? messages[messages.length - 1].quick_replies ?? []
    : [];

  const isEmpty = messages.length === 0;

  return (
    <div className="min-h-[calc(100vh-4rem)] max-w-3xl mx-auto px-6 py-8 flex flex-col">
      {/* Header */}
      {!isEmpty && (
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/talent')}
            className="w-9 h-9 rounded-full border border-zinc-200 flex items-center justify-center hover:bg-zinc-50"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4 text-zinc-700" />
          </button>
          <h1 className="text-xl font-medium text-zinc-900">Brief</h1>
        </div>
      )}

      {/* Messages area or hero */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto pb-[260px]">
        {isEmpty ? (
          <div className="min-h-[calc(100vh-380px)] flex flex-col items-center justify-center text-center px-4">
            <h2 className="text-3xl font-medium text-zinc-900 mb-3">Tell me what you need</h2>
            <p className="text-sm text-zinc-500 max-w-sm leading-relaxed">
              Describe your project. Paste a brief, share goals, drop links. I'll handle the rest.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((m, i) => (
              <div key={i}>
                <div className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm prose prose-sm prose-p:my-1 ${
                      m.role === 'user'
                        ? 'bg-zinc-900 text-white prose-invert'
                        : 'bg-zinc-100 text-zinc-800'
                    }`}
                  >
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                </div>
                {/* Quick-reply chips for the latest AI message */}
                {m.role === 'ai' && i === messages.length - 1 && !busy && (m.quick_replies?.length ?? 0) > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {m.quick_replies!.map((q, qi) => (
                      <button
                        key={qi}
                        onClick={() => send(q)}
                        className="text-xs px-4 py-2 rounded-full bg-white border border-zinc-200 text-zinc-700 hover:border-zinc-400 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                    <button
                      onClick={skipQuestion}
                      className="text-xs px-4 py-2 rounded-full bg-zinc-50 border border-zinc-200 text-zinc-500 hover:border-zinc-400"
                    >
                      Skip - Figure Out
                    </button>
                  </div>
                )}
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-4 py-3 bg-zinc-100 text-zinc-500 text-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Thinking…
                </div>
              </div>
            )}

            {readyToCurate && (
              <div className="flex flex-col items-center gap-3 pt-2">
                <div className="text-xs text-zinc-500">Who should deliver this?</div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button onClick={() => curate('freelancer')} disabled={curating} variant="outline" className="rounded-full h-10 px-5 text-sm">
                    Freelancer team
                  </Button>
                  <Button onClick={() => curate('agency')} disabled={curating} variant="outline" className="rounded-full h-10 px-5 text-sm">
                    Agency
                  </Button>
                  <Button onClick={() => curate('either')} disabled={curating} className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-full h-10 px-5 text-sm">
                    {curating ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Assembling…</>
                    ) : (
                      <><Sparkles className="w-4 h-4 mr-2" />Best match <ArrowRight className="w-4 h-4 ml-2" /></>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Inline understanding chips appear above last messages also when present */}
        {!isEmpty && lastQuickReplies.length === 0 && false}
      </div>

      {/* Sticky bottom: understanding panel + composer */}
      <div className="fixed bottom-0 left-0 right-0 pb-6 pt-4 pointer-events-none bg-gradient-to-t from-white via-white to-transparent">
        <div className="max-w-3xl mx-auto px-6 pointer-events-auto space-y-3">
          <UnderstandingPanel
            variant="inline"
            extracted={extracted}
            recommendations={recommendations}
            assumptions={assumptions}
            concerns={concerns}
            attachments={attachments}
            confidence={confidence}
            readyToCurate={readyToCurate}
          />

          <div className="rounded-3xl border border-zinc-200 bg-white p-3">
            {(attachments.length > 0 || uploading) && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {attachments.map((a, i) => (
                  <div key={i} className="text-xs px-2.5 py-1 rounded-full bg-zinc-100 border border-zinc-200 inline-flex items-center gap-1.5">
                    <Paperclip className="w-3 h-3" />
                    <span className="truncate max-w-[160px]">{a.name}</span>
                    <button onClick={() => removeAttachment(i)} className="text-zinc-400 hover:text-zinc-900"><X className="w-3 h-3" /></button>
                  </div>
                ))}
                {uploading && (
                  <div className="text-xs px-2.5 py-1 rounded-full bg-zinc-50 border border-dashed border-zinc-300 inline-flex items-center gap-1.5 text-zinc-500">
                    <Loader2 className="w-3 h-3 animate-spin" /> Uploading…
                  </div>
                )}
              </div>
            )}

            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="What shall we colab on today ?"
              rows={1}
              className="resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none px-0 py-1.5 min-h-[40px] max-h-[160px] bg-transparent text-base placeholder:text-zinc-400"
              disabled={busy || curating}
            />

            <div className="flex items-center justify-between mt-1">
              <Popover open={attachMenuOpen} onOpenChange={setAttachMenuOpen}>
                <PopoverTrigger asChild>
                  <button
                    className="w-9 h-9 rounded-full border border-zinc-200 flex items-center justify-center text-zinc-500 hover:border-zinc-400"
                    disabled={busy || curating}
                    aria-label="Attach"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-56 p-1.5" sideOffset={8}>
                  <button
                    onClick={() => { setAttachMenuOpen(false); setPickerOpen(true); }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-sm rounded-md hover:bg-zinc-100 text-zinc-900"
                  >
                    <FolderOpen className="w-4 h-4 text-zinc-500" />
                    From your projects
                  </button>
                  <button
                    onClick={() => { setAttachMenuOpen(false); fileRef.current?.click(); }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-sm rounded-md hover:bg-zinc-100 text-zinc-900"
                  >
                    <Upload className="w-4 h-4 text-zinc-500" />
                    Upload from device
                  </button>
                </PopoverContent>
              </Popover>

              <input ref={fileRef} type="file" multiple className="hidden" onChange={onFileUpload} accept="image/*,application/pdf,video/*" />

              <div className="flex items-center gap-2">
                <button
                  className="w-9 h-9 rounded-full border border-zinc-200 flex items-center justify-center text-zinc-500 hover:border-zinc-400"
                  aria-label="Voice"
                  type="button"
                >
                  <Mic className="w-4 h-4" />
                </button>
                <button
                  onClick={() => send()}
                  disabled={busy || curating || !input.trim()}
                  className="w-9 h-9 rounded-full bg-zinc-900 text-white flex items-center justify-center hover:bg-zinc-800 disabled:opacity-40"
                  aria-label="Send"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AttachmentPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onAttach={onAttach}
        projectId={projectIdRef.current}
      />
    </div>
  );
};

export default TalentIntake;
