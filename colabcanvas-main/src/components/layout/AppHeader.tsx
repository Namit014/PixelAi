import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { UpgradePlanModal } from "@/components/pricing/UpgradePlanModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AccountSettingIcon, PlansPricingIcon, CommunityTemplatesIcon, HelpCentreIcon, SuggestImprovementIcon, ReportBugIcon, JoinCommunityIcon, LogoutIcon } from "@/components/icons/CustomIcons";
import { Folder, ChevronRight, Gift } from "lucide-react";
import { NotificationBell } from "@/components/layout/NotificationBell";
import colabLogo from "@/assets/colab-logo.svg";
import colabWordmark from "@/assets/colab-wordmark.svg";

import { resolveAvatarUrl } from "@/lib/avatarUtils";
import { AppNavigation } from "@/components/layout/AppNavigation";
import { getDisplayPlanName, getCreditAllocation } from "@/lib/planUtils";

export const AppHeader = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState<any>(null);
  const [creditPopoverOpen, setCreditPopoverOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  useEffect(() => {
    loadUser();
  }, []);

  // Realtime credit updates - dynamically update credit indicator
  useEffect(() => {
    if (!user?.id) return;
    console.log('💳 Setting up realtime credit updates');
    const channel = supabase.channel(`credits-${user.id}`).on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'credits',
      filter: `user_id=eq.${user.id}`
    }, (payload) => {
      console.log('💳 Credit update received:', payload);
      setCredits(payload.new);
    }).subscribe();
    return () => {
      console.log('💳 Cleaning up credit subscription');
      supabase.removeChannel(channel);
    };
  }, [user?.id]);
  const loadUser = async () => {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      const {
        data: creditsData
      } = await supabase.from('credits').select('*').eq('user_id', user.id).single();
      setCredits(creditsData);
    }
  };
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };
  // Use new credit allocation logic
  const hasActivePlan = credits?.plan_status === 'active' || (credits?.subscription_expires_at && new Date(credits.subscription_expires_at) > new Date());
  const tierCredits = hasActivePlan ? getCreditAllocation(credits?.subscription_tier) : 0;
  const rawBalance = credits?.balance || 0;
  const currentCredits = !hasActivePlan && rawBalance === 100 && (credits?.monthly_credit_allocation ?? 0) <= 100 ? 0 : rawBalance;
  const maxCredits = currentCredits > 100000 ? currentCredits : Math.max(tierCredits, currentCredits);
  const usedCredits = maxCredits > 100000 ? 0 : Math.max(0, maxCredits - currentCredits);
  // Guard divide-by-zero for brand-new accounts (maxCredits = 0). Otherwise NaN
  // propagates into strokeDashoffset and the ring renders as if credits were "used".
  const percentageUsed = maxCredits > 100000 || maxCredits <= 0
    ? 0
    : Math.min(100, Math.round(usedCredits / maxCredits * 100));
  const percentageRemaining = maxCredits > 100000 || maxCredits <= 0
    ? 100
    : Math.max(0, 100 - percentageUsed);

  // Get display plan name - Free users see "Free Plan", not "Starter"
  const displayPlanName = getDisplayPlanName(credits?.subscription_tier, !!credits?.subscription_expires_at);
  let strokeColor = '#22c55e';
  let bgColor = 'bg-green-500';
  if (percentageUsed >= 75) {
    strokeColor = '#ef4444';
    bgColor = 'bg-red-500';
  } else if (percentageUsed >= 50) {
    strokeColor = '#f59e0b';
    bgColor = 'bg-amber-500';
  }
  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - percentageRemaining / 100 * circumference;
  return <>
      <header className="bg-transparent sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between relative">
          <div className="flex items-center gap-2">
            <img src={colabLogo} alt="Colab" className="h-8 w-8" />
            <img src={colabWordmark} alt="Colab" className="h-4" />
            <span className="text-[10px] font-semibold rounded-full px-[7px] py-[4px] text-zinc-600 bg-primary-foreground">
              BETA
            </span>
          </div>
          
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <AppNavigation className="my-0 px-[3px] py-[3px] border-secondary" />
          </div>
          
          <div className="flex items-center gap-4">
            <NotificationBell />
            <Popover open={creditPopoverOpen} onOpenChange={setCreditPopoverOpen}>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all duration-200 group cursor-pointer bg-primary-foreground">
                  <div className="relative w-4 h-4">
                    <svg className="w-4 h-4 -rotate-90" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" fill="none" stroke="#e5e7eb" strokeWidth="3" className="transition-all duration-200 group-hover:stroke-[4]" />
                      <circle cx="12" cy="12" r="10" fill="none" stroke={strokeColor} strokeWidth="3" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-200 group-hover:stroke-[4]" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-foreground">
                    {maxCredits > 100000 ? '∞ Unlimited' : `${currentCredits} Credits`}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0 bg-white rounded-2xl border border-zinc-200 shadow-lg z-50" align="end">
                {/* Header with cream background */}
                <div className="p-4 rounded-t-2xl bg-primary-foreground">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-zinc-900">Credits</span>
                    <button
                    onClick={() => {setCreditPopoverOpen(false);navigate('/pricing');}}
                    className="flex items-center gap-1 text-sm text-zinc-700 hover:text-zinc-900">

                      {maxCredits > 100000 ? '∞' : currentCredits} left <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="h-2 bg-zinc-200 rounded-full overflow-hidden mb-3">
                    <div
                    className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all duration-500"
                    style={{ width: `${percentageRemaining}%` }} />

                  </div>
                  
                  {/* Using monthly credits */}
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-600" />
                    <span className="text-sm text-zinc-600">Using monthly credits</span>
                  </div>
                </div>
                
                {/* Get free credits link */}
                <div className="p-3 border-t border-zinc-100">
                  <button
                  onClick={() => {setCreditPopoverOpen(false);navigate('/referral');}}
                  className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700">

                    <Gift className="w-4 h-4" />
                    Get free credits
                  </button>
                </div>
              </PopoverContent>
            </Popover>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-md">
                  <Avatar className="h-7 w-7 rounded-md">
                    <AvatarImage src={resolveAvatarUrl(null, user?.id || 'anonymous')} alt="User avatar" className="rounded-md" />
                    <AvatarFallback className="bg-gray-200 text-black text-xs rounded-md">
                      {user?.email?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-popover z-50">
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
                <DropdownMenuItem onClick={() => navigate('/brands')} className="cursor-pointer">
                  <Folder className="w-4 h-4 mr-2" />
                  <span>Brand Assets</span>
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
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600">
                  <LogoutIcon className="w-4 h-4 mr-2" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Upgrade Plan Modal */}
      <UpgradePlanModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} />
    </>;
};