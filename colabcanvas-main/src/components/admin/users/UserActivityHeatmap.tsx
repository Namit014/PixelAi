import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface UserActivityHeatmapProps {
  userId: string;
}

export const UserActivityHeatmap = ({ userId }: UserActivityHeatmapProps) => {
  const [activityData, setActivityData] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivityData();
  }, [userId]);

  const loadActivityData = async () => {
    try {
      // Get last 90 days of activity
      const startDate = subDays(new Date(), 90);
      
      const { data, error } = await supabase
        .from('user_activity_events')
        .select('created_at')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      // Group by date
      const grouped: { [key: string]: number } = {};
      data?.forEach((event) => {
        const date = format(new Date(event.created_at), 'yyyy-MM-dd');
        grouped[date] = (grouped[date] || 0) + 1;
      });

      setActivityData(grouped);
    } catch (error) {
      console.error('Error loading activity data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIntensity = (count: number) => {
    if (count === 0) return 'bg-zinc-800';
    if (count <= 5) return 'bg-green-900/50';
    if (count <= 10) return 'bg-green-700/70';
    if (count <= 20) return 'bg-green-600';
    return 'bg-green-500';
  };

  // Generate last 90 days
  const days = Array.from({ length: 90 }, (_, i) => {
    const date = subDays(new Date(), 89 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const count = activityData[dateStr] || 0;
    return { date: dateStr, count, displayDate: format(date, 'MMM d') };
  });

  if (loading) {
    return <div className="text-zinc-400">Loading activity heatmap...</div>;
  }

  return (
    <Card className="p-6 bg-zinc-900 border-zinc-800">
      <h3 className="text-lg font-semibold text-zinc-100 mb-4">Activity Heatmap (Last 90 Days)</h3>
      
      <div className="grid grid-cols-13 gap-1">
        {days.map((day, idx) => (
          <div
            key={day.date}
            className={`w-2 h-2 rounded-sm ${getIntensity(day.count)} transition-colors`}
            title={`${day.displayDate}: ${day.count} activities`}
          />
        ))}
      </div>

      <div className="flex items-center gap-4 mt-4 text-xs text-zinc-500">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-sm bg-zinc-800"></div>
          <div className="w-3 h-3 rounded-sm bg-green-900/50"></div>
          <div className="w-3 h-3 rounded-sm bg-green-700/70"></div>
          <div className="w-3 h-3 rounded-sm bg-green-600"></div>
          <div className="w-3 h-3 rounded-sm bg-green-500"></div>
        </div>
        <span>More</span>
      </div>
    </Card>
  );
};
