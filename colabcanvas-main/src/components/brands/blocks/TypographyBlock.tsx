import { useState, useEffect, useRef } from 'react';
import { TypographyBlock as TypographyBlockType } from '@/types/brandBlocks';
import { Trash2, Upload, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useBrandAssetUpload } from '@/hooks/useBrandAssetUpload';

interface TypographyBlockProps {
  block: TypographyBlockType;
  brandId: string;
  sectionId: string;
  onUpdate: (content: TypographyBlockType['content']) => void;
  onDelete: () => void;
  isPreviewMode?: boolean;
}

// Popular Google Fonts
const GOOGLE_FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald', 'Source Sans Pro',
  'Raleway', 'PT Sans', 'Merriweather', 'Nunito', 'Playfair Display', 'Ubuntu',
  'Poppins', 'Work Sans', 'Noto Sans', 'Rubik', 'DM Sans', 'Manrope'
];

const FONT_WEIGHTS = ['100', '200', '300', '400', '500', '600', '700', '800', '900'];

export const TypographyBlock = ({ block, brandId, sectionId, onUpdate, onDelete, isPreviewMode = false }: TypographyBlockProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadAsset, uploading } = useBrandAssetUpload(brandId);
  const [fontSource, setFontSource] = useState<'google' | 'upload'>('google');
  const [fontFamily, setFontFamily] = useState(block.content.font_family || 'Inter');
  const [weights, setWeights] = useState(block.content.weights || ['400']);
  const [sampleText, setSampleText] = useState(block.content.sample_text || 'The quick brown fox jumps over the lazy dog');
  const [usageNotes, setUsageNotes] = useState(block.content.usage_notes || '');
  const [fontLoaded, setFontLoaded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Load Google Font
  useEffect(() => {
    if (fontFamily && GOOGLE_FONTS.includes(fontFamily)) {
      const link = document.createElement('link');
      link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@${weights.join(';')}&display=swap`;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
      
      // Wait for font to load
      setTimeout(() => setFontLoaded(true), 100);
      
      return () => {
        document.head.removeChild(link);
      };
    }
  }, [fontFamily, weights]);

  const handleUpdate = () => {
    onUpdate({
      font_family: fontFamily,
      weights,
      sample_text: sampleText,
      usage_notes: usageNotes
    });
  };

  const toggleWeight = (weight: string) => {
    const newWeights = weights.includes(weight)
      ? weights.filter(w => w !== weight)
      : [...weights, weight].sort();
    setWeights(newWeights);
    onUpdate({
      font_family: fontFamily,
      weights: newWeights,
      sample_text: sampleText,
      usage_notes: usageNotes
    });
  };

  const downloadFont = () => {
    const url = `https://fonts.google.com/download?family=${fontFamily.replace(' ', '+')}`;
    window.open(url, '_blank');
    toast({ title: 'Opening Google Fonts download page' });
  };

  const handleFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['font/ttf', 'font/otf', 'font/woff', 'font/woff2', 'application/x-font-ttf', 'application/x-font-otf'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(ttf|otf|woff|woff2)$/)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a TTF, OTF, WOFF, or WOFF2 font file',
        variant: 'destructive',
      });
      return;
    }

    try {
      const data = await uploadAsset(file, sectionId, block.id);
      setFontFamily(file.name.split('.')[0]);
      onUpdate({
        font_family: file.name.split('.')[0],
        weights,
        sample_text: sampleText,
        usage_notes: usageNotes,
        font_file_path: data.file_path
      });
      toast({
        title: 'Font uploaded',
        description: 'Custom font has been uploaded successfully',
      });
    } catch (error) {
      // Error handled by upload hook
    }
  };

  return (
    <div className="group relative py-2">
      {isPreviewMode && fontFamily ? (
        <div className="space-y-4">
          <p className="text-sm font-medium text-muted-foreground">{fontFamily}</p>
          {weights.slice(0, 2).map(weight => (
            <p
              key={weight}
              style={{
                fontFamily: `'${fontFamily}', sans-serif`,
                fontWeight: weight,
                fontSize: '24px',
              }}
            >
              {sampleText}
            </p>
          ))}
          {usageNotes && (
            <p className="text-sm text-muted-foreground">{usageNotes}</p>
          )}
        </div>
      ) : (
        <div className="space-y-4 border border-border rounded-lg p-6">
          <Tabs value={fontSource} onValueChange={(v) => setFontSource(v as 'google' | 'upload')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="google">Google Fonts</TabsTrigger>
              <TabsTrigger value="upload">Upload Font</TabsTrigger>
            </TabsList>
            
            <TabsContent value="google" className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Font Family</label>
                <Select value={fontFamily} onValueChange={(value) => {
                  setFontFamily(value);
                  handleUpdate();
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a font" />
                  </SelectTrigger>
                  <SelectContent>
                    {GOOGLE_FONTS.map(font => (
                      <SelectItem key={font} value={font}>{font}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
            
            <TabsContent value="upload" className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Upload Custom Font</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".ttf,.otf,.woff,.woff2"
                  onChange={handleFontUpload}
                  className="hidden"
                />
                <Button 
                  onClick={() => fileInputRef.current?.click()} 
                  variant="outline" 
                  className="w-full gap-2"
                  disabled={uploading}
                >
                  <Upload className="w-4 h-4" />
                  {uploading ? 'Uploading...' : 'Upload Font File'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <label className="text-sm font-medium">Font Weights</label>
            <div className="flex flex-wrap gap-2">
              {FONT_WEIGHTS.map(weight => (
                <Button
                  key={weight}
                  variant={weights.includes(weight) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleWeight(weight)}
                >
                  {weight}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Sample Text</label>
            <Textarea
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              onBlur={handleUpdate}
              placeholder="The quick brown fox jumps over the lazy dog"
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-4 p-4 bg-muted rounded-lg">
            {weights.slice(0, 2).map(weight => (
              <p
                key={weight}
                style={{
                  fontFamily: `'${fontFamily}', sans-serif`,
                  fontWeight: weight
                }}
                className="text-lg"
              >
                {sampleText}
              </p>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Usage Guidelines</label>
            <Textarea
              value={usageNotes}
              onChange={(e) => setUsageNotes(e.target.value)}
              onBlur={handleUpdate}
              placeholder="e.g., Use weight 700 for headings"
              rows={2}
            />
          </div>
        </div>
      )}

      {!isPreviewMode && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
};
