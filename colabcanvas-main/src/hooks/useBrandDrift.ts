import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRumiLearning } from './useRumiLearning';

interface DesignSnapshot {
  colors?: string[];
  typography?: { fontFamily?: string; fontWeight?: number }[];
  layoutDensity?: number;
  emotionalTone?: string;
  dimensions?: { width: number; height: number };
}

interface DriftDimension {
  score: number;
  deviation: string;
  current: unknown;
  expected: unknown;
  severity: 'info' | 'warning' | 'critical';
}

interface DriftAlert {
  drift_type: string;
  severity: string;
  deviation_score: number;
  correction_suggestion: string;
  current_value: unknown;
  expected_range: unknown;
}

export interface DriftAnalysis {
  overall_drift_score: number;
  dimensions: {
    color: DriftDimension;
    typography: DriftDimension;
    layout: DriftDimension;
    tone: DriftDimension;
  };
  alerts: DriftAlert[];
  suggestions: string[];
  requires_attention: boolean;
}

export function useBrandDrift() {
  const { user } = useAuth();
  const { recordDriftResponse } = useRumiLearning();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<DriftAnalysis | null>(null);
  const [showAlert, setShowAlert] = useState(false);

  /**
   * Analyze a design for brand drift
   */
  const analyzeDrift = useCallback(async (
    brandId: string,
    designSnapshot: DesignSnapshot,
    projectId?: string
  ): Promise<DriftAnalysis | null> => {
    if (!user?.id) {
      console.warn('Cannot analyze drift: user not authenticated');
      return null;
    }

    setIsAnalyzing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('brand-drift-detector', {
        body: {
          brandId,
          userId: user.id,
          projectId,
          designSnapshot,
        },
      });

      if (error) {
        console.error('Drift analysis error:', error);
        return null;
      }

      const analysis = data as DriftAnalysis;
      setLastAnalysis(analysis);

      // Auto-show alert if attention required
      if (analysis.requires_attention) {
        setShowAlert(true);
      }

      return analysis;
    } catch (error) {
      console.error('Failed to analyze drift:', error);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [user?.id]);

  /**
   * Handle user acknowledging drift (no correction needed)
   */
  const handleAcknowledge = useCallback(async (
    alertId: string,
    brandId: string
  ) => {
    setShowAlert(false);
    await recordDriftResponse(alertId, 'acknowledged', brandId);
  }, [recordDriftResponse]);

  /**
   * Handle user intentionally overriding brand guidelines
   */
  const handleOverride = useCallback(async (
    alertId: string,
    brandId: string,
    reason?: string
  ) => {
    setShowAlert(false);
    await recordDriftResponse(alertId, 'overridden', brandId, { reason });
  }, [recordDriftResponse]);

  /**
   * Handle user accepting correction suggestion
   */
  const handleCorrection = useCallback(async (
    alertId: string,
    brandId: string,
    correctionApplied?: Record<string, unknown>
  ) => {
    setShowAlert(false);
    await recordDriftResponse(alertId, 'corrected', brandId, { correctionApplied });
  }, [recordDriftResponse]);

  /**
   * Get recent drift alerts for a brand
   */
  const getRecentAlerts = useCallback(async (
    brandId: string,
    limit = 10
  ): Promise<DriftAlert[]> => {
    if (!user?.id) return [];

    try {
      const { data, error } = await supabase
        .from('brand_drift_alerts')
        .select('*')
        .eq('brand_id', brandId)
        .eq('user_id', user.id)
        .is('user_response', null) // Only unresolved alerts
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to fetch drift alerts:', error);
        return [];
      }

      return (data || []).map((alert) => ({
        drift_type: alert.drift_type,
        severity: alert.severity || 'warning',
        deviation_score: alert.deviation_score,
        correction_suggestion: alert.correction_suggestion || '',
        current_value: alert.current_value,
        expected_range: alert.expected_range,
      }));
    } catch (error) {
      console.error('Error fetching drift alerts:', error);
      return [];
    }
  }, [user?.id]);

  /**
   * Get drift statistics for a brand
   */
  const getDriftStats = useCallback(async (brandId: string) => {
    if (!user?.id) return null;

    try {
      const { data, error } = await supabase
        .from('brand_drift_alerts')
        .select('drift_type, severity, user_response')
        .eq('brand_id', brandId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Failed to fetch drift stats:', error);
        return null;
      }

      const alerts = data || [];
      const total = alerts.length;
      const resolved = alerts.filter((a) => a.user_response).length;
      const overridden = alerts.filter((a) => a.user_response === 'intentional_override').length;
      const corrected = alerts.filter((a) => a.user_response === 'corrected').length;

      const bySeverity = {
        critical: alerts.filter((a) => a.severity === 'critical').length,
        warning: alerts.filter((a) => a.severity === 'warning').length,
        info: alerts.filter((a) => a.severity === 'info').length,
      };

      const byType = alerts.reduce((acc, alert) => {
        acc[alert.drift_type] = (acc[alert.drift_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        total,
        resolved,
        unresolved: total - resolved,
        overridden,
        corrected,
        bySeverity,
        byType,
        overrideRate: total > 0 ? overridden / total : 0,
      };
    } catch (error) {
      console.error('Error fetching drift stats:', error);
      return null;
    }
  }, [user?.id]);

  return {
    // Analysis
    analyzeDrift,
    isAnalyzing,
    lastAnalysis,

    // Alert UI state
    showAlert,
    setShowAlert,

    // Response handlers
    handleAcknowledge,
    handleOverride,
    handleCorrection,

    // Data fetching
    getRecentAlerts,
    getDriftStats,
  };
}
