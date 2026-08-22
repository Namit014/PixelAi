import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Camera, Upload, CheckCircle2, AlertCircle, ShieldCheck, X } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onVerified: () => void;
}

type IdType = 'passport' | 'driver_license' | 'national_id';

interface KycRow {
  status: 'unverified' | 'submitted' | 'verified' | 'rejected';
  id_type?: string | null;
  ai_confidence?: number | null;
  ai_reasons?: any;
}

export const KycSheet = ({ open, onOpenChange, onVerified }: Props) => {
  const { user } = useAuth();
  const [idType, setIdType] = useState<IdType>('passport');
  const [idCountry, setIdCountry] = useState('US');
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [existing, setExisting] = useState<KycRow | null>(null);
  const [result, setResult] = useState<{ status: string; decision?: any } | null>(null);
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !user?.id) return;
    supabase.from('talent_kyc').select('status, id_type, ai_confidence, ai_reasons').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setExisting((data as any) ?? null));
    setResult(null);
  }, [open, user?.id]);

  const uploadOne = async (file: File, kind: 'front' | 'back' | 'selfie'): Promise<string> => {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${user!.id}/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('talent-kyc').upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    return path;
  };

  const submit = async () => {
    if (!user) return;
    if (!frontFile || !selfieFile) { toast.error('Upload ID front and selfie'); return; }
    if (idType === 'driver_license' && !backFile) { toast.error('Driver license requires back side'); return; }
    setBusy(true);
    setResult(null);
    try {
      const [front, back, selfie] = await Promise.all([
        uploadOne(frontFile, 'front'),
        backFile ? uploadOne(backFile, 'back') : Promise.resolve(null),
        uploadOne(selfieFile, 'selfie'),
      ]);

      const { data, error } = await supabase.functions.invoke('submit-kyc-verification', {
        body: { id_type: idType, id_country: idCountry, id_front_path: front, id_back_path: back, selfie_path: selfie },
      });
      if (error) throw error;
      const r = data as any;
      setResult(r);
      if (r?.status === 'verified') {
        toast.success('Identity verified');
        onVerified?.();
        setTimeout(() => onOpenChange(false), 1500);
      } else {
        toast.message('Submitted for review', { description: r?.decision?.reason ?? 'A reviewer will verify within 1 business day.' });
        onVerified?.();
      }
    } catch (e: any) {
      toast.error(e.message ?? 'Submission failed');
    } finally {
      setBusy(false);
    }
  };

  const FileBox = ({ file, onPick, inputRef, label, sub, accept }: { file: File | null; onPick: (f: File) => void; inputRef: React.RefObject<HTMLInputElement>; label: string; sub: string; accept: string }) => (
    <div>
      <Label>{label}</Label>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={e => e.target.files?.[0] && onPick(e.target.files[0])} />
      {file ? (
        <div className="mt-1 flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-emerald-200 bg-emerald-50 text-xs">
          <span className="truncate text-emerald-800">{file.name}</span>
          <button onClick={() => inputRef.current?.click()} className="text-emerald-700 underline">Replace</button>
        </div>
      ) : (
        <button onClick={() => inputRef.current?.click()} className="mt-1 w-full px-3 py-3 rounded-md border border-dashed border-zinc-300 bg-white hover:border-zinc-500 text-xs text-zinc-600 inline-flex items-center justify-center gap-2">
          <Upload className="w-4 h-4" /> {sub}
        </button>
      )}
    </div>
  );

  if (existing?.status === 'verified') {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader><SheetTitle>Identity verified</SheetTitle></SheetHeader>
          <div className="mt-8 text-center space-y-3">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <div className="font-medium text-zinc-900">Your identity is verified</div>
            <div className="text-xs text-zinc-500">You can withdraw funds without restriction.</div>
            <Button onClick={() => onOpenChange(false)} variant="outline" className="mt-4">Close</Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Verify your identity</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-[11px] text-zinc-600 flex gap-2">
            <ShieldCheck className="w-4 h-4 text-zinc-500 flex-shrink-0 mt-0.5" />
            <span>Required by financial regulations to withdraw funds. Your documents are encrypted and only visible to verified reviewers. Verification is usually instant.</span>
          </div>

          {existing?.status === 'submitted' && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 inline-flex items-center gap-2 w-full">
              <Loader2 className="w-4 h-4" /> Previous submission under review. You can re-submit below.
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>ID type</Label>
              <select value={idType} onChange={e => setIdType(e.target.value as IdType)} className="w-full h-10 px-3 rounded-md border border-zinc-200 bg-white text-sm">
                <option value="passport">Passport</option>
                <option value="driver_license">Driver's license</option>
                <option value="national_id">National ID</option>
              </select>
            </div>
            <div>
              <Label>Country of issue</Label>
              <input value={idCountry} onChange={e => setIdCountry(e.target.value.toUpperCase())} maxLength={2} placeholder="US" className="w-full h-10 px-3 rounded-md border border-zinc-200 bg-white text-sm uppercase" />
            </div>
          </div>

          <FileBox file={frontFile} onPick={setFrontFile} inputRef={frontRef} label="ID — front" sub="Upload front of ID" accept="image/*" />
          {idType === 'driver_license' && (
            <FileBox file={backFile} onPick={setBackFile} inputRef={backRef} label="ID — back" sub="Upload back of ID" accept="image/*" />
          )}
          <FileBox file={selfieFile} onPick={setSelfieFile} inputRef={selfieRef} label="Selfie" sub="Take or upload a clear selfie" accept="image/*" />

          {result && (
            <div className={`rounded-lg border p-3 text-xs ${result.status === 'verified' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
              <div className="font-medium inline-flex items-center gap-1.5">
                {result.status === 'verified' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {result.status === 'verified' ? 'Verified instantly' : 'Submitted — under manual review'}
              </div>
              {result.decision?.reason && <div className="mt-1 opacity-80">{result.decision.reason}</div>}
            </div>
          )}

          <Button onClick={submit} disabled={busy || !frontFile || !selfieFile} className="w-full bg-zinc-900 hover:bg-zinc-800">
            {busy ? (<><Loader2 className="w-4 h-4 animate-spin mr-2" /> Verifying…</>) : 'Submit for verification'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
