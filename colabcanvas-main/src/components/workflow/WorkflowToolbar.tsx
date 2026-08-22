import { useState, useEffect, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Crown, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UpgradePlanModal } from '@/components/pricing/UpgradePlanModal';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { useWorkflowStore } from '@/stores/workflowStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import colabLogo from '@/assets/colab-logo.svg';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { resolveAvatarUrl } from '@/lib/avatarUtils';
import { 
  BackToDashboardIcon, 
  NewProjectIcon, 
  DeleteProjectIcon,
  AccountSettingIcon,
  PlansPricingIcon,
  CommunityTemplatesIcon,
  HelpCentreIcon,
  SuggestImprovementIcon,
  ReportBugIcon,
  JoinCommunityIcon,
  LogoutIcon
} from '@/components/icons/CustomIcons';
import VersionHistoryPanel from './VersionHistoryPanel';
import ExecutionHistory from './ExecutionHistory';
import PublishTemplateDialog from './PublishTemplateDialog';
import { ShareWorkflowDialog } from './ShareWorkflowDialog';
import { WorkflowCollaboratorAvatars } from './WorkflowCollaboratorAvatars';

interface ProfileButtonProps {
  userId?: string;
}
const ProfileButton = forwardRef<HTMLButtonElement, ProfileButtonProps>(({ userId, ...props }, ref) => (
  <button
    ref={ref}
    className="flex items-center justify-center w-7 h-7 rounded-md overflow-hidden"
    {...props}
  >
    <Avatar className="h-7 w-7 rounded-md">
      <AvatarImage src={resolveAvatarUrl(null, userId || 'anonymous')} alt="User avatar" className="rounded-md" />
      <AvatarFallback className="bg-zinc-200 text-zinc-700 text-xs rounded-md">U</AvatarFallback>
    </Avatar>
  </button>
));
ProfileButton.displayName = 'ProfileButton';

