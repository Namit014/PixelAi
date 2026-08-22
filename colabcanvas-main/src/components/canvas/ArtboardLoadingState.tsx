import { ImageGeneration } from '@/components/ui/ai-chat-image-generation';
import colabLogo from '@/assets/colab-logo.svg';

interface ArtboardLoadingStateProps {
  width: number;
  height: number;
  title: string;
  zoom?: number;
}

const ArtboardLoadingState = ({ width, height, title, zoom = 1 }: ArtboardLoadingStateProps) => {
  return (
    <div
      className="relative rounded-lg border-2 border-dashed border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10 overflow-hidden flex items-center justify-center"
      style={{ width: width * zoom, height: height * zoom }}
    >
      <div style={{ transform: `scale(${zoom})` }}>
        <ImageGeneration>
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 animate-spin" style={{ animationDuration: '1.5s' }}>
              <img src={colabLogo} alt="Loading" className="w-full h-full" />
            </div>
            <p className="text-xs text-muted-foreground">Creating {title}</p>
          </div>
        </ImageGeneration>
      </div>
    </div>
  );
};

export default ArtboardLoadingState;
