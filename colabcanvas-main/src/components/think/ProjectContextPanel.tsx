import React from 'react';
import { motion } from 'framer-motion';
import { 
  FolderOpen, 
  Palette, 
  Clock, 
  Activity,
  ChevronRight,
  Image,
  Layers
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Project, Brand, ProjectActivity } from '@/hooks/useProjectMonitor';
import type { CreativeSession } from '@/hooks/useCreativeIntelligence';

interface ProjectContextPanelProps {
  projects: Project[];
  brands: Brand[];
  projectStats: Record<string, number>;
  recentSessions: CreativeSession[];
  realtimeActivity: ProjectActivity[];
  onSelectProject?: (project: Project) => void;
  onSelectBrand?: (brand: Brand) => void;
  onSelectSession?: (session: CreativeSession) => void;
}

export function ProjectContextPanel({
  projects,
  brands,
  projectStats,
  recentSessions,
  realtimeActivity,
  onSelectProject,
  onSelectBrand,
  onSelectSession,
}: ProjectContextPanelProps) {
  const [projectsOpen, setProjectsOpen] = React.useState(true);
  const [brandsOpen, setBrandsOpen] = React.useState(true);
  const [sessionsOpen, setSessionsOpen] = React.useState(false);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Real-time Activity */}
        {realtimeActivity.length > 0 && (
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-xs font-medium text-primary">Active Monitoring</span>
            </div>
            <div className="space-y-1">
              {realtimeActivity.slice(0, 2).map((activity) => (
                <div key={activity.projectId} className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{activity.projectTitle}</span>
                  <span className="mx-1">•</span>
                  <span>{activity.artboardCount} asset{activity.artboardCount !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Your Projects */}
        <Collapsible open={projectsOpen} onOpenChange={setProjectsOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 group">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Your Projects</span>
              <span className="text-xs text-muted-foreground">({projects.length})</span>
            </div>
            <ChevronRight className={cn(
              "w-4 h-4 text-muted-foreground transition-transform",
              projectsOpen && "rotate-90"
            )} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-1 mt-2">
              {projects.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 px-2">No projects yet</p>
              ) : (
                projects.slice(0, 10).map((project) => (
                  <motion.button
                    key={project.id}
                    onClick={() => onSelectProject?.(project)}
                    className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                    whileHover={{ x: 2 }}
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
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Layers className="w-3 h-3" />
                        <span>{projectStats[project.id] || 0} assets</span>
                      </div>
                    </div>
                  </motion.button>
                ))
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Your Brands */}
        <Collapsible open={brandsOpen} onOpenChange={setBrandsOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 group">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Your Brands</span>
              <span className="text-xs text-muted-foreground">({brands.length})</span>
            </div>
            <ChevronRight className={cn(
              "w-4 h-4 text-muted-foreground transition-transform",
              brandsOpen && "rotate-90"
            )} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-1 mt-2">
              {brands.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 px-2">No brands created</p>
              ) : (
                brands.slice(0, 5).map((brand) => (
                  <motion.button
                    key={brand.id}
                    onClick={() => onSelectBrand?.(brand)}
                    className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                    whileHover={{ x: 2 }}
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
                  </motion.button>
                ))
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Recent Sessions */}
        <Collapsible open={sessionsOpen} onOpenChange={setSessionsOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 group">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Recent Decisions</span>
            </div>
            <ChevronRight className={cn(
              "w-4 h-4 text-muted-foreground transition-transform",
              sessionsOpen && "rotate-90"
            )} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-1 mt-2">
              {recentSessions.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 px-2">No sessions yet</p>
              ) : (
                recentSessions.slice(0, 5).map((session) => (
                  <motion.button
                    key={session.id}
                    onClick={() => onSelectSession?.(session)}
                    className="flex items-start gap-3 w-full p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                    whileHover={{ x: 2 }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {(session.business_context as any)?.goal?.slice(0, 50) || 'Strategic Session'}...
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(session.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </motion.button>
                ))
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </ScrollArea>
  );
}
