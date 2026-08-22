import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChooseBrandSystemIcon } from '@/components/icons/CustomIcons';

interface BrandSystem {
  id?: string;
  name?: string;
  colors?: {
    primary?: { hex: string; name: string };
    secondary?: { hex: string; name: string };
    accent?: { hex: string; name: string };
  };
  typography?: {
    primary_font?: string;
    secondary_font?: string;
    font_weights?: number[];
  };
  style?: string;
  logo_type?: string;
}

interface BrandSystemSelectorProps {
  selectedBrandSystem: BrandSystem | null;
  onBrandSystemChange: (system: BrandSystem | null) => void;
}

const BrandSystemSelector = ({ selectedBrandSystem, onBrandSystemChange }: BrandSystemSelectorProps) => {
  const { toast } = useToast();
  const [presets, setPresets] = useState<any[]>([]);
  const [userSystems, setUserSystems] = useState<any[]>([]);
  const [customSystem, setCustomSystem] = useState<BrandSystem>({
    colors: {
      primary: { hex: '#000000', name: 'Black' },
      secondary: { hex: '#FFFFFF', name: 'White' },
      accent: { hex: '#CCCCCC', name: 'Gray' }
    },
    typography: {
      primary_font: 'Inter',
      secondary_font: 'Roboto',
      font_weights: [400, 600, 700]
    },
    style: 'modern clean',
    logo_type: 'wordmark'
  });
  const [customName, setCustomName] = useState('');

  useEffect(() => {
    loadPresets();
    loadUserSystems();
  }, []);

  const loadPresets = async () => {
    const { data, error } = await supabase
      .from('brand_system_presets')
      .select('*')
      .eq('is_default', true);
    
    if (!error && data) {
      setPresets(data);
    }
  };

  const loadUserSystems = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('user_brand_systems')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setUserSystems(data);
    }
  };

  const saveCustomSystem = async () => {
    if (!customName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for your brand system',
        variant: 'destructive'
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('user_brand_systems')
      .insert([{
        user_id: user.id,
        name: customName,
        brand_system: customSystem as any
      }]);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to save brand system',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'Brand system saved successfully'
      });
      loadUserSystems();
      onBrandSystemChange({ ...customSystem, name: customName });
    }
  };

  const deleteUserSystem = async (id: string) => {
    const { error } = await supabase
      .from('user_brand_systems')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete brand system',
        variant: 'destructive'
      });
    } else {
      loadUserSystems();
      if (selectedBrandSystem?.id === id) {
        onBrandSystemChange(null);
      }
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={`h-11 w-11 rounded-lg transition-smooth ${
            selectedBrandSystem 
              ? 'bg-primary/10 text-primary hover:bg-primary/20' 
              : 'text-muted-foreground hover:text-foreground bg-zinc-200 hover:bg-zinc-100'
          }`}
          title="Brand System"
        >
          <ChooseBrandSystemIcon className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="start">
        <Tabs defaultValue="presets" className="w-full">
          <div className="p-4 pb-0">
            <h4 className="font-semibold text-sm mb-2">Brand System</h4>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="presets">Presets</TabsTrigger>
              <TabsTrigger value="custom">Custom</TabsTrigger>
              <TabsTrigger value="saved">Saved</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="presets" className="p-4 pt-3">
            <ScrollArea className="h-[320px]">
              <div className="grid grid-cols-2 gap-2">
                {presets.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => onBrandSystemChange(preset.brand_system)}
                    className={`p-3 rounded-lg border text-left hover:border-primary transition-colors ${
                      selectedBrandSystem?.name === preset.name 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border'
                    }`}
                  >
                    <div className="font-medium text-sm mb-2">{preset.name}</div>
                    <div className="flex gap-1 mb-2">
                      {Object.values(preset.brand_system.colors || {}).map((color: any, idx: number) => (
                        <div 
                          key={idx}
                          className="w-6 h-6 rounded border"
                          style={{ backgroundColor: color.hex }}
                        />
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {preset.brand_system.style}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="custom" className="p-4 pt-3">
            <ScrollArea className="h-[320px]">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={customSystem.colors?.primary?.hex || '#000000'}
                      onChange={(e) => setCustomSystem({
                        ...customSystem,
                        colors: {
                          ...customSystem.colors,
                          primary: { hex: e.target.value, name: 'Primary' }
                        }
                      })}
                      className="w-12 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={customSystem.colors?.primary?.hex || '#000000'}
                      onChange={(e) => setCustomSystem({
                        ...customSystem,
                        colors: {
                          ...customSystem.colors,
                          primary: { hex: e.target.value, name: 'Primary' }
                        }
                      })}
                      placeholder="#000000"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Secondary Color</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={customSystem.colors?.secondary?.hex || '#FFFFFF'}
                      onChange={(e) => setCustomSystem({
                        ...customSystem,
                        colors: {
                          ...customSystem.colors,
                          secondary: { hex: e.target.value, name: 'Secondary' }
                        }
                      })}
                      className="w-12 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={customSystem.colors?.secondary?.hex || '#FFFFFF'}
                      onChange={(e) => setCustomSystem({
                        ...customSystem,
                        colors: {
                          ...customSystem.colors,
                          secondary: { hex: e.target.value, name: 'Secondary' }
                        }
                      })}
                      placeholder="#FFFFFF"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Accent Color</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={customSystem.colors?.accent?.hex || '#CCCCCC'}
                      onChange={(e) => setCustomSystem({
                        ...customSystem,
                        colors: {
                          ...customSystem.colors,
                          accent: { hex: e.target.value, name: 'Accent' }
                        }
                      })}
                      className="w-12 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={customSystem.colors?.accent?.hex || '#CCCCCC'}
                      onChange={(e) => setCustomSystem({
                        ...customSystem,
                        colors: {
                          ...customSystem.colors,
                          accent: { hex: e.target.value, name: 'Accent' }
                        }
                      })}
                      placeholder="#CCCCCC"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Primary Font</Label>
                  <Input
                    value={customSystem.typography?.primary_font || 'Inter'}
                    onChange={(e) => setCustomSystem({
                      ...customSystem,
                      typography: {
                        ...customSystem.typography,
                        primary_font: e.target.value
                      }
                    })}
                    placeholder="Inter"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Style Keywords</Label>
                  <Input
                    value={customSystem.style || ''}
                    onChange={(e) => setCustomSystem({
                      ...customSystem,
                      style: e.target.value
                    })}
                    placeholder="modern bold elegant"
                  />
                </div>

                <div className="space-y-2">
                  <Label>System Name</Label>
                  <Input
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="My Brand System"
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={saveCustomSystem} className="flex-1">
                    Save & Use
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => onBrandSystemChange(customSystem)}
                  >
                    Use Now
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="saved" className="p-4 pt-3">
            <ScrollArea className="h-[320px]">
              {userSystems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No saved brand systems yet
                </div>
              ) : (
                <div className="space-y-2">
                  {userSystems.map(system => (
                    <div
                      key={system.id}
                      className={`p-3 rounded-lg border flex items-center justify-between group hover:border-primary transition-colors ${
                        selectedBrandSystem?.id === system.id 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border'
                      }`}
                    >
                      <button
                        onClick={() => onBrandSystemChange({ ...system.brand_system, id: system.id, name: system.name })}
                        className="flex-1 text-left"
                      >
                        <div className="font-medium text-sm mb-1">{system.name}</div>
                        <div className="flex gap-1">
                          {Object.values(system.brand_system.colors || {}).map((color: any, idx: number) => (
                            <div 
                              key={idx}
                              className="w-5 h-5 rounded border"
                              style={{ backgroundColor: color.hex }}
                            />
                          ))}
                        </div>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deleteUserSystem(system.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};

export default BrandSystemSelector;
