import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionContent } from "@/components/brands/SectionContent";
import { Download, Lock, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ContentBlock } from "@/types/brandBlocks";

export default function SharedBrand() {
  const { shareToken } = useParams();
  const { toast } = useToast();
  
  const [brand, setBrand] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [allSectionsBlocks, setAllSectionsBlocks] = useState<Record<string, ContentBlock[]>>({});
  const [loading, setLoading] = useState(true);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [downloadEnabled, setDownloadEnabled] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadSharedBrand();
  }, [shareToken]);

  const loadSharedBrand = async (pwd?: string) => {
    try {
      setVerifying(true);
      setError("");
      
      const { data, error } = await supabase.functions.invoke('verify-brand-share', {
        body: { 
          share_token: shareToken,
          password: pwd
        }
      });

      if (error) throw error;

      if (data.requires_password) {
        setRequiresPassword(true);
        setVerifying(false);
        return;
      }

      setBrand(data.brand);
      setSections(data.sections || []);
      setDownloadEnabled(data.download_enabled);
      
      // Organize blocks by section
      const blocksMap: Record<string, ContentBlock[]> = {};
      (data.sections || []).forEach((section: any) => {
        blocksMap[section.id] = (section.brand_content_blocks || []) as ContentBlock[];
      });
      setAllSectionsBlocks(blocksMap);
      
      setRequiresPassword(false);
    } catch (error: any) {
      console.error('Error loading shared brand:', error);
      setError(error.message || 'Failed to load shared brand');
      toast({
        title: "Error",
        description: error.message || 'Failed to load shared brand',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setVerifying(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    loadSharedBrand(password);
  };

  if (loading || verifying) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="text-2xl font-semibold text-foreground">Unable to Load Brand</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (requiresPassword) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-full max-w-md p-8 space-y-6 border border-border rounded-lg">
          <div className="space-y-2 text-center">
            <Lock className="w-12 h-12 text-foreground mx-auto" />
            <h2 className="text-2xl font-semibold text-foreground">Password Required</h2>
            <p className="text-sm text-muted-foreground">
              This brand is password protected. Please enter the password to continue.
            </p>
          </div>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full"
              autoFocus
            />
            <Button type="submit" className="w-full" disabled={!password.trim()}>
              Continue
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (!brand) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-foreground">{brand.name}</h1>
              {brand.description && (
                <p className="text-muted-foreground mt-2">{brand.description}</p>
              )}
            </div>
            {downloadEnabled && (
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto py-8 px-6 space-y-12">
        {sections.map(section => (
          <div key={section.id} className="space-y-6">
            <div className="border-b border-border pb-3">
              <h2 className="text-2xl font-semibold text-foreground">
                {section.section_name}
              </h2>
            </div>
            <SectionContent
              sectionId={section.id}
              brandId={brand.id}
              blocks={allSectionsBlocks[section.id] || []}
              isPreviewMode={true}
              onAddBlock={() => {}}
              onUpdateBlock={() => {}}
              onDeleteBlock={() => {}}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
