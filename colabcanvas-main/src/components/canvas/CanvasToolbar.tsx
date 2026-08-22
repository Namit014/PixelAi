import { useState, useEffect, forwardRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CreditCard, Crown, ChevronDown, Upload, Download, Palette, Workflow, Sparkles, Users, Route, Check, Pencil, History, Save } from 'lucide-react';
import { UpgradePlanModal } from '@/components/pricing/UpgradePlanModal';
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
  ExportBrandSystemIcon,
  DeleteProjectIcon,
  ExportFromBrandIcon,
  ImportFromBrandIcon,
  ImportFromLibraryIcon,
  SendToCosmoIcon,
  Assets2Icon,
  SaveStatusIcon,
  NotSavingIcon
} from '@/components/icons/CustomIcons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import colabLogo from '@/assets/colab-logo.svg';
import { StyleGuideExportButton } from './StyleGuideExportButton';
import { AssetPickerModal } from '@/components/assets/AssetPickerModal';
import { ExportToBrandDialog } from '@/components/assets/ExportToBrandDialog';
import { SendToCosmoDialog } from '@/components/assets/SendToCosmoDialog';
import { ImportFromBrandPanel } from '@/components/assets/ImportFromBrandPanel';
import { ShareProjectDialog } from './ShareProjectDialog';
import { CollaboratorAvatars } from './CollaboratorAvatars';
import { resolveAvatarUrl } from '@/lib/avatarUtils';
import { useTourContext } from '@/components/tour/TourContext';
// Shaders temporarily disabled

// ProfileButton component with proper ref forwarding to fix React warning
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

// Utility function for time formatting
const formatTimeSince = (date: Date): string => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
};

