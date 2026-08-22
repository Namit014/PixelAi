// Filter Engine Types — Non-destructive, stackable filter system

export interface FilterParam {
  name: string;
  label: string;
  type: 'float' | 'int' | 'color' | 'bool' | 'select';
  value: number | number[] | boolean | string;
  min?: number;
  max?: number;
  step?: number;
  options?: { label: string; value: string }[];
}

export interface CanvasFilter {
  id: string;
  name: string;
  type: 'shader' | 'cpu';
  category: 'basic' | 'distortion' | 'color' | 'stylize';
  icon?: string;
  params: Record<string, FilterParam>;
  fragmentShader?: string;
  // For multi-pass shaders (bloom etc.)
  passes?: number;
  // CPU filter apply function
  apply?: (inputData: ImageData, params: Record<string, any>) => ImageData;
}

export interface AppliedFilter {
  instanceId: string;
  filterId: string;
  params: Record<string, number | number[] | boolean | string>;
}

export interface LayerFilterState {
  objectId: string;
  originalBitmap: ImageBitmap | null;
  filterStack: AppliedFilter[];
  cacheTexture: WebGLTexture | null;
  dirty: boolean;
}

export interface FilterPreset {
  id: string;
  name: string;
  category: string;
  filterStack: { filterId: string; params: Record<string, any> }[];
}

export type FilterCategory = 'basic' | 'distortion' | 'color' | 'stylize';
