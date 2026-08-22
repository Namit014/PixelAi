import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { resolveAvatarUrl } from "@/lib/avatarUtils";

interface Collaborator {
  id: string;
  user_id: string;
  is_online: boolean;
  permission: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
  };
}

interface CollaboratorAvatarsProps {
  projectId: string;
  currentUserId: string;
  maxVisible?: number;
}

export function CollaboratorAvatars({ projectId, currentUserId, maxVisible = 5 }: CollaboratorAvatarsProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [owner, setOwner] = useState<{ id: string; full_name: string | null; avatar_url: string | null } | null>(null);

  useEffect(() => {
    if (!projectId) return;

    // Load initial collaborators
    loadCollaborators();

    // Subscribe to collaborator changes
    const channel = supabase
      .channel(`collaborators:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_collaborators',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          loadCollaborators();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [projectId]);

  const loadCollaborators = async () => {
    try {
      // Get project owner
      const { data: project } = await supabase
        .from('projects')
        .select('user_id, profiles(full_name, avatar_url)')
        .eq('id', projectId)
        .single();

      if (project) {
        const profile = project.profiles as any;
        setOwner({
          id: project.user_id,
          full_name: profile?.full_name,
          avatar_url: profile?.avatar_url,
        });
      }

      // Get collaborators
      const { data: collabs } = await supabase
        .from('project_collaborators')
        .select('id, user_id, is_online, permission')
        .eq('project_id', projectId);

      if (collabs) {
        // Fetch profiles for all collaborators
        const userIds = collabs.map(c => c.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, email')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        const collaboratorsWithProfiles = collabs.map(c => ({
          ...c,
          profile: profileMap.get(c.user_id) || null,
        }));

        // Sort: online users first
        collaboratorsWithProfiles.sort((a, b) => {
          if (a.is_online && !b.is_online) return -1;
          if (!a.is_online && b.is_online) return 1;
          return 0;
        });

        setCollaborators(collaboratorsWithProfiles);
      }
    } catch (error) {
      console.error('Error loading collaborators:', error);
    }
  };

  const getInitials = (name: string | null | undefined, email: string | null | undefined) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return '?';
  };

  // Filter out current user and combine owner with collaborators
  const allMembers = [
    ...(owner && owner.id !== currentUserId ? [{
      id: 'owner',
      user_id: owner.id,
      is_online: true, // Owner is always considered "active"
      permission: 'owner',
      profile: { full_name: owner.full_name, avatar_url: owner.avatar_url, email: null },
      isOwner: true,
    }] : []),
    ...collaborators.filter(c => c.user_id !== currentUserId),
  ];

  const visibleMembers = allMembers.slice(0, maxVisible);
  const hiddenCount = allMembers.length - maxVisible;

  if (allMembers.length === 0) {
    return null;
  }

  return (
    <div className="group flex items-center -space-x-2 hover:space-x-1 transition-all duration-300">
      {visibleMembers.map((member) => (
        <Tooltip key={member.id}>
          <TooltipTrigger asChild>
            <div className="relative transition-all duration-300 group-hover:scale-110 hover:z-10">
              <Avatar className={cn(
                "h-7 w-7 rounded-md transition-all duration-300",
                member.is_online ? "ring-1 ring-primary ring-offset-1 ring-offset-background" : ""
              )}>
                <AvatarImage src={resolveAvatarUrl(member.profile?.avatar_url, member.user_id)} className="rounded-md" />
                <AvatarFallback className="text-xs bg-primary text-primary-foreground rounded-md">
                  {getInitials(member.profile?.full_name, member.profile?.email)}
                </AvatarFallback>
              </Avatar>
              {member.is_online && (
                <span className="absolute bottom-0 right-0 w-2 h-2 bg-primary rounded-full border border-background" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="font-medium">{member.profile?.full_name || 'Anonymous'}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {(member as any).isOwner ? 'Owner' : member.permission}
              {member.is_online ? ' • Online' : ''}
            </p>
          </TooltipContent>
        </Tooltip>
      ))}
      
      {hiddenCount > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center transition-all duration-300 group-hover:scale-110">
              <span className="text-xs font-medium text-muted-foreground">+{hiddenCount}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{hiddenCount} more collaborator{hiddenCount > 1 ? 's' : ''}</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
