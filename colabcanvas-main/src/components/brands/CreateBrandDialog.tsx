import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Globe } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CreateBrandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreateBrandDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: CreateBrandDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [industry, setIndustry] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [useAI, setUseAI] = useState(false);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const extractFromWebsite = async () => {
    if (!websiteUrl.trim()) {
      toast({
        title: "URL required",
        description: "Please enter a website URL",
        variant: "destructive",
      });
      return;
    }

    setExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-brand-from-website", {
        body: { websiteUrl }
      });

      if (error) throw error;

      if (data?.success && data?.data) {
        setExtractedData(data.data);
        setName(name || websiteUrl.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]);
        setDescription(data.data.description || description);
        setIndustry(data.data.industry || industry);
        
        toast({
          title: "Brand assets extracted!",
          description: `Found ${data.data.colors?.length || 0} colors and brand information`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Extraction failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setExtracting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-brand", {
        body: { 
          name, 
          description, 
          industry,
          useAI,
          website_url: websiteUrl || null,
          extraction_metadata: extractedData ? {
            extractedAt: new Date().toISOString(),
            colors: extractedData.colors,
            typography: extractedData.typography,
            styleKeywords: extractedData.styleKeywords
          } : null
        },
      });

      if (error) throw error;

      toast({
        title: "Brand created",
        description: useAI ? "Brand created with AI-generated template" : "Your brand has been created successfully",
      });

      onSuccess();
      setName("");
      setDescription("");
      setIndustry("");
      setWebsiteUrl("");
      setExtractedData(null);
      navigate(`/brands/${data.brand.slug}`);
    } catch (error: any) {
      toast({
        title: "Error creating brand",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Brand</DialogTitle>
            <DialogDescription>
              Start building your brand asset library with guidelines and files
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="manual" className="py-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
              <TabsTrigger value="extract">
                <Globe className="w-4 h-4 mr-2" />
                Extract from Website
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="manual" className="space-y-4 mt-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Brand Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Acme Co"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of your brand..."
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="Technology, Fashion, etc."
                />
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="use-ai"
                  checked={useAI}
                  onCheckedChange={setUseAI}
                />
                <Label htmlFor="use-ai" className="text-sm cursor-pointer">
                  Generate AI template with colors and typography
                </Label>
              </div>
            </TabsContent>
            
            <TabsContent value="extract" className="space-y-4 mt-4">
              <div className="grid gap-2">
                <Label htmlFor="website">Website URL *</Label>
                <div className="flex gap-2">
                  <Input
                    id="website"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://example.com"
                    type="url"
                  />
                  <Button
                    type="button"
                    onClick={extractFromWebsite}
                    disabled={extracting || !websiteUrl.trim()}
                  >
                    {extracting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  AI will automatically extract logo, colors, fonts, and brand style
                </p>
              </div>

              {extractedData && (
                <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Sparkles className="w-4 h-4 text-zinc-500" />
                    Extracted Assets
                  </div>
                  {extractedData.colors && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Colors Found:</p>
                      <div className="flex gap-1 flex-wrap">
                        {extractedData.colors.map((color: any, i: number) => (
                          <div
                            key={i}
                            className="w-8 h-8 rounded border"
                            style={{ backgroundColor: color.hex }}
                            title={color.name}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {extractedData.description && (
                    <p className="text-xs text-muted-foreground">
                      {extractedData.description}
                    </p>
                  )}
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="name-extract">Brand Name *</Label>
                <Input
                  id="name-extract"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Acme Co"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description-extract">Description</Label>
                <Textarea
                  id="description-extract"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of your brand..."
                  rows={2}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="industry-extract">Industry</Label>
                <Input
                  id="industry-extract"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="Technology, Fashion, etc."
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {useAI && <Sparkles className="w-4 h-4 mr-2" />}
              Create Brand
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};