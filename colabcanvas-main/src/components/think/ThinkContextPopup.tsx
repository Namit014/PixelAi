import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FolderOpen, Palette, Image, Brain, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project, Brand } from '@/hooks/useProjectMonitor';

interface BrandMemoryInsight {
  id: string;
  label: string;
  confidence: number;
  type: 'color' | 'typography' | 'layout' | 'tone';
}

interface ThinkContextPopupProps {
  open: boolean;
  onClose: () => void;
  onSelectProject: (project: Project) => void;
  onSelectBrand: (brand: Brand) => void;
  projects: Project[];
  brands: Brand[];
  projectStats: Record<string, number>;
  position: { x: number; y: number };
  brandMemoryInsights?: BrandMemoryInsight[];
  suggestedBrandId?: string;
}

export function ThinkContextPopup({
  open,
  onClose,
  onSelectProject,
  onSelectBrand,
  projects,
  brands,
  projectStats,
  position,
  brandMemoryInsights = [],
  suggestedBrandId,
}: ThinkContextPopupProps) {
  if (!open) return null;

  // Find suggested brand
  const suggestedBrand = suggestedBrandId ? brands.find(b => b.id === suggestedBrandId) : null;

  const content = (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-[9998]" 
            onClick={onClose}
          />
          
          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed z-[9999] w-80 max-h-[450px] overflow-hidden rounded-xl bg-background border border-border"
            style={{
              left: Math.min(position.x, window.innerWidth - 340),
              bottom: window.innerHeight - position.y + 10,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-medium">Your Context</span>
              <button
                onClick={onClose}
                className="h-6 w-6 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[390px]">
              {/* Brand Memory Insights Section - Only show if insights exist */}
              {brandMemoryInsights.length > 0 && (
                <div className="p-3 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    <Brain className="h-3.5 w-3.5" />
                    Brand Memory Insights
                    <span className="ml-auto px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px]">
                      AI Suggested
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 px-2">
                    {brandMemoryInsights.slice(0, 4).map((insight) => (
                      <div
                        key={insight.id}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-background border border-border text-xs"
                      >
                        <span className="text-foreground">{insight.label}</span>
                        <span className="text-muted-foreground text-[10px]">
                          {Math.round(insight.confidence * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Brand - Quick Access */}
              {suggestedBrand && (
                <div className="p-3 border-b border-border">
                  <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5" />
                    Suggested Brand
                  </div>
                  <button
                    onClick={() => onSelectBrand(suggestedBrand)}
                    className="flex items-center gap-3 w-full p-2 mt-1 rounded-lg bg-primary/5 hover:bg-primary/10 border border-primary/20 transition-colors text-left group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                      {suggestedBrand.logo_primary_url ? (
                        <img 
                          src={suggestedBrand.logo_primary_url} 
                          alt="" 
                          className="w-full h-full object-contain p-1"
                        />
                      ) : (
                        <Palette className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-foreground">{suggestedBrand.name}</p>
                      <p className="text-[10px] text-primary">Click to add context</p>
                    </div>
                  </button>
                </div>
              )}

              {/* Projects Section */}
              <div className="p-3">
                <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  <FolderOpen className="h-3.5 w-3.5" />
                  Projects
                </div>
                <div className="mt-1 space-y-0.5">
                  {projects.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-2 py-2">No projects yet</p>
                  ) : (
                    projects.slice(0, 8).map((project) => (
                      <button
                        key={project.id}
                        onClick={() => onSelectProject(project)}
                        className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                          {project.thumbnail_url ? (
                            <img 
                              src={project.thumbnail_url} 
                              alt="" 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Image className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{project.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {projectStats[project.id] || 0} assets
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Brands Section */}
              <div className="p-3 border-t border-border">
                <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  <Palette className="h-3.5 w-3.5" />
                  Brands
                </div>
                <div className="mt-1 space-y-0.5">
                  {brands.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-2 py-2">No brands created</p>
                  ) : (
                    brands.filter(b => b.id !== suggestedBrandId).slice(0, 5).map((brand) => (
                      <button
                        key={brand.id}
                        onClick={() => onSelectBrand(brand)}
                        className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                          {brand.logo_primary_url ? (
                            <img 
                              src={brand.logo_primary_url} 
                              alt="" 
                              className="w-full h-full object-contain p-1"
                            />
                          ) : (
                            <Palette className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{brand.name}</p>
                          {brand.industry && (
                            <p className="text-xs text-muted-foreground truncate">{brand.industry}</p>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
