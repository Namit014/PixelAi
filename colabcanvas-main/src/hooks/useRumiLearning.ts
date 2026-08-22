import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type LearningSignalType = 
  | 'suggestion_accepted'
  | 'suggestion_modified'
  | 'suggestion_ignored'
  | 'manual_design'
  | 'time_to_approval'
  | 'revision_count'
  | 'drift_acknowledged'
  | 'drift_overridden'
  | 'drift_corrected'
  | 'design_approved'
  | 'design_exported';

export interface LearningSignal {
  type: LearningSignalType;
  brandId?: string;
  sessionId?: string;
  cardId?: string;
  data: Record<string, unknown>;
  context?: Record<string, unknown>;
}

export interface LearningStats {
  totalSignals: number;
  acceptanceRate: number;
  modificationRate: number;
  avgTimeToApproval: number;
  avgRevisionCount: number;
}

export function useRumiLearning() {
  const { user } = useAuth();

  /**
   * Record a learning signal from user behavior
   */
  const recordSignal = useCallback(async (signal: LearningSignal): Promise<boolean> => {
    if (!user?.id) {
      console.warn('Cannot record learning signal: user not authenticated');
      return false;
    }

    try {
      const insertData = {
        user_id: user.id,
        brand_id: signal.brandId || null,
        session_id: signal.sessionId || null,
        decision_card_id: signal.cardId || null,
        signal_type: signal.type,
        signal_data: signal.data as Record<string, unknown>,
        context_snapshot: signal.context || {},
      };
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase
        .from('rumi_learning_events') as any)
        .insert(insertData);
      if (error) {
        console.error('Failed to record learning signal:', error);
        return false;
      }

      console.log('Learning signal recorded:', signal.type);
      return true;
    } catch (error) {
      console.error('Error recording learning signal:', error);
      return false;
    }
  }, [user?.id]);

  /**
   * Record when user accepts a RUMI suggestion
   */
  const recordAcceptance = useCallback(async (
    cardId: string,
    sessionId: string,
    brandId?: string,
    context?: Record<string, unknown>
  ) => {
    return recordSignal({
      type: 'suggestion_accepted',
      cardId,
      sessionId,
      brandId,
      data: { acceptedAt: new Date().toISOString() },
      context,
    });
  }, [recordSignal]);

  /**
   * Record when user modifies a suggestion after accepting
   */
  const recordModification = useCallback(async (
    cardId: string,
    sessionId: string,
    modifications: Record<string, unknown>,
    brandId?: string
  ) => {
    return recordSignal({
      type: 'suggestion_modified',
      cardId,
      sessionId,
      brandId,
      data: { modifications, modifiedAt: new Date().toISOString() },
    });
  }, [recordSignal]);

  /**
   * Record when user ignores/dismisses a suggestion
   */
  const recordIgnored = useCallback(async (
    cardId: string,
    sessionId: string,
    reason?: string,
    brandId?: string
  ) => {
    return recordSignal({
      type: 'suggestion_ignored',
      cardId,
      sessionId,
      brandId,
      data: { reason, ignoredAt: new Date().toISOString() },
    });
  }, [recordSignal]);

  /**
   * Record when user creates a design manually without RUMI
   */
  const recordManualDesign = useCallback(async (
    projectId: string,
    designData: Record<string, unknown>,
    brandId?: string
  ) => {
    return recordSignal({
      type: 'manual_design',
      brandId,
      data: { 
        projectId, 
        designData, 
        createdAt: new Date().toISOString() 
      },
    });
  }, [recordSignal]);

  /**
   * Record time from design creation to approval/export
   */
  const recordTimeToApproval = useCallback(async (
    cardId: string,
    sessionId: string,
    createdAt: string,
    approvedAt: string,
    brandId?: string
  ) => {
    const durationMs = new Date(approvedAt).getTime() - new Date(createdAt).getTime();
    
    return recordSignal({
      type: 'time_to_approval',
      cardId,
      sessionId,
      brandId,
      data: { 
        createdAt, 
        approvedAt, 
        durationMs,
        durationMinutes: durationMs / 60000,
      },
    });
  }, [recordSignal]);

  /**
   * Record revision count for a design
   */
  const recordRevisionCount = useCallback(async (
    cardId: string,
    sessionId: string,
    revisionCount: number,
    brandId?: string
  ) => {
    return recordSignal({
      type: 'revision_count',
      cardId,
      sessionId,
      brandId,
      data: { 
        revisionCount, 
        recordedAt: new Date().toISOString() 
      },
    });
  }, [recordSignal]);

  /**
   * Record user response to brand drift alert
   */
  const recordDriftResponse = useCallback(async (
    alertId: string,
    response: 'acknowledged' | 'overridden' | 'corrected',
    brandId: string,
    details?: Record<string, unknown>
  ) => {
    const signalType: LearningSignalType = 
      response === 'acknowledged' ? 'drift_acknowledged' :
      response === 'overridden' ? 'drift_overridden' : 'drift_corrected';

    return recordSignal({
      type: signalType,
      brandId,
      data: { 
        alertId, 
        response, 
        ...details,
        respondedAt: new Date().toISOString(),
      },
    });
  }, [recordSignal]);

  /**
   * Get learning statistics for a brand
   */
  const getLearningStats = useCallback(async (brandId?: string): Promise<LearningStats | null> => {
    if (!user?.id) return null;

    try {
      let query = supabase
        .from('rumi_learning_events')
        .select('signal_type, signal_data')
        .eq('user_id', user.id);

      if (brandId) {
        query = query.eq('brand_id', brandId);
      }

      const { data: events, error } = await query;

      if (error) {
        console.error('Failed to fetch learning stats:', error);
        return null;
      }

      if (!events || events.length === 0) {
        return {
          totalSignals: 0,
          acceptanceRate: 0,
          modificationRate: 0,
          avgTimeToApproval: 0,
          avgRevisionCount: 0,
        };
      }

      const accepted = events.filter(e => e.signal_type === 'suggestion_accepted').length;
      const modified = events.filter(e => e.signal_type === 'suggestion_modified').length;
      const ignored = events.filter(e => e.signal_type === 'suggestion_ignored').length;
      
      const timeEvents = events.filter(e => e.signal_type === 'time_to_approval');
      const avgTime = timeEvents.length > 0
        ? timeEvents.reduce((acc, e) => {
            const signalData = e.signal_data as Record<string, unknown> | null;
            return acc + (typeof signalData?.durationMinutes === 'number' ? signalData.durationMinutes : 0);
          }, 0) / timeEvents.length
        : 0;

      const revisionEvents = events.filter(e => e.signal_type === 'revision_count');
      const avgRevisions = revisionEvents.length > 0
        ? revisionEvents.reduce((acc, e) => {
            const signalData = e.signal_data as Record<string, unknown> | null;
            return acc + (typeof signalData?.revisionCount === 'number' ? signalData.revisionCount : 0);
          }, 0) / revisionEvents.length
        : 0;

      const totalDecisions = accepted + modified + ignored;

      return {
        totalSignals: events.length,
        acceptanceRate: totalDecisions > 0 ? accepted / totalDecisions : 0,
        modificationRate: totalDecisions > 0 ? modified / totalDecisions : 0,
        avgTimeToApproval: avgTime,
        avgRevisionCount: avgRevisions,
      };
    } catch (error) {
      console.error('Error fetching learning stats:', error);
      return null;
    }
  }, [user?.id]);

  return {
    // Core recording functions
    recordSignal,
    
    // Convenience methods
    recordAcceptance,
    recordModification,
    recordIgnored,
    recordManualDesign,
    recordTimeToApproval,
    recordRevisionCount,
    recordDriftResponse,
    
    // Analytics
    getLearningStats,
  };
}
