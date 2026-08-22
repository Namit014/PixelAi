import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  FlipVertical2,
  ArrowLeftRight,
  Unlink,
  Type,
  Layers,
} from 'lucide-react';
import type { TextOnPathData } from '@/lib/canvas/textOnPath';
import { DEFAULT_TEXT_ON_PATH } from '@/lib/canvas/textOnPath';

interface TextOnPathPanelProps {
  selectedObject: any;
  canvas: any;
  onUpdate: (properties: any) => void;
}

export default function TextOnPathPanel({
  selectedObject,
  canvas,
  onUpdate,
}: TextOnPathPanelProps) {
  const textOnPath: TextOnPathData = selectedObject?.textOnPath ?? DEFAULT_TEXT_ON_PATH;

  const [text, setText] = useState(textOnPath.text);
  const [fontSize, setFontSize] = useState(textOnPath.fontSize);
  const [alignment, setAlignment] = useState(textOnPath.alignment);
  const [startOffset, setStartOffset] = useState(textOnPath.startOffset * 100);
  const [verticalOffset, setVerticalOffset] = useState(textOnPath.verticalOffset);
  const [letterSpacing, setLetterSpacing] = useState(textOnPath.letterSpacing);
  const [flip, setFlip] = useState(textOnPath.flip);
  const [reverseDirection, setReverseDirection] = useState(textOnPath.reverseDirection);

  // Sync from object
  useEffect(() => {
    const tp = selectedObject?.textOnPath;
    if (!tp) return;
    setText(tp.text);
    setFontSize(tp.fontSize);
    setAlignment(tp.alignment);
    setStartOffset(tp.startOffset * 100);
    setVerticalOffset(tp.verticalOffset);
    setLetterSpacing(tp.letterSpacing);
    setFlip(tp.flip);
    setReverseDirection(tp.reverseDirection);
  }, [selectedObject?.textOnPath]);

  const update = (partial: Partial<TextOnPathData>) => {
    if (!selectedObject) return;
    selectedObject.textOnPath = { ...selectedObject.textOnPath, ...partial };
    canvas?.fire('object:modified', { target: selectedObject });
    canvas?.requestRenderAll();
  };

  const handleDetach = () => {
    if (!selectedObject || !canvas) return;
    // Create standalone textbox from text-on-path
    import('fabric').then(({ Textbox }) => {
      const tp = selectedObject.textOnPath as TextOnPathData;
      const textbox = new Textbox(tp.text, {
        left: selectedObject.left,
        top: selectedObject.top,
        fontSize: tp.fontSize,
        fontFamily: tp.fontFamily,
        fill: tp.fill,
      });
      (textbox as any).isStandaloneObject = true;
      (textbox as any).canvasObjectId = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      delete selectedObject.textOnPath;
      canvas.add(textbox);
      canvas.setActiveObject(textbox);
      canvas.fire('object:modified', { target: selectedObject });
      canvas.requestRenderAll();
    });
  };

  return (
    <TooltipProvider>
      <div className="space-y-3 p-3 border-t border-border">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <Type className="w-3.5 h-3.5" />
          Type on Path
        </div>

        {/* Text input */}
        <div>
          <Label className="text-xs text-muted-foreground">Text</Label>
          <Input
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              update({ text: e.target.value });
            }}
            className="h-8 text-sm"
          />
        </div>

        {/* Font size */}
        <div>
          <Label className="text-xs text-muted-foreground">Size</Label>
          <Input
            type="number"
            value={fontSize}
            onChange={(e) => {
              const v = Number(e.target.value);
              setFontSize(v);
              update({ fontSize: v });
            }}
            className="h-8 text-sm w-20"
            min={1}
            max={200}
          />
        </div>

        {/* Alignment */}
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Alignment</Label>
          <div className="flex gap-1">
            {(['start', 'center', 'end'] as const).map((a) => (
              <Tooltip key={a}>
                <TooltipTrigger asChild>
                  <Button
                    variant={alignment === a ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => { setAlignment(a); update({ alignment: a }); }}
                  >
                    {a === 'start' ? <AlignLeft className="w-3.5 h-3.5" /> :
                     a === 'center' ? <AlignCenter className="w-3.5 h-3.5" /> :
                     <AlignRight className="w-3.5 h-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{a.charAt(0).toUpperCase() + a.slice(1)}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>

        {/* Start Offset */}
        <div>
          <Label className="text-xs text-muted-foreground">Offset: {Math.round(startOffset)}%</Label>
          <Slider
            value={[startOffset]}
            onValueChange={([v]) => {
              setStartOffset(v);
              update({ startOffset: v / 100 });
            }}
            min={0}
            max={100}
            step={1}
            className="mt-1"
          />
        </div>

        {/* Vertical Offset */}
        <div>
          <Label className="text-xs text-muted-foreground">Vertical Offset</Label>
          <Slider
            value={[verticalOffset]}
            onValueChange={([v]) => {
              setVerticalOffset(v);
              update({ verticalOffset: v });
            }}
            min={-50}
            max={50}
            step={1}
            className="mt-1"
          />
        </div>

        {/* Letter Spacing */}
        <div>
          <Label className="text-xs text-muted-foreground">Letter Spacing</Label>
          <Slider
            value={[letterSpacing]}
            onValueChange={([v]) => {
              setLetterSpacing(v);
              update({ letterSpacing: v });
            }}
            min={-10}
            max={50}
            step={0.5}
            className="mt-1"
          />
        </div>

        {/* Flip & Reverse */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={flip}
              onCheckedChange={(v) => { setFlip(v); update({ flip: v }); }}
            />
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <FlipVertical2 className="w-3 h-3" /> Flip
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={reverseDirection}
              onCheckedChange={(v) => { setReverseDirection(v); update({ reverseDirection: v }); }}
            />
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <ArrowLeftRight className="w-3 h-3" /> Reverse
            </Label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={handleDetach}>
            <Unlink className="w-3 h-3 mr-1" /> Detach
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
