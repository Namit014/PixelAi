import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Upload, Image } from "lucide-react";

interface UploadSelectMenuProps {
  onUpload: (file: File) => void;
  onSelectFromCanvas: () => void;
}

export const UploadSelectMenu = ({ onUpload, onSelectFromCanvas }: UploadSelectMenuProps) => {
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
    setOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => onUpload(file));
    // Reset input to allow re-uploading same file
    e.target.value = '';
  };

  const handleSelectFromCanvas = () => {
    onSelectFromCanvas();
    setOpen(false);
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <Upload className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2 z-[1200]" align="start">
          <div className="space-y-1">
            <button
              onClick={handleUploadClick}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Image</span>
            </button>
            <button
              onClick={handleSelectFromCanvas}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
            >
              <Image className="w-4 h-4" />
              <span>Select from Canvas</span>
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
};
