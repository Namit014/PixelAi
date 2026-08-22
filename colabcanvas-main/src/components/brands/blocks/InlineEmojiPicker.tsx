import { useEffect, useRef, useState } from 'react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  Home, Star, Heart, Settings, User, Mail, Phone, Calendar,
  Search, Filter, Edit, Trash2, Plus, Minus, Check, X,
  ChevronRight, ChevronLeft, ChevronUp, ChevronDown, Circle, Square,
  Triangle, Camera, Image, File, Folder, Download, Upload,
  Save, Share, Send, Lock, Unlock, Eye, EyeOff, Bell,
  MessageSquare, ThumbsUp, Flag, Bookmark, Link, Clock, MapPin,
  Tag, Zap, TrendingUp, Award, Gift, Music, Video, Mic,
  Volume2, Play, Pause, SkipForward, SkipBack, Shuffle, Repeat
} from 'lucide-react';

interface InlineEmojiPickerProps {
  onEmojiSelect: (value: string, type: 'emoji' | 'icon' | 'image') => void;
  onClose: () => void;
  position: { top: number; left: number };
}

const icons = [
  { name: 'Home', component: Home },
  { name: 'Star', component: Star },
  { name: 'Heart', component: Heart },
  { name: 'Settings', component: Settings },
  { name: 'User', component: User },
  { name: 'Mail', component: Mail },
  { name: 'Phone', component: Phone },
  { name: 'Calendar', component: Calendar },
  { name: 'Search', component: Search },
  { name: 'Filter', component: Filter },
  { name: 'Edit', component: Edit },
  { name: 'Trash2', component: Trash2 },
  { name: 'Plus', component: Plus },
  { name: 'Minus', component: Minus },
  { name: 'Check', component: Check },
  { name: 'X', component: X },
  { name: 'ChevronRight', component: ChevronRight },
  { name: 'ChevronLeft', component: ChevronLeft },
  { name: 'ChevronUp', component: ChevronUp },
  { name: 'ChevronDown', component: ChevronDown },
  { name: 'Circle', component: Circle },
  { name: 'Square', component: Square },
  { name: 'Triangle', component: Triangle },
  { name: 'Camera', component: Camera },
  { name: 'Image', component: Image },
  { name: 'File', component: File },
  { name: 'Folder', component: Folder },
  { name: 'Download', component: Download },
  { name: 'Upload', component: Upload },
  { name: 'Save', component: Save },
  { name: 'Share', component: Share },
  { name: 'Send', component: Send },
  { name: 'Lock', component: Lock },
  { name: 'Unlock', component: Unlock },
  { name: 'Eye', component: Eye },
  { name: 'EyeOff', component: EyeOff },
  { name: 'Bell', component: Bell },
  { name: 'MessageSquare', component: MessageSquare },
  { name: 'ThumbsUp', component: ThumbsUp },
  { name: 'Flag', component: Flag },
  { name: 'Bookmark', component: Bookmark },
  { name: 'Link', component: Link },
  { name: 'Clock', component: Clock },
  { name: 'MapPin', component: MapPin },
  { name: 'Tag', component: Tag },
  { name: 'Zap', component: Zap },
  { name: 'TrendingUp', component: TrendingUp },
  { name: 'Award', component: Award },
  { name: 'Gift', component: Gift },
  { name: 'Music', component: Music },
  { name: 'Video', component: Video },
  { name: 'Mic', component: Mic },
  { name: 'Volume2', component: Volume2 },
  { name: 'Play', component: Play },
  { name: 'Pause', component: Pause },
  { name: 'SkipForward', component: SkipForward },
  { name: 'SkipBack', component: SkipBack },
  { name: 'Shuffle', component: Shuffle },
  { name: 'Repeat', component: Repeat },
];

export const InlineEmojiPicker = ({ onEmojiSelect, onClose, position }: InlineEmojiPickerProps) => {
  const pickerRef = useRef<HTMLDivElement>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onEmojiSelect(emojiData.emoji, 'emoji');
    onClose();
  };

  const handleIconClick = (iconName: string) => {
    onEmojiSelect(iconName, 'icon');
    onClose();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        setUploadedImage(imageUrl);
        onEmojiSelect(imageUrl, 'image');
        onClose();
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div
      ref={pickerRef}
      className="fixed z-50 bg-background border border-zinc-200 rounded-lg shadow-lg"
      style={{ top: position.top, left: position.left }}
    >
      <Tabs defaultValue="emoji" className="w-[350px]">
        <TabsList className="w-full grid grid-cols-3 bg-transparent p-0 h-auto border-b border-zinc-200 rounded-none">
          <TabsTrigger value="emoji">Emoji</TabsTrigger>
          <TabsTrigger value="icon">Icon</TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
        </TabsList>

        <TabsContent value="emoji" className="m-0">
          <EmojiPicker 
            onEmojiClick={handleEmojiClick} 
            width={350} 
            height={400}
            searchDisabled={false}
            skinTonesDisabled
            previewConfig={{ showPreview: false }}
          />
        </TabsContent>

        <TabsContent value="icon" className="m-0">
          <ScrollArea className="h-[400px]">
            <div className="grid grid-cols-8 gap-2 p-4">
              {icons.map(({ name, component: Icon }) => (
                <Button
                  key={name}
                  variant="ghost"
                  size="icon"
                  onClick={() => handleIconClick(name)}
                  className="h-10 w-10 hover:bg-zinc-100"
                  title={name}
                >
                  <Icon className="w-5 h-5 text-zinc-700" />
                </Button>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="upload" className="m-0">
          <div className="p-6 h-[400px] flex flex-col items-center justify-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            
            {uploadedImage ? (
              <div className="flex flex-col items-center gap-3">
                <img 
                  src={uploadedImage} 
                  alt="Preview" 
                  className="w-32 h-32 object-cover rounded-lg border border-zinc-200"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Choose Different Image
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Image
              </Button>
            )}
            
            <p className="text-xs text-zinc-500 text-center">
              Upload an image to use as an inline icon
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
