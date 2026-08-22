import { useState, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, RotateCw, Palette, Maximize2, Camera, Sun, Droplet, Wand2, Eraser, RefreshCw, Check } from 'lucide-react';

interface SlashCommandParam {
  value: string;
  label: string;
  isCustomInput?: boolean;
}

interface SlashCommand {
  command: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  params: SlashCommandParam[];
}

// Preview images for command parameters
const PARAM_PREVIEW_IMAGES: Record<string, Record<string, string>> = {
  '/angle': {
    'front': 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&q=80',
    'side': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&q=80',
    'back': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&q=80',
    'top': 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=80&h=80&fit=crop&q=80',
    '45deg': 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80&h=80&fit=crop&q=80',
  },
  '/filter': {
    'vintage': 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=80&h=80&fit=crop&q=80&sat=-50&sepia=50',
    'cinematic': 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=80&h=80&fit=crop&q=80',
    'noir': 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=80&h=80&fit=crop&q=80',
    'warm': 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=80&h=80&fit=crop&q=80',
    'cool': 'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=80&h=80&fit=crop&q=80',
    'vibrant': 'https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=80&h=80&fit=crop&q=80',
  },
  '/lighting': {
    'studio': 'https://images.unsplash.com/photo-1609220136736-443140cffec6?w=80&h=80&fit=crop&q=80',
    'natural': 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=80&h=80&fit=crop&q=80',
    'dramatic': 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=80&h=80&fit=crop&q=80',
    'soft': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=80&h=80&fit=crop&q=80',
    'golden-hour': 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=80&h=80&fit=crop&q=80',
    'neon': 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=80&h=80&fit=crop&q=80',
  },
  '/shot': {
    'close-up': 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&h=80&fit=crop&q=80',
    'medium': 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=80&h=80&fit=crop&q=80',
    'wide': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=80&h=80&fit=crop&q=80',
    'extreme-close': 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&q=80',
    'full-body': 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=80&h=80&fit=crop&q=80',
  },
  '/style': {
    'realistic': 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&q=80',
    'illustration': 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=80&h=80&fit=crop&q=80',
    'watercolor': 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=80&h=80&fit=crop&q=80',
    'oil-painting': 'https://images.unsplash.com/photo-1578926375605-eaf7559b1458?w=80&h=80&fit=crop&q=80',
    'sketch': 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=80&h=80&fit=crop&q=80',
    '3d-render': 'https://images.unsplash.com/photo-1617802690992-15d93263d3a9?w=80&h=80&fit=crop&q=80',
  },
  '/remove': {
    'background': 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=80&h=80&fit=crop&q=80',
    'object': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&h=80&fit=crop&q=80',
    'text': 'https://images.unsplash.com/photo-1504805572947-34fad45aed93?w=80&h=80&fit=crop&q=80',
    'person': 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&q=80',
  },
  '/replace': {
    'background': 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=80&h=80&fit=crop&q=80',
    'face': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&q=80',
    'object': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=80&h=80&fit=crop&q=80',
    'color': 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=80&h=80&fit=crop&q=80',
  },
};

// Color swatches for /color command
const COLOR_SWATCHES: Record<string, string> = {
  'vibrant': 'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 50%, #45B7D1 100%)',
  'muted': 'linear-gradient(135deg, #8B9A8B 0%, #A8B5A0 50%, #C9D6C3 100%)',
  'monochrome': 'linear-gradient(135deg, #1a1a1a 0%, #666666 50%, #cccccc 100%)',
  'warm': 'linear-gradient(135deg, #FF9A56 0%, #FF6B6B 50%, #FFB347 100%)',
  'cool': 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 50%, #093028 100%)',
  'pastel': 'linear-gradient(135deg, #FFD1DC 0%, #B5EAD7 50%, #C7CEEA 100%)',
};

