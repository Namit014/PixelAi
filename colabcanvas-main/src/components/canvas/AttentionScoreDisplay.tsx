 import { useEffect, useState } from 'react';
 import { motion } from 'framer-motion';
 
 interface AttentionScoreDisplayProps {
   score: number;
   size?: 'sm' | 'md' | 'lg';
 }
 
 const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
 
 const getScoreColor = (score: number): string => {
   if (score >= 70) return 'stroke-green-500';
   if (score >= 40) return 'stroke-yellow-500';
   return 'stroke-red-500';
 };
 
 const getScoreLabel = (score: number): string => {
   if (score >= 80) return 'Excellent';
   if (score >= 60) return 'Good';
   if (score >= 40) return 'Average';
   return 'Needs Work';
 };
 
 const AttentionScoreDisplay = ({ score, size = 'md' }: AttentionScoreDisplayProps) => {
   const [displayScore, setDisplayScore] = useState(0);
   const [hasAnimated, setHasAnimated] = useState(false);
 
   const dimensions = {
     sm: { width: 80, height: 80, radius: 32, strokeWidth: 6, fontSize: 'text-xl' },
     md: { width: 120, height: 120, radius: 48, strokeWidth: 8, fontSize: 'text-3xl' },
     lg: { width: 160, height: 160, radius: 64, strokeWidth: 10, fontSize: 'text-4xl' },
   };
 
   const { width, height, radius, strokeWidth, fontSize } = dimensions[size];
   const circumference = 2 * Math.PI * radius;
   const center = width / 2;
 
   useEffect(() => {
     if (hasAnimated) return;
     
     const duration = 1500;
     let startTime: number;
 
     const animate = (timestamp: number) => {
       if (!startTime) startTime = timestamp;
       const progress = Math.min((timestamp - startTime) / duration, 1);
       setDisplayScore(Math.floor(score * easeOutCubic(progress)));
       if (progress < 1) {
         requestAnimationFrame(animate);
       } else {
         setHasAnimated(true);
       }
     };
 
     requestAnimationFrame(animate);
   }, [score, hasAnimated]);
 
   return (
     <div className="flex flex-col items-center gap-2">
       <div className="relative" style={{ width, height }}>
         <svg
           className="-rotate-90"
           width={width}
           height={height}
           viewBox={`0 0 ${width} ${height}`}
         >
           {/* Background circle */}
           <circle
             cx={center}
             cy={center}
             r={radius}
             strokeWidth={strokeWidth}
             className="stroke-muted"
             fill="none"
           />
           {/* Animated progress circle */}
           <motion.circle
             cx={center}
             cy={center}
             r={radius}
             strokeWidth={strokeWidth}
             className={getScoreColor(score)}
             fill="none"
             strokeLinecap="round"
             initial={{ strokeDashoffset: circumference }}
             animate={{ strokeDashoffset: circumference - (circumference * score / 100) }}
             transition={{ duration: 1.5, ease: 'easeOut' }}
             strokeDasharray={circumference}
           />
         </svg>
         {/* Center score display */}
         <div className="absolute inset-0 flex flex-col items-center justify-center">
           <motion.span
             className={`font-bold ${fontSize}`}
             initial={{ scale: 0.8, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             transition={{ delay: 0.3, duration: 0.5 }}
           >
             {displayScore}
           </motion.span>
         </div>
       </div>
       <motion.div
         className="text-center"
         initial={{ opacity: 0, y: 10 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ delay: 1, duration: 0.5 }}
       >
         <span className="text-sm font-medium text-muted-foreground">
           {getScoreLabel(score)}
         </span>
       </motion.div>
     </div>
   );
 };
 
 export default AttentionScoreDisplay;