interface CanvasToolbarProps {
  projectTitle: string;
  projectId: string;
  onSignOut: () => void;
  user: any;
  onRefreshCredits?: () => void;
  onImportAsset?: (asset: any) => void;
  isSaving?: boolean;
  lastSaved?: Date | null;
  selectedObject?: any;
  canvasInstance?: any;
  canvasElement?: HTMLCanvasElement | null;
}
const CanvasToolbar = ({
  projectTitle,
  projectId,
  onSignOut,
  user,
  onRefreshCredits,
  onImportAsset,
  isSaving = false,
  lastSaved = null,
  selectedObject,
  canvasInstance,
  canvasElement,
}: CanvasToolbarProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const tourContext = useTourContext();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(projectTitle);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [credits, setCredits] = useState<any>(null);
  const [creditPopoverOpen, setCreditPopoverOpen] = useState(false);
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [showExportToBrand, setShowExportToBrand] = useState(false);
  const [showSendToCosmo, setShowSendToCosmo] = useState(false);
  const [showImportFromBrand, setShowImportFromBrand] = useState(false);
  const [currentAssetData, setCurrentAssetData] = useState<any>(null);
  // const [showShadersPanel, setShowShadersPanel] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [userProjects, setUserProjects] = useState<{ id: string; title: string; thumbnail_url: string | null }[]>([]);

  const loadProjects = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, title, thumbnail_url')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });
      if (!error && data) setUserProjects(data);
    } catch (e) {
      console.error('Error loading projects:', e);
    }
  }, [user]);

  useEffect(() => {
    loadCredits();
    loadProjects();
  }, [user]);

  // Expose loadCredits to parent via callback
  useEffect(() => {
    if (onRefreshCredits) {
      // Store the function reference in a way the parent can call it
      (window as any).__refreshCanvasCredits = loadCredits;
    }
  }, [onRefreshCredits]);

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
  const handleTitleSave = async () => {
    if (editedTitle.trim() === projectTitle) {
      setIsEditingTitle(false);
      return;
    }
    
    try {
      const { error } = await supabase
        .from('projects')
        .update({ title: editedTitle.trim() })
        .eq('id', projectId);
      
      if (error) throw error;
      
      toast({
        title: 'Title Updated',
        description: 'Project title saved successfully',
        duration: 2000
      });
      
      // Reload to update title in parent
      window.location.reload();
    } catch (error) {
      console.error('Error saving title:', error);
      toast({
        title: 'Error',
        description: 'Failed to save project title',
        variant: 'destructive'
      });
      setEditedTitle(projectTitle);
    } finally {
      setIsEditingTitle(false);
    }
  };
  const handleGoHome = () => {
    navigate('/dashboard');
  };
  const handleNewProject = async () => {
    try {
      const {
        data: newProject,
        error
      } = await supabase.from('projects').insert({
        user_id: user.id,
        title: 'Untitled Project'
      }).select().single();
      if (error) throw error;
      toast({
        title: 'Project Created',
        description: 'New project created successfully'
      });
      window.location.reload();
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: 'Error',
        description: 'Failed to create new project',
        variant: 'destructive'
      });
    }
  };
  const handleDeleteProject = async () => {
    try {
      const {
        error
      } = await supabase.from('projects').delete().eq('id', projectId);
      if (error) throw error;
      toast({
        title: 'Project Deleted',
        description: 'Project deleted successfully'
      });
      navigate('/dashboard');
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete project',
        variant: 'destructive'
      });
    }
  };
  return <>
      <header className="h-14 flex items-center justify-between px-6 bg-transparent sticky top-0 z-50">
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
            <DropdownMenuItem onClick={handleGoHome} className="cursor-pointer">
              <BackToDashboardIcon className="mr-2 h-4 w-4" />
              <span>Back to Dashboard</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleNewProject} className="cursor-pointer">
              <NewProjectIcon className="mr-2 h-4 w-4" />
              <span>New Project</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowShareDialog(true)} className="cursor-pointer">
              <Users className="mr-2 h-4 w-4" />
              <span>Share Project</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => window.dispatchEvent(new CustomEvent('colab:save-version'))}
              className="cursor-pointer"
            >
              <Save className="mr-2 h-4 w-4" />
              <span>Save current version</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => window.dispatchEvent(new CustomEvent('colab:open-version-history'))}
              className="cursor-pointer"
            >
              <History className="mr-2 h-4 w-4" />
              <span>Version history</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled className="cursor-not-allowed opacity-50">
              <ExportBrandSystemIcon className="mr-2 h-4 w-4" />
              <span>Export Brand System</span>
              <span className="ml-auto text-[8px] bg-zinc-500 text-white px-1.5 py-0.5 rounded-full">Soon</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => tourContext.startManualTour('/canvas')} className="cursor-pointer">
              <Route className="mr-2 h-4 w-4" />
              <span>Start Tour</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="cursor-pointer text-destructive focus:text-destructive">
              <DeleteProjectIcon className="mr-2 h-4 w-4" />
              <span>Delete Project</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 2. Save Status Icon - BUG FIX #13: Add blinking indicator */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center relative">
                {isSaving ? (
                  <>
                    <NotSavingIcon className="w-5 h-5 text-muted-foreground animate-pulse" />
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  </>
                ) : (
                  <>
                    <SaveStatusIcon className="w-5 h-5 text-foreground" />
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500" />
                  </>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {isSaving 
                ? "Saving changes..." 
                : lastSaved 
                  ? `Last saved ${formatTimeSince(lastSaved)}`
                  : "All changes saved"
              }
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* 3. Project Title / Switcher */}
        {isEditingTitle ? (
          <input 
            type="text" 
            value={editedTitle} 
            onChange={(e) => setEditedTitle(e.target.value)} 
            onBlur={handleTitleSave} 
            onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()} 
            autoFocus 
            className="text-sm bg-transparent border-b border-zinc-300 outline-none px-1 font-normal text-zinc-700 min-w-[200px]" 
          />
        ) : (
          <DropdownMenu onOpenChange={(open) => { if (open) loadProjects(); }}>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 text-sm font-medium hover:text-muted-foreground transition-colors cursor-pointer outline-none max-w-[180px]">
                <span className="truncate">{projectTitle}</span>
                <ChevronDown className="h-3 w-3 opacity-50 flex-shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 max-h-[300px] overflow-y-auto bg-popover z-[100]">
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => setIsEditingTitle(true)}
              >
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Rename Project
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {userProjects.map((p) => (
                <DropdownMenuItem
                  key={p.id}
                  className="cursor-pointer flex items-center gap-2"
                  onClick={() => {
                    if (p.id !== projectId) {
                      navigate(`/canvas?projectId=${p.id}`);
                    }
                  }}
                >
                  {p.thumbnail_url ? (
                    <img src={p.thumbnail_url} alt="" className="h-6 w-6 rounded object-cover flex-shrink-0" />
                  ) : (
                    <div className="h-6 w-6 rounded bg-muted flex-shrink-0" />
                  )}
                  <span className={`truncate flex-1 ${p.id === projectId ? 'font-semibold' : ''}`}>
                    {p.title || 'Untitled'}
                  </span>
                  {p.id === projectId && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                </DropdownMenuItem>
              ))}
              {userProjects.length === 0 && (
                <DropdownMenuItem disabled className="text-muted-foreground text-xs">
                  No projects found
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Assets moved to sidebar CanvasToolPanel */}

        {/* Effects moved to CanvasToolPanel */}
      </div>

        <TooltipProvider>
          <div className="flex items-center gap-4">
            {(() => {
              const currentCredits = credits?.balance || 0;
              // If balance is huge (like 998275), it's likely test/unlimited credits
              const maxCredits = currentCredits > 100000 ? currentCredits : (credits?.subscription_tier === 'free' ? 100 : credits?.subscription_tier === 'pro' ? 500 : 1000);
              const usedCredits = currentCredits > 100000 ? 0 : Math.max(0, maxCredits - currentCredits);
              const percentageUsed = currentCredits > 100000 ? 0 : Math.min(100, Math.round((usedCredits / maxCredits) * 100));
              const percentageRemaining = currentCredits > 100000 ? 100 : Math.max(0, 100 - percentageUsed);
              
              // Credit debug removed to reduce console noise
              
              // Color coding based on usage
              let strokeColor = '#22c55e'; // green when low usage
              let bgColor = 'bg-green-500';
              if (percentageUsed >= 100) {
                strokeColor = '#dc2626'; // darker red when fully used
                bgColor = 'bg-red-600';
              } else if (percentageUsed >= 75) {
                strokeColor = '#ef4444'; // red when high usage
                bgColor = 'bg-red-500';
              } else if (percentageUsed >= 50) {
                strokeColor = '#eab308'; // yellow when medium-high
                bgColor = 'bg-yellow-500';
              } else if (percentageUsed >= 25) {
                strokeColor = '#71717a'; // zinc when medium
                bgColor = 'bg-zinc-500';
              }
              
              const circumference = 2 * Math.PI * 12;
              const offset = circumference - (percentageRemaining / 100) * circumference;
              
              return (
                <Popover open={creditPopoverOpen} onOpenChange={setCreditPopoverOpen}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <button className="flex items-center gap-2 bg-zinc-100 px-2 py-1.5 rounded-lg hover:bg-zinc-200 transition-all duration-200 group cursor-pointer">
                          <div className="relative w-4 h-4">
                            <svg className="w-4 h-4 -rotate-90" viewBox="0 0 24 24">
                              {/* Background circle */}
                              <circle
                                cx="12"
                                cy="12"
                                r="10"
                                fill="none"
                                stroke={percentageUsed >= 100 ? strokeColor : "#e5e7eb"}
                                strokeWidth="3"
                                className="transition-all duration-200 group-hover:stroke-[4]"
                              />
                              {/* Progress circle */}
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
                          <span className="text-xs font-medium text-foreground">
                            {percentageUsed}% credit used
                          </span>
                        </button>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={8}>
                      Click to view credit details
                    </TooltipContent>
                  </Tooltip>
                  <PopoverContent className="w-64 p-0 bg-white border-zinc-200 rounded-lg" align="end">
                    <div className="p-4 space-y-3">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-zinc-900">Credit Usage</h3>
                        <div className={`px-2 py-0.5 rounded-lg text-[10px] font-medium text-white ${bgColor}`}>
                          {credits?.subscription_tier?.toUpperCase() || 'FREE'}
                        </div>
                      </div>

                      {/* Stats Grid */}
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

                      {/* Progress Bar */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-zinc-600">Progress</span>
                          <span className="text-zinc-900 font-semibold">{percentageUsed}%</span>
                        </div>
                        <div className="relative h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                          <div 
                            className={`absolute left-0 top-0 h-full ${bgColor} transition-all duration-500 rounded-full`}
                            style={{ width: `${percentageUsed}%` }}
                          />
                        </div>
                      </div>

                      {/* Action Button */}
                      <Button 
                        className="w-full bg-zinc-900 hover:bg-zinc-800 text-white text-xs h-8" 
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
              );
            })()}

            {/* Collaborator Avatars */}
            {projectId && user?.id && (
              <CollaboratorAvatars 
                projectId={projectId} 
                currentUserId={user.id} 
              />
            )}

            {/* Share Button removed - now in logo dropdown */}

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
              <DropdownMenuItem onClick={onSignOut} className="cursor-pointer text-destructive focus:text-destructive">
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
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{projectTitle}"? This action cannot be undone.
              All artboards and data will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Asset Flow Dialogs */}
      <AssetPickerModal 
        open={showAssetPicker} 
        onOpenChange={setShowAssetPicker}
        onSelect={(asset) => {
          if (onImportAsset) onImportAsset(asset);
        }}
      />
      <ExportToBrandDialog 
        open={showExportToBrand} 
        onOpenChange={setShowExportToBrand}
        assetData={currentAssetData || { file: null, type: 'image', sourceType: 'canvas', sourceId: projectId }}
      />
      <SendToCosmoDialog 
        open={showSendToCosmo} 
        onOpenChange={setShowSendToCosmo}
        assetData={currentAssetData || { file: null, type: 'image', sourceType: 'canvas', sourceId: projectId }}
      />
      <ImportFromBrandPanel 
        open={showImportFromBrand}
        onOpenChange={setShowImportFromBrand}
        onImport={(asset) => {
          if (onImportAsset) onImportAsset(asset);
        }}
      />

      {/* Shader Panel temporarily disabled */}
      <ImportFromBrandPanel 
        open={showImportFromBrand} 
        onOpenChange={setShowImportFromBrand}
        onImport={(asset) => {
          if (onImportAsset) onImportAsset(asset);
        }}
      />

      {/* Upgrade Plan Modal */}
      <UpgradePlanModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} />

      {/* Share Project Dialog */}
      <ShareProjectDialog 
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        projectId={projectId}
        projectTitle={projectTitle}
      />
    </>;
};
export default CanvasToolbar;