const SLASH_COMMANDS: SlashCommand[] = [
  { 
    command: '/angle', 
    label: 'Change Angle', 
    description: 'Rotate or change perspective',
    icon: RotateCw,
    params: [
      { value: 'front', label: 'Front facing' },
      { value: 'side', label: 'Side view' },
      { value: 'back', label: 'Back view' },
      { value: 'top', label: 'Top down' },
      { value: '45deg', label: '45° angle' },
    ]
  },
  { 
    command: '/filter', 
    label: 'Apply Filter', 
    description: 'Visual style filters',
    icon: Palette,
    params: [
      { value: 'vintage', label: 'Vintage' },
      { value: 'cinematic', label: 'Cinematic' },
      { value: 'noir', label: 'Film noir' },
      { value: 'warm', label: 'Warm tones' },
      { value: 'cool', label: 'Cool tones' },
      { value: 'vibrant', label: 'Vibrant' },
    ]
  },
  { 
    command: '/aspect', 
    label: 'Aspect Ratio', 
    description: 'Change dimensions',
    icon: Maximize2,
    params: [
      { value: '1:1', label: 'Square (1:1)' },
      { value: '4:3', label: 'Standard (4:3)' },
      { value: '16:9', label: 'Widescreen (16:9)' },
      { value: '9:16', label: 'Portrait (9:16)' },
      { value: '3:2', label: 'Photo (3:2)' },
    ]
  },
  { 
    command: '/shot', 
    label: 'Shot Type', 
    description: 'Camera framing',
    icon: Camera,
    params: [
      { value: 'close-up', label: 'Close-up' },
      { value: 'medium', label: 'Medium shot' },
      { value: 'wide', label: 'Wide shot' },
      { value: 'extreme-close', label: 'Extreme close-up' },
      { value: 'full-body', label: 'Full body' },
    ]
  },
  { 
    command: '/lighting', 
    label: 'Lighting', 
    description: 'Adjust light conditions',
    icon: Sun,
    params: [
      { value: 'studio', label: 'Studio lighting' },
      { value: 'natural', label: 'Natural light' },
      { value: 'dramatic', label: 'Dramatic' },
      { value: 'soft', label: 'Soft diffused' },
      { value: 'golden-hour', label: 'Golden hour' },
      { value: 'neon', label: 'Neon glow' },
    ]
  },
  { 
    command: '/color', 
    label: 'Color', 
    description: 'Color adjustments',
    icon: Droplet,
    params: [
      { value: 'vibrant', label: 'Vibrant' },
      { value: 'muted', label: 'Muted' },
      { value: 'monochrome', label: 'Monochrome' },
      { value: 'warm', label: 'Warm palette' },
      { value: 'cool', label: 'Cool palette' },
      { value: 'pastel', label: 'Pastel' },
      { value: 'custom', label: 'Custom hex code', isCustomInput: true },
    ]
  },
  { 
    command: '/style', 
    label: 'Style', 
    description: 'Artistic styles',
    icon: Wand2,
    params: [
      { value: 'realistic', label: 'Photorealistic' },
      { value: 'illustration', label: 'Illustration' },
      { value: 'watercolor', label: 'Watercolor' },
      { value: 'oil-painting', label: 'Oil painting' },
      { value: 'sketch', label: 'Pencil sketch' },
      { value: '3d-render', label: '3D render' },
    ]
  },
  { 
    command: '/remove', 
    label: 'Remove', 
    description: 'Remove objects',
    icon: Eraser,
    params: [
      { value: 'background', label: 'Background' },
      { value: 'object', label: 'Specific object' },
      { value: 'text', label: 'Text/watermarks' },
      { value: 'person', label: 'People' },
    ]
  },
  { 
    command: '/replace', 
    label: 'Replace', 
    description: 'Replace elements',
    icon: RefreshCw,
    params: [
      { value: 'background', label: 'Background' },
      { value: 'face', label: 'Face' },
      { value: 'object', label: 'Object' },
      { value: 'color', label: 'Color scheme' },
    ]
  },
];

export interface ImageEditCommand {
  command: string;
  param: string;
  displayText: string;
}

interface ImageEditingPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCommand: (command: ImageEditCommand) => void;
  searchQuery: string;
}

