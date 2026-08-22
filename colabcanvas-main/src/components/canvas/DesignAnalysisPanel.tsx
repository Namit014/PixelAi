 import { useState, useEffect } from 'react';
 import { X, ScanLine, Loader2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from '@/components/ui/select';
 import {
   Collapsible,
   CollapsibleContent,
   CollapsibleTrigger,
 } from '@/components/ui/collapsible';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/contexts/AuthContext';
 import { useBrandsData } from '@/hooks/useDashboardData';
 import { toast } from 'sonner';
 import AttentionScoreDisplay from './AttentionScoreDisplay';
 import ImprovementPinChip from './ImprovementPinChip';
 import type { DesignAnalysisResult, DesignAnalysisContext } from '@/types/designAnalysis';
 
 interface DesignAnalysisPanelProps {
   imageUrl: string;
   selectedObject: any;
   canvas: any;
   onClose: () => void;
 }
 
 type AnalysisPhase = 'detecting' | 'context' | 'scanning' | 'results';
 
 const AGE_RANGES = [
   { value: '13-17', label: '13-17 (Teen)' },
   { value: '18-24', label: '18-24 (Young Adult)' },
   { value: '25-34', label: '25-34 (Adult)' },
   { value: '35-44', label: '35-44 (Middle Age)' },
   { value: '45-54', label: '45-54 (Mature)' },
   { value: '55+', label: '55+ (Senior)' },
   { value: 'all', label: 'All Ages' },
 ];
 
 const DESIGN_TYPES = [
   { value: 'logo', label: 'Logo' },
   { value: 'poster', label: 'Poster' },
   { value: 'social_media', label: 'Social Media' },
   { value: 'banner', label: 'Banner' },
   { value: 'flyer', label: 'Flyer' },
   { value: 'brochure', label: 'Brochure' },
   { value: 'business_card', label: 'Business Card' },
   { value: 'packaging', label: 'Packaging' },
   { value: 'website', label: 'Website' },
   { value: 'app_ui', label: 'App UI' },
   { value: 'illustration', label: 'Illustration' },
   { value: 'campaign', label: 'Campaign' },
   { value: 'advertisement', label: 'Advertisement' },
   { value: 'infographic', label: 'Infographic' },
   { value: 'general', label: 'General' },
 ];
 
 const DesignAnalysisPanel = ({
   imageUrl,
   selectedObject,
   canvas,
   onClose,
 }: DesignAnalysisPanelProps) => {
   const { user } = useAuth();
   const { data: brands = [] } = useBrandsData(user?.id);
 
    // Start on 'context' immediately — don't block on detect-type
    const [phase, setPhase] = useState<AnalysisPhase>('context');
    const [detectedType, setDetectedType] = useState<string>('general');
    const [context, setContext] = useState<DesignAnalysisContext>({
      brandId: '',
      targetAudience: '',
      geography: '',
      ageRange: '',
    });
    const [results, setResults] = useState<DesignAnalysisResult | null>(null);
    const [activePin, setActivePin] = useState<string | null>(null);
    const [strengthsOpen, setStrengthsOpen] = useState(false);
    const [weaknessesOpen, setWeaknessesOpen] = useState(false);
  
    // Detect design type in background (non-blocking)
    useEffect(() => {
      const detectType = async () => {
        try {
          const { data, error } = await supabase.functions.invoke('analyze-design-canvas', {
            body: { imageUrl, detectTypeOnly: true },
          });
  
          if (error) throw error;
          if (data?.designType) {
            setDetectedType(data.designType);
          }
        } catch (err) {
          console.error('Design type detection failed:', err);
        }
     };
 
     detectType();
   }, [imageUrl]);
 
   // Handle Escape key
   useEffect(() => {
     const handleKeyDown = (e: KeyboardEvent) => {
       if (e.key === 'Escape') onClose();
     };
     window.addEventListener('keydown', handleKeyDown);
     return () => window.removeEventListener('keydown', handleKeyDown);
   }, [onClose]);
 
   const runDeepScan = async () => {
     if (!user) {
       toast.error('Please sign in to use this feature');
       return;
     }
 
     setPhase('scanning');
 
     try {
       const { data, error } = await supabase.functions.invoke('analyze-design-canvas', {
         body: {
           imageUrl,
           designType: detectedType,
           brandId: context.brandId || undefined,
           targetAudience: context.targetAudience || undefined,
           geography: context.geography || undefined,
           ageRange: context.ageRange || undefined,
           userId: user.id,
         },
       });
 
       if (error) throw error;
 
        console.log('[DesignAnalysis] Results received:', data);
 
       setResults({
         attentionScore: data.attentionScore || 0,
         designType: data.designType || detectedType,
          improvements: Array.isArray(data.improvements) ? data.improvements : [],
         summary: data.summary || '',
          strengths: Array.isArray(data.strengths) ? data.strengths : [],
          weaknesses: Array.isArray(data.weaknesses) ? data.weaknesses : [],
       });
       setPhase('results');
     } catch (err) {
       console.error('Deep scan failed:', err);
       toast.error('Analysis failed. Please try again.');
       setPhase('context');
     }
   };
 
   const getPosition = () => {
     if (!canvas || !selectedObject) return { x: 100, y: 100 };
     const bounds = selectedObject.getBoundingRect();
     const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
     const zoom = vpt[0];
     return {
       x: Math.min((bounds.left + bounds.width) * zoom + vpt[4] + 20, window.innerWidth - 340),
       y: Math.max(bounds.top * zoom + vpt[5], 80),
     };
   };
 
   const position = getPosition();
 
   const formatDesignType = (type: string) =>
     type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
 
   return (
     <div
       className="fixed z-[55] w-80 bg-background/95 backdrop-blur-xl border rounded-xl overflow-hidden animate-in fade-in slide-in-from-left-4 duration-200"
       style={{ left: `${position.x}px`, top: `${position.y}px` }}
       onContextMenu={(e) => e.stopPropagation()}
     >
       {/* Header */}
       <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
         <div className="flex items-center gap-2">
           <ScanLine className="w-4 h-4 text-primary" />
           <span className="text-sm font-semibold">Design Analysis</span>
            <span className="text-[10px] font-medium px-1.5 py-0.5 bg-amber-500/10 text-amber-600 rounded-full">
              Beta
           </span>
         </div>
         <button
           onClick={onClose}
           className="p-1 hover:bg-muted rounded-md transition-colors"
         >
           <X className="w-4 h-4 text-muted-foreground" />
         </button>
       </div>
 
       {/* Content */}
       <div className="p-4 max-h-[70vh] overflow-y-auto">
         {/* Detecting Phase */}
         {phase === 'detecting' && (
           <div className="flex flex-col items-center justify-center py-8 gap-3">
             <Loader2 className="w-8 h-8 animate-spin text-primary" />
             <p className="text-sm text-muted-foreground">Detecting design type...</p>
           </div>
         )}
 
         {/* Context Phase */}
         {phase === 'context' && (
           <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Design Type</Label>
                <Select
                  value={detectedType}
                  onValueChange={(v) => setDetectedType(v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select design type" />
                  </SelectTrigger>
                <SelectContent className="z-[100]">
                    {DESIGN_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
 
             <div className="space-y-3">
               <div className="space-y-1.5">
                 <Label className="text-xs">Brand (optional)</Label>
                 <Select
                   value={context.brandId}
                   onValueChange={(v) => setContext({ ...context, brandId: v })}
                 >
                   <SelectTrigger className="h-9">
                     <SelectValue placeholder="Select brand" />
                   </SelectTrigger>
                  <SelectContent className="z-[100]">
                     {brands.map((brand: any) => (
                       <SelectItem key={brand.id} value={brand.id}>
                         <div className="flex items-center gap-2">
                           {brand.logo_primary_url && (
                             <img
                               src={brand.logo_primary_url}
                               alt=""
                               className="w-4 h-4 rounded object-cover"
                             />
                           )}
                           {brand.name}
                         </div>
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
 
               <div className="space-y-1.5">
                 <Label className="text-xs">Target Audience</Label>
                 <Input
                   placeholder="e.g., Tech-savvy millennials"
                   value={context.targetAudience}
                   onChange={(e) =>
                     setContext({ ...context, targetAudience: e.target.value })
                   }
                   className="h-9"
                 />
               </div>
 
               <div className="space-y-1.5">
                 <Label className="text-xs">Geography / Location</Label>
                 <Input
                   placeholder="e.g., North America, Urban"
                   value={context.geography}
                   onChange={(e) =>
                     setContext({ ...context, geography: e.target.value })
                   }
                   className="h-9"
                 />
               </div>
 
               <div className="space-y-1.5">
                 <Label className="text-xs">Age Range</Label>
                 <Select
                   value={context.ageRange}
                   onValueChange={(v) => setContext({ ...context, ageRange: v })}
                 >
                   <SelectTrigger className="h-9">
                     <SelectValue placeholder="Select age range" />
                   </SelectTrigger>
                   <SelectContent className="z-[100]">
                     {AGE_RANGES.map((range) => (
                       <SelectItem key={range.value} value={range.value}>
                         {range.label}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
             </div>
 
             <p className="text-[10px] text-muted-foreground/70">Uses 12 credits</p>
           </div>
         )}
 
         {/* Scanning Phase */}
         {phase === 'scanning' && (
           <div className="flex flex-col items-center justify-center py-8 gap-4">
             <div className="relative">
               <Loader2 className="w-12 h-12 animate-spin text-primary" />
               <Sparkles className="w-5 h-5 text-primary absolute -top-1 -right-1 animate-pulse" />
             </div>
             <div className="text-center space-y-1">
               <p className="text-sm font-medium">Running Deep Scan...</p>
               <p className="text-xs text-muted-foreground">
                 Analyzing visual hierarchy & attention flow
               </p>
             </div>
           </div>
         )}
 
         {/* Results Phase */}
         {phase === 'results' && results && (
           <div className="space-y-5">
             {/* Attention Score */}
             <div className="flex justify-center py-2">
               <AttentionScoreDisplay score={results.attentionScore} size="md" />
             </div>
 
             {/* Summary */}
             {results.summary && (
               <p className="text-xs text-muted-foreground leading-relaxed">
                 {results.summary}
               </p>
             )}
 
             {/* Improvements */}
             {results.improvements.length > 0 && (
               <div className="space-y-2">
                 <p className="text-xs font-medium">Improvements</p>
                 <div className="flex flex-wrap gap-1.5">
                   {results.improvements.map((pin) => (
                     <ImprovementPinChip
                       key={pin.id}
                       pin={pin}
                       isActive={activePin === pin.id}
                       onClick={() =>
                         setActivePin(activePin === pin.id ? null : pin.id)
                       }
                       imageUrl={imageUrl}
                     />
                   ))}
                 </div>
               </div>
             )}
 
             {/* Strengths */}
             {results.strengths.length > 0 && (
               <Collapsible open={strengthsOpen} onOpenChange={setStrengthsOpen}>
                 <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-medium py-1.5">
                   <span className="flex items-center gap-1.5">
                     <span className="w-2 h-2 rounded-full bg-green-500" />
                     Strengths ({results.strengths.length})
                   </span>
                   {strengthsOpen ? (
                     <ChevronUp className="w-3.5 h-3.5" />
                   ) : (
                     <ChevronDown className="w-3.5 h-3.5" />
                   )}
                 </CollapsibleTrigger>
                 <CollapsibleContent className="pt-1.5">
                   <ul className="space-y-1">
                     {results.strengths.map((s, i) => (
                       <li
                         key={i}
                         className="text-xs text-muted-foreground pl-3 border-l-2 border-green-300"
                       >
                         {s}
                       </li>
                     ))}
                   </ul>
                 </CollapsibleContent>
               </Collapsible>
             )}
 
             {/* Weaknesses */}
             {results.weaknesses.length > 0 && (
               <Collapsible open={weaknessesOpen} onOpenChange={setWeaknessesOpen}>
                 <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-medium py-1.5">
                   <span className="flex items-center gap-1.5">
                     <span className="w-2 h-2 rounded-full bg-red-500" />
                     Weaknesses ({results.weaknesses.length})
                   </span>
                   {weaknessesOpen ? (
                     <ChevronUp className="w-3.5 h-3.5" />
                   ) : (
                     <ChevronDown className="w-3.5 h-3.5" />
                   )}
                 </CollapsibleTrigger>
                 <CollapsibleContent className="pt-1.5">
                   <ul className="space-y-1">
                     {results.weaknesses.map((w, i) => (
                       <li
                         key={i}
                         className="text-xs text-muted-foreground pl-3 border-l-2 border-red-300"
                       >
                         {w}
                       </li>
                     ))}
                   </ul>
                 </CollapsibleContent>
               </Collapsible>
             )}
           </div>
         )}
       </div>
 
       {/* Footer */}
       <div className="flex items-center justify-between gap-2 px-4 py-3 bg-muted/30">
         <Button variant="ghost" size="sm" onClick={onClose}>
           {phase === 'results' ? 'Close' : 'Cancel'}
         </Button>
         {phase === 'context' && (
           <Button size="sm" onClick={runDeepScan} className="gap-1.5">
             <ScanLine className="w-3.5 h-3.5" />
             Run Deep Scan
           </Button>
         )}
         {phase === 'results' && (
           <Button
             size="sm"
             variant="outline"
             onClick={() => setPhase('context')}
             className="gap-1.5"
           >
             Scan Again
           </Button>
         )}
       </div>
     </div>
   );
 };
 
 export default DesignAnalysisPanel;