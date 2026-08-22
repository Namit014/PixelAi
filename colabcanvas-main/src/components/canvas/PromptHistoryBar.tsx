import { useState } from 'react';
import { usePromptHistory } from '@/stores/promptHistoryStore';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronUp, Trash2, RotateCcw, CheckCircle2, Circle, XCircle, Loader2, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
const PromptHistoryBar = ({ projectId }: {projectId: string;}) => {
  const {
    items,
    removeItem,
    clearHistory
  } = usePromptHistory();
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter items by current project
  const projectItems = items.filter((item) => item.projectId === projectId);

  // Calculate status for collapsed indicator
  const generatingCount = projectItems.filter((i) => i.status === 'generating').length;
  const queuedCount = projectItems.filter((i) => i.status === 'queued').length;

  const truncatePrompt = (prompt: string, maxLength: number = 60) => {
    return prompt.length > maxLength ?
    prompt.substring(0, maxLength) + '...' :
    prompt;
  };

  const handleCopyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    toast.success('Prompt copied to clipboard');
  };
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'generating':
        return <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />;
      case 'queued':
        return <Circle className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };
  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return 'Generated';
      case 'generating':
        return 'Generating...';
      case 'queued':
        return 'Queued';
      case 'error':
        return 'Failed';
      default:
        return status;
    }
  };
  const handleRetry = (item: any) => {
    toast.info('Retry functionality coming soon');
  };
  if (projectItems.length === 0) return null;
  return <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-45 w-[360px] animate-in fade-in slide-in-from-bottom duration-200">
      <div className="glass rounded-lg backdrop-blur-md border border-zinc-200 overflow-hidden bg-white">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-primary-foreground border-primary-foreground">
          <div className="flex items-center gap-2">
            <h3 className="text-zinc-700 text-xs font-medium">Generation History</h3>
            {generatingCount > 0 ?
          <span className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                <Loader2 className="w-3 h-3 animate-spin" />
                {generatingCount}
              </span> :
          queuedCount > 0 ?
          <span className="text-xs text-yellow-600 bg-yellow-100 px-1.5 py-0.5 rounded-full">
                {queuedCount}
              </span> :

          <span className="text-xs text-zinc-500 bg-zinc-200 px-1.5 py-0.5 rounded-full">
                {projectItems.length}
              </span>
          }
          </div>
          
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => {
            if (confirm('Clear all generation history?')) {
              clearHistory();
              toast.success('History cleared');
            }
          }} className="h-7 px-2 text-xs">
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Clear
            </Button>
            
            <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="h-7 px-2">
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Content */}
        {isExpanded && <ScrollArea className="h-[200px]">
            <div className="p-2 space-y-1 pr-4">
              {projectItems.map((item) => <div key={item.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-100/50 transition-colors group">
                  {/* Status Icon */}
                  <div className="flex-shrink-0">
                    {getStatusIcon(item.status)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium text-zinc-700">
                        {getStatusText(item.status)}
                      </span>
                      {item.imageCount && item.imageCount > 1 && <span className="text-xs text-zinc-500 bg-zinc-200 px-1.5 py-0.5 rounded">
                          {item.imageCount} images
                        </span>}
                      {item.size && <span className="text-xs text-zinc-500 bg-zinc-200 px-1.5 py-0.5 rounded">
                          {item.size}
                        </span>}
                    </div>
                    
                    <p className="text-xs text-zinc-600">
                      {truncatePrompt(item.prompt)}
                    </p>
                    
                    {item.error && <p className="text-xs text-red-500 mt-0.5">
                        {item.error}
                      </p>}
                    
                    <span className="text-[10px] text-zinc-400">
                      {format(new Date(item.timestamp), 'HH:mm:ss')}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.status === 'error' && <Button variant="ghost" size="sm" onClick={() => handleRetry(item)} className="h-6 px-2">
                        <RotateCcw className="w-3 h-3" />
                      </Button>}
                    
                    {item.imageUrls && item.imageUrls.length > 0 && <div className="flex gap-1">
                        {item.imageUrls.slice(0, 3).map((url, idx) => <img key={idx} src={url} alt={`Generated ${idx + 1}`} className="w-6 h-6 rounded object-cover border border-zinc-200" />)}
                      </div>}
                    
                    <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopyPrompt(item.prompt)}
                className="h-6 px-2"
                title="Copy prompt">

                      <Copy className="w-3 h-3" />
                    </Button>
                    
                    <Button variant="ghost" size="sm" onClick={() => removeItem(item.id)} className="h-6 px-2">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>)}
            </div>
          </ScrollArea>}
      </div>
    </div>;
};
export default PromptHistoryBar;