import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Props {
  onSigned: (signatureUrl: string) => void;
  existingSignatureUrl?: string | null;
  signedAt?: string | null;
}

export const SignaturePad = ({ onSigned, existingSignatureUrl, signedAt }: Props) => {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * ratio;
    c.height = c.offsetHeight * ratio;
    const ctx = c.getContext('2d')!;
    ctx.scale(ratio, ratio);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#18181b';
  }, []);

  if (existingSignatureUrl && signedAt) {
    return (
      <div className="border border-zinc-200 rounded-xl p-4 bg-zinc-50">
        <div className="text-xs text-zinc-500 mb-2">Signed on {new Date(signedAt).toLocaleString()}</div>
        <img src={existingSignatureUrl} alt="Signature" className="max-h-24 bg-white rounded border border-zinc-200 p-2" />
      </div>
    );
  }

  const pos = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const start = (e: React.PointerEvent) => {
    drawing.current = true;
    last.current = pos(e);
    canvasRef.current?.setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current || !last.current) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    setHasInk(true);
  };
  const end = () => { drawing.current = false; last.current = null; };

  const clear = () => {
    const c = canvasRef.current!;
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
    setHasInk(false);
  };

  const save = async () => {
    if (!hasInk || !user || !name.trim()) {
      toast.error('Please type your full name and draw your signature');
      return;
    }
    setSaving(true);
    try {
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvasRef.current!.toBlob(b => b ? resolve(b) : reject(new Error('canvas blob fail')), 'image/png')
      );
      const path = `${user.id}/signatures/${Date.now()}.png`;
      const { error } = await supabase.storage.from('design-assets').upload(path, blob, { contentType: 'image/png', upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('design-assets').getPublicUrl(path);
      onSigned(data.publicUrl);
      toast.success('Signature saved');
    } catch (e: any) {
      toast.error(e.message ?? 'Could not save signature');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-zinc-600">Your full legal name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Type your name"
          className="w-full mt-1 px-3 py-2 border border-zinc-300 rounded-lg text-sm"
        />
      </div>
      <div>
        <label className="text-xs text-zinc-600 mb-1 block">Draw your signature</label>
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          className="w-full h-32 border-2 border-dashed border-zinc-300 rounded-xl bg-white touch-none cursor-crosshair"
        />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={clear} disabled={!hasInk}><RotateCcw className="w-3.5 h-3.5 mr-1" /> Clear</Button>
        <Button onClick={save} disabled={!hasInk || saving || !name.trim()} className="flex-1 bg-zinc-900 hover:bg-zinc-800">
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : 'Sign & accept'}
        </Button>
      </div>
    </div>
  );
};
