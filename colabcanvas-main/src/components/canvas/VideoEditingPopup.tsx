import { useState, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Camera, Aperture, Film, Sun, Move, RotateCcw, Waves, Focus, Layers, Zap, Check, Wind, Clock, Eye } from 'lucide-react';

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
  '/lens': {
    '24mm': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=80&h=80&fit=crop&q=80',
    '35mm': 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=80&h=80&fit=crop&q=80',
    '50mm': 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&q=80',
    '85mm': 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&q=80',
    '135mm': 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&h=80&fit=crop&q=80',
    'fisheye': 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=80&h=80&fit=crop&q=80',
    'macro': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=80&h=80&fit=crop&q=80',
  },
  '/aperture': {
    'f/1.4': 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&h=80&fit=crop&q=80',
    'f/2.8': 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&q=80',
    'f/5.6': 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=80&h=80&fit=crop&q=80',
    'f/11': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=80&h=80&fit=crop&q=80',
    'f/16': 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=80&h=80&fit=crop&q=80',
  },
  '/movement': {
    'dolly-in': 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=80&h=80&fit=crop&q=80',
    'dolly-out': 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=80&h=80&fit=crop&q=80',
    'pan-left': 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=80&h=80&fit=crop&q=80',
    'pan-right': 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=80&h=80&fit=crop&q=80',
    'tilt-up': 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=80&h=80&fit=crop&q=80',
    'tilt-down': 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=80&h=80&fit=crop&q=80',
    'orbit': 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=80&h=80&fit=crop&q=80',
    'crane': 'https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=80&h=80&fit=crop&q=80',
  },
  '/lighting': {
    'golden-hour': 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=80&h=80&fit=crop&q=80',
    'blue-hour': 'https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=80&h=80&fit=crop&q=80',
    'studio': 'https://images.unsplash.com/photo-1609220136736-443140cffec6?w=80&h=80&fit=crop&q=80',
    'natural': 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=80&h=80&fit=crop&q=80',
    'dramatic': 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=80&h=80&fit=crop&q=80',
    'neon': 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=80&h=80&fit=crop&q=80',
    'cinematic': 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=80&h=80&fit=crop&q=80',
  },
  '/grade': {
    'film': 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=80&h=80&fit=crop&q=80',
    'log': 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=80&h=80&fit=crop&q=80',
    'desaturated': 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=80&h=80&fit=crop&q=80',
    'warm': 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=80&h=80&fit=crop&q=80',
    'cool': 'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=80&h=80&fit=crop&q=80',
    'noir': 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=80&h=80&fit=crop&q=80',
    'blockbuster': 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=80&h=80&fit=crop&q=80',
  },
  '/focus': {
    'rack-focus': 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&h=80&fit=crop&q=80',
    'deep-focus': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=80&h=80&fit=crop&q=80',
    'shallow': 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&q=80',
    'follow-focus': 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=80&h=80&fit=crop&q=80',
    'split-diopter': 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=80&h=80&fit=crop&q=80',
  },
  '/speed': {
    'slow-mo': 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&h=80&fit=crop&q=80',
    'normal': 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=80&h=80&fit=crop&q=80',
    'fast': 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=80&h=80&fit=crop&q=80',
    'timelapse': 'https://images.unsplash.com/photo-1475070929565-c985b714f8f0?w=80&h=80&fit=crop&q=80',
    'hyperlapse': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=80&h=80&fit=crop&q=80',
    'ramping': 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&h=80&fit=crop&q=80',
  },
  '/transition': {
    'fade': 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=80&h=80&fit=crop&q=80',
    'dissolve': 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=80&h=80&fit=crop&q=80',
    'wipe': 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=80&h=80&fit=crop&q=80',
    'whip-pan': 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=80&h=80&fit=crop&q=80',
    'zoom': 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=80&h=80&fit=crop&q=80',
    'morph': 'https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=80&h=80&fit=crop&q=80',
  },
  '/shake': {
    'none': 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=80&h=80&fit=crop&q=80',
    'subtle': 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=80&h=80&fit=crop&q=80',
    'handheld': 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=80&h=80&fit=crop&q=80',
    'intense': 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=80&h=80&fit=crop&q=80',
  },
  '/depth': {
    'foreground': 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&h=80&fit=crop&q=80',
    'midground': 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=80&h=80&fit=crop&q=80',
    'background': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=80&h=80&fit=crop&q=80',
    'parallax': 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=80&h=80&fit=crop&q=80',
  },
};

