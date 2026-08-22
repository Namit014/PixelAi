import { useEffect } from "react";
import { Canvas as FabricCanvas, IText } from "fabric";

interface TextEditorProps {
  canvas: FabricCanvas;
}

export function TextEditor({ canvas }: TextEditorProps) {
  useEffect(() => {
    canvas.defaultCursor = 'text';

    const handleClick = (e: any) => {
      const pointer = canvas.getPointer(e.e);
      
      const text = new IText('Type here', {
        left: pointer.x,
        top: pointer.y,
        fontSize: 24,
        fill: '#000000',
        fontFamily: 'Arial',
      });

      canvas.add(text);
      canvas.setActiveObject(text);
      text.enterEditing();
      text.selectAll();
    };

    canvas.on('mouse:down', handleClick);

    return () => {
      canvas.off('mouse:down', handleClick);
      canvas.defaultCursor = 'default';
    };
  }, [canvas]);

  return null;
}
