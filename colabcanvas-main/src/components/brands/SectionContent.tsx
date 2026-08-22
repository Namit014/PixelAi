import { useState, useEffect } from 'react';
import { ContentBlock, BlockType } from '@/types/brandBlocks';
import { HeadingBlock } from './blocks/HeadingBlock';
import { TextBlock } from './blocks/TextBlock';
import { ColoursBlock } from './blocks/ColoursBlock';
import { ImageBlock } from './blocks/ImageBlock';
import { DividerBlock } from './blocks/DividerBlock';
import { QuoteBlock } from './blocks/QuoteBlock';
import { CalloutBlock } from './blocks/CalloutBlock';
import { TypographyBlock } from './blocks/TypographyBlock';
import { GalleryBlock } from './blocks/GalleryBlock';
import { VideoBlock } from './blocks/VideoBlock';
import { LogoVariantBlock } from './blocks/LogoVariantBlock';
import { AudioBlock } from './blocks/AudioBlock';
import { FileBlock } from './blocks/FileBlock';
import { TodoListBlock } from './blocks/TodoListBlock';
import { BulletListBlock } from './blocks/BulletListBlock';
import { NumberedListBlock } from './blocks/NumberedListBlock';
import { CodeBlock } from './blocks/CodeBlock';
import { TableBlock } from './blocks/TableBlock';
import { ButtonBlock } from './blocks/ButtonBlock';
import { EmbedBlock } from './blocks/EmbedBlock';
import { AddBlockMenu } from './AddBlockMenu';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SectionContentProps {
  sectionId: string;
  brandId: string;
  blocks: ContentBlock[];
  onAddBlock: (type: BlockType) => void;
  onUpdateBlock: (blockId: string, content: any) => void;
  onDeleteBlock: (blockId: string) => void;
  isPreviewMode?: boolean;
}

