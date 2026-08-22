import type { SlideLayout, ContentBlock } from '@/types/presentation';

// All content-accepting block types for body regions
const allBodyTypes: ContentBlock['type'][] = [
  'bullets', 'subtitle', 'icon-list', 'numbered-list', 'card-grid',
  'timeline', 'progress', 'table', 'todo-list', 'divider', 'code',
  'stats', 'steps', 'cycle-diagram', 'venn-diagram', 'process-flow',
  'gallery', 'button-block', 'quote-box', 'icon-grid', 'callout',
  'quote', 'comparison', 'metric', 'chart', 'image', 'embed',
];

export const slideLayouts: SlideLayout[] = [
  {
    id: 'title-center',
    name: 'Title Slide',
    semantic: 'title',
    regions: [
      { id: 'title', label: 'Title', x: 10, y: 25, width: 80, height: 25, accepts: ['title'], minFontSize: 48, maxFontSize: 80 },
      { id: 'subtitle', label: 'Subtitle', x: 15, y: 55, width: 70, height: 15, accepts: ['subtitle'], minFontSize: 20, maxFontSize: 32 },
    ],
    defaultBackground: { type: 'gradient', value: 'radial-gradient(ellipse at 30% 50%, rgba(99,102,241,0.15) 0%, transparent 70%)' },
    defaultDecorations: [
      { type: 'circle', x: 85, y: 15, size: 300, color: 'currentAccent', opacity: 0.08 },
      { type: 'circle', x: 5, y: 80, size: 200, color: 'currentAccent', opacity: 0.05 },
    ],
  },
  {
    id: 'section-header',
    name: 'Section Header',
    semantic: 'section',
    regions: [
      { id: 'title', label: 'Section Title', x: 8, y: 30, width: 84, height: 20, accepts: ['title'], minFontSize: 40, maxFontSize: 64 },
      { id: 'subtitle', label: 'Description', x: 8, y: 55, width: 60, height: 15, accepts: ['subtitle'], minFontSize: 18, maxFontSize: 28 },
    ],
    defaultBackground: { type: 'gradient', value: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, transparent 50%)' },
    defaultDecorations: [{ type: 'line', x: 8, y: 52, size: 120, color: 'currentAccent', opacity: 0.6 }],
  },
  {
    id: 'content-left',
    name: 'Content',
    semantic: 'content',
    regions: [
      { id: 'title', label: 'Heading', x: 6, y: 6, width: 88, height: 12, accepts: ['title'], minFontSize: 28, maxFontSize: 44 },
      { id: 'body', label: 'Body', x: 6, y: 22, width: 88, height: 70, accepts: allBodyTypes, minFontSize: 16, maxFontSize: 24 },
    ],
  },
  {
    id: 'two-column',
    name: 'Two Column',
    semantic: 'comparison',
    regions: [
      { id: 'title', label: 'Heading', x: 6, y: 6, width: 88, height: 12, accepts: ['title'], minFontSize: 28, maxFontSize: 44 },
      { id: 'left', label: 'Left Column', x: 6, y: 22, width: 42, height: 70, accepts: allBodyTypes, minFontSize: 14, maxFontSize: 22 },
      { id: 'right', label: 'Right Column', x: 52, y: 22, width: 42, height: 70, accepts: allBodyTypes, minFontSize: 14, maxFontSize: 22 },
    ],
  },
  {
    id: 'three-column',
    name: 'Three Column',
    semantic: 'content',
    regions: [
      { id: 'title', label: 'Heading', x: 6, y: 6, width: 88, height: 12, accepts: ['title'], minFontSize: 28, maxFontSize: 44 },
      { id: 'col1', label: 'Column 1', x: 4, y: 24, width: 29, height: 68, accepts: allBodyTypes, minFontSize: 14, maxFontSize: 20 },
      { id: 'col2', label: 'Column 2', x: 36, y: 24, width: 29, height: 68, accepts: allBodyTypes, minFontSize: 14, maxFontSize: 20 },
      { id: 'col3', label: 'Column 3', x: 68, y: 24, width: 29, height: 68, accepts: allBodyTypes, minFontSize: 14, maxFontSize: 20 },
    ],
  },
  {
    id: 'metrics-grid',
    name: 'Metrics',
    semantic: 'metrics',
    regions: [
      { id: 'title', label: 'Heading', x: 6, y: 6, width: 88, height: 12, accepts: ['title'], minFontSize: 28, maxFontSize: 44 },
      { id: 'metrics', label: 'Metrics Area', x: 6, y: 24, width: 88, height: 68, accepts: allBodyTypes, minFontSize: 16, maxFontSize: 64 },
    ],
  },
  {
    id: 'image-right',
    name: 'Image Right',
    semantic: 'content',
    regions: [
      { id: 'title', label: 'Heading', x: 6, y: 6, width: 45, height: 12, accepts: ['title'], minFontSize: 28, maxFontSize: 44 },
      { id: 'body', label: 'Body', x: 6, y: 22, width: 45, height: 70, accepts: allBodyTypes, minFontSize: 14, maxFontSize: 22 },
      { id: 'image', label: 'Image', x: 54, y: 6, width: 40, height: 88, accepts: ['image', 'gallery'], minFontSize: 12, maxFontSize: 12 },
    ],
  },
  {
    id: 'image-left',
    name: 'Image Left',
    semantic: 'content',
    regions: [
      { id: 'image', label: 'Image', x: 6, y: 6, width: 40, height: 88, accepts: ['image', 'gallery'], minFontSize: 12, maxFontSize: 12 },
      { id: 'title', label: 'Heading', x: 50, y: 6, width: 44, height: 12, accepts: ['title'], minFontSize: 28, maxFontSize: 44 },
      { id: 'body', label: 'Body', x: 50, y: 22, width: 44, height: 70, accepts: allBodyTypes, minFontSize: 14, maxFontSize: 22 },
    ],
  },
  {
    id: 'full-image',
    name: 'Full Image',
    semantic: 'content',
    regions: [
      { id: 'image', label: 'Background Image', x: 0, y: 0, width: 100, height: 100, accepts: ['image'], minFontSize: 12, maxFontSize: 12 },
      { id: 'title', label: 'Overlay Title', x: 8, y: 65, width: 84, height: 20, accepts: ['title'], minFontSize: 36, maxFontSize: 64 },
      { id: 'subtitle', label: 'Caption', x: 8, y: 82, width: 60, height: 10, accepts: ['subtitle'], minFontSize: 16, maxFontSize: 24 },
    ],
    defaultBackground: { type: 'gradient', value: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 40%, transparent 100%)' },
  },
  {
    id: 'problem-statement',
    name: 'Problem',
    semantic: 'problem',
    regions: [
      { id: 'title', label: 'Problem', x: 6, y: 6, width: 88, height: 12, accepts: ['title'], minFontSize: 32, maxFontSize: 52 },
      { id: 'body', label: 'Description', x: 10, y: 28, width: 80, height: 60, accepts: allBodyTypes, minFontSize: 18, maxFontSize: 28 },
    ],
    defaultBackground: { type: 'gradient', value: 'radial-gradient(ellipse at 80% 20%, rgba(239,68,68,0.08) 0%, transparent 60%)' },
  },
  {
    id: 'solution-slide',
    name: 'Solution',
    semantic: 'solution',
    regions: [
      { id: 'title', label: 'Solution', x: 6, y: 6, width: 88, height: 12, accepts: ['title'], minFontSize: 32, maxFontSize: 52 },
      { id: 'body', label: 'Details', x: 6, y: 22, width: 55, height: 70, accepts: allBodyTypes, minFontSize: 16, maxFontSize: 24 },
      { id: 'visual', label: 'Visual', x: 64, y: 22, width: 30, height: 70, accepts: ['image', 'chart', 'callout', 'metric', 'stats', 'cycle-diagram', 'venn-diagram'], minFontSize: 12, maxFontSize: 20 },
    ],
    defaultBackground: { type: 'gradient', value: 'radial-gradient(ellipse at 20% 80%, rgba(34,197,94,0.08) 0%, transparent 60%)' },
  },
  {
    id: 'timeline',
    name: 'Timeline',
    semantic: 'timeline',
    regions: [
      { id: 'title', label: 'Title', x: 6, y: 6, width: 88, height: 12, accepts: ['title'], minFontSize: 28, maxFontSize: 44 },
      { id: 'timeline', label: 'Timeline', x: 6, y: 24, width: 88, height: 68, accepts: allBodyTypes, minFontSize: 14, maxFontSize: 20 },
    ],
  },
  {
    id: 'chart-focus',
    name: 'Chart Focus',
    semantic: 'metrics',
    regions: [
      { id: 'title', label: 'Title', x: 6, y: 6, width: 50, height: 12, accepts: ['title'], minFontSize: 28, maxFontSize: 40 },
      { id: 'chart', label: 'Chart', x: 6, y: 22, width: 55, height: 70, accepts: ['chart', 'stats', 'progress'], minFontSize: 12, maxFontSize: 12 },
      { id: 'insights', label: 'Key Insights', x: 65, y: 22, width: 30, height: 70, accepts: allBodyTypes, minFontSize: 14, maxFontSize: 22 },
    ],
  },
  {
    id: 'closing',
    name: 'Closing',
    semantic: 'closing',
    regions: [
      { id: 'title', label: 'Thank You', x: 10, y: 25, width: 80, height: 25, accepts: ['title'], minFontSize: 48, maxFontSize: 72 },
      { id: 'subtitle', label: 'Contact', x: 15, y: 55, width: 70, height: 20, accepts: ['subtitle', 'callout', 'button-block'], minFontSize: 18, maxFontSize: 28 },
    ],
    defaultBackground: { type: 'gradient', value: 'radial-gradient(ellipse at 50% 50%, rgba(99,102,241,0.12) 0%, transparent 70%)' },
    defaultDecorations: [
      { type: 'circle', x: 75, y: 20, size: 400, color: 'currentAccent', opacity: 0.06 },
      { type: 'circle', x: 15, y: 75, size: 250, color: 'currentAccent', opacity: 0.04 },
    ],
  },
];

export const getLayout = (id: string): SlideLayout =>
  slideLayouts.find((l) => l.id === id) ?? slideLayouts[0];
