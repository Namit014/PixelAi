import { NodeType } from '@/types/workflow';
import { 
  Merge,
  Video
} from 'lucide-react';

// Custom SVG icons for workflow nodes
import MediaIcon from '@/assets/icons/media-node.svg?react';
import TextIcon from '@/assets/icons/text-node.svg?react';
import ImageGeneratorIcon from '@/assets/icons/image-generator-node.svg?react';
import VideoGeneratorIcon from '@/assets/icons/video-generator-node.svg?react';
import AssistantIcon from '@/assets/icons/assistant-node.svg?react';
import BatchGenerateIcon from '@/assets/icons/Batch_Generate.svg?react';
import ConditionalIcon from '@/assets/icons/Conditional.svg?react';
import LoopIcon from '@/assets/icons/Loop.svg?react';
import RandomIcon from '@/assets/icons/Random.svg?react';
import AiPromptIcon from '@/assets/icons/Ai_Prompt.svg?react';
import SettingIcon from '@/assets/icons/setting.svg?react';
import VideoOutputIcon from '@/assets/icons/video_Output.svg?react';
import ImageOutputIcon from '@/assets/icons/Image_Output.svg?react';
import ExportIcon from '@/assets/icons/workflow-export.svg?react';

export interface NodeTypeDefinition {
  type: NodeType;
  label: string;
  icon: any;
  category: 'input' | 'generation' | 'transformation' | 'logic' | 'output';
  description: string;
  defaultConfig: Record<string, any>;
  inputs: { id: string; label: string; type: string }[];
  outputs: { id: string; label: string; type: string }[];
}

