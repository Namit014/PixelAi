 import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
 import type { ImprovementPin } from '@/types/designAnalysis';
 import {
   HoverCard,
   HoverCardContent,
   HoverCardTrigger,
 } from '@/components/ui/hover-card';
 
 interface ImprovementPinChipProps {
   pin: ImprovementPin;
   isActive: boolean;
   onClick: () => void;
   imageUrl?: string;
 }
 
 const getSeverityStyles = (severity: ImprovementPin['severity']) => {
   switch (severity) {
     case 'high':
       return {
         bg: 'bg-red-50',
         border: 'border-red-300',
         ring: 'ring-red-200',
         icon: AlertTriangle,
         iconColor: 'text-red-500',
       };
     case 'medium':
       return {
         bg: 'bg-yellow-50',
         border: 'border-yellow-300',
         ring: 'ring-yellow-200',
         icon: AlertCircle,
         iconColor: 'text-yellow-600',
       };
     case 'low':
       return {
         bg: 'bg-blue-50',
         border: 'border-blue-300',
         ring: 'ring-blue-200',
         icon: Info,
         iconColor: 'text-blue-500',
       };
   }
 };
 
 const getCategoryLabel = (category: ImprovementPin['category']) => {
   const labels: Record<string, string> = {
     contrast: 'Contrast',
     hierarchy: 'Hierarchy',
     balance: 'Balance',
     spacing: 'Spacing',
     typography: 'Typography',
     color: 'Color',
   };
   return labels[category] || category;
 };
 
 export const ImprovementPinChip = ({
   pin,
   isActive,
   onClick,
   imageUrl,
 }: ImprovementPinChipProps) => {
   const styles = getSeverityStyles(pin.severity);
   const Icon = styles.icon;
 
   const chipContent = (
     <button
       onClick={onClick}
       className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
         isActive
           ? `${styles.bg} ${styles.border} ring-2 ${styles.ring}`
           : `bg-white border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300`
       }`}
     >
       <Icon className={`w-3.5 h-3.5 ${styles.iconColor}`} />
       <span className="font-medium text-zinc-700 max-w-[120px] truncate">
         {pin.title}
       </span>
       <span className="text-[10px] px-1.5 py-0.5 bg-zinc-100 text-zinc-500 rounded">
         {getCategoryLabel(pin.category)}
       </span>
     </button>
   );
 
   if (!imageUrl) {
     return chipContent;
   }
 
   const animationName = `zoomToImprovement-${pin.id}`;
   const keyframes = `
     @keyframes ${animationName} {
       0% { 
         background-size: 100%; 
         background-position: center center; 
       }
       100% { 
         background-size: 250%; 
         background-position: ${pin.x * 100}% ${pin.y * 100}%; 
       }
     }
   `;
 
   return (
     <HoverCard openDelay={200} closeDelay={100}>
       <HoverCardTrigger asChild>{chipContent}</HoverCardTrigger>
       <HoverCardContent
         side="top"
         sideOffset={8}
         className="w-48 p-0 overflow-hidden rounded-lg border-0"
       >
         <style>{keyframes}</style>
         <div
           className="w-full h-32 relative"
           style={{
             backgroundImage: `url(${imageUrl})`,
             backgroundRepeat: 'no-repeat',
             animation: `${animationName} 600ms cubic-bezier(0.4, 0, 0.2, 1) forwards`,
           }}
         >
           {/* Crosshair indicator */}
           <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
             <div className={`w-5 h-5 border-2 border-white rounded-full shadow-md ${styles.bg} opacity-80`} />
           </div>
         </div>
         <div className="p-3 bg-background">
           <p className="text-xs text-muted-foreground">{pin.suggestion}</p>
         </div>
       </HoverCardContent>
     </HoverCard>
   );
 };
 
 export default ImprovementPinChip;