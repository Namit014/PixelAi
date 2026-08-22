import { useState, useEffect } from 'react';
import { History, RotateCcw, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useWorkflowStore } from '@/stores/workflowStore';

const VersionHistoryPanel = () => {
  const [versions, setVersions] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [description, setDescription] = useState('');
  const { workflowId, nodes, edges, workflowTitle, setNodes, setEdges } = useWorkflowStore();

  useEffect(() => {
    if (isOpen && workflowId) {
      loadVersions();
    }
  }, [isOpen, workflowId]);

  const loadVersions = async () => {
    if (!workflowId) return;

    const { data, error } = await supabase
      .from('workflow_versions')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('version_number', { ascending: false });

    if (error) {
      console.error('Error loading versions:', error);
      return;
    }

    setVersions(data || []);
  };

  const handleCreateVersion = async () => {
    if (!workflowId) return;

    try {
      const { data, error } = await supabase.functions.invoke('create-workflow-version', {
        body: {
          workflowId,
          nodes,
          edges,
          title: workflowTitle,
        },
      });

      if (error) throw error;

      toast.success(`Version ${data.versionNumber} created`);
      setDescription('');
      setIsCreateDialogOpen(false);
      loadVersions();
    } catch (error) {
      console.error('Error creating version:', error);
      toast.error('Failed to create version');
    }
  };

  const handleRestoreVersion = async (version: any) => {
    try {
      const snapshot = version.snapshot;
      
      if (snapshot.nodes && snapshot.edges) {
        setNodes(snapshot.nodes);
        setEdges(snapshot.edges);
        toast.success(`Restored to version ${version.version_number}`);
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Error restoring version:', error);
      toast.error('Failed to restore version');
    }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm">
            <History className="w-4 h-4 mr-2" />
            Versions
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              Version History
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Version
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Version</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Description (optional)</Label>
                      <Input
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="What changed in this version?"
                      />
                    </div>
                    <Button onClick={handleCreateVersion} className="w-full">
                      Create Version
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-100px)] mt-6">
            <div className="space-y-2">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm">
                      Version {version.version_number}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(version.created_at).toLocaleString()}
                    </div>
                  </div>

                  {version.snapshot?.title && (
                    <div className="text-sm text-muted-foreground">
                      {version.snapshot.title}
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    {version.snapshot?.nodes?.length || 0} nodes,{' '}
                    {version.snapshot?.edges?.length || 0} edges
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRestoreVersion(version)}
                    className="w-full"
                  >
                    <RotateCcw className="w-3 h-3 mr-2" />
                    Restore This Version
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default VersionHistoryPanel;
