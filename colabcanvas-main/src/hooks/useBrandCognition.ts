import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface BrandCognitionMemory {
  id: string;
  brand_id: string;
  user_id: string;
  visual_patterns: Record<string, unknown>;
  typography_usage: Record<string, number>;
  layout_density_patterns: Record<string, number>;
  color_relationship_vectors: Record<string, unknown>;
  emotional_tone_mapping: Record<string, number>;
  campaign_style_clusters: unknown[];
  design_risk_tolerance: number;
  channel_style_variations: Record<string, unknown>;
  total_designs_analyzed: number;
  confidence_score: number;
  created_at: string;
  updated_at: string;
}

export interface DesignData {
  id: string;
  type: 'artboard' | 'canvas_object' | 'design_asset';
  projectId?: string;
  colors?: string[];
  fonts?: string[];
  dimensions?: { width: number; height: number };
  layout?: {
    nodes: {
      id: string;
      type: 'text_block' | 'image_container' | 'cta_element' | 'background_layer';
      position: { x: number; y: number; width: number; height: number };
      properties: Record<string, unknown>;
    }[];
    edges: {
      source: string;
      target: string;
      relationship: 'spatial' | 'hierarchy' | 'grouping';
      weight: number;
    }[];
  };
  metadata?: Record<string, unknown>;
}

export type DesignEventType = 
  | 'design_created'
  | 'design_edited'
  | 'design_approved'
  | 'design_exported'
  | 'design_reused'
  | 'design_rejected';

export function useBrandCognition(brandId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch brand cognition memory
  const { 
    data: cognitionMemory, 
    isLoading: memoryLoading,
    error: memoryError,
    refetch: refetchMemory,
  } = useQuery({
    queryKey: ['brand-cognition', brandId, user?.id],
    queryFn: async () => {
      if (!brandId || !user?.id) return null;

      const { data, error } = await supabase
        .from('brand_cognition_memory')
        .select('*')
        .eq('brand_id', brandId)
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data as BrandCognitionMemory | null;
    },
    enabled: !!brandId && !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch recent design events
  const { 
    data: designHistory = [],
    isLoading: historyLoading,
  } = useQuery({
    queryKey: ['brand-design-history', brandId, user?.id],
    queryFn: async () => {
      if (!brandId || !user?.id) return [];

      const { data, error } = await supabase
        .from('brand_design_events')
        .select('*')
        .eq('brand_id', brandId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!brandId && !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Process design and update cognition memory
  const processDesign = useMutation({
    mutationFn: async ({ 
      designData, 
      eventType 
    }: { 
      designData: DesignData; 
      eventType: DesignEventType;
    }) => {
      if (!brandId || !user?.id) {
        throw new Error('Missing brandId or user');
      }

      setIsProcessing(true);

      const { data, error } = await supabase.functions.invoke('brand-cognition-engine', {
        body: {
          action: 'process_design',
          userId: user.id,
          brandId,
          designData,
          eventType,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-cognition', brandId] });
      queryClient.invalidateQueries({ queryKey: ['brand-design-history', brandId] });
    },
    onSettled: () => {
      setIsProcessing(false);
    },
  });

  // Record a design event without full cognition update
  const recordDesignEvent = useCallback(async (
    eventType: DesignEventType,
    designSnapshot: Record<string, unknown>,
    channel?: string,
    campaignId?: string
  ) => {
    if (!brandId || !user?.id) return false;

    try {
      const insertData = {
        brand_id: brandId,
        user_id: user.id,
        event_type: eventType,
        design_snapshot: designSnapshot as Record<string, unknown>,
        channel: channel || null,
        campaign_id: campaignId || null,
      };
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase
        .from('brand_design_events') as any)
        .insert(insertData);

      if (error) {
        console.error('Failed to record design event:', error);
        return false;
      }

      queryClient.invalidateQueries({ queryKey: ['brand-design-history', brandId] });
      return true;
    } catch (error) {
      console.error('Error recording design event:', error);
      return false;
    }
  }, [brandId, user?.id, queryClient]);

  // Get cognition confidence level
  const getConfidenceLevel = useCallback((): 'low' | 'medium' | 'high' => {
    if (!cognitionMemory) return 'low';
    
    const score = cognitionMemory.confidence_score;
    if (score >= 0.7) return 'high';
    if (score >= 0.4) return 'medium';
    return 'low';
  }, [cognitionMemory]);

  // Get emotional tone summary
  const getEmotionalToneSummary = useCallback((): string[] => {
    if (!cognitionMemory?.emotional_tone_mapping) return [];

    const tones = cognitionMemory.emotional_tone_mapping;
    return Object.entries(tones)
      .filter(([, value]) => value > 0.5)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tone]) => tone);
  }, [cognitionMemory]);

  // Get typography preferences
  const getTypographyPreferences = useCallback((): string[] => {
    if (!cognitionMemory?.typography_usage) return [];

    return Object.entries(cognitionMemory.typography_usage)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([font]) => font);
  }, [cognitionMemory]);

  // Get layout style preference
  const getLayoutStyle = useCallback((): string | null => {
    if (!cognitionMemory?.visual_patterns) return null;
    
    const patterns = cognitionMemory.visual_patterns as Record<string, unknown>;
    return (patterns.layout_type as string) || null;
  }, [cognitionMemory]);

  // Check if brand has sufficient cognition data
  const hasSufficientData = useCallback((): boolean => {
    if (!cognitionMemory) return false;
    return cognitionMemory.total_designs_analyzed >= 3;
  }, [cognitionMemory]);

  // Clear cognition memory for a brand
  const clearCognitionMemory = useMutation({
    mutationFn: async () => {
      if (!brandId || !user?.id) {
        throw new Error('Missing brandId or user');
      }

      const { error } = await supabase
        .from('brand_cognition_memory')
        .delete()
        .eq('brand_id', brandId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-cognition', brandId] });
    },
  });

  return {
    // Data
    cognitionMemory,
    designHistory,
    
    // Loading states
    isLoading: memoryLoading || historyLoading,
    isProcessing,
    error: memoryError,
    
    // Actions
    processDesign: processDesign.mutate,
    recordDesignEvent,
    clearCognitionMemory: clearCognitionMemory.mutate,
    refetchMemory,
    
    // Computed helpers
    getConfidenceLevel,
    getEmotionalToneSummary,
    getTypographyPreferences,
    getLayoutStyle,
    hasSufficientData,
  };
}
