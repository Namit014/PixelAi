import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, QrCode, Loader2, Link, Mail, Phone, Wifi } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { HexColorPicker } from 'react-colorful';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface QRCodeGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (imageUrl: string) => void;
}

type QRType = 'url' | 'text' | 'email' | 'phone' | 'wifi';

interface QRTypeOption {
  id: QRType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  placeholder: string;
}

const QR_TYPES: QRTypeOption[] = [
  { id: 'url', label: 'URL', icon: Link, placeholder: 'https://example.com' },
  { id: 'text', label: 'Text', icon: QrCode, placeholder: 'Enter any text...' },
  { id: 'email', label: 'Email', icon: Mail, placeholder: 'email@example.com' },
  { id: 'phone', label: 'Phone', icon: Phone, placeholder: '+1234567890' },
  { id: 'wifi', label: 'WiFi', icon: Wifi, placeholder: 'Network name' },
];

export function QRCodeGenerator({
  isOpen,
  onClose,
  onGenerate,
}: QRCodeGeneratorProps) {
  const [qrType, setQrType] = useState<QRType>('url');
  const [content, setContent] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [isGenerating, setIsGenerating] = useState(false);

  const formatQRContent = (): string => {
    switch (qrType) {
      case 'url':
        return content.startsWith('http') ? content : `https://${content}`;
      case 'email':
        return `mailto:${content}`;
      case 'phone':
        return `tel:${content}`;
      case 'wifi':
        return `WIFI:T:WPA;S:${content};P:${wifiPassword};;`;
      default:
        return content;
    }
  };

  const handleGenerate = async () => {
    if (!content.trim()) {
      toast.error('Please enter content for the QR code');
      return;
    }

    setIsGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to generate QR codes');
        return;
      }

      const { data, error } = await supabase.functions.invoke('generate-qr', {
        body: {
          content: formatQRContent(),
          foregroundColor: fgColor,
          backgroundColor: bgColor,
          size: 512,
        },
      });

      if (error) throw error;

      if (data?.imageUrl) {
        onGenerate(data.imageUrl);
        toast.success('QR code generated!');
        onClose();
      }
    } catch (error) {
      console.error('QR generation error:', error);
      toast.error('Failed to generate QR code');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed left-[60px] top-1/2 -translate-y-1/2 z-50">
      <div 
        className="bg-background rounded-2xl border border-border w-[380px] overflow-hidden"
        style={{
          animation: 'slideIn 0.2s ease-out forwards'
        }}
      >
        <style>{`
          @keyframes slideIn {
            0% { opacity: 0; transform: translateX(-10px); }
            100% { opacity: 1; transform: translateX(0); }
          }
        `}</style>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">QR Code Generator</h2>
              <p className="text-sm text-muted-foreground">Create custom QR codes</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* QR Type Selector */}
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            {QR_TYPES.map(type => {
              const Icon = type.icon;
              const isSelected = qrType === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => setQrType(type.id)}
                  className={`flex-1 flex flex-col items-center py-2 px-1 rounded-md transition-all ${
                    isSelected 
                      ? 'bg-background shadow-sm' 
                      : 'hover:bg-background/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 mb-1 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-[10px] ${isSelected ? 'font-medium' : 'text-muted-foreground'}`}>
                    {type.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Content Input */}
          <div>
            <Label className="text-xs mb-1.5 block">Content</Label>
            <Input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => {
                // Prevent spacebar from triggering canvas panning
                if (e.key === ' ' || e.key === 'Spacebar') {
                  e.stopPropagation();
                }
              }}
              placeholder={QR_TYPES.find(t => t.id === qrType)?.placeholder}
              className="h-10"
            />
          </div>

          {/* WiFi Password (conditional) */}
          {qrType === 'wifi' && (
            <div>
              <Label className="text-xs mb-1.5 block">WiFi Password</Label>
              <Input
                type="password"
                value={wifiPassword}
                onChange={(e) => setWifiPassword(e.target.value)}
                onKeyDown={(e) => {
                  // Prevent spacebar from triggering canvas panning
                  if (e.key === ' ' || e.key === 'Spacebar') {
                    e.stopPropagation();
                  }
                }}
                placeholder="Enter password..."
                className="h-10"
              />
            </div>
          )}

          {/* Color Options */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs mb-1.5 block">Foreground</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-2 w-full cursor-pointer group">
                    <div 
                      className="w-10 h-10 rounded-lg border border-border flex-shrink-0 transition-all group-hover:ring-2 group-hover:ring-primary/20"
                      style={{ backgroundColor: fgColor }}
                    />
                    <Input
                      value={fgColor}
                      onChange={(e) => setFgColor(e.target.value)}
                      onKeyDown={(e) => e.key === ' ' && e.stopPropagation()}
                      className="h-10 font-mono text-xs flex-1"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" side="bottom" align="start">
                  <HexColorPicker color={fgColor} onChange={setFgColor} />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Background</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-2 w-full cursor-pointer group">
                    <div 
                      className="w-10 h-10 rounded-lg border border-border flex-shrink-0 transition-all group-hover:ring-2 group-hover:ring-primary/20"
                      style={{ backgroundColor: bgColor }}
                    />
                    <Input
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      onKeyDown={(e) => e.key === ' ' && e.stopPropagation()}
                      className="h-10 font-mono text-xs flex-1"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" side="bottom" align="start">
                  <HexColorPicker color={bgColor} onChange={setBgColor} />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Generate Button */}
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating || !content.trim()}
            className="w-full h-11"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Generating...
              </>
            ) : (
              <>
                <QrCode className="w-4 h-4 mr-2" />
                Generate QR Code
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
