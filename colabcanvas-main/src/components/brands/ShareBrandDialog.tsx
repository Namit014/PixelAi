import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Copy, Check } from 'lucide-react';

interface ShareBrandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  brandName: string;
}

export const ShareBrandDialog = ({
  open,
  onOpenChange,
  brandId,
  brandName,
}: ShareBrandDialogProps) => {
  const { toast } = useToast();
  const [shareName, setShareName] = useState('');
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleCreateShare = async () => {
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('share-brand', {
        body: {
          brand_id: brandId,
          share_name: shareName || `${brandName} Share`,
          password: usePassword ? password : undefined,
        },
      });

      if (error) throw error;

      const url = `${window.location.origin}/brands/shared/${data.share_token}`;
      setShareUrl(url);

      toast({
        title: 'Share link created',
        description: 'Your brand is now shareable',
      });
    } catch (error: any) {
      toast({
        title: 'Failed to create share link',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Copied to clipboard' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Brand</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!shareUrl ? (
            <>
              <div className="space-y-2">
                <Label>Share Name (Optional)</Label>
                <Input
                  value={shareName}
                  onChange={(e) => setShareName(e.target.value)}
                  placeholder={`${brandName} Share`}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Password Protection</Label>
                <Switch checked={usePassword} onCheckedChange={setUsePassword} />
              </div>

              {usePassword && (
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                  />
                </div>
              )}

              <Button onClick={handleCreateShare} disabled={creating} className="w-full">
                {creating ? 'Creating...' : 'Create Share Link'}
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Share URL</Label>
                <div className="flex gap-2">
                  <Input value={shareUrl} readOnly />
                  <Button variant="outline" size="icon" onClick={handleCopy}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
