import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { ArrowUp, Paperclip, X, Zap, Brain, Globe, Square } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import ModelSelector from './ModelSelector';
import BrandSystemSelector from './BrandSystemSelector';
import { AssetTaggingPopup, type CanvasAsset } from '@/components/canvas/AssetTaggingPopup';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skill } from '@/lib/rumiSkillsConfig';

interface SelectedSkillData {
  id: string;
  name: string;
  iconName: string;
  color: string;
}

interface ChatInputProps {
  onSend: (message: string, files?: File[], taggedAssets?: CanvasAsset[], selectedSkill?: SelectedSkillData) => void;
  disabled?: boolean;
  placeholder?: string;
  selectedModel?: string;
  onModelChange?: (model: string) => void;
  selectedImageModel?: string;
  onImageModelChange?: (model: string) => void;
  selectedBrandSystem?: any;
  onBrandSystemChange?: (system: any) => void;
  canvasInstance?: any | null;
  thinkMode?: boolean;
  onThinkModeChange?: (enabled: boolean) => void;
  webSearchEnabled?: boolean;
  onWebSearchChange?: (enabled: boolean) => void;
  selectedSkill?: Skill | null;
  onSkillRemove?: () => void;
  onCancel?: () => void;
}

const ChatInput = ({
  onSend,
  disabled,
  placeholder,
  selectedModel,
  onModelChange,
  selectedImageModel,
  onImageModelChange,
  selectedBrandSystem,
  onBrandSystemChange,
  canvasInstance,
  thinkMode = false,
  onThinkModeChange,
  webSearchEnabled = false,
  onWebSearchChange,
  selectedSkill,
  onSkillRemove,
  onCancel
}: ChatInputProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [showAssetPopup, setShowAssetPopup] = useState(false);
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [taggedAssets, setTaggedAssets] = useState<CanvasAsset[]>([]);
  const [hoveredAsset, setHoveredAsset] = useState<CanvasAsset | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{x: number;y: number;} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const [localThinkMode, setLocalThinkMode] = useState(thinkMode);
  const [localWebSearch, setLocalWebSearch] = useState(webSearchEnabled);

  useEffect(() => {
    setLocalThinkMode(thinkMode);
  }, [thinkMode]);

  useEffect(() => {
    setLocalWebSearch(webSearchEnabled);
  }, [webSearchEnabled]);

  // Focus the contenteditable on mount
  useEffect(() => {
    contentEditableRef.current?.focus();
  }, []);

  const getTextContent = useCallback(() => {
    const contentDiv = contentEditableRef.current;
    if (!contentDiv) return '';
    return contentDiv.innerText.trim();
  }, []);

  const handleSend = useCallback(() => {
    const contentDiv = contentEditableRef.current;
    if (!contentDiv) return;

    const textContent = contentDiv.innerText.trim();
    if (!textContent && files.length === 0) return;

    // Get all tagged asset IDs from chips still in the content
    const chips = contentDiv.querySelectorAll('[data-asset-id]');
    const assetIds = Array.from(chips).map((c) => c.getAttribute('data-asset-id'));
    const finalAssets = taggedAssets.filter((a) => assetIds.includes(a.id));

    // Prepare skill data if active
    const skillData = selectedSkill ? {
      id: selectedSkill.id,
      name: selectedSkill.name,
      iconName: selectedSkill.icon.displayName || selectedSkill.icon.name || 'Sparkles',
      color: selectedSkill.color
    } : undefined;

    onSend(textContent, files.length > 0 ? files : undefined, finalAssets.length > 0 ? finalAssets : undefined, skillData);

    contentDiv.innerHTML = '';
    setFiles([]);
    setTaggedAssets([]);
    setShowAssetPopup(false);
  }, [files, taggedAssets, onSend, selectedSkill]);

  const handleContentChange = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setShowAssetPopup(false);
      return;
    }

    const range = selection.getRangeAt(0);
    const textNode = range.startContainer;

    if (textNode.nodeType === Node.TEXT_NODE) {
      const text = textNode.textContent || '';
      const cursorPos = range.startOffset;
      const textBeforeCursor = text.slice(0, cursorPos);
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');

      if (lastAtIndex !== -1 && canvasInstance) {
        const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
        if (/\s/.test(charBeforeAt) || lastAtIndex === 0) {
          setAssetSearchQuery(textBeforeCursor.slice(lastAtIndex + 1));
          setShowAssetPopup(true);
          return;
        }
      }
    }
    setShowAssetPopup(false);
  }, [canvasInstance]);

  const handleAssetSelect = useCallback((asset: CanvasAsset) => {
    const contentDiv = contentEditableRef.current;
    if (!contentDiv) return;

    // Remove the @ and search text
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const textNode = range.startContainer;

      if (textNode.nodeType === Node.TEXT_NODE) {
        const text = textNode.textContent || '';
        const cursorPos = range.startOffset;
        const textBeforeCursor = text.slice(0, cursorPos);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');

        if (lastAtIndex !== -1) {
          // Delete from @ to cursor
          const newText = text.slice(0, lastAtIndex) + text.slice(cursorPos);
          textNode.textContent = newText;

          // Position cursor at the @ position
          const newRange = document.createRange();
          newRange.setStart(textNode, lastAtIndex);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }
    }

    // Insert chip HTML at current cursor position - p-1 for equal padding on all sides
    const chipHtml = `<span contenteditable="false" data-asset-id="${asset.id}" class="inline-flex items-center gap-1 p-1 rounded border border-zinc-200 bg-zinc-50 mx-0.5 align-middle cursor-pointer hover:border-zinc-300"><img src="${asset.thumbnailUrl}" class="w-4 h-4 rounded object-cover"/><span class="text-xs">Image</span></span>&nbsp;`;

    document.execCommand('insertHTML', false, chipHtml);

    // Track the asset
    if (!taggedAssets.find((a) => a.id === asset.id)) {
      setTaggedAssets((prev) => [...prev, asset]);
    }

    setShowAssetPopup(false);
    contentDiv.focus();
  }, [taggedAssets]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Stop propagation for Space bar
    if (e.key === ' ') {
      e.stopPropagation();
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleSend();
    }
  }, [handleSend]);

  // Navigate to asset on canvas
  const navigateToAsset = useCallback((asset: CanvasAsset) => {
    if (!canvasInstance) return;

    const objects = canvasInstance.getObjects();
    const targetObject = objects.find((obj: any) => obj.id === asset.id);

    if (targetObject) {
      canvasInstance.setActiveObject(targetObject);
      const objCenter = targetObject.getCenterPoint();
      const vpt = [...canvasInstance.viewportTransform];
      const zoom = canvasInstance.getZoom();

      vpt[4] = canvasInstance.width / 2 - objCenter.x * zoom;
      vpt[5] = canvasInstance.height / 2 - objCenter.y * zoom;

      canvasInstance.setViewportTransform(vpt);
      canvasInstance.requestRenderAll();
    }
  }, [canvasInstance]);

  // Handle click on inline chips for canvas navigation
  const handleContentClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const chip = target.closest('[data-asset-id]') as HTMLElement;

    if (chip && canvasInstance) {
      const assetId = chip.getAttribute('data-asset-id');
      const asset = taggedAssets.find((a) => a.id === assetId);
      if (asset) {
        navigateToAsset(asset);
      }
    }
  }, [canvasInstance, taggedAssets, navigateToAsset]);

  // Handle mouse events for hover preview
  const handleContentMouseOver = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const chip = target.closest('[data-asset-id]') as HTMLElement;

    if (chip) {
      const assetId = chip.getAttribute('data-asset-id');
      const asset = taggedAssets.find((a) => a.id === assetId);
      if (asset) {
        const rect = chip.getBoundingClientRect();
        setHoveredAsset(asset);
        setHoverPosition({ x: rect.left + rect.width / 2, y: rect.top });
      }
    }
  }, [taggedAssets]);

  const handleContentMouseOut = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const chip = target.closest('[data-asset-id]');
    if (chip) {
      setHoveredAsset(null);
      setHoverPosition(null);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const oversizedFiles = selectedFiles.filter((f) => f.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 5MB',
        variant: 'destructive'
      });
      return;
    }
    setFiles((prev) => [...prev, ...selectedFiles].slice(0, 5));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="p-2 bg-white">
      <div className="bg-white rounded-2xl p-3 border border-zinc-100 relative">
        {/* File attachments */}
        {files.length > 0 &&
        <div className="flex gap-2 mb-3 pb-3 border-b border-zinc-100">
            {files.map((file, index) =>
          <div key={index} className="flex items-center gap-2 bg-zinc-50 px-3 py-1.5 rounded-md text-sm">
                <span className="text-xs">{file.name}</span>
                <button onClick={() => removeFile(index)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              </div>
          )}
          </div>
        }

        {/* Asset tagging popup */}
        {showAssetPopup && canvasInstance &&
        <AssetTaggingPopup
          isOpen={showAssetPopup}
          onClose={() => setShowAssetPopup(false)}
          onSelectAsset={handleAssetSelect}
          searchQuery={assetSearchQuery}
          canvasInstance={canvasInstance} />

        }

        <div className="relative mb-3">
          {/* SINGLE ROW: Skill prefix + contentEditable all inline */}
          <div className="flex flex-wrap items-center gap-1.5">
            {selectedSkill &&
            <>
                <span className="text-sm text-muted-foreground whitespace-nowrap">Use this skill</span>
                <span className="inline-flex items-center gap-1 p-1 rounded border border-zinc-200 bg-white shadow-sm">
                  <selectedSkill.icon className={`w-3.5 h-3.5 ${selectedSkill.color}`} />
                  <span className="text-xs font-medium">
                    {selectedSkill.name.length > 15 ? selectedSkill.name.slice(0, 15) + '...' : selectedSkill.name}
                  </span>
                  <button onClick={onSkillRemove} className="hover:bg-zinc-100 rounded p-0.5 -mr-0.5">
                    <X className="w-2.5 h-2.5 text-muted-foreground" />
                  </button>
                </span>
                <span className="text-sm text-muted-foreground whitespace-nowrap">to create:</span>
              </>
            }
            
            {/* ContentEditable area - allows text AND inline chips */}
            <div
              ref={contentEditableRef}
              contentEditable={!disabled}
              onInput={handleContentChange}
              onKeyDown={handleKeyDown}
              onClick={handleContentClick}
              onMouseOver={handleContentMouseOver}
              onMouseOut={handleContentMouseOut}
              className={cn(
                "flex-1 min-w-[100px] min-h-[24px] outline-none text-sm leading-6",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              data-placeholder={selectedSkill ? "" : placeholder || 'Start with an idea, or type "@" to mention...'}
              suppressContentEditableWarning />

          </div>

        {/* Hover preview for asset chips - rendered via Portal */}
          {hoveredAsset && hoverPosition && createPortal(
            <div
              className="fixed z-[9999] bg-white rounded-lg shadow-xl border border-zinc-200 p-2 pointer-events-none animate-fade-in"
              style={{
                left: hoverPosition.x,
                top: hoverPosition.y - 12,
                transform: 'translate(-50%, -100%)'
              }}>

              <img
                src={hoveredAsset.imageUrl || hoveredAsset.thumbnailUrl}
                alt={hoveredAsset.name}
                className="w-32 h-auto rounded object-cover max-h-24" />

              <p className="text-xs text-muted-foreground mt-1 text-center truncate max-w-[128px]">
                {hoveredAsset.name}
              </p>
            </div>,
            document.body
          )}
        </div>

        <div className="flex gap-1 items-center justify-between pt-2">
          <div className="flex gap-1 items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || files.length >= 5}
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-zinc-50 border-secondary">

              <Paperclip className="h-4 w-4" />
            </Button>
            
            {selectedModel && onModelChange &&
            <ModelSelector
              selectedModel={selectedModel}
              onModelChange={onModelChange}
              selectedImageModel={selectedImageModel}
              onImageModelChange={onImageModelChange} />

            }
          </div>

          <div className="flex gap-2 items-center">
            <TooltipProvider delayDuration={200}>
              <div className="flex items-center bg-zinc-100 rounded-full p-0.5 border border-zinc-200 h-8">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        setLocalThinkMode(false);
                        onThinkModeChange?.(false);
                      }}
                      className={cn(
                        "flex items-center justify-center w-7 h-7 rounded-full transition-all",
                        !localThinkMode ?
                        "bg-white text-zinc-900 shadow-sm" :
                        "text-zinc-400 hover:text-zinc-600"
                      )}>

                      <Zap className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">Fast Mode</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        setLocalThinkMode(true);
                        onThinkModeChange?.(true);
                      }}
                      className={cn(
                        "flex items-center justify-center w-7 h-7 rounded-full transition-all",
                        localThinkMode ?
                        "bg-amber-100 text-amber-600 shadow-sm" :
                        "text-zinc-400 hover:text-zinc-600"
                      )}>

                      <Brain className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">Think Mode</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const newState = !localWebSearch;
                setLocalWebSearch(newState);
                onWebSearchChange?.(newState);
              }}
              className={cn(
                "h-8 w-8 rounded-full transition-colors",
                localWebSearch ?
                "bg-blue-100 text-blue-600 border border-blue-200" :
                "text-muted-foreground hover:text-foreground hover:bg-blue-50 hover:text-blue-600"
              )}
              title={localWebSearch ? "Web Search: ON" : "Web Search: OFF"}>

              <Globe className="h-4 w-4" />
            </Button>
            
            {disabled && onCancel ? (
              <Button
                size="icon"
                onClick={onCancel}
                className="h-8 w-8 rounded-full bg-red-100 hover:bg-red-200 text-red-600"
                title="Stop generation">
                <Square className="h-3.5 w-3.5 fill-current" />
              </Button>
            ) : (
              <Button
                size="icon"
                onClick={handleSend}
                disabled={disabled}
                className="h-8 w-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 disabled:opacity-50"
                title="Send message">
                <ArrowUp className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={handleFileSelect} />
    </div>);

};

export default ChatInput;