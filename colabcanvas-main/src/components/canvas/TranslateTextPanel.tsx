import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Languages, Loader2, Check, Image, Type } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  script: string;
  fontFamily: string;
}

// Extended Language interface with creative flag
interface ExtendedLanguage extends Language {
  isCreative?: boolean;
}

const INDIAN_LANGUAGES: ExtendedLanguage[] = [
  // NEW: Hinglish - Creative copywriter-style translation
  { code: 'hi-colloquial', name: 'Hinglish', nativeName: 'हिंग्लिश', script: 'Mixed', fontFamily: 'Noto Sans Devanagari', isCreative: true },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', script: 'Devanagari', fontFamily: 'Noto Sans Devanagari' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', script: 'Tamil', fontFamily: 'Noto Sans Tamil' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', script: 'Telugu', fontFamily: 'Noto Sans Telugu' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', script: 'Gurmukhi', fontFamily: 'Noto Sans Gurmukhi' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', script: 'Bengali', fontFamily: 'Noto Sans Bengali' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', script: 'Gujarati', fontFamily: 'Noto Sans Gujarati' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', script: 'Kannada', fontFamily: 'Noto Sans Kannada' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', script: 'Malayalam', fontFamily: 'Noto Sans Malayalam' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', script: 'Devanagari', fontFamily: 'Noto Sans Devanagari' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', script: 'Odia', fontFamily: 'Noto Sans Oriya' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', script: 'Bengali', fontFamily: 'Noto Sans Bengali' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', script: 'Nastaliq', fontFamily: 'Noto Sans Arabic' },
];

const OTHER_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', script: 'Latin', fontFamily: 'Noto Sans' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', script: 'Latin', fontFamily: 'Noto Sans' },
  { code: 'fr', name: 'French', nativeName: 'Français', script: 'Latin', fontFamily: 'Noto Sans' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', script: 'Latin', fontFamily: 'Noto Sans' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', script: 'Arabic', fontFamily: 'Noto Sans Arabic' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', script: 'Hanzi', fontFamily: 'Noto Sans' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', script: 'Kanji/Kana', fontFamily: 'Noto Sans' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', script: 'Hangul', fontFamily: 'Noto Sans' },
];

type TranslateMode = 'text' | 'image';

interface TranslateTextPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTexts: Array<{ id: string; text: string; fontFamily?: string }>;
  onTranslateComplete: (translations: Array<{ id: string; translatedText: string; fontFamily?: string }>) => void;
  selectedImageUrl?: string | null;
  selectedImageWidth?: number;
  selectedImageHeight?: number;
  onImageTranslateComplete?: (translatedImageUrl: string) => void;
}