// FPS options 
const FPS_OPTIONS: Record<string, string> = {
  '24': '24fps - Cinematic',
  '30': '30fps - Standard',
  '60': '60fps - Smooth',
  '120': '120fps - Slow-mo'
};

const VIDEO_SLASH_COMMANDS: SlashCommand[] = [
  { 
    command: '/lens', 
    label: 'Camera Lens', 
    description: 'Change focal length',
    icon: Camera,
    params: [
      { value: '24mm', label: '24mm Wide' },
      { value: '35mm', label: '35mm Standard' },
      { value: '50mm', label: '50mm Normal' },
      { value: '85mm', label: '85mm Portrait' },
      { value: '135mm', label: '135mm Telephoto' },
      { value: 'fisheye', label: 'Fisheye' },
      { value: 'macro', label: 'Macro' },
    ]
  },
  { 
    command: '/aperture', 
    label: 'Aperture', 
    description: 'Depth of field control',
    icon: Aperture,
    params: [
      { value: 'f/1.4', label: 'f/1.4 - Shallow' },
      { value: 'f/2.8', label: 'f/2.8 - Portrait' },
      { value: 'f/5.6', label: 'f/5.6 - Balanced' },
      { value: 'f/11', label: 'f/11 - Sharp' },
      { value: 'f/16', label: 'f/16 - Deep' },
      { value: 'custom', label: 'Custom f-stop', isCustomInput: true },
    ]
  },
  { 
    command: '/movement', 
    label: 'Camera Movement', 
    description: 'Motion and tracking',
    icon: Move,
    params: [
      { value: 'dolly-in', label: 'Dolly In' },
      { value: 'dolly-out', label: 'Dolly Out' },
      { value: 'pan-left', label: 'Pan Left' },
      { value: 'pan-right', label: 'Pan Right' },
      { value: 'tilt-up', label: 'Tilt Up' },
      { value: 'tilt-down', label: 'Tilt Down' },
      { value: 'orbit', label: '360° Orbit' },
      { value: 'crane', label: 'Crane Shot' },
    ]
  },
  { 
    command: '/lighting', 
    label: 'Lighting', 
    description: 'Lighting conditions',
    icon: Sun,
    params: [
      { value: 'golden-hour', label: 'Golden Hour' },
      { value: 'blue-hour', label: 'Blue Hour' },
      { value: 'studio', label: 'Studio Lit' },
      { value: 'natural', label: 'Natural Light' },
      { value: 'dramatic', label: 'Dramatic' },
      { value: 'neon', label: 'Neon/Cyberpunk' },
      { value: 'cinematic', label: 'Cinematic' },
    ]
  },
  { 
    command: '/grade', 
    label: 'Color Grade', 
    description: 'Color grading presets',
    icon: Film,
    params: [
      { value: 'film', label: 'Film Look' },
      { value: 'log', label: 'LOG / Flat' },
      { value: 'desaturated', label: 'Desaturated' },
      { value: 'warm', label: 'Warm Tones' },
      { value: 'cool', label: 'Cool Tones' },
      { value: 'noir', label: 'Noir/B&W' },
      { value: 'blockbuster', label: 'Blockbuster' },
    ]
  },
  { 
    command: '/focus', 
    label: 'Focus', 
    description: 'Focus techniques',
    icon: Focus,
    params: [
      { value: 'rack-focus', label: 'Rack Focus' },
      { value: 'deep-focus', label: 'Deep Focus' },
      { value: 'shallow', label: 'Shallow DOF' },
      { value: 'follow-focus', label: 'Follow Focus' },
      { value: 'split-diopter', label: 'Split Diopter' },
    ]
  },
  { 
    command: '/speed', 
    label: 'Speed', 
    description: 'Playback speed',
    icon: Clock,
    params: [
      { value: 'slow-mo', label: 'Slow Motion' },
      { value: 'normal', label: 'Normal (1x)' },
      { value: 'fast', label: 'Fast Motion' },
      { value: 'timelapse', label: 'Timelapse' },
      { value: 'hyperlapse', label: 'Hyperlapse' },
      { value: 'ramping', label: 'Speed Ramping' },
    ]
  },
  { 
    command: '/transition', 
    label: 'Transition', 
    description: 'Video transitions',
    icon: Layers,
    params: [
      { value: 'fade', label: 'Fade' },
      { value: 'dissolve', label: 'Dissolve' },
      { value: 'wipe', label: 'Wipe' },
      { value: 'whip-pan', label: 'Whip Pan' },
      { value: 'zoom', label: 'Zoom' },
      { value: 'morph', label: 'Morph' },
    ]
  },
  { 
    command: '/shake', 
    label: 'Camera Shake', 
    description: 'Handheld effect',
    icon: Wind,
    params: [
      { value: 'none', label: 'Stabilized' },
      { value: 'subtle', label: 'Subtle' },
      { value: 'handheld', label: 'Handheld' },
      { value: 'intense', label: 'Intense' },
    ]
  },
  { 
    command: '/depth', 
    label: 'Depth Layers', 
    description: 'Z-depth control',
    icon: Eye,
    params: [
      { value: 'foreground', label: 'Foreground Focus' },
      { value: 'midground', label: 'Midground Focus' },
      { value: 'background', label: 'Background Focus' },
      { value: 'parallax', label: 'Parallax Effect' },
    ]
  },
  { 
    command: '/fps', 
    label: 'Frame Rate', 
    description: 'Change FPS',
    icon: Zap,
    params: [
      { value: '24', label: '24fps - Cinematic' },
      { value: '30', label: '30fps - Standard' },
      { value: '60', label: '60fps - Smooth' },
      { value: '120', label: '120fps - Slow-mo' },
    ]
  },
  { 
    command: '/regenerate', 
    label: 'Regenerate', 
    description: 'Generate new variation',
    icon: RotateCcw,
    params: [
      { value: 'same-settings', label: 'Same Settings' },
      { value: 'new-seed', label: 'New Seed' },
      { value: 'vary-subtle', label: 'Subtle Variation' },
      { value: 'vary-strong', label: 'Strong Variation' },
    ]
  },
];