export const NODE_TYPES: Record<NodeType, NodeTypeDefinition> = {
  // Input nodes
  upload: {
    type: 'upload',
    label: 'Upload Image',
    icon: MediaIcon,
    category: 'input',
    description: 'Upload an image file',
    defaultConfig: {},
    inputs: [{ id: 'input', label: 'Input', type: 'any' }],
    outputs: [{ id: 'image', label: 'Image', type: 'image' }],
  },
  textInput: {
    type: 'textInput',
    label: 'Text Input',
    icon: TextIcon,
    category: 'input',
    description: 'Multi-line text input',
    defaultConfig: { text: '' },
    inputs: [{ id: 'input', label: 'Input', type: 'any' }],
    outputs: [{ id: 'text', label: 'Text', type: 'text' }],
  },
  promptInput: {
    type: 'promptInput',
    label: 'Prompt',
    icon: AiPromptIcon,
    category: 'input',
    description: 'AI prompt input',
    defaultConfig: { prompt: '' },
    inputs: [{ id: 'input', label: 'Input', type: 'any' }],
    outputs: [{ id: 'prompt', label: 'Prompt', type: 'text' }],
  },
  
  // Generation nodes
  imageGenerator: {
    type: 'imageGenerator',
    label: 'Generate Image',
    icon: ImageGeneratorIcon,
    category: 'generation',
    description: 'Generate image with AI',
    defaultConfig: {
      model: 'google/gemini-2.5-flash-image-preview',
      aspectRatio: '1:1',
      iterations: 1,
    },
    inputs: [
      { id: 'prompt', label: 'Prompt', type: 'text' },
      { id: 'reference', label: 'Reference', type: 'image' },
    ],
    outputs: [{ id: 'image', label: 'Image', type: 'image' }],
  },
  videoGenerator: {
    type: 'videoGenerator',
    label: 'Generate Video',
    icon: VideoGeneratorIcon,
    category: 'generation',
    description: 'Generate video with AI',
    defaultConfig: {
      duration: 5,
      aspectRatio: '16:9',
    },
    inputs: [
      { id: 'prompt', label: 'Prompt', type: 'text' },
      { id: 'reference', label: 'Reference', type: 'image' },
    ],
    outputs: [{ id: 'video', label: 'Video', type: 'video' }],
  },
  
  // Transformation nodes
  upscaler: {
    type: 'upscaler',
    label: 'Upscale',
    icon: SettingIcon,
    category: 'transformation',
    description: 'Upscale image quality',
    defaultConfig: { scale: 2 },
    inputs: [{ id: 'image', label: 'Image', type: 'image' }],
    outputs: [{ id: 'image', label: 'Image', type: 'image' }],
  },
  assistant: {
    type: 'assistant',
    label: 'AI Assistant',
    icon: AssistantIcon,
    category: 'transformation',
    description: 'AI-powered suggestions',
    defaultConfig: { instruction: '' },
    inputs: [
      { id: 'input', label: 'Input', type: 'any' },
      { id: 'instruction', label: 'Instruction', type: 'text' },
    ],
    outputs: [{ id: 'output', label: 'Output', type: 'text' }],
  },
  
  // Logic nodes
  batchGenerator: {
    type: 'batchGenerator',
    label: 'Batch Generate',
    icon: BatchGenerateIcon,
    category: 'logic',
    description: 'Generate multiple variations',
    defaultConfig: { count: 4 },
    inputs: [{ id: 'input', label: 'Input', type: 'any' }],
    outputs: [{ id: 'output', label: 'Output', type: 'array' }],
  },
  conditional: {
    type: 'conditional',
    label: 'Conditional',
    icon: ConditionalIcon,
    category: 'logic',
    description: 'Route based on condition',
    defaultConfig: { condition: '' },
    inputs: [{ id: 'input', label: 'Input', type: 'any' }],
    outputs: [
      { id: 'true', label: 'True', type: 'any' },
      { id: 'false', label: 'False', type: 'any' },
    ],
  },
  merge: {
    type: 'merge',
    label: 'Merge',
    icon: Merge,
    category: 'logic',
    description: 'Combine multiple inputs',
    defaultConfig: {},
    inputs: [
      { id: 'input1', label: 'Input 1', type: 'any' },
      { id: 'input2', label: 'Input 2', type: 'any' },
    ],
    outputs: [{ id: 'output', label: 'Output', type: 'array' }],
  },
  random: {
    type: 'random',
    label: 'Random',
    icon: RandomIcon,
    category: 'logic',
    description: 'Generate random values',
    defaultConfig: { min: 0, max: 100 },
    inputs: [],
    outputs: [{ id: 'value', label: 'Value', type: 'number' }],
  },
  loop: {
    type: 'loop',
    label: 'Loop',
    icon: LoopIcon,
    category: 'logic',
    description: 'Repeat workflow section',
    defaultConfig: { iterations: 3 },
    inputs: [{ id: 'input', label: 'Input', type: 'any' }],
    outputs: [{ id: 'output', label: 'Output', type: 'array' }],
  },
  
  // Output nodes
  imageOutput: {
    type: 'imageOutput',
    label: 'Image Output',
    icon: ImageOutputIcon,
    category: 'output',
    description: 'Display generated image',
    defaultConfig: { title: 'Result' },
    inputs: [{ id: 'image', label: 'Image', type: 'image' }],
    outputs: [{ id: 'output', label: 'Output', type: 'any' }],
  },
  videoOutput: {
    type: 'videoOutput',
    label: 'Video Output',
    icon: VideoOutputIcon,
    category: 'output',
    description: 'Display generated video',
    defaultConfig: { title: 'Result' },
    inputs: [{ id: 'video', label: 'Video', type: 'video' }],
    outputs: [{ id: 'output', label: 'Output', type: 'any' }],
  },
  export: {
    type: 'export',
    label: 'Export',
    icon: ExportIcon,
    category: 'output',
    description: 'Download results',
    defaultConfig: { format: 'zip' },
    inputs: [{ id: 'files', label: 'Files', type: 'array' }],
    outputs: [{ id: 'output', label: 'Output', type: 'any' }],
  },
};

export const NODE_CATEGORIES = {
  input: { label: 'Input', nodes: ['upload', 'textInput', 'promptInput'] },
  generation: { label: 'Generation', nodes: ['imageGenerator', 'videoGenerator'] },
  transformation: { label: 'Transform', nodes: ['upscaler', 'assistant'] },
  logic: { label: 'Logic', nodes: ['batchGenerator', 'conditional', 'merge', 'random', 'loop'] },
  output: { label: 'Output', nodes: ['imageOutput', 'videoOutput', 'export'] },
};
