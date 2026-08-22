import { useState, useRef, useEffect, useCallback } from 'react';
import { RefreshCw, Loader2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FabricImage } from 'fabric';
import { snapshotSingleImageOrSource } from '@/lib/canvas/safeSnapshot';
import { getSafeImageSrc, ensureRemoteImageUrl, getNaturalImageSize, replaceImageOnCanvas } from '@/lib/canvas/imageToolHelpers';

interface MultiAnglesPanelProps {
  selectedObject: any;
  canvas: any;
  position: { x: number; y: number };
  imageUrl: string;
  onClose: () => void;
}

type ModeId = 'subject' | 'camera';

const scaleLabel = (v: number) => v <= 33 ? 'Small' : v >= 67 ? 'Large' : 'Medium';

const MultiAnglesPanel = ({ selectedObject, canvas, position, imageUrl, onClose }: MultiAnglesPanelProps) => {
  const [mode, setMode] = useState<ModeId>('subject');
  const [rotate, setRotate] = useState(0);
  const [tilt, setTilt] = useState(0);
  const [scaleVal, setScaleVal] = useState(50);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; rotate: number; tilt: number } | null>(null);
  const thumbnailUrl = useRef<string>('');
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!selectedObject) {
        thumbnailUrl.current = imageUrl;
        return;
      }
      try {
        const src = await snapshotSingleImageOrSource(selectedObject, { format: 'png', multiplier: 0.5 });
        if (!cancelled) thumbnailUrl.current = src || imageUrl;
      } catch {
        if (!cancelled) thumbnailUrl.current = imageUrl;
      }
    };
    load();
    return () => { cancelled = true; };
  }, [selectedObject, imageUrl]);

  // Measure panel and clamp to viewport
  useEffect(() => {
    const clamp = () => {
      const pad = 12;
      const pw = 340;
      const ph = panelRef.current?.offsetHeight || 560;
      const x = Math.max(pad, Math.min(position.x + 20, window.innerWidth - pw - pad));
      const y = Math.max(pad, Math.min(position.y - 100, window.innerHeight - ph - pad));
      setPanelPos({ x, y });
    };
    clamp();
    window.addEventListener('resize', clamp);
    return () => window.removeEventListener('resize', clamp);
  }, [position]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, rotate, tilt };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [rotate, tilt]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setRotate(Math.round(Math.max(-180, Math.min(180, dragStartRef.current.rotate + dx * 1.2))));
    setTilt(Math.round(Math.max(-90, Math.min(90, dragStartRef.current.tilt - dy * 0.8))));
  }, [isDragging]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  const handleRandomize = () => {
    setRotate(Math.floor(Math.random() * 360) - 180);
    setTilt(Math.floor(Math.random() * 180) - 90);
    setScaleVal([15, 50, 85][Math.floor(Math.random() * 3)]);
  };

  const handleRun = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    const loadingToast = toast.loading('Generating new angle (high-res)…');
    try {
      const scale = scaleLabel(scaleVal);
      const scaleDesc = scale === 'Small' ? 'zoomed out' : scale === 'Large' ? 'close-up' : 'medium distance';
      const modeDesc = mode === 'subject'
        ? `Rotate the subject ${rotate}° around its vertical axis, tilt ${tilt}° around horizontal axis, render at ${scaleDesc}.`
        : `Move the camera to view the scene from ${rotate}° horizontal angle and ${tilt}° vertical angle at ${scaleDesc}.`;
      const prompt = `Change the perspective of this image: ${modeDesc} Keep the same subject, lighting style, colors, and overall composition. Output a high-resolution photorealistic result with the new viewpoint, preserving sharp details and original aspect ratio.`;

      // Always prefer the original source URL (full resolution) over a snapshot
      let safeUrl = getSafeImageSrc(selectedObject) || imageUrl;
      if (!safeUrl) {
        safeUrl = (await snapshotSingleImageOrSource(selectedObject, { format: 'png', multiplier: 2, maxDimension: 4096 })) || imageUrl;
      }
      // Backend needs an HTTP URL; upload data/blob URLs first
      try { safeUrl = await ensureRemoteImageUrl(safeUrl); } catch (e) {
        console.warn('[MultiAngles] ensureRemoteImageUrl failed, sending raw url', e);
      }

      const natural = getNaturalImageSize(selectedObject);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Please sign in to use Multi-Angles');

      const { data, error } = await supabase.functions.invoke('edit-image', {
        body: {
          imageUrl: safeUrl,
          // Use heavy/quality mode in edit-image
          operation: 'perspective',
          prompt,
          originalWidth: natural.width || undefined,
          originalHeight: natural.height || undefined,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (!data?.imageUrl) throw new Error(data?.message || data?.error || 'No image returned');

      const replaced = await replaceImageOnCanvas(canvas, selectedObject, data.imageUrl);
      if (!replaced) throw new Error('Failed to insert generated image on canvas');
      toast.success('Multi-angle image generated!', { id: loadingToast });
      onClose();
    } catch (err: any) {
      console.error('[MultiAngles] Error:', err);
      toast.error(err?.message || err?.error || 'Failed to generate angle', { id: loadingToast });
    } finally {
      setIsGenerating(false);
    }
  };

  // Subject cube sizing
  const cubeHalf = Math.round(40 + (scaleVal / 100) * 40); // 40px to 80px half-size

  // Camera mode: spherical coords
  const camRadius = 75 + (1 - scaleVal / 100) * 20; // farther when small
  const rotRad = (rotate * Math.PI) / 180;
  const tiltRad = (tilt * Math.PI) / 180;
  const cx = 110, cy = 110;
  const camX = cx + Math.cos(tiltRad) * Math.sin(rotRad) * camRadius;
  const camY = cy - Math.sin(tiltRad) * camRadius;
  const camScale = 0.7 + 0.3 * (Math.cos(tiltRad) * Math.cos(rotRad) * 0.5 + 0.5); // depth cue

  return (
    <div
      ref={panelRef}
      className="fixed z-[1001] w-[340px] bg-white rounded-2xl shadow-2xl border border-zinc-200/60 animate-in fade-in slide-in-from-left-2 duration-200"
      style={{
        left: `${panelPos.x}px`,
        top: `${panelPos.y}px`,
        maxHeight: 'calc(100vh - 24px)',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-semibold text-zinc-900">Multi-Angles</span>
        <button
          onClick={handleRandomize}
          className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5 text-zinc-500" />
        </button>
      </div>

      {/* Pill Tabs */}
      <div className="px-4 pb-3">
        <div className="flex bg-zinc-100 rounded-lg p-0.5">
          {(['subject', 'camera'] as ModeId[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                mode === m
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-600'
              }`}
            >
              {m === 'subject' ? 'Subject' : 'Camera'}
            </button>
          ))}
        </div>
      </div>

      {/* 3D Visualization */}
      <div
        className="mx-4 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center select-none relative overflow-hidden"
        style={{ cursor: isDragging ? 'grabbing' : 'grab', height: 240 }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {mode === 'subject' ? (
          /* ─── Subject Mode: True CSS 3D Cube ─── */
          <div
            style={{
              perspective: 600,
              perspectiveOrigin: '50% 50%',
              width: cubeHalf * 2,
              height: cubeHalf * 2,
            }}
          >
            <div
              style={{
                width: cubeHalf * 2,
                height: cubeHalf * 2,
                position: 'relative',
                transformStyle: 'preserve-3d',
                transform: `rotateX(${-tilt}deg) rotateY(${rotate}deg)`,
                transition: isDragging ? 'none' : 'transform 0.15s ease-out',
              }}
            >
              {/* Front */}
              <div
                className="absolute inset-0 overflow-hidden rounded-lg"
                style={{
                  width: cubeHalf * 2, height: cubeHalf * 2,
                  transform: `translateZ(${cubeHalf}px)`,
                  background: '#e4e4e7',
                }}
              >
                {thumbnailUrl.current && (
                  <img src={thumbnailUrl.current} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" draggable={false} />
                )}
              </div>
              {/* Back */}
              <div
                className="absolute inset-0 rounded-lg flex items-center justify-center"
                style={{
                  width: cubeHalf * 2, height: cubeHalf * 2,
                  transform: `rotateY(180deg) translateZ(${cubeHalf}px)`,
                  background: 'rgba(200,200,200,0.5)',
                }}
              >
                <span className="text-zinc-400 text-xs font-medium">B</span>
              </div>
              {/* Left */}
              <div
                className="absolute inset-0 rounded-lg flex items-center justify-center"
                style={{
                  width: cubeHalf * 2, height: cubeHalf * 2,
                  transform: `rotateY(-90deg) translateZ(${cubeHalf}px)`,
                  background: 'rgba(210,210,210,0.5)',
                }}
              >
                <span className="text-zinc-400 text-xs font-medium">L</span>
              </div>
              {/* Right */}
              <div
                className="absolute inset-0 rounded-lg flex items-center justify-center"
                style={{
                  width: cubeHalf * 2, height: cubeHalf * 2,
                  transform: `rotateY(90deg) translateZ(${cubeHalf}px)`,
                  background: 'rgba(210,210,210,0.5)',
                }}
              >
                <span className="text-zinc-400 text-xs font-medium">R</span>
              </div>
              {/* Top */}
              <div
                className="absolute inset-0 rounded-lg"
                style={{
                  width: cubeHalf * 2, height: cubeHalf * 2,
                  transform: `rotateX(90deg) translateZ(${cubeHalf}px)`,
                  background: 'rgba(230,230,230,0.4)',
                }}
              />
              {/* Bottom */}
              <div
                className="absolute inset-0 rounded-lg flex items-center justify-center"
                style={{
                  width: cubeHalf * 2, height: cubeHalf * 2,
                  transform: `rotateX(-90deg) translateZ(${cubeHalf}px)`,
                  background: 'rgba(190,190,190,0.5)',
                }}
              >
                <span className="text-zinc-400 text-xs font-medium">Bt</span>
              </div>
            </div>
          </div>
        ) : (
          /* ─── Camera Mode: CSS 3D Wireframe Globe ─── */
          <div className="relative" style={{ width: 220, height: 220 }}>
            {/* 3D wireframe globe using CSS 3D rings */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                perspective: 800,
                perspectiveOrigin: '50% 50%',
              }}
            >
              <div
                style={{
                  width: 220,
                  height: 220,
                  position: 'relative',
                  transformStyle: 'preserve-3d',
                  transform: `rotateX(${-tilt * 0.4}deg) rotateY(${rotate * 0.4}deg)`,
                  transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                }}
              >
                {/* Longitude rings (vertical great circles) */}
                {Array.from({ length: 8 }, (_, i) => {
                  const angle = (i * 180) / 8;
                  return (
                    <div
                      key={`lon-${i}`}
                      style={{
                        position: 'absolute',
                        left: 22, top: 22,
                        width: 176, height: 176,
                        borderRadius: '50%',
                        border: '1px solid rgba(180, 160, 130, 0.35)',
                        transformStyle: 'preserve-3d',
                        transform: `rotateY(${angle}deg)`,
                      }}
                    />
                  );
                })}
                {/* Latitude rings (horizontal circles) */}
                {Array.from({ length: 7 }, (_, i) => {
                  const lat = -60 + (i * 120) / 6;
                  const latRad = (lat * Math.PI) / 180;
                  const ringRadius = 88 * Math.cos(latRad);
                  const yOffset = 88 * Math.sin(latRad);
                  return (
                    <div
                      key={`lat-${i}`}
                      style={{
                        position: 'absolute',
                        left: 110 - ringRadius,
                        top: 110 - ringRadius,
                        width: ringRadius * 2,
                        height: ringRadius * 2,
                        borderRadius: '50%',
                        border: '1px solid rgba(180, 160, 130, 0.3)',
                        transformStyle: 'preserve-3d',
                        transform: `translateZ(${yOffset}px) rotateX(90deg)`,
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Center thumbnail */}
            <div className="absolute" style={{ left: 75, top: 75, width: 70, height: 70, zIndex: 2 }}>
              {thumbnailUrl.current && (
                <img
                  src={thumbnailUrl.current}
                  alt=""
                  className="w-full h-full object-cover rounded-lg opacity-70"
                  crossOrigin="anonymous"
                  draggable={false}
                />
              )}
            </div>

            {/* Connecting line */}
            <svg
              viewBox="0 0 220 220"
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ zIndex: 3 }}
            >
              <line
                x1={cx} y1={cy}
                x2={camX} y2={camY}
                stroke="#93c5fd"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                opacity="0.7"
              />
            </svg>

            {/* Dashed orbit ellipse */}
            <svg viewBox="0 0 220 220" className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
              <ellipse
                cx={cx} cy={cy}
                rx={camRadius}
                ry={camRadius * Math.abs(Math.cos(tiltRad))}
                fill="none"
                stroke="#93c5fd"
                strokeWidth="1"
                strokeDasharray="4 3"
                opacity="0.35"
              />
            </svg>

            {/* Orbiting camera cube */}
            <div
              className="absolute"
              style={{
                left: camX - 16,
                top: camY - 16,
                width: 32,
                height: 32,
                perspective: 120,
                zIndex: 4,
                transition: isDragging ? 'none' : 'left 0.15s ease-out, top 0.15s ease-out',
                transform: `scale(${camScale})`,
                opacity: 0.6 + camScale * 0.4,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  transformStyle: 'preserve-3d',
                  transform: `rotateX(${-tilt * 0.5}deg) rotateY(${rotate * 0.5}deg)`,
                  transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                }}
              >
                {/* Front — image */}
                <div
                  className="absolute inset-0 overflow-hidden bg-white border border-zinc-300 rounded-[4px]"
                  style={{ transform: 'translateZ(16px)' }}
                >
                  {thumbnailUrl.current && (
                    <img src={thumbnailUrl.current} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" draggable={false} />
                  )}
                </div>
                <div className="absolute inset-0 bg-zinc-200 border border-zinc-300 rounded-[4px]" style={{ transform: 'rotateY(180deg) translateZ(16px)' }} />
                <div className="absolute inset-0 bg-zinc-150 border border-zinc-300 rounded-[4px]" style={{ transform: 'rotateY(-90deg) translateZ(16px)' }} />
                <div className="absolute inset-0 bg-zinc-150 border border-zinc-300 rounded-[4px]" style={{ transform: 'rotateY(90deg) translateZ(16px)' }} />
                <div className="absolute inset-0 bg-zinc-100 border border-zinc-300 rounded-[4px]" style={{ transform: 'rotateX(90deg) translateZ(16px)' }} />
                <div className="absolute inset-0 bg-zinc-200 border border-zinc-300 rounded-[4px]" style={{ transform: 'rotateX(-90deg) translateZ(16px)' }} />
              </div>
            </div>

            {/* Directional hints */}
            <span className="absolute left-0 top-1/2 -translate-y-1/2 text-zinc-300 text-[11px] select-none pointer-events-none">‹</span>
            <span className="absolute right-0 top-1/2 -translate-y-1/2 text-zinc-300 text-[11px] select-none pointer-events-none">›</span>
            <span className="absolute top-0 left-1/2 -translate-x-1/2 text-zinc-300 text-[11px] select-none pointer-events-none rotate-90">‹</span>
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-zinc-300 text-[11px] select-none pointer-events-none rotate-90">›</span>
          </div>
        )}
      </div>

      {/* Sliders */}
      <div className="px-4 py-4 space-y-4">
        <div>
          <div className="flex justify-between mb-1.5">
            <span className="text-[13px] font-medium text-zinc-700">Rotate</span>
            <span className="text-[12px] text-zinc-400 tabular-nums">{rotate}°</span>
          </div>
          <Slider min={-180} max={180} step={1} value={[rotate]} onValueChange={([v]) => setRotate(v)} />
        </div>
        <div>
          <div className="flex justify-between mb-1.5">
            <span className="text-[13px] font-medium text-zinc-700">Tilt</span>
            <span className="text-[12px] text-zinc-400 tabular-nums">{tilt}°</span>
          </div>
          <Slider min={-90} max={90} step={1} value={[tilt]} onValueChange={([v]) => setTilt(v)} />
        </div>
        <div>
          <div className="flex justify-between mb-1.5">
            <span className="text-[13px] font-medium text-zinc-700">Scale</span>
            <span className="text-[12px] text-zinc-400">{scaleLabel(scaleVal)}</span>
          </div>
          <Slider min={0} max={100} step={1} value={[scaleVal]} onValueChange={([v]) => setScaleVal(v)} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2.5 px-4 pb-4">
        <Button
          variant="outline"
          className="flex-1 h-10 text-sm rounded-xl"
          onClick={onClose}
          disabled={isGenerating}
        >
          Cancel
        </Button>
        <Button
          className="flex-1 h-10 text-sm rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white gap-1.5"
          onClick={handleRun}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              <Zap className="w-3.5 h-3.5" />
              Run · 2
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default MultiAnglesPanel;
