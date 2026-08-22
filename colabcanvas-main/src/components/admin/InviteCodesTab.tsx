import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Copy, Trash2, Check, X } from 'lucide-react';
import { format } from 'date-fns';

export const InviteCodesTab = () => {
  const queryClient = useQueryClient();
  const [newCode, setNewCode] = useState('');
  const [maxUses, setMaxUses] = useState<number | null>(1);
  const [expiresAt, setExpiresAt] = useState('');
  const [description, setDescription] = useState('');

  // Fetch invite codes
  const { data: codes, isLoading } = useQuery({
    queryKey: ['invite-codes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invite_codes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Generate random code
  const generateRandomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
      if (i > 0 && i % 4 === 0) code += '-';
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCode(code);
  };

  // Create code mutation
  const createCodeMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('invite_codes')
        .insert({
          code: newCode.trim().toUpperCase(),
          max_uses: maxUses,
          expires_at: expiresAt || null,
          description: description || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invite-codes'] });
      toast.success('Invite code created successfully');
      setNewCode('');
      setDescription('');
      setMaxUses(1);
      setExpiresAt('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create invite code');
    }
  });

  // Delete code mutation
  const deleteCodeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('invite_codes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invite-codes'] });
      toast.success('Invite code deleted');
    }
  });

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Invite Code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  placeholder="XXXX-XXXX-XXXX"
                  className="font-mono"
                />
                <Button onClick={generateRandomCode} variant="outline">
                  Generate
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxUses">Max Uses (blank = unlimited)</Label>
              <Input
                id="maxUses"
                type="number"
                value={maxUses || ''}
                onChange={(e) => setMaxUses(e.target.value ? parseInt(e.target.value) : null)}
                placeholder="1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expires At (optional)</Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Early access batch 1"
              />
            </div>
          </div>

          <Button 
            onClick={() => createCodeMutation.mutate()}
            disabled={!newCode.trim() || createCodeMutation.isPending}
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Invite Code
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Codes ({codes?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {isLoading && <p className="text-muted-foreground">Loading codes...</p>}
            
            {codes && codes.length === 0 && (
              <p className="text-muted-foreground">No invite codes created yet.</p>
            )}
            
            {codes?.map((code) => (
              <div key={code.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-4">
                    <code className="font-mono text-lg font-semibold">{code.code}</code>
                    
                    {code.is_active ? (
                      <span className="flex items-center gap-1 text-xs text-green-600">
                        <Check className="h-3 w-3" /> Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-red-600">
                        <X className="h-3 w-3" /> Inactive
                      </span>
                    )}
                  </div>
                  
                  <div className="text-sm text-muted-foreground mt-1">
                    {code.description && <p>{code.description}</p>}
                    <p>
                      Uses: {code.current_uses} / {code.max_uses || '∞'}
                      {code.expires_at && ` • Expires: ${format(new Date(code.expires_at), 'PPP')}`}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => copyCode(code.code)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => deleteCodeMutation.mutate(code.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
