import {
  Heading1,
  Type,
  Palette,
  Image as ImageIcon,
  Images,
  Video,
  Music,
  File,
  Minus,
  Quote,
  AlertCircle,
  CheckSquare,
  List,
  ListOrdered,
  Code2,
  Table,
  MousePointer,
  Globe,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { BlockType } from "@/types/brandBlocks";

interface AddBlockMenuProps {
  onAddBlock: (type: BlockType) => void;
}

export const AddBlockMenu = ({ onAddBlock }: AddBlockMenuProps) => {
  const blockTypes = [
    { type: 'heading' as BlockType, icon: Heading1, label: 'Heading' },
    { type: 'text' as BlockType, icon: Type, label: 'Text' },
    { type: 'quote' as BlockType, icon: Quote, label: 'Quote' },
    { type: 'callout' as BlockType, icon: AlertCircle, label: 'Callout' },
    { type: 'todo_list' as BlockType, icon: CheckSquare, label: 'To-Do List' },
    { type: 'bullet_list' as BlockType, icon: List, label: 'Bullet List' },
    { type: 'numbered_list' as BlockType, icon: ListOrdered, label: 'Numbered List' },
    { type: 'code' as BlockType, icon: Code2, label: 'Code' },
    { type: 'table' as BlockType, icon: Table, label: 'Table' },
    { type: 'colours' as BlockType, icon: Palette, label: 'Colors' },
    { type: 'logo_variant' as BlockType, icon: ImageIcon, label: 'Logo Variant' },
    { type: 'typography' as BlockType, icon: Type, label: 'Typography' },
    { type: 'image' as BlockType, icon: ImageIcon, label: 'Image' },
    { type: 'gallery' as BlockType, icon: Images, label: 'Gallery' },
    { type: 'video' as BlockType, icon: Video, label: 'Video' },
    { type: 'audio' as BlockType, icon: Music, label: 'Audio' },
    { type: 'file' as BlockType, icon: File, label: 'File' },
    { type: 'button' as BlockType, icon: MousePointer, label: 'Button' },
    { type: 'embed' as BlockType, icon: Globe, label: 'Embed' },
    { type: 'divider' as BlockType, icon: Minus, label: 'Divider' },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Add Block
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Add Content Block</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {blockTypes.map(({ type, icon: Icon, label }) => (
          <DropdownMenuItem key={type} onClick={() => onAddBlock(type)}>
            <Icon className="w-4 h-4 mr-2" />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
