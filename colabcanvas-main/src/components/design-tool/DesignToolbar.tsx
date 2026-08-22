import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { 
  MousePointer2, 
  Hand, 
  Square, 
  Type, 
  PenTool, 
  Image,
  ChevronDown,
  Download,
  Trash2,
  Clock,
  FileText,
  Sparkles
} from "lucide-react";

type Tool = 'select' | 'pan' | 'shapes' | 'text' | 'pen' | 'image';

interface DesignToolbarProps {
  projectTitle: string;
  onTitleChange: (title: string) => void;
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  onNew: () => void;
  onExport: () => void;
  onShowTemplates: () => void;
  onShowVersions: () => void;
  onDelete: () => void;
}

export function DesignToolbar({
  projectTitle,
  onTitleChange,
  activeTool,
  onToolChange,
  onNew,
  onExport,
  onShowTemplates,
  onShowVersions,
  onDelete,
}: DesignToolbarProps) {
  const navigate = useNavigate();

  const tools = [
    { id: 'select' as Tool, icon: MousePointer2, label: 'Select', shortcut: 'V' },
    { id: 'pan' as Tool, icon: Hand, label: 'Pan', shortcut: 'H' },
    { id: 'shapes' as Tool, icon: Square, label: 'Shapes', shortcut: 'R' },
    { id: 'text' as Tool, icon: Type, label: 'Text', shortcut: 'T' },
    { id: 'pen' as Tool, icon: PenTool, label: 'Pen', shortcut: 'P' },
    { id: 'image' as Tool, icon: Image, label: 'Image', shortcut: 'I' },
  ];

  return (
    <div className="h-16 border-b border-border bg-background flex items-center justify-between px-4 sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2">
              <Sparkles className="w-6 h-6" />
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onNew}>
              New Project
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onShowTemplates}>
              <FileText className="w-4 h-4 mr-2" />
              Browse Templates
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onShowVersions}>
              <Clock className="w-4 h-4 mr-2" />
              Version History
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Input
          value={projectTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          className="w-64 font-medium"
          placeholder="Project title"
        />
      </div>

      <div className="flex items-center gap-2">
        {tools.map((tool) => (
          <Button
            key={tool.id}
            variant={activeTool === tool.id ? "default" : "ghost"}
            size="sm"
            onClick={() => onToolChange(tool.id)}
            title={`${tool.label} (${tool.shortcut})`}
          >
            <tool.icon className="w-4 h-4" />
          </Button>
        ))}
      </div>

      <div className="w-64" />
    </div>
  );
}
