import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface Section {
  id: string;
  section_name: string;
  icon_name?: string;
  is_default: boolean;
  emoji?: string;
}

interface BrandSidebarProps {
  sections: Section[];
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
  onAddSection: () => void;
}

export const BrandSidebar = ({
  sections,
  activeSection,
  onSectionChange,
  onAddSection
}: BrandSidebarProps) => {

  return <div className="w-56 border-r border-zinc-200 bg-background h-full flex flex-col overflow-hidden">
      <div className="px-3 py-4 border-b border-zinc-200 bg-zinc-50">
        <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Sections</h3>
      </div>

      <div className="flex-1 overflow-y-auto bg-zinc-50">
        <div className="p-2">
          {sections.map(section => (
            <button 
              key={section.id} 
              onClick={() => onSectionChange(section.id)}
              className={`w-full px-3 py-2 rounded text-sm text-left transition-colors ${
                activeSection === section.id 
                  ? 'bg-zinc-100 text-zinc-900 font-medium' 
                  : 'text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              <span className="truncate">{section.section_name}</span>
            </button>
          ))}

          <div className="my-3 border-t border-zinc-200" />

          <Button variant="ghost" size="sm" onClick={onAddSection} className="w-full justify-start gap-2 text-zinc-700 hover:bg-zinc-50">
            <Plus className="w-4 h-4" />
            Add Section
          </Button>
        </div>
      </div>
    </div>;
};