const WorkflowToolbar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    workflowId,
    workflowTitle,
    setWorkflowTitle,
  } = useWorkflowStore();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [credits, setCredits] = useState<any>(null);
  const [creditPopoverOpen, setCreditPopoverOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  useEffect(() => {
    loadCredits();
  }, [user]);

  const loadCredits = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('credits')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      setCredits(data);
    } catch (error) {
      console.error('Error loading credits:', error);
    }
  };

  const handleSave = async () => {
    if (!workflowId) return;

    try {
      const { error } = await supabase
        .from('workflows')
        .update({ title: workflowTitle, updated_at: new Date().toISOString() })
        .eq('id', workflowId);

      if (error) throw error;
      toast.success('Workflow saved');
    } catch (error) {
      console.error('Error saving workflow:', error);
      toast.error('Failed to save workflow');
    }
  };

  const handleNewWorkflow = async () => {
    try {
      const { data: newWorkflow, error } = await supabase
        .from('workflows')
        .insert({
          user_id: user.id,
          title: 'Untitled Workflow'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Workflow created');
      navigate(`/workflow?id=${newWorkflow.id}`);
    } catch (error) {
      console.error('Error creating workflow:', error);
      toast.error('Failed to create workflow');
    }
  };

  const handleDeleteWorkflow = async () => {
    try {
      const { error } = await supabase
        .from('workflows')
        .delete()
        .eq('id', workflowId);

      if (error) throw error;

      toast.success('Workflow deleted');
      navigate('/workflow');
    } catch (error) {
      console.error('Error deleting workflow:', error);
      toast.error('Failed to delete workflow');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const hasActivePlan = credits?.plan_status === 'active' ||
    (!!credits?.subscription_expires_at && new Date(credits.subscription_expires_at) > new Date());
  const rawCredits = credits?.balance || 0;
  const currentCredits = hasActivePlan ? rawCredits : 0;
  const tier = (credits?.subscription_tier || 'free').toLowerCase();
  const allocationByTier: Record<string, number> = { free: 0, starter: 300, creator: 1000, pro: 2500, business: 6000, enterprise: 15000 };
  const tierCredits = hasActivePlan ? (allocationByTier[tier] ?? 0) : 0;
  const maxCredits = currentCredits > 100000 ? currentCredits : Math.max(tierCredits, currentCredits);
  const usedCredits = maxCredits > 100000 || maxCredits <= 0 ? 0 : Math.max(0, maxCredits - currentCredits);
  const percentageUsed = maxCredits > 100000 || maxCredits <= 0 ? 0 : Math.min(100, Math.round((usedCredits / maxCredits) * 100));
  const percentageRemaining = maxCredits > 100000 || maxCredits <= 0 ? 100 : Math.max(0, 100 - percentageUsed);

  let strokeColor = '#22c55e';
  let bgColor = 'bg-green-500';
  if (percentageUsed >= 100) {
    strokeColor = '#dc2626';
    bgColor = 'bg-red-600';
  } else if (percentageUsed >= 75) {
    strokeColor = '#ef4444';
    bgColor = 'bg-red-500';
  } else if (percentageUsed >= 50) {
    strokeColor = '#eab308';
    bgColor = 'bg-yellow-500';
  } else if (percentageUsed >= 25) {
    strokeColor = '#71717a';
    bgColor = 'bg-zinc-500';
  }

  const circumference = 2 * Math.PI * 12;
  const offset = circumference - (percentageRemaining / 100) * circumference;

  return (
    <>
      <header className="h-14 flex items-center justify-between px-6 bg-transparent">
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 hover:bg-muted h-10 px-2">
                <img src={colabLogo} alt="Colab AI" className="w-10 h-10" />
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-popover">
              <DropdownMenuItem onClick={() => navigate('/dashboard')} className="cursor-pointer">
                <BackToDashboardIcon className="mr-2 h-4 w-4" />
                <span>Back to Dashboard</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleNewWorkflow} className="cursor-pointer">
                <NewProjectIcon className="mr-2 h-4 w-4" />
                <span>New Workflow</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowShareDialog(true)} className="cursor-pointer">
                <Users className="mr-2 h-4 w-4" />
                <span>Share Workflow</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {}} className="cursor-pointer">
                <span>Publish Template</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {}} className="cursor-pointer">
                <span>Version History</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {}} className="cursor-pointer">
                <span>Execution History</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="cursor-pointer text-destructive focus:text-destructive">
                <DeleteProjectIcon className="mr-2 h-4 w-4" />
                <span>Delete Workflow</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {isEditingTitle ? (
            <Input
              value={workflowTitle}
              onChange={(e) => setWorkflowTitle(e.target.value)}
              onBlur={() => {
                setIsEditingTitle(false);
                handleSave();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setIsEditingTitle(false);
                  handleSave();
                }
              }}
              className="h-9 w-64 text-sm font-medium"
              autoFocus
            />
          ) : (
            <span className="text-sm font-medium cursor-pointer hover:text-gray-600" onClick={() => setIsEditingTitle(true)}>
              {workflowTitle}
            </span>
          )}
        </div>

        <TooltipProvider>
          <div className="flex items-center gap-4">
            <Popover open={creditPopoverOpen} onOpenChange={setCreditPopoverOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-2 bg-zinc-100/50 px-2 py-1.5 rounded-lg hover:bg-zinc-200/50 transition-all duration-200 group cursor-pointer">
                      <div className="relative w-4 h-4">
                        <svg className="w-4 h-4 -rotate-90" viewBox="0 0 24 24">
                          <circle
                            cx="12"
                            cy="12"
                            r="10"
                            fill="none"
                            stroke={percentageUsed >= 100 ? strokeColor : "#e5e7eb"}
                            strokeWidth="3"
                            className="transition-all duration-200 group-hover:stroke-[4]"
                          />
                          <circle
                            cx="12"
                            cy="12"
                            r="10"
                            fill="none"
                            stroke={strokeColor}
                            strokeWidth="3"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            strokeLinecap="round"
                            className="transition-all duration-200 group-hover:stroke-[4]"
                          />
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-zinc-900">
                        {percentageUsed}% credit used
                      </span>
                    </button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8}>
                  Click to view credit details
                </TooltipContent>
              </Tooltip>
              <PopoverContent className="w-64 p-0 bg-white/95 backdrop-blur-md border-zinc-200 rounded-lg" align="end">
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-zinc-900">Credit Usage</h3>
                    <div className={`px-2 py-0.5 rounded-lg text-[10px] font-medium text-zinc-900 ${bgColor}`}>
                      {credits?.subscription_tier?.toUpperCase() || 'FREE'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-zinc-100/50 rounded-xl p-2 border border-zinc-300">
                      <p className="text-[10px] text-zinc-500 mb-0.5">Available</p>
                      <p className="text-lg font-bold text-zinc-900">{currentCredits}</p>
                    </div>
                    <div className="bg-zinc-100/50 rounded-xl p-2 border border-zinc-300">
                      <p className="text-[10px] text-zinc-500 mb-0.5">Used</p>
                      <p className="text-lg font-bold text-zinc-900">{usedCredits}</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-zinc-500">Progress</span>
                      <span className="text-zinc-900 font-semibold">{percentageUsed}%</span>
                    </div>
                    <div className="relative h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                      <div 
                        className={`absolute left-0 top-0 h-full ${bgColor} transition-all duration-500 rounded-full`}
                        style={{ width: `${percentageUsed}%` }}
                      />
                    </div>
                  </div>

                  <Button 
                    className="w-full bg-white hover:bg-zinc-100 text-zinc-900 text-xs h-8" 
                    onClick={() => {
                      setCreditPopoverOpen(false);
                      setShowUpgradeModal(true);
                    }}
                  >
                    Upgrade Plan
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Collaborator Avatars */}
            {workflowId && user?.id && (
              <WorkflowCollaboratorAvatars 
                workflowId={workflowId} 
                currentUserId={user.id} 
              />
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-50 font-medium h-auto px-2 py-1.5 text-xs"
                  onClick={() => setShowUpgradeModal(true)}
                >
                  <Crown className="w-3 h-3" />
                  Upgrade Now
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8}>
                Upgrade to Pro plan
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <ProfileButton userId={user?.id} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-popover">
                    <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
                      <AccountSettingIcon className="w-4 h-4 mr-2" />
                      <span>Account Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/pricing')} className="cursor-pointer">
                      <PlansPricingIcon className="w-4 h-4 mr-2" />
                      <span>Plans & Pricing</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/community')} className="cursor-pointer">
                      <CommunityTemplatesIcon className="w-4 h-4 mr-2" />
                      <span>Community Templates</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/help')} className="cursor-pointer">
                      <HelpCentreIcon className="w-4 h-4 mr-2" />
                      <span>Help Center</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/feedback?tab=improvement')} className="cursor-pointer">
                      <SuggestImprovementIcon className="w-4 h-4 mr-2" />
                      <span>Suggest Improvement</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/feedback?tab=bug')} className="cursor-pointer">
                      <ReportBugIcon className="w-4 h-4 mr-2" />
                      <span>Report a Bug</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => window.open('https://discord.gg/hj5vSAkv', '_blank')} 
                      className="cursor-pointer"
                    >
                      <JoinCommunityIcon className="w-4 h-4 mr-2" />
                      <span>Join Community</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
                      <LogoutIcon className="w-4 h-4 mr-2" />
                      <span>Sign Out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8}>
                Account menu
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </header>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{workflowTitle}"? This action cannot be undone.
              All nodes and configuration will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteWorkflow} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Workflow
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upgrade Plan Modal */}
      <UpgradePlanModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} />

      {/* Share Workflow Dialog */}
      {workflowId && (
        <ShareWorkflowDialog 
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
          workflowId={workflowId}
          workflowTitle={workflowTitle}
        />
      )}
    </>
  );
};

export default WorkflowToolbar;