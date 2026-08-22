import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Upload, Palette, Workflow, Download } from 'lucide-react';

interface ExportMenuProps {
  onExportToBrand: () => void;
  onSendToCosmo: () => void;
  onDownload: () => void;
  trigger?: React.ReactNode;
}

export const ExportMenu = ({ onExportToBrand, onSendToCosmo, onDownload, trigger }: ExportMenuProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Export
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onExportToBrand}>
          <Palette className="w-4 h-4 mr-2" />
          Export to Brand
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onSendToCosmo}>
          <Workflow className="w-4 h-4 mr-2" />
          Send to Cosmo
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDownload}>
          <Download className="w-4 h-4 mr-2" />
          Download
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};