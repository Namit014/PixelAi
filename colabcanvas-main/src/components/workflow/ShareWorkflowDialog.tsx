import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, Link, Loader2, Trash2, Check, Workflow, Mail, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

interface ShareWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowId: string;
  workflowTitle: string;
}

interface ShareLink {
  id: string;
  share_token: string;
  permission: string;
  expires_at: string | null;
  created_at: string;
  is_active: boolean;
}

interface Collaborator {
  id: string;
  user_id: string;
  permission: string;
  joined_at: string;
  is_online: boolean;
  profiles: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

export function ShareWorkflowDialog({ open, onOpenChange, workflowId, workflowTitle }: ShareWorkflowDialogProps) {
  const [loading, setLoading] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [permission, setPermission] = useState<'view' | 'edit'>('view');
  const [expiresInDays, setExpiresInDays] = useState<string>('never');
  const [existingShares, setExistingShares] = useState<ShareLink[]>([]);
  const [loadingShares, setLoadingShares] = useState(false);
  const [copied, setCopied] = useState(false);

  // Email invite state
  const [email, setEmail] = useState('');
  const [emailPermission, setEmailPermission] = useState<'view' | 'edit'>('view');
  const [invitingByEmail, setInvitingByEmail] = useState(false);

  // Collaborators state
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loadingCollaborators, setLoadingCollaborators] = useState(false);

  // Load existing shares and collaborators when dialog opens
  useEffect(() => {
    if (open && workflowId) {
      loadExistingShares();
      loadCollaborators();
    }
  }, [open, workflowId]);

  const loadExistingShares = async () => {
    setLoadingShares(true);
    try {
      const { data, error } = await supabase
        .from('workflow_shares')
        .select('*')
        .eq('workflow_id', workflowId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExistingShares(data || []);
    } catch (error) {
      console.error('Error loading shares:', error);
    } finally {
      setLoadingShares(false);
    }
  };

  const loadCollaborators = async () => {
    setLoadingCollaborators(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('manage-collaborator', {
        body: { 
          action: 'list',
          resourceType: 'workflow',
          resourceId: workflowId
        },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) throw error;
      setCollaborators(data?.collaborators || []);
    } catch (error) {
      console.error('Error loading collaborators:', error);
    } finally {
      setLoadingCollaborators(false);
    }
  };

  const handleGenerateLink = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in");
        return;
      }

      const { data, error } = await supabase.functions.invoke('share-workflow', {
        body: { 
          workflowId, 
          permission,
          expiresInDays: expiresInDays === 'never' ? null : parseInt(expiresInDays),
        },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) throw error;

      setGeneratedUrl(data.shareUrl);
      loadExistingShares();
      toast.success("Share link created! Copy the link to share with collaborators.");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate share link");
    } finally {
      setLoading(false);
    }
  };

  const handleInviteByEmail = async () => {
    if (!email.trim()) {
      toast.error("Please enter an email");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Invalid email format");
      return;
    }

    setInvitingByEmail(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in");
        return;
      }

      const { data, error } = await supabase.functions.invoke('invite-by-email', {
        body: { 
          email: email.trim(),
          resourceType: 'workflow',
          resourceId: workflowId,
          permission: emailPermission
        },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) throw error;

      toast.success(data.message || "Invitation sent!");
      setEmail('');
      loadExistingShares();
    } catch (error: any) {
      toast.error(error.message || "Failed to send invitation");
    } finally {
      setInvitingByEmail(false);
    }
  };

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy");
    }
  };

  const handleRevokeShare = async (shareId: string) => {
    try {
      const { error } = await supabase
        .from('workflow_shares')
        .update({ is_active: false })
        .eq('id', shareId);

      if (error) throw error;

      setExistingShares(prev => prev.filter(s => s.id !== shareId));
      toast.success("Share link revoked");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleUpdatePermission = async (collaboratorId: string, newPermission: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase.functions.invoke('manage-collaborator', {
        body: { 
          action: 'update_permission',
          resourceType: 'workflow',
          resourceId: workflowId,
          collaboratorId,
          permission: newPermission
        },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) throw error;

      setCollaborators(prev => 
        prev.map(c => c.id === collaboratorId ? { ...c, permission: newPermission } : c)
      );
      toast.success("Permission updated");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleRemoveAccess = async (collaboratorId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase.functions.invoke('manage-collaborator', {
        body: { 
          action: 'remove',
          resourceType: 'workflow',
          resourceId: workflowId,
          collaboratorId
        },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) throw error;

      setCollaborators(prev => prev.filter(c => c.id !== collaboratorId));
      toast.success("Collaborator removed");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getExpirationText = (expiresAt: string | null) => {
    if (!expiresAt) return "Never expires";
    const date = new Date(expiresAt);
    if (date < new Date()) return "Expired";
    return `Expires ${date.toLocaleDateString()}`;
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Workflow className="w-5 h-5" />
            Share "{workflowTitle}"
          </DialogTitle>
          <DialogDescription>
            Invite collaborators by email or create a shareable link.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Invite by email section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Invite by email</Label>
            <div className="flex gap-2">
              <Input 
                type="email" 
                placeholder="collaborator@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleInviteByEmail();
                  }
                }}
              />
              <Select value={emailPermission} onValueChange={(v: 'view' | 'edit') => setEmailPermission(v)}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View</SelectItem>
                  <SelectItem value="edit">Edit</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleInviteByEmail} disabled={invitingByEmail} size="icon">
                {invitingByEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <Separator />

          {/* People with access */}
          {collaborators.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">People with access</Label>
              <ScrollArea className="max-h-[150px]">
                <div className="space-y-2">
                  {collaborators.map((collab) => (
                    <div 
                      key={collab.id} 
                      className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="relative">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={collab.profiles?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(collab.profiles?.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          {collab.is_online && (
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-background rounded-full" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {collab.profiles?.full_name || 'Unknown'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {collab.profiles?.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Select 
                          value={collab.permission}
                          onValueChange={(v) => handleUpdatePermission(collab.id, v)}
                        >
                          <SelectTrigger className="w-20 h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="view">View</SelectItem>
                            <SelectItem value="edit">Edit</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveAccess(collab.id)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          <Separator />

          {/* Generate link section */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Or share with a link</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Permission</Label>
                <Select value={permission} onValueChange={(v: 'view' | 'edit') => setPermission(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">Can view</SelectItem>
                    <SelectItem value="edit">Can edit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Link expires</Label>
                <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never</SelectItem>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleGenerateLink} disabled={loading} className="w-full">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Link className="w-4 h-4 mr-2" />
              )}
              Generate Share Link
            </Button>
          </div>

          {/* Generated URL */}
          {generatedUrl && (
            <div className="space-y-2">
              <Label>Share link</Label>
              <div className="flex gap-2">
                <Input value={generatedUrl} readOnly className="text-sm" />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => handleCopyLink(generatedUrl)}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          )}

          {/* Existing shares */}
          {existingShares.length > 0 && (
            <div className="space-y-2">
              <Label>Active share links</Label>
              <ScrollArea className="h-[120px] rounded-md border p-2">
                <div className="space-y-2">
                  {existingShares.map((share) => (
                    <div 
                      key={share.id} 
                      className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          ...{share.share_token.substring(8)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {share.permission} • {getExpirationText(share.expires_at)}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleCopyLink(`${window.location.origin}/workflow/join/${share.share_token}`)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleRevokeShare(share.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
