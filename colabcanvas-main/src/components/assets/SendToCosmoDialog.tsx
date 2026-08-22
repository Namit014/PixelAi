import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Workflow {
  id: string;
  title: string;
}

interface SendToCosmoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetData: {
    file: File | null;
    type: string;
    metadata?: any;
    sourceId?: string;
    sourceType?: string;
  };
}

export const SendToCosmoDialog = ({ open, onOpenChange, assetData }: SendToCosmoDialogProps) => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('new');
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      loadWorkflows();
    }
  }, [open]);

  const loadWorkflows = async () => {
    try {
      const { data, error } = await supabase
        .from('workflows')
        .select('id, title')
        .order('updated_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setWorkflows(data || []);
    } catch (error) {
      console.error('Failed to load workflows:', error);
      toast.error('Failed to load workflows');
    }
  };

  const handleSend = async () => {
    if (!assetData.file) {
      toast.error('No asset to send');
      return;
    }

    setSending(true);
    try {
      const workflowId = selectedWorkflow === 'new' ? null : selectedWorkflow;

      const { data, error } = await supabase.functions.invoke('export-to-cosmo', {
        body: {
          workflowId,
          assetFile: assetData.file,
          assetType: assetData.type,
          metadata: assetData.metadata,
          sourceId: assetData.sourceId,
          sourceType: assetData.sourceType || 'canvas'
        }
      });

      if (error) throw error;

      toast.success('Asset sent to Cosmo successfully');
      onOpenChange(false);

      // Navigate to Cosmo with the asset
      if (selectedWorkflow === 'new') {
        navigate('/cosmo/editor', { state: { importedAsset: data } });
      } else {
        navigate(`/cosmo?workflowId=${selectedWorkflow}`, { state: { importedAsset: data } });
      }
    } catch (error) {
      console.error('Failed to send to Cosmo:', error);
      toast.error('Failed to send to Cosmo');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send to Cosmo Workflow</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Select Workflow</Label>
            <Select value={selectedWorkflow} onValueChange={setSelectedWorkflow}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a workflow" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">Create New Workflow</SelectItem>
                {workflows.map((workflow) => (
                  <SelectItem key={workflow.id} value={workflow.id}>
                    {workflow.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            <p><strong>Asset Type:</strong> {assetData.type}</p>
            {assetData.metadata?.width && assetData.metadata?.height && (
              <p><strong>Dimensions:</strong> {assetData.metadata.width} × {assetData.metadata.height}</p>
            )}
            <p className="mt-2 text-xs">The asset will be added as a Media node in the workflow</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? 'Sending...' : 'Send to Cosmo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};