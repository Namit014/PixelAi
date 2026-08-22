/**
 * ImageTrailController - Handles mouse trail effect with image pool
 * Uses GSAP ticker for smooth 60fps tracking + elastic/back easing
 */
import gsap from 'gsap';

export class ImageTrailController {
  private elements: HTMLElement[];
  private gap: number;
  private index = 0;
  private wrapper: (index: number) => number;
  private mousePos = { x: 0, y: 0 };
  private lastMousePos = { x: 0, y: 0 };
  private cachedMousePos = { x: 0, y: 0 };
  private isInitialized = false;
  private tickerCallback: (() => void) | null = null;

  constructor(elements: HTMLElement[], gap: number = 100) {
    this.elements = elements;
    this.gap = gap;
    this.wrapper = gsap.utils.wrap(0, elements.length);
    gsap.defaults({ duration: 1 });
  }

  init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Reset all elements
    this.elements.forEach((el) => {
      gsap.set(el, { opacity: 0 });
    });

    // Add ticker for smooth 60fps tracking
    this.tickerCallback = () => this.imageTrail();
    gsap.ticker.add(this.tickerCallback);
  }

  setMousePos(x: number, y: number) {
    this.mousePos = { x, y };
  }

  private imageTrail() {
    const travelDistance = Math.hypot(
      this.lastMousePos.x - this.mousePos.x,
      this.lastMousePos.y - this.mousePos.y
    );

    // Smooth interpolation of cached position
    this.cachedMousePos.x = gsap.utils.interpolate(
      this.cachedMousePos.x || this.mousePos.x,
      this.mousePos.x,
      0.1
    );
    this.cachedMousePos.y = gsap.utils.interpolate(
      this.cachedMousePos.y || this.mousePos.y,
      this.mousePos.y,
      0.1
    );

    if (travelDistance > this.gap) {
      this.animateImage();
      this.lastMousePos = { ...this.mousePos };
    }
  }

  private playAnimation(shape: HTMLElement) {
    const tl = gsap.timeline();
    
    tl.from(shape, {
      opacity: 0,
      scale: 0,
      ease: "elastic.out(1,0.3)"
    })
    .to(shape, {
      rotation: "random([-360, 360])"
    }, "<")
    .to(shape, {
      y: "120vh",
      ease: "back.in(.4)",
      duration: 1
    }, 0);
  }

  private animateImage() {
    const wrappedIndex = this.wrapper(this.index);
    const img = this.elements[wrappedIndex];
    
    gsap.killTweensOf(img);
    gsap.set(img, { clearProps: "all" });
    gsap.set(img, {
      opacity: 1,
      left: this.mousePos.x,
      top: this.mousePos.y,
      xPercent: -50,
      yPercent: -50
    });

    this.playAnimation(img);
    this.index++;
  }

  destroy() {
    if (this.tickerCallback) {
      gsap.ticker.remove(this.tickerCallback);
    }
    this.elements.forEach((el) => {
      gsap.killTweensOf(el);
      gsap.set(el, { opacity: 0 });
    });
    this.isInitialized = false;
    this.index = 0;
  }
}
