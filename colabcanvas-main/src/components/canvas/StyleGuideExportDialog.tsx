import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileJson, Code, Layout, Palette, Box } from "lucide-react";

interface StyleGuideExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (format: string) => void;
}

const platformInstructions = {
  figma: {
    title: "Import to Figma",
    icon: Palette,
    steps: [
      "1. Download the Figma Tokens JSON file",
      "2. In Figma, install the 'Figma Tokens' plugin from the community",
      "3. Open the plugin and click 'Import'",
      "4. Select the downloaded JSON file",
      "5. Your brand colors, typography, and spacing tokens are now available in Figma!"
    ],
    note: "Figma Tokens plugin allows you to use your brand system across all Figma files."
  },
  colab: {
    title: "Import to Colab",
    icon: Code,
    steps: [
      "1. Download the Colab Theme JSON file",
      "2. In Colab Canvas, open your project settings",
      "3. Navigate to 'Design System' or 'Theme'",
      "4. Click 'Import Theme' and upload the JSON file",
      "5. Your brand colors, fonts, and styles are applied to the project!"
    ],
    note: "This will update your project's design tokens in index.css and tailwind.config.ts"
  },
  wix: {
    title: "Import to Wix",
    icon: Layout,
    steps: [
      "1. Download the Wix Design JSON file",
      "2. In Wix Editor, go to 'Site Design' > 'Site Styles'",
      "3. Click 'Import Theme' or 'Custom Theme'",
      "4. Upload the JSON file with your brand system",
      "5. Wix will apply your colors and fonts across the site!"
    ],
    note: "Wix may require manual adjustment for some design tokens."
  },
  framer: {
    title: "Import to Framer",
    icon: Box,
    steps: [
      "1. Download the Framer Config TSX file",
      "2. In Framer, go to your project settings",
      "3. Navigate to 'Code' > 'Theme'",
      "4. Paste the exported theme configuration",
      "5. Your brand system is now available in Framer components!"
    ],
    note: "Framer uses React components, so the exported theme is ready to use."
  }
};

export function StyleGuideExportDialog({ open, onOpenChange, onExport }: StyleGuideExportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export & Import Style Guide</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="figma" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="figma">Figma</TabsTrigger>
            <TabsTrigger value="colab">Colab</TabsTrigger>
            <TabsTrigger value="wix">Wix</TabsTrigger>
            <TabsTrigger value="framer">Framer</TabsTrigger>
          </TabsList>
          
          {Object.entries(platformInstructions).map(([key, platform]) => (
            <TabsContent key={key} value={key} className="mt-4">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <platform.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{platform.title}</h3>
                    <p className="text-sm text-muted-foreground">{platform.note}</p>
                  </div>
                </div>
                
                <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                  <h4 className="font-medium text-sm mb-3">How to Import:</h4>
                  {platform.steps.map((step, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="text-xs text-muted-foreground mt-0.5">{step.split('.')[0]}.</div>
                      <p className="text-sm flex-1">{step.split('.').slice(1).join('.')}</p>
                    </div>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={() => {
                      onExport(key);
                      onOpenChange(false);
                    }}
                    className="flex-1"
                  >
                    <FileJson className="h-4 w-4 mr-2" />
                    Download {key.charAt(0).toUpperCase() + key.slice(1)} File
                  </Button>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
        
        <div className="mt-4 p-4 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <p className="text-sm text-zinc-900 dark:text-zinc-100">
            <strong>Note:</strong> These export files contain your brand colors, typography, spacing, and other design tokens. 
            Most platforms require manual import or a plugin/extension to use these files.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
