import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { History, Pin, RotateCcw, Eye } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface VersionsTabProps {
  brandId: string;
  mcpConfigId: string | null;
}

export function VersionsTab({ brandId, mcpConfigId }: VersionsTabProps) {
  const [versions, setVersions] = useState<any[]>([]);
  const [versionMode, setVersionMode] = useState<string>("latest");
  const [pinnedVersionId, setPinnedVersionId] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadVersions();
    if (mcpConfigId) {
      loadVersionConfig();
    }
  }, [brandId, mcpConfigId]);

  const loadVersions = async () => {
    const { data } = await supabase
      .from("brand_versions")
      .select("*")
      .eq("brand_id", brandId)
      .order("version_number", { ascending: false });
    
    if (data) setVersions(data);
  };

  const loadVersionConfig = async () => {
    if (!mcpConfigId) return;
    
    const { data } = await supabase
      .from("brand_mcp_configs")
      .select("version_mode, pinned_version_id")
      .eq("id", mcpConfigId)
      .single();
    
    if (data) {
      setVersionMode(data.version_mode || "latest");
      setPinnedVersionId(data.pinned_version_id);
    }
  };

  const updateVersionMode = async (mode: string) => {
    if (!mcpConfigId) return;

    setLoading(true);
    const { error } = await supabase
      .from("brand_mcp_configs")
      .update({ version_mode: mode })
      .eq("id", mcpConfigId);

    if (!error) {
      setVersionMode(mode);
      toast.success(`Version mode set to ${mode}`);
    }
    setLoading(false);
  };

  const pinVersion = async (versionId: string) => {
    if (!mcpConfigId) return;

    setLoading(true);
    const { error } = await supabase
      .from("brand_mcp_configs")
      .update({ 
        pinned_version_id: versionId,
        version_mode: "pinned"
      })
      .eq("id", mcpConfigId);

    if (!error) {
      setPinnedVersionId(versionId);
      setVersionMode("pinned");
      toast.success("Version pinned for MCP access");
    }
    setLoading(false);
  };

  const restoreVersion = async (versionId: string) => {
    const version = versions.find(v => v.id === versionId);
    if (!version) return;

    setLoading(true);
    const snapshot = version.snapshot;
    
    const { error } = await supabase
      .from("brands")
      .update({
        name: snapshot.name,
        description: snapshot.description,
        brand_system_snapshot: snapshot.brand_system_snapshot,
        logo_primary_url: snapshot.logo_primary_url,
        logo_secondary_url: snapshot.logo_secondary_url,
        website_url: snapshot.website_url,
        industry: snapshot.industry,
        target_audience: snapshot.target_audience,
        brand_voice: snapshot.brand_voice
      })
      .eq("id", brandId);

    if (!error) {
      toast.success("Brand restored to this version");
      loadVersions();
    } else {
      toast.error("Failed to restore version");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Version Mode</CardTitle>
          <CardDescription className="text-xs">
            Control which version AI tools access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={versionMode} onValueChange={updateVersionMode}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">Always Latest</SelectItem>
              <SelectItem value="pinned">Pin Specific Version</SelectItem>
              <SelectItem value="all">Allow Version Selection</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="w-4 h-4" />
            Version History
          </CardTitle>
          <CardDescription className="text-xs">
            {versions.length} versions available
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            {versions.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-4">
                No versions yet. Changes will be tracked automatically.
              </p>
            ) : (
              <div className="space-y-2">
                {versions.map((version, index) => (
                  <div
                    key={version.id}
                    className="p-3 rounded border border-zinc-200 dark:border-zinc-800"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] h-5">
                          v{version.version_number}
                        </Badge>
                        {index === 0 && (
                          <Badge className="bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 text-[10px] h-5">
                            Latest
                          </Badge>
                        )}
                        {pinnedVersionId === version.id && (
                          <Badge className="bg-zinc-700 dark:bg-zinc-300 text-zinc-50 dark:text-zinc-900 text-[10px] h-5">
                            <Pin className="w-2.5 h-2.5 mr-1" />
                            Pinned
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedVersion(version)}
                          className="h-7 px-2"
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => pinVersion(version.id)}
                          disabled={loading}
                          className="h-7 px-2"
                        >
                          <Pin className="w-3 h-3" />
                        </Button>
                        {index !== 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => restoreVersion(version.id)}
                            disabled={loading}
                            className="h-7 px-2"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                      {version.change_summary || "Brand updated"}
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      {new Date(version.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {selectedVersion && (
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              Version {selectedVersion.version_number} Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-40">
              <pre className="text-[10px] text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                {JSON.stringify(selectedVersion.snapshot, null, 2)}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