export function ImageEditingPopup({
  isOpen,
  onClose,
  onSelectCommand,
  searchQuery,
}: ImageEditingPopupProps) {
  const [selectedCommand, setSelectedCommand] = useState<SlashCommand | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [customHex, setCustomHex] = useState('');
  const popupRef = useRef<HTMLDivElement>(null);

  // Filter commands by search query
  const filteredCommands = searchQuery
    ? SLASH_COMMANDS.filter(cmd => 
        cmd.command.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cmd.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : SLASH_COMMANDS;

  // Reset state when popup opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedCommand(null);
      setHighlightedIndex(0);
      setCustomHex('');
    }
  }, [isOpen]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const handleCommandClick = (cmd: SlashCommand) => {
    setSelectedCommand(cmd);
    setHighlightedIndex(0);
  };

  const handleParamClick = (param: SlashCommandParam) => {
    if (!selectedCommand) return;
    
    onSelectCommand({
      command: selectedCommand.command,
      param: param.value,
      displayText: `${selectedCommand.command}:${param.label}`
    });
    setSelectedCommand(null);
    onClose();
  };

  const handleHexSubmit = () => {
    if (!selectedCommand || customHex.length !== 6) return;
    
    const cleanHex = customHex.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
    if (cleanHex.length === 6) {
      onSelectCommand({
        command: selectedCommand.command,
        param: `#${cleanHex}`,
        displayText: `${selectedCommand.command}:#${cleanHex}`
      });
      setSelectedCommand(null);
      setCustomHex('');
      onClose();
    }
  };

  const handleBackClick = () => {
    setSelectedCommand(null);
    setCustomHex('');
  };

  const getPreviewContent = (command: string, paramValue: string) => {
    // For color command, show gradient swatches
    if (command === '/color' && COLOR_SWATCHES[paramValue]) {
      return (
        <div 
          className="w-full h-full rounded"
          style={{ background: COLOR_SWATCHES[paramValue] }}
        />
      );
    }
    
    // For aspect ratio, show ratio visualization
    if (command === '/aspect') {
      return (
        <div className="w-full h-full flex items-center justify-center bg-muted">
          <div 
            className="bg-primary/20 border border-primary/40 rounded-sm"
            style={{
              width: paramValue === '9:16' ? '14px' : paramValue === '1:1' ? '20px' : '24px',
              height: paramValue === '9:16' ? '24px' : paramValue === '1:1' ? '20px' : paramValue === '16:9' ? '14px' : '18px',
            }}
          />
        </div>
      );
    }
    
    // For other commands, show preview images
    const imageUrl = PARAM_PREVIEW_IMAGES[command]?.[paramValue];
    if (imageUrl) {
      return (
        <img 
          src={imageUrl} 
          alt={paramValue}
          className="w-full h-full object-cover rounded"
          loading="lazy"
        />
      );
    }
    
    // Fallback to letter
    return (
      <span className="text-xs text-primary font-medium">
        {paramValue.charAt(0).toUpperCase()}
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={popupRef}
      className="bg-background rounded-lg overflow-hidden w-full border border-border/30 shadow-lg"
      style={{
        animation: 'flyInUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
      }}
    >
      <style>{`
        @keyframes flyInUp {
          0% {
            opacity: 0;
            transform: translateY(12px) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes staggerFadeIn {
          0% {
            opacity: 0;
            transform: translateX(-8px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .command-item {
          opacity: 0;
          animation: staggerFadeIn 0.2s ease-out forwards;
        }
      `}</style>
      
      <div className="flex items-center justify-between px-3 py-2 bg-background">
        {selectedCommand ? (
          <button 
            onClick={handleBackClick}
            className="text-xs font-medium text-primary hover:underline"
          >
            ← Back to commands
          </button>
        ) : (
          <span className="text-xs font-medium text-muted-foreground">
            Image Editing Commands
          </span>
        )}
        <button 
          onClick={onClose}
          className="p-1 hover:bg-muted rounded transition-colors"
        >
          <X className="w-3 h-3 text-muted-foreground" />
        </button>
      </div>

      <ScrollArea className="h-[280px] overflow-y-auto">
        {selectedCommand ? (
          // Show parameters for selected command
          <div className="p-1">
            <div className="px-2 py-1 mb-1">
              <div className="flex items-center gap-2">
                <selectedCommand.icon className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">{selectedCommand.label}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{selectedCommand.description}</p>
            </div>
            {selectedCommand.params.map((param, index) => (
              param.isCustomInput ? (
                // Custom hex input for /color command
                <div 
                  key={param.value}
                  className="command-item w-full flex items-center gap-3 p-2 rounded-md"
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <div className="w-8 h-8 rounded bg-muted flex items-center justify-center overflow-hidden">
                    {customHex.length === 6 ? (
                      <div 
                        className="w-full h-full"
                        style={{ backgroundColor: `#${customHex}` }}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">#</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center h-8 bg-muted rounded-md px-2 w-[140px]">
                      <span className="text-muted-foreground text-sm">#</span>
                      <input
                        type="text"
                        value={customHex}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
                          if (val.length <= 6) setCustomHex(val);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleHexSubmit();
                        }}
                        placeholder="FF5500"
                        className="flex-1 bg-transparent text-sm uppercase tracking-wide outline-none ml-1"
                        maxLength={6}
                      />
                    </div>
                    <button
                      onClick={handleHexSubmit}
                      disabled={customHex.length !== 6}
                      className="w-8 h-8 flex items-center justify-center bg-primary text-primary-foreground rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  key={param.value}
                  onClick={() => handleParamClick(param)}
                  className="command-item w-full flex items-center gap-3 p-2 hover:bg-muted rounded-md transition-all duration-150 text-left hover:translate-x-1"
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center overflow-hidden">
                    {getPreviewContent(selectedCommand.command, param.value)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{param.label}</p>
                    <p className="text-xs text-muted-foreground">{selectedCommand.command}:{param.value}</p>
                  </div>
                </button>
              )
            ))}
          </div>
        ) : (
          // Show command list
          filteredCommands.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No matching commands
            </div>
          ) : (
            <div className="p-1">
              {filteredCommands.map((cmd, index) => {
                const Icon = cmd.icon;
                return (
                  <button
                    key={cmd.command}
                    onClick={() => handleCommandClick(cmd)}
                    className="command-item w-full flex items-center gap-3 p-2 hover:bg-muted rounded-md transition-all duration-150 text-left hover:translate-x-1"
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{cmd.label}</p>
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{cmd.command}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{cmd.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )
        )}
      </ScrollArea>
    </div>
  );
}

export { SLASH_COMMANDS };
