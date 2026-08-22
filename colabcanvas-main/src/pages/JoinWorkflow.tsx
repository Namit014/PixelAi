import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Users, Eye, Edit3, AlertCircle, CheckCircle, Workflow } from 'lucide-react';
import colabLogo from '@/assets/colab-logo.svg';

export default function JoinWorkflow() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareInfo, setShareInfo] = useState<{
    workflowId: string;
    workflowTitle: string;
    permission: string;
  } | null>(null);
  const [joined, setJoined] = useState(false);

  // Validate share token when component mounts
  useEffect(() => {
    if (!authLoading && shareToken) {
      if (!user) {
        // Redirect to auth with return URL
        navigate(`/auth?redirect=/workflow/join/${shareToken}`);
        return;
      }
      validateShare();
    }
  }, [shareToken, user, authLoading]);

  const validateShare = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate(`/auth?redirect=/workflow/join/${shareToken}`);
        return;
      }

      const { data, error } = await supabase.functions.invoke('accept-workflow-share', {
        body: { shareToken, action: 'validate' },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) throw error;

      if (data.isOwner) {
        // User is the owner, redirect directly
        navigate(`/workflow?id=${data.workflowId}`);
        return;
      }

      if (data.error) {
        setError(data.error);
      } else {
        setShareInfo({
          workflowId: data.workflowId,
          workflowTitle: data.workflowTitle,
          permission: data.permission,
        });
      }
    } catch (err: any) {
      console.error('Error validating share:', err);
      setError(err.message || 'Failed to validate share link');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinWorkflow = async () => {
    setJoining(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate(`/auth?redirect=/workflow/join/${shareToken}`);
        return;
      }

      const { data, error } = await supabase.functions.invoke('accept-workflow-share', {
        body: { shareToken, action: 'join' },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) throw error;

      if (data.success) {
        setJoined(true);
        // Redirect to workflow after brief delay
        setTimeout(() => {
          navigate(`/workflow?id=${data.workflowId}`);
        }, 1500);
      } else if (data.error) {
        setError(data.error);
      }
    } catch (err: any) {
      console.error('Error joining workflow:', err);
      setError(err.message || 'Failed to join workflow');
    } finally {
      setJoining(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Validating share link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img src={colabLogo} alt="Colab AI" className="w-16 h-16 mx-auto mb-4" />
          <CardTitle className="flex items-center justify-center gap-2">
            <Workflow className="w-5 h-5" />
            Workflow Invitation
          </CardTitle>
          <CardDescription>
            You've been invited to collaborate on a workflow
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <p className="text-destructive font-medium">{error}</p>
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                Go to Dashboard
              </Button>
            </div>
          ) : joined ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-green-500/10 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <p className="text-green-600 font-medium">Successfully joined!</p>
              <p className="text-muted-foreground text-sm">Redirecting to workflow...</p>
            </div>
          ) : shareInfo ? (
            <>
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Workflow</p>
                  <p className="font-semibold text-lg">{shareInfo.workflowTitle}</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">Permission:</p>
                  <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-full text-sm font-medium">
                    {shareInfo.permission === 'edit' ? (
                      <>
                        <Edit3 className="w-3 h-3" />
                        Can Edit
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3" />
                        View Only
                      </>
                    )}
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleJoinWorkflow} 
                disabled={joining}
                className="w-full"
                size="lg"
              >
                {joining ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Joining...
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4 mr-2" />
                    Join Workflow
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                By joining, you'll be able to {shareInfo.permission === 'edit' ? 'view and edit' : 'view'} this workflow.
              </p>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
