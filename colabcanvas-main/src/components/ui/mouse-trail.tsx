import React, { useEffect, useRef } from 'react';
import { ImageTrailController } from '@/lib/imageTrailController';

const flairImages = [
  "https://assets.codepen.io/16327/Revised+Flair.png",
  "https://assets.codepen.io/16327/Revised+Flair-1.png",
  "https://assets.codepen.io/16327/Revised+Flair-2.png",
  "https://assets.codepen.io/16327/Revised+Flair-3.png",
  "https://assets.codepen.io/16327/Revised+Flair-4.png",
  "https://assets.codepen.io/16327/Revised+Flair-5.png",
  "https://assets.codepen.io/16327/Revised+Flair-6.png",
  "https://assets.codepen.io/16327/Revised+Flair-7.png",
  "https://assets.codepen.io/16327/Revised+Flair-8.png",
  "https://assets.codepen.io/16327/Revised+Flair.png",
  "https://assets.codepen.io/16327/Revised+Flair-1.png",
  "https://assets.codepen.io/16327/Revised+Flair-2.png",
  "https://assets.codepen.io/16327/Revised+Flair-3.png",
  "https://assets.codepen.io/16327/Revised+Flair-4.png",
  "https://assets.codepen.io/16327/Revised+Flair-5.png",
  "https://assets.codepen.io/16327/Revised+Flair-6.png",
  "https://assets.codepen.io/16327/Revised+Flair-7.png",
  "https://assets.codepen.io/16327/Revised+Flair-8.png",
];

export function MouseTrailComponent() {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<ImageTrailController | null>(null);

  useEffect(() => {
    // Respect reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || !contentRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const flairElements = Array.from(
      contentRef.current.querySelectorAll('.flair')
    ) as HTMLElement[];

    const controller = new ImageTrailController(flairElements, 100);
    controllerRef.current = controller;
    controller.init();

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      
      // Check if mouse is over the chatbox (exclude it from trail effect)
      const chatbox = document.querySelector('[data-chatbox]');
      if (chatbox) {
        const chatRect = chatbox.getBoundingClientRect();
        if (
          e.clientX >= chatRect.left &&
          e.clientX <= chatRect.right &&
          e.clientY >= chatRect.top &&
          e.clientY <= chatRect.bottom
        ) {
          return; // Don't trigger trail over chatbox
        }
      }
      
      // Only trigger if mouse is within container bounds
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        // Pass position relative to container
        controller.setMousePos(e.clientX - rect.left, e.clientY - rect.top);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      controller.destroy();
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 pointer-events-none z-10 overflow-hidden"
    >
      <div ref={contentRef} className="w-full h-full relative">
        {flairImages.map((src, index) => (
          <img
            key={index}
            src={src}
            alt=""
            className="flair fixed opacity-0 w-[50px] pointer-events-none"
            style={{ willChange: 'transform, opacity' }}
          />
        ))}
      </div>
    </div>
  );
}
