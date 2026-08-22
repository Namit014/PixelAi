import { useState, useEffect, forwardRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePresentationStore } from '@/stores/presentationStore';
import { Crown, ChevronDown, Check, Pencil, Presentation, ScreenShare, Download } from 'lucide-react';
import { getCreditAllocation } from '@/lib/planUtils';
import { ExportPresentationDialog } from './ExportPresentationDialog';
import { Button } from '@/components/ui/button';
import { UpgradePlanModal } from '@/components/pricing/UpgradePlanModal';
import { ShareDialog } from './ShareDialog';
import { PresentationMode, type PresentMode } from './PresentationMode';
import {
  AccountSettingIcon,
  PlansPricingIcon,
  CommunityTemplatesIcon,
  HelpCentreIcon,
  SuggestImprovementIcon,
  ReportBugIcon,
  JoinCommunityIcon,
  LogoutIcon,
  BackToDashboardIcon,
  NewProjectIcon,
  DeleteProjectIcon,
  SaveStatusIcon,
  NotSavingIcon } from
'@/components/icons/CustomIcons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator } from
'@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle } from
'@/components/ui/alert-dialog';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import colabLogo from '@/assets/colab-logo.svg';
import { resolveAvatarUrl } from '@/lib/avatarUtils';

const ProfileButton = forwardRef<HTMLButtonElement, {userId?: string;}>(({ userId, ...props }, ref) =>
<button
  ref={ref}
  className="flex items-center justify-center w-7 h-7 rounded-md overflow-hidden"
  {...props}>

    <Avatar className="h-7 w-7 rounded-md">
      <AvatarImage src={resolveAvatarUrl(null, userId || 'anonymous')} alt="User avatar" className="rounded-md" />
      <AvatarFallback className="bg-zinc-200 text-zinc-700 text-xs rounded-md">U</AvatarFallback>
    </Avatar>
  </button>
);
ProfileButton.displayName = 'ProfileButton';

const formatTimeSince = (date: Date): string => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
};