export interface VideoEditCommand {
  command: string;
  param: string;
  displayText: string;
}

interface VideoEditingPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCommand: (command: VideoEditCommand) => void;
  searchQuery: string;
}

export function VideoEditingPopup({
  isOpen,
  onClose,
  onSelectCommand,
  searchQuery,
}: VideoEditingPopupProps) {
  const [selectedCommand, setSelectedCommand] = useState<SlashCommand | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [customValue, setCustomValue] = useState('');
  const popupRef = useRef<HTMLDivElement>(null);

  // Filter commands by search query
  const filteredCommands = searchQuery
    ? VIDEO_SLASH_COMMANDS.filter(cmd => 
        cmd.command.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cmd.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : VIDEO_SLASH_COMMANDS;

  // Reset state when popup opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedCommand(null);
      setHighlightedIndex(0);
      setCustomValue('');
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

  const handleCustomSubmit = () => {
    if (!selectedCommand || !customValue.trim()) return;
    
    onSelectCommand({
      command: selectedCommand.command,
      param: customValue.trim(),
      displayText: `${selectedCommand.command}:${customValue.trim()}`
    });
    setSelectedCommand(null);
    setCustomValue('');
    onClose();
  };

  const handleBackClick = () => {
    setSelectedCommand(null);
    setCustomValue('');
  };

  const getPreviewContent = (command: string, paramValue: string) => {
    // For FPS, show styled number
    if (command === '/fps') {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
          <span className="text-xs font-bold text-primary">{paramValue}</span>
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
            Video Editing Commands
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
                // Custom input
                <div 
                  key={param.value}
                  className="command-item w-full flex items-center gap-3 p-2 rounded-md"
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <div className="w-8 h-8 rounded bg-muted flex items-center justify-center overflow-hidden">
                    <span className="text-xs text-muted-foreground">f/</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center h-8 bg-muted rounded-md px-2 w-[140px]">
                      <span className="text-muted-foreground text-sm">f/</span>
                      <input
                        type="text"
                        value={customValue}
                        onChange={(e) => setCustomValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCustomSubmit();
                        }}
                        placeholder="2.0"
                        className="flex-1 bg-transparent text-sm outline-none ml-1"
                        maxLength={4}
                      />
                    </div>
                    <button
                      onClick={handleCustomSubmit}
                      disabled={!customValue.trim()}
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
                  <span className="text-sm">{param.label}</span>
                </button>
              )
            ))}
          </div>
        ) : (
          // Show command list
          <div className="p-1">
            {filteredCommands.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No commands found
              </p>
            ) : (
              filteredCommands.map((cmd, index) => (
                <button
                  key={cmd.command}
                  onClick={() => handleCommandClick(cmd)}
                  className={`command-item w-full flex items-center gap-3 p-2 hover:bg-muted rounded-md transition-all duration-150 text-left hover:translate-x-1 ${
                    highlightedIndex === index ? 'bg-muted' : ''
                  }`}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                    <cmd.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{cmd.label}</span>
                      <span className="text-xs text-muted-foreground font-mono">{cmd.command}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{cmd.description}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

export default VideoEditingPopup;
