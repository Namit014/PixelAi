import gsap from 'gsap';
import type { AnimationConfig, PathAnimationConfig } from '@/stores/svgAnimationStore';

const EASING_MAP: Record<string, string> = {
  linear: 'none',
  easeIn: 'power2.in',
  easeOut: 'power2.out',
  easeInOut: 'power2.inOut',
  bounce: 'bounce.out',
  elastic: 'elastic.out(1, 0.3)',
  back: 'back.out(1.7)',
};

/**
 * Build a GSAP master timeline from an AnimationConfig.
 * Each path gets its own child timeline with tweens for enabled properties.
 * 
 * @param svgElement - The root SVG DOM element (or container with child <path> elements)
 * @param config - The animation configuration from the store
 * @returns A paused GSAP timeline
 */
export function buildTimeline(
  svgElement: SVGElement | HTMLElement,
  config: AnimationConfig,
): gsap.core.Timeline {
  const master = gsap.timeline({ paused: true, repeat: config.repeat, delay: config.delay });
  const ease = EASING_MAP[config.easing] || 'power2.out';

  // Get all animatable child paths/shapes
  const paths = svgElement.querySelectorAll('path, circle, rect, line, polyline, polygon, ellipse');

  config.paths.forEach((pathConfig: PathAnimationConfig) => {
    const el = paths[pathConfig.pathIndex] as SVGElement | undefined;
    if (!el) return;

    const childTl = gsap.timeline();

    // Path length (stroke-dasharray draw-on effect)
    if (pathConfig.pathLength.enabled && el instanceof SVGGeometryElement) {
      try {
        const totalLength = el.getTotalLength();
        // Set initial dash state
        gsap.set(el, {
          strokeDasharray: totalLength,
          strokeDashoffset: totalLength * (1 - pathConfig.pathLength.initial),
        });

        const keyframes = pathConfig.pathLength.keyframes.map((kf) => ({
          strokeDashoffset: totalLength * (1 - kf.value),
          duration: kf.time * config.duration,
          ease,
        }));

        if (keyframes.length) {
          childTl.to(el, { keyframes, duration: config.duration }, 0);
        }
      } catch {
        // getTotalLength may fail on some elements
      }
    }

    // Opacity
    if (pathConfig.opacity.enabled) {
      gsap.set(el, { opacity: pathConfig.opacity.initial });
      const keyframes = pathConfig.opacity.keyframes.map((kf) => ({
        opacity: kf.value,
        duration: kf.time * config.duration,
        ease,
      }));
      if (keyframes.length) {
        childTl.to(el, { keyframes, duration: config.duration }, 0);
      }
    }

    // Generic transform properties
    const transformProps: { prop: string; cssKey: string; unit?: string }[] = [
      { prop: 'scale', cssKey: 'scale' },
      { prop: 'scaleX', cssKey: 'scaleX' },
      { prop: 'scaleY', cssKey: 'scaleY' },
      { prop: 'rotate', cssKey: 'rotation', unit: '' },
      { prop: 'x', cssKey: 'x' },
      { prop: 'y', cssKey: 'y' },
    ];

    transformProps.forEach(({ prop, cssKey }) => {
      const p = pathConfig[prop as keyof PathAnimationConfig] as any;
      if (!p?.enabled) return;

      gsap.set(el, { [cssKey]: p.initial });
      const keyframes = p.keyframes.map((kf: any) => ({
        [cssKey]: kf.value,
        duration: kf.time * config.duration,
        ease,
      }));
      if (keyframes.length) {
        childTl.to(el, { keyframes, duration: config.duration }, 0);
      }
    });

    // Stroke width
    if (pathConfig.strokeWidth.enabled) {
      gsap.set(el, { strokeWidth: pathConfig.strokeWidth.initial });
      const keyframes = pathConfig.strokeWidth.keyframes.map((kf) => ({
        strokeWidth: kf.value,
        duration: kf.time * config.duration,
        ease,
      }));
      if (keyframes.length) {
        childTl.to(el, { keyframes, duration: config.duration }, 0);
      }
    }

    master.add(childTl, 0);
  });

  return master;
}
