import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Brand {
  id: string;
  name: string;
}

interface BrandSection {
  id: string;
  section_name: string;
  icon_name: string;
}

interface ExportToBrandDialogProps {
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

export const ExportToBrandDialog = ({ open, onOpenChange, assetData }: ExportToBrandDialogProps) => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [sections, setSections] = useState<BrandSection[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (open) {
      loadBrands();
    }
  }, [open]);

  useEffect(() => {
    if (selectedBrand) {
      loadSections(selectedBrand);
    }
  }, [selectedBrand]);

  const loadBrands = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('id, name')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBrands(data || []);
    } catch (error) {
      console.error('Failed to load brands:', error);
      toast.error('Failed to load brands');
    }
  };

  const loadSections = async (brandId: string) => {
    try {
      const { data, error } = await supabase
        .from('brand_sections')
        .select('id, section_name, icon_name')
        .eq('brand_id', brandId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setSections(data || []);
    } catch (error) {
      console.error('Failed to load sections:', error);
      toast.error('Failed to load sections');
    }
  };

  const handleExport = async () => {
    if (!selectedBrand || !selectedSection || !assetData.file) {
      toast.error('Please select brand and section');
      return;
    }

    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('export-to-brand', {
        body: {
          brandId: selectedBrand,
          sectionId: selectedSection,
          assetFile: assetData.file,
          assetType: assetData.type,
          metadata: assetData.metadata,
          sourceId: assetData.sourceId,
          sourceType: assetData.sourceType || 'canvas'
        }
      });

      if (error) throw error;

      toast.success('Asset exported to brand successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to export to brand:', error);
      toast.error('Failed to export to brand');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export to Brand Assets</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Select Brand</Label>
            <Select value={selectedBrand} onValueChange={setSelectedBrand}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a brand" />
              </SelectTrigger>
              <SelectContent>
                {brands.map((brand) => (
                  <SelectItem key={brand.id} value={brand.id}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Select Section</Label>
            <Select 
              value={selectedSection} 
              onValueChange={setSelectedSection}
              disabled={!selectedBrand}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a section" />
              </SelectTrigger>
              <SelectContent>
                {sections.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    {section.section_name}
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
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={!selectedBrand || !selectedSection || exporting}
          >
            {exporting ? 'Exporting...' : 'Export to Brand'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};