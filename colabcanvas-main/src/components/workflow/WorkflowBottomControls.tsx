import { Button } from '@/components/ui/button';
import { useReactFlow } from '@xyflow/react';
import { useState, useEffect } from 'react';
import FitViewIcon from '@/assets/icons/workflow-fit-view.svg?react';
import ZoomInIcon from '@/assets/icons/workflow-zoom-in.svg?react';
import ZoomOutIcon from '@/assets/icons/workflow-zoom-out.svg?react';

const WorkflowBottomControls = () => {
  const { zoomIn, zoomOut, fitView, getViewport } = useReactFlow();
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    const viewport = getViewport();
    setZoom(Math.round(viewport.zoom * 100));
  }, [getViewport]);

  const handleZoomIn = () => {
    zoomIn();
    setTimeout(() => {
      const viewport = getViewport();
      setZoom(Math.round(viewport.zoom * 100));
    }, 100);
  };

  const handleZoomOut = () => {
    zoomOut();
    setTimeout(() => {
      const viewport = getViewport();
      setZoom(Math.round(viewport.zoom * 100));
    }, 100);
  };

  const handleFitView = () => {
    fitView();
    setTimeout(() => {
      const viewport = getViewport();
      setZoom(Math.round(viewport.zoom * 100));
    }, 100);
  };

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-lg rounded-lg shadow-sm px-2 py-1.5 flex items-center gap-1 z-40 border border-zinc-200">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleZoomOut}
        className="h-8 w-8 text-zinc-900 hover:bg-zinc-100"
        title="Zoom Out"
      >
        <ZoomOutIcon className="h-4 w-4 covex-icon-strong" />
      </Button>
      
      <span className="text-xs font-semibold text-zinc-900 min-w-[3rem] text-center">
        {zoom}%
      </span>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={handleZoomIn}
        className="h-8 w-8 text-zinc-900 hover:bg-zinc-100"
        title="Zoom In"
      >
        <ZoomInIcon className="h-4 w-4 covex-icon-strong" />
      </Button>
      
      <div className="w-px h-5 bg-zinc-200 mx-1" />
      
      <Button
        variant="ghost"
        size="icon"
        onClick={handleFitView}
        className="h-8 w-8 text-zinc-900 hover:bg-zinc-100"
        title="Fit View"
      >
        <FitViewIcon className="h-4 w-4 covex-icon-strong" />
      </Button>
    </div>
  );
};

export default WorkflowBottomControls;