const SortableBlock = ({ block, isPreviewMode, children }: { 
  block: ContentBlock; 
  isPreviewMode: boolean;
  children: React.ReactNode;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: block.id,
    disabled: isPreviewMode
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  
  return (
    <div ref={setNodeRef} style={style} {...attributes} className="relative group/sortable">
      {!isPreviewMode && (
        <div 
          className="absolute -left-8 top-2 opacity-0 group-hover/sortable:opacity-100 cursor-grab active:cursor-grabbing z-20 transition-opacity" 
          {...listeners}
        >
          <GripVertical className="w-5 h-5 text-muted-foreground" />
        </div>
      )}
      {children}
    </div>
  );
};

export const SectionContent = ({
  sectionId,
  brandId,
  blocks,
  onAddBlock,
  onUpdateBlock,
  onDeleteBlock,
  isPreviewMode = false,
}: SectionContentProps) => {
  const { toast } = useToast();
  const [localBlocks, setLocalBlocks] = useState(blocks);

  // Sync localBlocks with blocks prop changes
  useEffect(() => {
    setLocalBlocks(blocks);
  }, [blocks]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localBlocks.findIndex(b => b.id === active.id);
    const newIndex = localBlocks.findIndex(b => b.id === over.id);
    
    const newBlocks = arrayMove(localBlocks, oldIndex, newIndex);
    setLocalBlocks(newBlocks);
    
    try {
      const blockOrders = newBlocks.map((block, index) => ({
        id: block.id,
        display_order: index
      }));
      
      const { error } = await supabase.rpc('update_block_display_orders', {
        block_orders: blockOrders
      });
      
      if (error) throw error;
      
      toast({
        title: 'Order updated',
        description: 'Block order has been saved',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      setLocalBlocks(blocks);
    }
  };
  // Group consecutive logo variants for grid display
  const groupBlocks = (blocks: ContentBlock[]) => {
    const grouped: (ContentBlock | ContentBlock[])[] = [];
    let logoGroup: ContentBlock[] = [];

    blocks.forEach((block, index) => {
      if (block.block_type === 'logo_variant') {
        logoGroup.push(block);
        // If next block isn't logo or is last block, push the group
        if (index === blocks.length - 1 || blocks[index + 1]?.block_type !== 'logo_variant') {
          grouped.push([...logoGroup]);
          logoGroup = [];
        }
      } else {
        grouped.push(block);
      }
    });

    return grouped;
  };

  const renderBlock = (block: ContentBlock | ContentBlock[]) => {
    // Handle logo variant groups
    if (Array.isArray(block)) {
      return (
        <div key={block[0].id} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 py-2">
          {block.map(logoBlock => {
            const props = {
              brandId,
              sectionId,
              onUpdate: (content: any) => onUpdateBlock(logoBlock.id, content),
              onDelete: () => onDeleteBlock(logoBlock.id),
              isPreviewMode,
            };
            return <LogoVariantBlock key={logoBlock.id} block={logoBlock as any} {...props} />;
          })}
        </div>
      );
    }

    // Handle single blocks
    const props = {
      brandId,
      sectionId,
      onUpdate: (content: any) => onUpdateBlock(block.id, content),
      onDelete: () => onDeleteBlock(block.id),
      isPreviewMode,
    };

    switch (block.block_type) {
      case 'heading':
        return <HeadingBlock key={block.id} block={block} {...props} />;
      case 'text':
        return <TextBlock key={block.id} block={block} {...props} onSlashCommand={onAddBlock} />;
      case 'colours':
        return <ColoursBlock key={block.id} block={block} {...props} />;
      case 'typography':
        return <TypographyBlock key={block.id} block={block} {...props} />;
      case 'image':
        return <ImageBlock key={block.id} block={block} {...props} />;
      case 'gallery':
        return <GalleryBlock key={block.id} block={block} {...props} />;
      case 'video':
        return <VideoBlock key={block.id} block={block} {...props} />;
      case 'audio':
        return <AudioBlock key={block.id} block={block} {...props} />;
      case 'file':
        return <FileBlock key={block.id} block={block} {...props} />;
      case 'divider':
        return <DividerBlock key={block.id} block={block} onDelete={props.onDelete} />;
      case 'quote':
        return <QuoteBlock key={block.id} block={block} {...props} />;
      case 'callout':
        return <CalloutBlock key={block.id} block={block} {...props} />;
      case 'todo_list':
        return <TodoListBlock key={block.id} block={block as any} {...props} />;
      case 'bullet_list':
        return <BulletListBlock key={block.id} block={block as any} {...props} />;
      case 'numbered_list':
        return <NumberedListBlock key={block.id} block={block as any} {...props} />;
      case 'code':
        return <CodeBlock key={block.id} block={block as any} {...props} />;
      case 'table':
        return <TableBlock key={block.id} block={block as any} {...props} />;
      case 'button':
        return <ButtonBlock key={block.id} block={block as any} {...props} />;
      case 'embed':
        return <EmbedBlock key={block.id} block={block as any} {...props} />;
      default:
        return null;
    }
  };

  const groupedBlocks = groupBlocks(localBlocks);

  return (
    <div className="max-w-4xl mx-auto">
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={localBlocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1">
            {groupedBlocks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No content yet. Add a block to get started.</p>
              </div>
            ) : (
              groupedBlocks.map((blockOrGroup, index) => {
                const key = Array.isArray(blockOrGroup) 
                  ? `logo-group-${blockOrGroup[0].id}` 
                  : blockOrGroup.id;
                
                const isLogoGroup = Array.isArray(blockOrGroup);
                
                return (
                  <div key={key}>
                    {isLogoGroup ? (
                      renderBlock(blockOrGroup)
                    ) : (
                      <SortableBlock block={blockOrGroup} isPreviewMode={isPreviewMode}>
                        {renderBlock(blockOrGroup)}
                      </SortableBlock>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </SortableContext>
      </DndContext>
      
      {!isPreviewMode && (
        <div className="pt-6 mt-6 border-t border-border">
          <AddBlockMenu onAddBlock={onAddBlock} />
        </div>
      )}
    </div>
  );
};