export function SlideToolbar() {
  const title = usePresentationStore((s) => s.title);
  const setTitle = usePresentationStore((s) => s.setTitle);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [user, setUser] = useState<any>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [credits, setCredits] = useState<any>(null);
  const [creditPopoverOpen, setCreditPopoverOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [presentMode, setPresentMode] = useState<PresentMode | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const isEmpty = usePresentationStore((s) => s.isEmpty);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  useEffect(() => {
    setEditedTitle(title);
  }, [title]);

  useEffect(() => {
    if (!user) return;
    supabase.from('credits').select('*').eq('user_id', user.id).single().
    then(({ data }) => {if (data) setCredits(data);});
  }, [user]);

  const handleTitleSave = () => {
    setTitle(editedTitle.trim() || 'Untitled Project');
    setIsEditingTitle(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  // Credits calculation
  const hasActivePlan = credits?.plan_status === 'active' ||
    (!!credits?.subscription_expires_at && new Date(credits.subscription_expires_at) > new Date());
  const currentCredits = hasActivePlan ? (credits?.balance || 0) : 0;
  const tierCredits = hasActivePlan ? getCreditAllocation(credits?.subscription_tier) : 0;
  const maxCredits = currentCredits > 100000 ? currentCredits : Math.max(tierCredits, currentCredits);
  const usedCredits = maxCredits > 100000 || maxCredits <= 0 ? 0 : Math.max(0, maxCredits - currentCredits);
  const percentageUsed = maxCredits > 100000 || maxCredits <= 0 ? 0 : Math.min(100, Math.round(usedCredits / maxCredits * 100));
  const percentageRemaining = maxCredits > 100000 || maxCredits <= 0 ? 100 : Math.max(0, 100 - percentageUsed);

  let strokeColor = '#22c55e';
  let bgColor = 'bg-green-500';
  if (percentageUsed >= 100) {strokeColor = '#dc2626';bgColor = 'bg-red-600';} else
  if (percentageUsed >= 75) {strokeColor = '#ef4444';bgColor = 'bg-red-500';} else
  if (percentageUsed >= 50) {strokeColor = '#eab308';bgColor = 'bg-yellow-500';} else
  if (percentageUsed >= 25) {strokeColor = '#71717a';bgColor = 'bg-zinc-500';}

  const circumference = 2 * Math.PI * 12;
  const offset = circumference - percentageRemaining / 100 * circumference;

  return (
    <>
      <header className="h-14 flex items-center justify-between px-6 bg-background sticky top-0 z-50">
        <div className="flex items-center gap-4">
          {/* 1. Logo Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 hover:bg-muted h-10 px-2">
                <img src={colabLogo} alt="Colab AI" className="w-10 h-10" />
                <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-primary text-primary-foreground rounded-full">
                  Beta
                </span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-popover">
              <DropdownMenuItem onClick={() => navigate('/dashboard')} className="cursor-pointer">
                <BackToDashboardIcon className="mr-2 h-4 w-4" />
                <span>Back to Dashboard</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { usePresentationStore.getState().resetPresentation(); navigate('/cosmo'); }} className="cursor-pointer">
                <NewProjectIcon className="mr-2 h-4 w-4" />
                <span>New Presentation</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowExportDialog(true)} className="cursor-pointer">
                <Download className="mr-2 h-4 w-4" />
                <span>Export Presentation</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="cursor-pointer text-destructive focus:text-destructive">
                <DeleteProjectIcon className="mr-2 h-4 w-4" />
                <span>Delete Presentation</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 2. Save Status */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center relative">
                  <SaveStatusIcon className="w-5 h-5 text-foreground" />
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent>All changes saved</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* 3. Project Title */}
          {isEditingTitle ?
          <input
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
            autoFocus
            className="text-sm bg-transparent border-b border-zinc-300 outline-none px-1 font-normal text-zinc-700 min-w-[200px]" /> :


          <button
            onClick={() => setIsEditingTitle(true)}
            className="flex items-center gap-1 text-sm font-medium hover:text-muted-foreground transition-colors cursor-pointer outline-none">

              {title || 'Untitled Project'}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </button>
          }
        </div>

        <TooltipProvider>
          <div className="flex items-center gap-2">
            {/* Credits Popover */}
            <Popover open={creditPopoverOpen} onOpenChange={setCreditPopoverOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-2 bg-zinc-100 px-2 py-1.5 rounded-lg hover:bg-zinc-200 transition-all duration-200 group cursor-pointer">
                      <div className="relative w-4 h-4">
                        <svg className="w-4 h-4 -rotate-90" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" fill="none" stroke={percentageUsed >= 100 ? strokeColor : "#e5e7eb"} strokeWidth="3" />
                          <circle cx="12" cy="12" r="10" fill="none" stroke={strokeColor} strokeWidth="3" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-foreground">{percentageUsed}% credit used</span>
                    </button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8}>Click to view credit details</TooltipContent>
              </Tooltip>
              <PopoverContent className="w-64 p-0 bg-white border-zinc-200 rounded-lg" align="end">
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-zinc-900">Credit Usage</h3>
                    <div className={`px-2 py-0.5 rounded-lg text-[10px] font-medium text-white ${bgColor}`}>
                      {credits?.subscription_tier?.toUpperCase() || 'FREE'}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-zinc-50 rounded-xl p-2 border border-zinc-200">
                      <p className="text-[10px] text-zinc-500 mb-0.5">Available</p>
                      <p className="text-lg font-bold text-zinc-900">{currentCredits}</p>
                    </div>
                    <div className="bg-zinc-50 rounded-xl p-2 border border-zinc-200">
                      <p className="text-[10px] text-zinc-500 mb-0.5">Used</p>
                      <p className="text-lg font-bold text-zinc-900">{usedCredits}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-zinc-600">Progress</span>
                      <span className="text-zinc-900 font-semibold">{percentageUsed}%</span>
                    </div>
                    <div className="relative h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                      <div className={`absolute left-0 top-0 h-full ${bgColor} transition-all duration-500 rounded-full`} style={{ width: `${percentageUsed}%` }} />
                    </div>
                  </div>
                  <Button className="w-full bg-zinc-900 hover:bg-zinc-800 text-white text-xs h-8" onClick={() => {setCreditPopoverOpen(false);setShowUpgradeModal(true);}}>
                    Upgrade Plan
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Share, Export & Present */}
            {!isEmpty &&
            <>
                <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={() => setShowShareDialog(true)}>
                  <ScreenShare className="w-3 h-3" /> Share
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="default" size="sm" className="gap-1.5 h-7 text-xs bg-foreground text-background hover:bg-foreground/90">
                      <Presentation className="w-3 h-3" /> Present
                      <ChevronDown className="w-3 h-3 ml-0.5 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-popover">
                    <DropdownMenuItem onClick={() => setPresentMode('tab')} className="cursor-pointer">
                      <Presentation className="w-4 h-4 mr-2" />
                      <div className="flex-1">
                        <span>In this tab</span>
                        <span className="text-[10px] text-muted-foreground ml-2">⌘ Enter</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPresentMode('fullscreen')} className="cursor-pointer">
                      <ScreenShare className="w-4 h-4 mr-2" />
                      <div className="flex-1">
                        <span>Full screen</span>
                        <span className="text-[10px] text-muted-foreground ml-2">⌘ ⇧ Enter</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPresentMode('presenter')} className="cursor-pointer">
                      <Pencil className="w-4 h-4 mr-2" />
                      <div className="flex-1">
                        <span>Presenter view</span>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            }

            {/* Profile Dropdown */}
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
                    <DropdownMenuItem onClick={() => window.open('https://discord.gg/hj5vSAkv', '_blank')} className="cursor-pointer">
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
              <TooltipContent side="bottom" sideOffset={8}>Account menu</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </header>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Presentation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this presentation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate('/dashboard')} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UpgradePlanModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} />
      <ShareDialog open={showShareDialog} onOpenChange={setShowShareDialog} />
      <ExportPresentationDialog open={showExportDialog} onOpenChange={setShowExportDialog} />
      {presentMode && (
        <PresentationMode
          onExit={() => setPresentMode(null)}
          mode={presentMode}
          isFreeUser={!credits || credits.subscription_tier === 'free'}
        />
      )}
    </>);

}