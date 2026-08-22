import React from "react";
import { MoreHorizontal, PanelLeftClose, PanelLeftOpen, PenSquare, Search, Lightbulb, Brain, CheckCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import RumiBlackIcon from "@/assets/icons/rumi-black.svg?react";
import type { TasteProfile } from "@/hooks/useCreativeIntelligence";

type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

interface BrandCognitionStatus {
  brandName?: string;
  confidenceScore: number;
  totalDesignsAnalyzed: number;
  emotionalTones: string[];
}

type Props = {
  collapsed: boolean;
  onToggleCollapsed: () => void;

  loading: boolean;
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onNewConversation: () => void;

  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchClick: () => void;
  searchInputRef: React.RefObject<HTMLInputElement>;
  
  // CI mode specific
  isCreativeIntelligenceMode?: boolean;
  tasteProfile?: TasteProfile | null;
  
  // Brand cognition status
  brandCognitionStatus?: BrandCognitionStatus | null;
};

export function ThinkSidebar({
  collapsed,
  onToggleCollapsed,
  loading,
  conversations,
  currentConversationId,
  onSelectConversation,
  onDeleteConversation,
  onNewConversation,
  searchValue,
  onSearchChange,
  onSearchClick,
  searchInputRef,
  isCreativeIntelligenceMode = false,
  tasteProfile,
  brandCognitionStatus,
}: Props) {
  const displayTitle = (title: string) => {
    // Titles are derived from user text; strip markdown artifacts like asterisks.
    return (title || "New chat").replace(/\*/g, "").replace(/\s+/g, " ").trim();
  };

  return (
    <aside
      className={cn(
        "bg-muted/30 flex flex-col h-full",
        collapsed ? "w-14" : "w-[280px]",
      )}
    >
      {/* RUMI Branding with Collapse Button */}
      <div className={cn(
        "px-3 pt-4 pb-3 flex items-center gap-3 border-b border-border/50",
        collapsed ? "justify-center" : "justify-between"
      )}>
        <div className="flex items-center gap-3">
          <RumiBlackIcon className="h-7 w-7 shrink-0" />
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold font-instrument-serif leading-tight">RUMI</span>
              <span className="text-[10px] text-muted-foreground leading-tight">Creative Intelligence</span>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapsed}
          className="h-7 w-7 rounded-full shrink-0"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </div>

      {/* Brand Cognition Status - Shows when a brand is actively selected */}
      {!collapsed && brandCognitionStatus && (
        <div className="px-3 pt-3">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-medium text-foreground">Brand Memory</h4>
              </div>
              {brandCognitionStatus.confidenceScore >= 0.7 && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 text-success text-[10px]">
                  <CheckCircle className="h-3 w-3" />
                  <span>Trained</span>
                </div>
              )}
            </div>
            
            {brandCognitionStatus.brandName && (
              <p className="text-xs text-foreground font-medium mb-2">{brandCognitionStatus.brandName}</p>
            )}
            
            <div className="rounded-xl border border-border/30 bg-background p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Confidence:</span>
                <span className="font-medium text-foreground">
                  {Math.round(brandCognitionStatus.confidenceScore * 100)}%
                </span>
              </div>
              <Progress 
                value={brandCognitionStatus.confidenceScore * 100} 
                className="h-1.5 [&>div]:bg-primary"
              />
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Designs analyzed:</span>
                <span className="font-medium text-foreground">{brandCognitionStatus.totalDesignsAnalyzed}</span>
              </div>
            </div>
            
            {brandCognitionStatus.emotionalTones.length > 0 && (
              <div className="mt-3">
                <p className="text-[10px] text-muted-foreground mb-1.5">Detected tones:</p>
                <div className="flex flex-wrap gap-1">
                  {brandCognitionStatus.emotionalTones.slice(0, 3).map((tone, i) => (
                    <span 
                      key={i}
                      className="px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground capitalize"
                    >
                      {tone}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Taste Profile Card - Only visible in CI mode when expanded and no brand selected */}
      {!collapsed && isCreativeIntelligenceMode && !brandCognitionStatus && (
        <div className="px-3 pt-3">
          <div className="rounded-2xl border border-border/50 bg-background p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-foreground">Your Taste Profile</h4>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-foreground text-background text-[10px]">
                <Lightbulb className="h-3 w-3" />
                <span>Learning</span>
                <div className="w-8 h-1 bg-muted-foreground/30 rounded-full overflow-hidden ml-1">
                  <div 
                    className="h-full bg-warning rounded-full" 
                    style={{ width: `${Math.min(100, (tasteProfile?.total_sessions || 0) * 10 + (tasteProfile?.acceptance_rate || 0) * 0.5)}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border/30 p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Sessions Completed:</span>
                <span className="font-medium text-foreground">{tasteProfile?.total_sessions || 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Decision acceptance:</span>
                <span className="font-medium text-foreground">{(tasteProfile?.acceptance_rate || 0).toFixed(0)}%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Profile strength:</span>
                <span className="font-medium text-foreground">
                  {Math.min(100, (tasteProfile?.total_sessions || 0) * 10 + (tasteProfile?.acceptance_rate || 0) * 0.5).toFixed(0)}%
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
              The more you use creative intelligence, the better RUMI understands your preference.
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className={cn("px-2 pt-2", collapsed ? "space-y-1" : "space-y-1.5")}
      >
        <button
          type="button"
          onClick={onNewConversation}
          className={cn(
            "w-full rounded-xl flex items-center gap-3 transition-colors",
            "hover:bg-muted/60 text-foreground",
            collapsed ? "h-10 justify-center" : "h-10 px-3",
          )}
          title={collapsed ? "New chat" : undefined}
        >
          <PenSquare className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="text-sm">New chat</span>}
        </button>

        <button
          type="button"
          onClick={onSearchClick}
          className={cn(
            "w-full rounded-xl flex items-center gap-3 transition-colors",
            "hover:bg-muted/60 text-foreground",
            collapsed ? "h-10 justify-center" : "h-10 px-3",
          )}
          title={collapsed ? "Search chats" : undefined}
        >
          <Search className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="text-sm">Search chats</span>}
        </button>
      </div>

      {/* Expanded-only content */}
      {!collapsed && (
        <>
          <div className="px-4 pt-2">
            <input
              ref={searchInputRef}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search your chats"
              className={cn(
                "w-full h-9 rounded-xl bg-background px-3 text-sm",
                "ring-1 ring-black/5 dark:ring-white/10",
                "placeholder:text-muted-foreground focus:outline-none",
              )}
            />
          </div>

          <div className="px-4 pt-4 pb-2">
            <div className="text-xs font-medium text-muted-foreground">Your chats</div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-3">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No conversations yet</div>
            ) : (
              <div className="space-y-1">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={cn(
                      "group flex items-center gap-2 rounded-xl cursor-pointer transition-colors",
                      "px-3 py-2",
                      currentConversationId === conv.id
                        ? "bg-primary/10 text-foreground"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground",
                    )}
                    onClick={() => onSelectConversation(conv.id)}
                  >
                    <span className="text-sm truncate flex-1">{displayTitle(conv.title)}</span>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 focus:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                          aria-label="Chat actions"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteConversation(conv.id);
                          }}
                        >
                          Delete chat
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
