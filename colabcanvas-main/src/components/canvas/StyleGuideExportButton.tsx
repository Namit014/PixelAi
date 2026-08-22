import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Share2, FileJson, FileCode, Palette, Box } from "lucide-react";
import { toast } from "sonner";
import { exportStyleGuide, generateShareLink, downloadFile, getFileExtension, type ExportFormat } from "@/lib/mcpClient";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { StyleGuideExportDialog } from "./StyleGuideExportDialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

interface StyleGuideExportButtonProps {
  projectId: string;
  asMenuItem?: boolean;
}

export function StyleGuideExportButton({ projectId, asMenuItem = false }: StyleGuideExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [expiresInDays, setExpiresInDays] = useState<number | null>(30);
  const [isExporting, setIsExporting] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    try {
      const result = await exportStyleGuide(projectId, format);
      const content = typeof result.content === 'string' 
        ? result.content 
        : JSON.stringify(result.content, null, 2);
      
      downloadFile(content, result.fileName, result.contentType);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error.message || 'Failed to export style guide');
    } finally {
      setIsExporting(false);
    }
  };

  const handleGenerateShareLink = async () => {
    setIsExporting(true);
    try {
      const result = await generateShareLink(projectId, expiresInDays);
      setShareUrl(result.shareUrl);
      toast.success('Share link generated!');
    } catch (error: any) {
      console.error('Share link error:', error);
      toast.error(error.message || 'Failed to generate share link');
    } finally {
      setIsExporting(false);
    }
  };

  const copyShareUrl = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied to clipboard!');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {asMenuItem ? (
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setOpen(true); }} className="cursor-pointer">
            <Share2 className="mr-2 h-4 w-4" />
            <span>Export Brand System</span>
          </DropdownMenuItem>
        ) : (
          <Button variant="outline" size="sm">
            <Share2 className="w-4 h-4 mr-2" />
            Export Brand System
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export Brand System</DialogTitle>
          <DialogDescription>
            Download your brand system or generate a shareable link
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="download" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="download">Download</TabsTrigger>
            <TabsTrigger value="share">Share Link</TabsTrigger>
          </TabsList>

          <TabsContent value="download" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                onClick={() => handleExport('json')}
                disabled={isExporting}
              >
                <FileJson className="w-4 h-4 mr-2" />
                JSON
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleExport('css')}
                disabled={isExporting}
              >
                <FileCode className="w-4 h-4 mr-2" />
                CSS Variables
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleExport('tailwind')}
                disabled={isExporting}
              >
                <Palette className="w-4 h-4 mr-2" />
                Tailwind Config
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleExport('figma')}
                disabled={isExporting}
              >
                <Download className="w-4 h-4 mr-2" />
                Figma
              </Button>
            </div>
            
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowImportDialog(true)}
              >
                <Box className="w-4 h-4 mr-2" />
                Platform Integration Guides
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="share" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="expires">Link expires after 30 days</Label>
                <Switch
                  id="expires"
                  checked={expiresInDays !== null}
                  onCheckedChange={(checked) => setExpiresInDays(checked ? 30 : null)}
                />
              </div>

              <Button 
                onClick={handleGenerateShareLink}
                disabled={isExporting}
                className="w-full"
              >
                Generate Share Link
              </Button>

              {shareUrl && (
                <div className="space-y-2">
                  <Label>Share URL</Label>
                  <div className="flex gap-2">
                    <Input value={shareUrl} readOnly />
                    <Button onClick={copyShareUrl} variant="outline">
                      Copy
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
      
      <StyleGuideExportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onExport={handleExport}
      />
    </Dialog>
  );
}
