import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

interface Version {
  id: string;
  version_number: number;
  snapshot: any;
  created_at: string;
  description: string | null;
}

interface VersionHistoryProps {
  projectId: string;
  onClose: () => void;
  onRestore: (snapshot: any) => void;
}

export function VersionHistory({ projectId, onClose, onRestore }: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([]);

  useEffect(() => {
    loadVersions();
  }, [projectId]);

  const loadVersions = async () => {
    const { data, error } = await supabase
      .from('design_tool_versions')
      .select('*')
      .eq('project_id', projectId)
      .order('version_number', { ascending: false });

    if (!error && data) {
      setVersions(data);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Version History</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[60vh]">
          <div className="space-y-2 p-4">
            {versions.map(version => (
              <div
                key={version.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent"
              >
                <div>
                  <h4 className="font-medium">Version {version.version_number}</h4>
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
                  </p>
                  {version.description && (
                    <p className="text-sm mt-1">{version.description}</p>
                  )}
                </div>
                <Button onClick={() => onRestore(version.snapshot)}>
                  Restore
                </Button>
              </div>
            ))}

            {versions.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No version history yet
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
