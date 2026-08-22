import { useState } from "react";
import { Canvas as FabricCanvas, FabricImage } from "fabric";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Link as LinkIcon } from "lucide-react";

interface ImageImportProps {
  canvas: FabricCanvas;
}

export function ImageImport({ canvas }: ImageImportProps) {
  const [imageUrl, setImageUrl] = useState("");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imgUrl = event.target?.result as string;
      addImageToCanvas(imgUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleUrlAdd = () => {
    if (!imageUrl) return;
    addImageToCanvas(imageUrl);
    setImageUrl("");
  };

  const addImageToCanvas = (url: string) => {
    FabricImage.fromURL(url).then((img) => {
      img.set({
        left: 100,
        top: 100,
        scaleX: 0.5,
        scaleY: 0.5,
      });
      canvas.add(img);
      canvas.setActiveObject(img);
    });
  };

  return (
    <div className="absolute top-20 left-4 bg-background border border-border rounded-lg p-4 w-80 space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Upload Image</label>
        <Input
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="cursor-pointer"
        />
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Image URL</label>
        <div className="flex gap-2">
          <Input
            type="url"
            placeholder="https://example.com/image.jpg"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
          <Button onClick={handleUrlAdd}>
            <LinkIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
