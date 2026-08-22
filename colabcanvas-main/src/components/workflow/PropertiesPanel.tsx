import { useEffect, useState } from 'react';
import { useWorkflowStore } from '@/stores/workflowStore';
import { NodeData } from '@/types/workflow';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NODE_TYPES } from '@/lib/workflowNodeTypes';

const PropertiesPanel = () => {
  const { nodes } = useWorkflowStore();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const selectedNode = nodes.find(n => n.selected);

  useEffect(() => {
    if (selectedNode) {
      setSelectedNodeId(selectedNode.id);
    } else {
      setSelectedNodeId(null);
    }
  }, [selectedNode]);

  const updateNodeData = useWorkflowStore(state => state.updateNodeData);

  if (!selectedNode) {
    return (
      <div className="w-80 bg-white dark:bg-white border-l border-zinc-200 dark:border-zinc-200 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Select a node to view properties</p>
      </div>
    );
  }

  const nodeData = selectedNode.data as NodeData;
  const nodeTypeInfo = NODE_TYPES[nodeData.nodeType];

  return (
    <div className="w-80 bg-white/80 dark:bg-white/80 backdrop-blur-sm border-l border-zinc-200 dark:border-zinc-200 flex flex-col">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-200">
        <h2 className="text-lg font-semibold text-foreground">Properties</h2>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          <div>
            <Label>Node Type</Label>
            <p className="text-sm text-muted-foreground mt-1">{nodeTypeInfo?.label}</p>
          </div>

          <div>
            <Label htmlFor="node-label">Label</Label>
            <Input
              id="node-label"
              value={nodeData.label}
              onChange={(e) =>
                updateNodeData(selectedNode.id, { label: e.target.value })
              }
              className="mt-1"
            />
          </div>

          {nodeData.nodeType === 'imageGenerator' && (
            <>
              <div>
                <Label htmlFor="model">Model</Label>
                <Select
                  value={nodeData.config.model || 'google/gemini-2.5-flash-image-preview'}
                  onValueChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      config: { ...nodeData.config, model: value },
                    })
                  }
                >
                  <SelectTrigger id="model" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google/gemini-2.5-flash-image-preview">Gemini Flash</SelectItem>
                    <SelectItem value="google/gemini-2.5-pro-image-preview">Gemini Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="aspect-ratio">Aspect Ratio</Label>
                <Select
                  value={nodeData.config.aspectRatio || '1:1'}
                  onValueChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      config: { ...nodeData.config, aspectRatio: value },
                    })
                  }
                >
                  <SelectTrigger id="aspect-ratio" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1:1">1:1 Square</SelectItem>
                    <SelectItem value="16:9">16:9 Landscape</SelectItem>
                    <SelectItem value="9:16">9:16 Portrait</SelectItem>
                    <SelectItem value="4:3">4:3 Classic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {nodeData.nodeType === 'textInput' && (
            <div>
              <Label htmlFor="text-content">Text Content</Label>
              <Textarea
                id="text-content"
                value={nodeData.config.text || ''}
                onChange={(e) =>
                  updateNodeData(selectedNode.id, {
                    config: { ...nodeData.config, text: e.target.value },
                  })
                }
                className="mt-1 min-h-[200px]"
                placeholder="Enter text content..."
              />
            </div>
          )}

          {nodeData.nodeType === 'promptInput' && (
            <div>
              <Label htmlFor="prompt-content">Prompt</Label>
              <Textarea
                id="prompt-content"
                value={nodeData.config.prompt || ''}
                onChange={(e) =>
                  updateNodeData(selectedNode.id, {
                    config: { ...nodeData.config, prompt: e.target.value },
                  })
                }
                className="mt-1 min-h-[120px]"
                placeholder="Enter AI prompt..."
              />
            </div>
          )}

          {nodeData.nodeType === 'batchGenerator' && (
            <div>
              <Label htmlFor="batch-count">Number of Variations</Label>
              <Input
                id="batch-count"
                type="number"
                min="1"
                max="10"
                value={nodeData.config.count || 4}
                onChange={(e) =>
                  updateNodeData(selectedNode.id, {
                    config: { ...nodeData.config, count: parseInt(e.target.value) },
                  })
                }
                className="mt-1"
              />
            </div>
          )}

          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-200">
            <h3 className="text-sm font-medium mb-2">Inputs</h3>
            {nodeTypeInfo?.inputs.map(input => (
              <div key={input.id} className="text-sm text-muted-foreground">
                • {input.label} ({input.type})
              </div>
            ))}
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2">Outputs</h3>
            {nodeTypeInfo?.outputs.map(output => (
              <div key={output.id} className="text-sm text-muted-foreground">
                • {output.label} ({output.type})
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default PropertiesPanel;
