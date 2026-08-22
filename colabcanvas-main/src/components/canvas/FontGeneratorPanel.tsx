import { useEffect, useRef, useState } from "react";
import { X, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { Textbox } from "fabric";
import type { Canvas as FabricCanvas } from "fabric";
import fontPlaceholder from "@/assets/font-generator-placeholder.svg";
import { ensureCustomFont } from "@/lib/canvas/customFontRegistry";

interface CanvasFont {
  id: string;
  name: string;
  description: string | null;
  reference_image_url: string | null;
  preview_url: string | null;
  style_json: any;
}

interface PendingJob {
  id: string;
  startedAt: number;
  elapsed: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  canvas: FabricCanvas | null;
}

const MAX_SECONDS = 180;
const COMPILED_FONT_TYPE = "custom_compiled_font";
const LEGACY_VECTOR_TYPE = "custom_generated_vector_typeface";
const OLD_PARAMETRIC_SOURCE = "parametric_glyph_compiler";

const fmt = (s: number) => {
  const clamped = Math.min(Math.max(0, Math.floor(s)), MAX_SECONDS);
  const mm = String(Math.floor(clamped / 60)).padStart(2, "0");
  const ss = String(clamped % 60).padStart(2, "0");
  return `${mm}:${ss}`;
};

const getFunctionErrorMessage = async (error: any) => {
  const context = error?.context;
  if (context?.body && typeof context.body === "object" && ("error" in context.body || "message" in context.body)) {
    return context.body.error || context.body.message || error?.message || "Generation failed";
  }
  if (typeof context?.json === "function") {
    try {
      const body = await context.json();
      return body?.error || body?.message || error?.message || "Generation failed";
    } catch {
      return error?.message || "Generation failed";
    }
  }
  return error?.message || "Generation failed";
};

const svgDataUrl = (svg?: string) => svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : null;

export function FontGeneratorPanel({ open, onClose, canvas }: Props) {
  const [tab, setTab] = useState<"generation" | "my-fonts">("generation");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [fonts, setFonts] = useState<CanvasFont[]>([]);
  const [pendingJobs, setPendingJobs] = useState<PendingJob[]>([]);
  const [registered, setRegistered] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    loadFonts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (pendingJobs.length === 0) return;
    const t = setInterval(() => {
      setPendingJobs((prev) =>
        prev.map((j) => ({ ...j, elapsed: Math.min(MAX_SECONDS, (Date.now() - j.startedAt) / 1000) })),
      );
    }, 1000);
    return () => clearInterval(t);
  }, [pendingJobs.length]);

  // Preload all compiled fonts so live previews render immediately.
  useEffect(() => {
    fonts.forEach((f) => {
      const s = f.style_json || {};
      if (s.type !== COMPILED_FONT_TYPE) return;
      if (registered[s.familyName]) return;
      ensureCustomFont({
        familyName: s.familyName,
        fontDataBase64: s.fontDataBase64,
        fontUrl: s.fontUrl,
        fontMime: s.fontMime,
      }).then((ok) => {
        if (ok) setRegistered((prev) => ({ ...prev, [s.familyName]: true }));
      });
    });
  }, [fonts, registered]);

  const loadFonts = async () => {
    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;
    if (!userId) return;
    const { data } = await supabase
      .from("canvas_fonts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    // Show compiled fonts and legacy vector specimens (for visibility); only compiled are insertable as editable text.
    setFonts((data ?? []) as CanvasFont[]);
  };

  const onFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please upload an image", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!description.trim() && !imageDataUrl) {
      toast({ title: "Add a description or reference image", variant: "destructive" });
      return;
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const desc = description;
    const img = imageDataUrl;

    setPendingJobs((prev) => [{ id: jobId, startedAt: Date.now(), elapsed: 0 }, ...prev]);
    setTab("my-fonts");
    setDescription("");
    setImageDataUrl(null);
    setGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke("canvas-font-generator", {
        body: { description: desc, image_data_url: img },
      });
      if (error) throw new Error(await getFunctionErrorMessage(error));
      if ((data as any)?.error) throw new Error((data as any).error);
      if (!(data as any)?.font) throw new Error("Font generator returned no font data");
      const newFont = (data as any).font as CanvasFont;
      toast({ title: `Created "${newFont.name}"` });
      setFonts((prev) => [newFont, ...prev]);
    } catch (e: any) {
      toast({
        title: "Generation failed",
        description: e?.message ?? "Unknown error",
        variant: "destructive",
      });
    } finally {
      setPendingJobs((prev) => prev.filter((j) => j.id !== jobId));
      setGenerating(false);
    }
  };

  const insertFont = async (f: CanvasFont) => {
    if (!canvas) return;
    const s = f.style_json || {};

    if (s.type === LEGACY_VECTOR_TYPE || s.source === OLD_PARAMETRIC_SOURCE) {
      toast({
        title: "Regenerate this font",
        description: "This was made with the old font engine. Generate it again to get a professional editable typeface.",
        variant: "destructive",
      });
      return;
    }
    if (s.type !== COMPILED_FONT_TYPE || !s.familyName) {
      toast({ title: "Cannot insert this font", variant: "destructive" });
      return;
    }

    try {
      const ok = await ensureCustomFont({
        familyName: s.familyName,
        fontDataBase64: s.fontDataBase64,
        fontUrl: s.fontUrl,
        fontMime: s.fontMime,
      });
      if (!ok) throw new Error("Could not load custom font");

      const fillColor = s?.spec?.fill || "#111111";
      const tb = new Textbox("Type here", {
        left: 200,
        top: 200,
        width: 480,
        fontFamily: s.familyName,
        fontSize: 72,
        fill: fillColor,
        editable: true,
        selectable: true,
      });

      (tb as any).isStandaloneObject = true;
      (tb as any).canvasObjectId = `obj_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      (tb as any).fontMetadata = {
        name: f.name,
        customCompiledFont: true,
        familyName: s.familyName,
        fontDataBase64: s.fontDataBase64,
        fontUrl: s.fontUrl,
        fontMime: s.fontMime,
        fontId: f.id,
        source: s.source,
      };

      canvas.add(tb);
      canvas.setActiveObject(tb);
      canvas.requestRenderAll();
      canvas.fire("object:modified", { target: tb });
      toast({ title: `Inserted ${f.name}`, description: "Double-click to edit text" });
    } catch (e: any) {
      toast({ title: "Failed to insert font", description: e?.message, variant: "destructive" });
    }
  };

  if (!open) return null;

  return (
    <div className="absolute left-16 top-1/2 -translate-y-1/2 z-40 w-[260px] max-h-[60vh] flex flex-col rounded-xl border border-border bg-background pointer-events-auto">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold">Font Generator</span>
          <span className="text-[9px] font-medium px-1 py-0.5 bg-primary/10 text-primary rounded">
            Beta
          </span>
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="flex">
        <button
          onClick={() => setTab("generation")}
          className={`flex-1 py-1.5 text-[11px] font-medium border-b-2 transition-colors ${
            tab === "generation"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Generation
        </button>
        <button
          onClick={() => setTab("my-fonts")}
          className={`flex-1 py-1.5 text-[11px] font-medium border-b-2 transition-colors ${
            tab === "my-fonts"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          My Fonts {fonts.length > 0 && <span className="ml-0.5 text-[9px]">({fonts.length})</span>}
        </button>
      </div>

      {tab === "generation" ? (
        <div className="p-3 space-y-2 overflow-auto">
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground">Image Reference</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-24 rounded-lg border-2 border-dashed border-border hover:border-foreground/40 bg-muted/30 flex flex-col items-center justify-center text-[10px] text-muted-foreground transition-colors px-2 text-center overflow-hidden"
            >
              {imageDataUrl ? (
                <img
                  src={imageDataUrl}
                  alt="Reference"
                  className="max-h-full max-w-full object-contain rounded"
                />
              ) : (
                <>
                  <img
                    src={fontPlaceholder}
                    alt=""
                    className="h-14 w-auto mb-1 select-none"
                    draggable={false}
                  />
                  <span>Click to upload a font reference</span>
                </>
              )}
            </button>
            {imageDataUrl && (
              <button
                onClick={() => setImageDataUrl(null)}
                className="text-[9px] text-muted-foreground hover:text-foreground"
              >
                Remove image
              </button>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground">Style Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the font style you want..."
              rows={2}
              className="text-[11px] resize-none min-h-0"
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generating}
            size="sm"
            className="w-full h-8 text-xs"
          >
            {generating ? (
              <>
                <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 mr-1.5" />
                Generate
              </>
            )}
          </Button>

          <p className="text-center text-[9px] text-muted-foreground">
            Supports only <span className="underline">Latin characters</span>
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-3 space-y-2">
          {pendingJobs.map((job) => (
            <div key={job.id} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Designing your font</span>
                <span className="text-xs font-medium tabular-nums text-foreground">
                  {fmt(job.elapsed)} <span className="text-muted-foreground">/ {fmt(MAX_SECONDS)}</span>
                </span>
              </div>
              <div className="relative w-full h-24 rounded-lg bg-muted/40 overflow-hidden flex items-center justify-center">
                <img
                  src={fontPlaceholder}
                  alt="Designing your font"
                  className="h-14 w-auto select-none animate-font-bob"
                  draggable={false}
                />
              </div>
            </div>
          ))}

          {pendingJobs.length === 0 && fonts.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-12 px-4">
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>No fonts generated yet.</p>
            </div>
          ) : (
            fonts.map((f) => {
              const s = f.style_json || {};
              const isLegacy = s.type === LEGACY_VECTOR_TYPE || s.source === OLD_PARAMETRIC_SOURCE;
              const isCompiled = s.type === COMPILED_FONT_TYPE && !isLegacy;
              const isReady = isCompiled && registered[s.familyName];

              return (
                <button
                  key={f.id}
                  onClick={() => insertFont(f)}
                  className="w-full p-2 rounded-lg border border-border hover:border-foreground/40 bg-background transition-all text-left group"
                >
                  <div className="w-full h-16 rounded bg-white flex items-center justify-center px-2 overflow-hidden">
                    {isLegacy ? (
                      <div className="flex flex-col items-center justify-center text-center px-3">
                        <span className="text-xs font-medium text-muted-foreground">Regenerate</span>
                        <span className="text-[9px] text-muted-foreground/80">old font engine</span>
                      </div>
                    ) : isReady ? (
                      <span
                        style={{ fontFamily: s.familyName, fontSize: 30, color: s?.spec?.fill || "#111" }}
                        className="leading-none truncate"
                      >
                        Aa Bb 123
                      </span>
                    ) : s.previewSvg || s.svg || f.preview_url ? (
                      <img
                        src={svgDataUrl(s.previewSvg || s.svg) || f.preview_url || ""}
                        alt={`${f.name} specimen`}
                        className="max-h-full max-w-full object-contain"
                        draggable={false}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">Custom font</span>
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-medium truncate block">{f.name}</span>
                      <span className="text-[9px] text-muted-foreground truncate block">
                        {isLegacy ? "Old engine output — regenerate" : "Professional editable typeface"}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0">
                      {isLegacy ? "" : "Insert"}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
