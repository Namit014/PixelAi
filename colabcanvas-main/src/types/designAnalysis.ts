 export interface ImprovementPin {
   id: string;
   x: number; // Normalized 0-1 position on image
   y: number; // Normalized 0-1 position on image
   title: string;
   suggestion: string;
   severity: 'high' | 'medium' | 'low';
   category: 'contrast' | 'hierarchy' | 'balance' | 'spacing' | 'typography' | 'color';
 }
 
 export interface DesignAnalysisResult {
   attentionScore: number; // 0-100
   designType: string;
   improvements: ImprovementPin[];
   summary: string;
   strengths: string[];
   weaknesses: string[];
 }
 
 export interface DesignAnalysisContext {
   brandId?: string;
   targetAudience?: string;
   geography?: string;
   ageRange?: string;
 }