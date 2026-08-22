import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Download,
  Share2,
  Maximize2,
  Loader2,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareProjectDialog } from "@/components/canvas/ShareProjectDialog";

interface Project {
  id: string;
  title: string | null;
  thumbnail_url: string | null;
  updated_at: string | null;
}

/**
 * Read-only mobile Canvas experience.
 * - Lists the user's projects (or auto-opens one passed via ?projectId=).
 * - Renders the project's saved thumbnail in a pinch-to-zoom / pan container.
 * - Allows downloading the visible image and managing share access.
 */
export const MobileCanvasViewer = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const initialProjectId = searchParams.get("projectId");

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  // Load projects
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("projects")
        .select("id, title, thumbnail_url, updated_at")
        .eq("user_id", user.id)
        .order("last_accessed_at", { ascending: false, nullsFirst: false })
        .limit(50);
      if (cancelled) return;
      if (error) {
        toast({ title: "Couldn't load projects", description: error.message, variant: "destructive" });
      } else if (data) {
        setProjects(data as Project[]);
        if (initialProjectId) {
          const found = data.find((p) => p.id === initialProjectId);
          if (found) setActiveProject(found as Project);
        }
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, initialProjectId, toast]);

  if (!activeProject) {
    return (
      <div className="px-1 pt-2 pb-4">
        <div className="mb-4">
          <h1 className="text-xl font-semibold text-zinc-900">Canvas</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Pick a project to view, download, or manage sharing. Editing is available on desktop.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ImageIcon className="w-10 h-10 text-zinc-300 mb-3" />
            <p className="text-sm text-zinc-500">No projects yet. Create one on desktop.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => setActiveProject(p)}
                className="text-left rounded-xl border border-zinc-200 bg-white overflow-hidden active:scale-[0.98] transition-transform"
              >
                <div className="aspect-square bg-zinc-50 flex items-center justify-center">
                  {p.thumbnail_url ? (
                    <img
                      src={p.thumbnail_url}
                      alt={p.title ?? "Project"}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-zinc-300" />
                  )}
                </div>
                <div className="px-3 py-2">
                  <div className="text-sm font-medium text-zinc-900 truncate">
                    {p.title || "Untitled"}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <ProjectViewer
      project={activeProject}
      onBack={() => setActiveProject(null)}
      onShare={() => setShareOpen(true)}
      shareOpen={shareOpen}
      setShareOpen={setShareOpen}
    />
  );
};

function ProjectViewer({
  project,
  onBack,
  onShare,
  shareOpen,
  setShareOpen,
}: {
  project: Project;
  onBack: () => void;
  onShare: () => void;
  shareOpen: boolean;
  setShareOpen: (o: boolean) => void;
}) {
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // viewport transform
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);

  // Touch tracking
  const touchState = useRef({
    mode: "idle" as "idle" | "pan" | "pinch",
    startX: 0,
    startY: 0,
    startTx: 0,
    startTy: 0,
    startDist: 0,
    startScale: 1,
    pinchCenterX: 0,
    pinchCenterY: 0,
  });

  const dist = (a: React.Touch, b: React.Touch) =>
    Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchState.current.mode = "pan";
      touchState.current.startX = e.touches[0].clientX;
      touchState.current.startY = e.touches[0].clientY;
      touchState.current.startTx = tx;
      touchState.current.startTy = ty;
    } else if (e.touches.length === 2) {
      touchState.current.mode = "pinch";
      touchState.current.startDist = dist(e.touches[0], e.touches[1]);
      touchState.current.startScale = scale;
      touchState.current.pinchCenterX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      touchState.current.pinchCenterY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      touchState.current.startTx = tx;
      touchState.current.startTy = ty;
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchState.current.mode === "pan" && e.touches.length === 1) {
      e.preventDefault();
      const dx = e.touches[0].clientX - touchState.current.startX;
      const dy = e.touches[0].clientY - touchState.current.startY;
      setTx(touchState.current.startTx + dx);
      setTy(touchState.current.startTy + dy);
    } else if (touchState.current.mode === "pinch" && e.touches.length === 2) {
      e.preventDefault();
      const d = dist(e.touches[0], e.touches[1]);
      const ratio = d / touchState.current.startDist;
      const newScale = Math.max(0.25, Math.min(6, touchState.current.startScale * ratio));
      setScale(newScale);
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) touchState.current.mode = "idle";
    else if (e.touches.length === 1) {
      touchState.current.mode = "pan";
      touchState.current.startX = e.touches[0].clientX;
      touchState.current.startY = e.touches[0].clientY;
      touchState.current.startTx = tx;
      touchState.current.startTy = ty;
    }
  };

  const fit = () => {
    setScale(1);
    setTx(0);
    setTy(0);
  };

  const handleDownload = async () => {
    if (!project.thumbnail_url) {
      toast({ title: "Nothing to download", description: "This project has no preview yet." });
      return;
    }
    try {
      const res = await fetch(project.thumbnail_url, { mode: "cors" });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.title || "canvas"}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Downloaded" });
    } catch (err) {
      // Fallback: open in new tab
      window.open(project.thumbnail_url, "_blank");
    }
  };

  return (
    <div className="-mx-4 flex flex-col" style={{ height: "calc(100vh - 56px - 96px - env(safe-area-inset-top) - env(safe-area-inset-bottom))" }}>
      {/* Header strip */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-100 bg-white">
        <button
          onClick={onBack}
          aria-label="Back"
          className="w-9 h-9 flex items-center justify-center rounded-lg text-zinc-700 hover:bg-zinc-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-zinc-900 truncate">
            {project.title || "Untitled"}
          </div>
          <div className="text-[11px] text-zinc-500">View only · open on desktop to edit</div>
        </div>
      </div>

      {/* Pannable / zoomable area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden bg-zinc-100 relative touch-none select-none"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
            transformOrigin: "center center",
            transition: touchState.current.mode === "idle" ? "transform 0.18s ease-out" : "none",
          }}
        >
          {project.thumbnail_url ? (
            <img
              ref={imgRef}
              src={project.thumbnail_url}
              alt={project.title ?? "Canvas"}
              className="max-w-[92vw] max-h-full object-contain pointer-events-none"
              draggable={false}
            />
          ) : (
            <div className="text-zinc-400 text-sm">No preview available</div>
          )}
        </div>
      </div>

      {/* Floating action bar (above bottom nav pill) */}
      <div
        className="fixed left-1/2 -translate-x-1/2 z-40 pointer-events-none"
        style={{ bottom: "calc(96px + env(safe-area-inset-bottom))" }}
      >
        <div className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-white/90 backdrop-blur border border-zinc-200 ring-1 ring-black/5 px-2 py-1.5">
          <Button variant="ghost" size="sm" className="h-9 rounded-full px-3" onClick={fit}>
            <Maximize2 className="w-4 h-4 mr-1.5" /> Fit
          </Button>
          <div className="w-px h-5 bg-zinc-200 mx-0.5" />
          <Button variant="ghost" size="sm" className="h-9 rounded-full px-3" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-1.5" /> Download
          </Button>
          <div className="w-px h-5 bg-zinc-200 mx-0.5" />
          <Button variant="ghost" size="sm" className="h-9 rounded-full px-3" onClick={onShare}>
            <Share2 className="w-4 h-4 mr-1.5" /> Share
          </Button>
        </div>
      </div>

      <ShareProjectDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        projectId={project.id}
        projectTitle={project.title || "Untitled"}
      />
    </div>
  );
}

export default MobileCanvasViewer;
