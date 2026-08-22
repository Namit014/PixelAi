import { useEffect, useRef } from 'react';

interface Dot {
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
  phase: number;
  baseOpacity: number;
  currentOpacity: number;
}

interface Hotspot {
  x: number;
  y: number;
  angle: number;
  speed: number;
  radius: number;
  centerX: number;
  centerY: number;
}

export const InteractiveDotBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<Dot[]>([]);
  const hotspotsRef = useRef<Hotspot[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const animationFrameRef = useRef<number>();
  const timeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match container
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      ctx.scale(dpr, dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      // Regenerate dots on resize
      generateDots();
    };

    // Generate dot grid
    const generateDots = () => {
      const dots: Dot[] = [];
      const spacing = 30;
      const rect = canvas.getBoundingClientRect();
      
      for (let x = spacing; x < rect.width; x += spacing) {
        for (let y = spacing; y < rect.height; y += spacing) {
          dots.push({
            x,
            y,
            offsetX: 0,
            offsetY: 0,
            phase: Math.random() * Math.PI * 2,
            baseOpacity: 0.15,
            currentOpacity: 0.15,
          });
        }
      }
      
      dotsRef.current = dots;
    };

    // Generate floating hotspots
    const generateHotspots = () => {
      const hotspots: Hotspot[] = [];
      const rect = canvas.getBoundingClientRect();
      
      for (let i = 0; i < 4; i++) {
        hotspots.push({
          x: Math.random() * rect.width,
          y: Math.random() * rect.height,
          angle: Math.random() * Math.PI * 2,
          speed: 0.0005 + Math.random() * 0.0005,
          radius: 100 + Math.random() * 100,
          centerX: rect.width / 2,
          centerY: rect.height / 2,
        });
      }
      
      hotspotsRef.current = hotspots;
    };

    // Calculate distance between two points
    const distance = (x1: number, y1: number, x2: number, y2: number) => {
      return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    };

    // Render dots
    const render = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      
      timeRef.current += 1;

      const interactionRadius = 150;
      const hotspotRadius = 120;
      const connectionDistance = 60;
      const edgeFadeDistance = 200;
      const { x: mouseX, y: mouseY } = mouseRef.current;

      // Update hotspot positions
      hotspotsRef.current.forEach((hotspot) => {
        hotspot.angle += hotspot.speed;
        hotspot.x = hotspot.centerX + Math.cos(hotspot.angle) * hotspot.radius;
        hotspot.y = hotspot.centerY + Math.sin(hotspot.angle) * hotspot.radius;
      });

      // Update and draw dots
      dotsRef.current.forEach((dot) => {
        // Calculate edge fade
        const distToLeft = dot.x;
        const distToRight = rect.width - dot.x;
        const distToTop = dot.y;
        const distToBottom = rect.height - dot.y;
        const minEdgeDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);
        const edgeFade = Math.min(minEdgeDist / edgeFadeDistance, 1);

        // Cursor influence
        const cursorDist = distance(dot.x, dot.y, mouseX, mouseY);
        let targetOpacity = dot.baseOpacity;
        
        if (cursorDist < interactionRadius) {
          const factor = 1 - (cursorDist / interactionRadius);
          targetOpacity = Math.max(targetOpacity, dot.baseOpacity + (0.8 - dot.baseOpacity) * Math.pow(factor, 2));
        }

        // Hotspot influence (additive)
        hotspotsRef.current.forEach((hotspot) => {
          const hotspotDist = distance(dot.x, dot.y, hotspot.x, hotspot.y);
          if (hotspotDist < hotspotRadius) {
            const factor = 1 - (hotspotDist / hotspotRadius);
            targetOpacity = Math.max(targetOpacity, dot.baseOpacity + (0.6 - dot.baseOpacity) * Math.pow(factor, 2));
          }
        });

        // Apply edge fade
        targetOpacity *= edgeFade;

        // Smooth transition
        dot.currentOpacity += (targetOpacity - dot.currentOpacity) * 0.1;

        // Subtle floating animation
        dot.offsetX = Math.sin(timeRef.current * 0.001 + dot.phase) * 2;
        dot.offsetY = Math.cos(timeRef.current * 0.001 + dot.phase * 1.3) * 2;

        // Draw dot
        const drawX = dot.x + dot.offsetX;
        const drawY = dot.y + dot.offsetY;
        
        ctx.beginPath();
        ctx.arc(drawX, drawY, 0.8, 0, Math.PI * 2);
        
        // Color based on opacity (zinc-500 to zinc-100)
        const normalizedOpacity = Math.max(0, Math.min(1, (dot.currentOpacity - 0.15) / 0.65));
        const r = Math.floor(113 + (244 - 113) * normalizedOpacity);
        const g = Math.floor(113 + (244 - 113) * normalizedOpacity);
        const b = Math.floor(122 + (245 - 122) * normalizedOpacity);
        
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${dot.currentOpacity})`;
        ctx.fill();
      });

      // Draw connecting lines between nearby bright dots
      ctx.strokeStyle = 'rgba(244, 244, 245, 0.1)';
      ctx.lineWidth = 0.5;
      
      for (let i = 0; i < dotsRef.current.length; i++) {
        const dot1 = dotsRef.current[i];
        if (dot1.currentOpacity < 0.4) continue;

        for (let j = i + 1; j < dotsRef.current.length; j++) {
          const dot2 = dotsRef.current[j];
          if (dot2.currentOpacity < 0.4) continue;

          const dist = distance(
            dot1.x + dot1.offsetX,
            dot1.y + dot1.offsetY,
            dot2.x + dot2.offsetX,
            dot2.y + dot2.offsetY
          );

          if (dist < connectionDistance) {
            const lineOpacity = (1 - dist / connectionDistance) * ((dot1.currentOpacity + dot2.currentOpacity) / 2) * 0.3;
            ctx.strokeStyle = `rgba(244, 244, 245, ${lineOpacity})`;
            
            ctx.beginPath();
            ctx.moveTo(dot1.x + dot1.offsetX, dot1.y + dot1.offsetY);
            ctx.lineTo(dot2.x + dot2.offsetX, dot2.y + dot2.offsetY);
            ctx.stroke();
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    // Mouse move handler (throttled)
    let lastMouseUpdate = 0;
    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastMouseUpdate < 16) return; // 60fps cap
      
      lastMouseUpdate = now;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    // Mouse leave handler
    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    // Initialize
    resizeCanvas();
    generateHotspots();
    window.addEventListener('resize', resizeCanvas);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    
    // Start animation
    render();

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ willChange: 'transform' }}
    />
  );
};
