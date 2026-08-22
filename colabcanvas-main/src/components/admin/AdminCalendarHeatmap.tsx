import { useMemo } from 'react';

interface AdminCalendarHeatmapProps {
  title: string;
  data?: { date: string; count: number }[];
}

export const AdminCalendarHeatmap = ({ title, data = [] }: AdminCalendarHeatmapProps) => {
  const today = new Date();
  const currentMonth = today.toLocaleString('default', { month: 'long' });
  const currentYear = today.getFullYear();
  
  // Generate calendar grid for current month
  const calendarDays = useMemo(() => {
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days: (number | null)[] = [];
    
    // Add empty cells for days before the 1st
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return days;
  }, [today]);
  
  // Create a map of date -> count for quick lookup
  const dataMap = useMemo(() => {
    const map = new Map<number, number>();
    data.forEach(item => {
      const date = new Date(item.date);
      if (date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()) {
        map.set(date.getDate(), item.count);
      }
    });
    return map;
  }, [data, today]);
  
  const getIntensity = (count: number) => {
    if (count === 0) return 'bg-zinc-800';
    if (count < 3) return 'bg-blue-900/50';
    if (count < 6) return 'bg-blue-700/60';
    if (count < 10) return 'bg-blue-600/70';
    return 'bg-blue-500';
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-zinc-100">{title}</h3>
        <span className="text-sm text-zinc-500">{currentMonth} {currentYear}</span>
      </div>
      
      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={i} className="text-xs text-zinc-600 text-center py-1">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => (
          <div
            key={index}
            className={`
              aspect-square rounded-md flex items-center justify-center text-xs
              ${day === null 
                ? 'bg-transparent' 
                : `${getIntensity(dataMap.get(day) || 0)} ${
                    day === today.getDate() 
                      ? 'ring-1 ring-blue-500 ring-offset-1 ring-offset-zinc-900' 
                      : ''
                  }`
              }
              ${day !== null ? 'text-zinc-400' : ''}
            `}
          >
            {day}
          </div>
        ))}
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-end gap-1 mt-4">
        <span className="text-xs text-zinc-500 mr-2">Less</span>
        <div className="w-3 h-3 rounded-sm bg-zinc-800" />
        <div className="w-3 h-3 rounded-sm bg-blue-900/50" />
        <div className="w-3 h-3 rounded-sm bg-blue-700/60" />
        <div className="w-3 h-3 rounded-sm bg-blue-600/70" />
        <div className="w-3 h-3 rounded-sm bg-blue-500" />
        <span className="text-xs text-zinc-500 ml-2">More</span>
      </div>
    </div>
  );
};