export function TranslateTextPanel({
  isOpen,
  onClose,
  selectedTexts,
  onTranslateComplete,
  selectedImageUrl,
  selectedImageWidth,
  selectedImageHeight,
  onImageTranslateComplete,
}: TranslateTextPanelProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<ExtendedLanguage | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showOtherLanguages, setShowOtherLanguages] = useState(false);
  const [translateMode, setTranslateMode] = useState<TranslateMode>(
    selectedImageUrl ? 'image' : 'text'
  );

  // FIX #5: Update translateMode when selectedImageUrl or selectedTexts change
  useEffect(() => {
    if (selectedImageUrl && selectedTexts.length === 0) {
      setTranslateMode('image');
    } else if (!selectedImageUrl && selectedTexts.length > 0) {
      setTranslateMode('text');
    }
  }, [selectedImageUrl, selectedTexts.length]);

  const handleTranslateText = async (translateAll: boolean = false) => {
    if (!selectedLanguage) {
      toast.error('Please select a target language');
      return;
    }

    const textsToTranslate = translateAll ? selectedTexts : selectedTexts.slice(0, 1);
    
    if (textsToTranslate.length === 0) {
      toast.error('No text selected to translate');
      return;
    }

    setIsTranslating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to translate');
        return;
      }

      const { data, error } = await supabase.functions.invoke('translate-text', {
        body: {
          texts: textsToTranslate.map(t => t.text),
          targetLanguage: selectedLanguage.code,
          targetLanguageName: selectedLanguage.name,
        },
      });

      if (error) throw error;

      if (data?.translations) {
        const translations = textsToTranslate.map((t, i) => ({
          id: t.id,
          translatedText: data.translations[i] || t.text,
          fontFamily: selectedLanguage.fontFamily,
        }));
        
        onTranslateComplete(translations);
        toast.success(`Translated to ${selectedLanguage.name}`);
        onClose();
      }
    } catch (error) {
      console.error('Translation error:', error);
      toast.error('Failed to translate text');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleTranslateImage = async () => {
    if (!selectedLanguage) {
      toast.error('Please select a target language');
      return;
    }

    if (!selectedImageUrl) {
      toast.error('No image selected to translate');
      return;
    }

    setIsTranslating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to translate');
        return;
      }

      const { data, error } = await supabase.functions.invoke('translate-image-text', {
        body: {
          imageUrl: selectedImageUrl,
          targetLanguage: selectedLanguage.code,
          targetLanguageName: selectedLanguage.name,
          isCreative: selectedLanguage.isCreative || false,
          originalWidth: selectedImageWidth,
          originalHeight: selectedImageHeight,
        },
      });

      if (error) throw error;

      if (data?.translatedImageUrl) {
        onImageTranslateComplete?.(data.translatedImageUrl);
        toast.success(`Image text translated to ${selectedLanguage.name}`);
        onClose();
      }
    } catch (error: any) {
      console.error('Image translation error:', error);
      if (error.message?.includes('429')) {
        toast.error('Rate limit exceeded. Please try again later.');
      } else if (error.message?.includes('402')) {
        toast.error('Insufficient credits. Please add more credits.');
      } else {
        toast.error('Failed to translate image text');
      }
    } finally {
      setIsTranslating(false);
    }
  };

  const handleTranslate = () => {
    if (translateMode === 'image') {
      handleTranslateImage();
    } else {
      handleTranslateText(true);
    }
  };

  if (!isOpen) return null;

  const hasTexts = selectedTexts.length > 0;
  const hasImage = !!selectedImageUrl;
  // FIX #5: Show mode selector if either option is available, allow switch between modes
  const canSwitchModes = hasTexts || hasImage;

  return (
    <div className="fixed left-[60px] top-1/2 -translate-y-1/2 z-50">
      <div 
        className="bg-background rounded-2xl border border-border w-[420px] max-h-[80vh] overflow-hidden animate-slide-in-left"
      >

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Languages className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                Translate
                <span className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary align-middle">BETA</span>
              </h2>
              <p className="text-sm text-muted-foreground">
                {translateMode === 'image' 
                  ? 'Translate text in image' 
                  : `${selectedTexts.length} text${selectedTexts.length !== 1 ? 's' : ''} selected`
                }
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <ScrollArea className="h-[400px]">
          <div className="p-6 space-y-6">
            {/* Mode Selector - Only show if both modes available */}
            {canSwitchModes && (
              <div className="flex gap-2 p-1 bg-muted rounded-lg">
                <button
                  onClick={() => setTranslateMode('text')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md transition-all ${
                    translateMode === 'text' 
                      ? 'bg-background shadow-sm' 
                      : 'hover:bg-background/50'
                  }`}
                >
                  <Type className={`w-4 h-4 ${translateMode === 'text' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-sm ${translateMode === 'text' ? 'font-medium' : 'text-muted-foreground'}`}>
                    Text Objects
                  </span>
                </button>
                <button
                  onClick={() => setTranslateMode('image')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md transition-all ${
                    translateMode === 'image' 
                      ? 'bg-background shadow-sm' 
                      : 'hover:bg-background/50'
                  }`}
                >
                  <Image className={`w-4 h-4 ${translateMode === 'image' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-sm ${translateMode === 'image' ? 'font-medium' : 'text-muted-foreground'}`}>
                    Image Text
                  </span>
                </button>
              </div>
            )}

            {/* Preview */}
            {translateMode === 'text' && selectedTexts.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Preview</p>
                <p className="text-sm truncate">
                  {selectedTexts[0].text.substring(0, 100)}
                  {selectedTexts[0].text.length > 100 ? '...' : ''}
                </p>
                {selectedTexts.length > 1 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    +{selectedTexts.length - 1} more
                  </p>
                )}
              </div>
            )}

            {translateMode === 'image' && selectedImageUrl && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-2">Image to translate</p>
                <div className="rounded-lg overflow-hidden border border-border">
                  <img 
                    src={selectedImageUrl} 
                    alt="Selected for translation" 
                    className="w-full h-32 object-cover"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  AI will detect text in the image, translate it, and regenerate with translated text
                </p>
              </div>
            )}

            {/* Indian Languages */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">INDIAN LANGUAGES</h3>
              <div className="grid grid-cols-3 gap-2">
                {INDIAN_LANGUAGES.map(lang => {
                  const isSelected = selectedLanguage?.code === lang.code;
                  return (
                    <button
                      key={lang.code}
                      onClick={() => setSelectedLanguage(lang)}
                      className={`flex flex-col items-center p-3 rounded-lg border transition-all ${
                        isSelected 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                    >
                      <span className="text-lg mb-1" style={{ fontFamily: lang.fontFamily }}>{lang.nativeName}</span>
                      <span className="text-xs text-muted-foreground">{lang.name}</span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-primary mt-1" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Other Languages Toggle */}
            <button
              onClick={() => setShowOtherLanguages(!showOtherLanguages)}
              className="text-sm text-primary hover:underline"
            >
              {showOtherLanguages ? 'Hide other languages' : 'Show other languages'}
            </button>

            {/* Other Languages */}
            {showOtherLanguages && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">OTHER LANGUAGES</h3>
                <div className="grid grid-cols-3 gap-2">
                  {OTHER_LANGUAGES.map(lang => {
                    const isSelected = selectedLanguage?.code === lang.code;
                    return (
                      <button
                        key={lang.code}
                        onClick={() => setSelectedLanguage(lang)}
                        className={`flex flex-col items-center p-3 rounded-lg border transition-all ${
                          isSelected 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50 hover:bg-muted/50'
                        }`}
                      >
                        <span className="text-base mb-1">{lang.nativeName}</span>
                        <span className="text-xs text-muted-foreground">{lang.name}</span>
                        {isSelected && (
                          <Check className="w-4 h-4 text-primary mt-1" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground">
            {selectedLanguage ? `Translate to ${selectedLanguage.name}` : 'Select a language'}
          </p>
          <div className="flex items-center gap-2">
            {translateMode === 'text' && selectedTexts.length > 1 && (
              <Button
                variant="outline"
                onClick={() => handleTranslateText(false)}
                disabled={!selectedLanguage || isTranslating}
              >
                Translate Selected
              </Button>
            )}
            <Button
              onClick={handleTranslate}
              disabled={!selectedLanguage || isTranslating || (translateMode === 'image' && !selectedImageUrl) || (translateMode === 'text' && selectedTexts.length === 0)}
            >
              {isTranslating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Translating...
                </>
              ) : (
                `Translate ${translateMode === 'image' ? 'Image' : (selectedTexts.length > 1 ? 'All' : '')}`
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
