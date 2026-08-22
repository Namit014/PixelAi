export type BlockType =
  | 'heading'
  | 'text'
  | 'colours'
  | 'logo_variant'
  | 'typography'
  | 'image'
  | 'gallery'
  | 'video'
  | 'audio'
  | 'file'
  | 'divider'
  | 'quote'
  | 'callout'
  | 'todo_list'
  | 'bullet_list'
  | 'numbered_list'
  | 'code'
  | 'table'
  | 'button'
  | 'embed';

export interface BaseBlock {
  id: string;
  block_type: BlockType;
  display_order: number;
}

export interface HeadingBlock extends BaseBlock {
  block_type: 'heading';
  content: {
    text: string;
    level: 1 | 2 | 3 | 4 | 5 | 6;
    fontSize?: string;
  };
}

export interface TextBlock extends BaseBlock {
  block_type: 'text';
  content: {
    text: string;
  };
}

export interface ColoursBlock extends BaseBlock {
  block_type: 'colours';
  content: {
    colors: Array<{
      name: string;
      hex: string;
      rgb?: string;
      cmyk?: string;
      usage?: string;
    }>;
  };
}

export interface LogoVariantBlock extends BaseBlock {
  block_type: 'logo_variant';
  content: {
    title: string;
    file_path: string;
    signed_url: string;
    background: 'light' | 'dark' | 'transparent';
    usage_notes?: string;
  };
}

export interface TypographyBlock extends BaseBlock {
  block_type: 'typography';
  content: {
    font_family: string;
    weights: string[];
    sample_text: string;
    usage_notes?: string;
    font_file_path?: string;
  };
}

export interface ImageBlock extends BaseBlock {
  block_type: 'image';
  content: {
    file_path: string;
    signed_url: string;
    caption?: string;
    alt_text?: string;
  };
}

export interface GalleryBlock extends BaseBlock {
  block_type: 'gallery';
  content: {
    images: Array<{
      file_path: string;
      signed_url: string;
      caption?: string;
    }>;
  };
}

export interface VideoBlock extends BaseBlock {
  block_type: 'video';
  content: {
    file_path: string;
    signed_url: string;
    caption?: string;
  };
}

export interface AudioBlock extends BaseBlock {
  block_type: 'audio';
  content: {
    file_path: string;
    signed_url: string;
    title?: string;
  };
}

export interface FileBlock extends BaseBlock {
  block_type: 'file';
  content: {
    file_path: string;
    signed_url: string;
    file_name: string;
    file_size: number;
  };
}

export interface DividerBlock extends BaseBlock {
  block_type: 'divider';
  content: Record<string, never>;
}

export interface QuoteBlock extends BaseBlock {
  block_type: 'quote';
  content: {
    text: string;
    author?: string;
  };
}

export interface CalloutBlock extends BaseBlock {
  block_type: 'callout';
  content: {
    text: string;
    type: 'info' | 'warning' | 'success';
  };
}

export interface TodoListBlock extends BaseBlock {
  block_type: 'todo_list';
  content: {
    items: Array<{
      id: string;
      text: string;
      checked: boolean;
    }>;
  };
}

export interface BulletListBlock extends BaseBlock {
  block_type: 'bullet_list';
  content: {
    items: Array<{
      id: string;
      text: string;
      indent: number;
    }>;
  };
}

export interface NumberedListBlock extends BaseBlock {
  block_type: 'numbered_list';
  content: {
    items: Array<{
      id: string;
      text: string;
      indent: number;
    }>;
    start_number?: number;
  };
}

export interface CodeBlock extends BaseBlock {
  block_type: 'code';
  content: {
    code: string;
    language: string;
    show_line_numbers?: boolean;
  };
}

export interface TableBlock extends BaseBlock {
  block_type: 'table';
  content: {
    headers: string[];
    rows: Array<{
      id: string;
      cells: string[];
    }>;
    column_widths?: number[];
  };
}

export interface ButtonBlock extends BaseBlock {
  block_type: 'button';
  content: {
    text: string;
    url?: string;
    variant: 'primary' | 'secondary' | 'outline';
    size: 'sm' | 'md' | 'lg';
  };
}

export interface EmbedBlock extends BaseBlock {
  block_type: 'embed';
  content: {
    url: string;
    provider: 'youtube' | 'vimeo' | 'figma' | 'codepen' | 'generic';
    embed_html?: string;
    aspect_ratio?: string;
  };
}

export type ContentBlock =
  | HeadingBlock
  | TextBlock
  | ColoursBlock
  | LogoVariantBlock
  | TypographyBlock
  | ImageBlock
  | GalleryBlock
  | VideoBlock
  | AudioBlock
  | FileBlock
  | DividerBlock
  | QuoteBlock
  | CalloutBlock
  | TodoListBlock
  | BulletListBlock
  | NumberedListBlock
  | CodeBlock
  | TableBlock
  | ButtonBlock
  | EmbedBlock;
