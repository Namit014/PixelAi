import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { 
  Download, 
  Filter, 
  Search, 
  Brain, 
  CheckCircle, 
  XCircle, 
  Edit,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface AuditEvent {
  id: string;
  signal_type: string;
  signal_data: unknown;
  context_snapshot: unknown;
  created_at: string;
  brand_id?: string | null;
  session_id?: string | null;
}

interface RumiAuditLogProps {
  brandId?: string;
  className?: string;
}

const signalTypeConfig: Record<string, { 
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
}> = {
  suggestion_accepted: {
    icon: CheckCircle,
    label: 'Accepted',
    color: 'text-success',
  },
  suggestion_modified: {
    icon: Edit,
    label: 'Modified',
    color: 'text-warning',
  },
  suggestion_ignored: {
    icon: XCircle,
    label: 'Ignored',
    color: 'text-destructive',
  },
  drift_acknowledged: {
    icon: AlertTriangle,
    label: 'Drift Ack',
    color: 'text-muted-foreground',
  },
  drift_overridden: {
    icon: AlertTriangle,
    label: 'Drift Override',
    color: 'text-warning',
  },
  drift_corrected: {
    icon: CheckCircle,
    label: 'Drift Fixed',
    color: 'text-success',
  },
  manual_design: {
    icon: Brain,
    label: 'Manual',
    color: 'text-primary',
  },
  time_to_approval: {
    icon: CheckCircle,
    label: 'Approved',
    color: 'text-success',
  },
  revision_count: {
    icon: RefreshCw,
    label: 'Revision',
    color: 'text-muted-foreground',
  },
};

export function RumiAuditLog({ brandId, className }: RumiAuditLogProps) {
  const { user } = useAuth();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const fetchEvents = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      let query = supabase
        .from('rumi_learning_events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (brandId) {
        query = query.eq('brand_id', brandId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch audit events:', error);
        return;
      }

      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching audit events:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, brandId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const filteredEvents = events.filter((event) => {
    if (typeFilter !== 'all' && event.signal_type !== typeFilter) {
      return false;
    }
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const typeLabel = signalTypeConfig[event.signal_type]?.label.toLowerCase() || '';
      const dataStr = JSON.stringify(event.signal_data).toLowerCase();
      return typeLabel.includes(searchLower) || dataStr.includes(searchLower);
    }
    return true;
  });

  const exportToCSV = useCallback(() => {
    const headers = ['Date', 'Type', 'Data', 'Context'];
    const rows = filteredEvents.map((event) => [
      format(new Date(event.created_at), 'yyyy-MM-dd HH:mm:ss'),
      signalTypeConfig[event.signal_type]?.label || event.signal_type,
      JSON.stringify(event.signal_data),
      JSON.stringify(event.context_snapshot),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `rumi-audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }, [filteredEvents]);

  const exportToJSON = useCallback(() => {
    const exportData = filteredEvents.map((event) => ({
      date: event.created_at,
      type: event.signal_type,
      label: signalTypeConfig[event.signal_type]?.label,
      data: event.signal_data,
      context: event.context_snapshot,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `rumi-audit-log-${format(new Date(), 'yyyy-MM-dd')}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }, [filteredEvents]);

  const signalTypes = Object.keys(signalTypeConfig);

  return (
    <Card className={cn('border-border', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              RUMI Audit Log
            </CardTitle>
            <CardDescription className="mt-1">
              Track all AI decisions and learning signals
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              disabled={filteredEvents.length === 0}
            >
              <Download className="h-4 w-4 mr-1.5" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToJSON}
              disabled={filteredEvents.length === 0}
            >
              <Download className="h-4 w-4 mr-1.5" />
              JSON
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px] h-9">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {signalTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {signalTypeConfig[type].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchEvents}
            disabled={isLoading}
            className="h-9 w-9"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>

        {/* Events Table */}
        <ScrollArea className="h-[400px] border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[160px]">Date</TableHead>
                <TableHead className="w-[120px]">Type</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    No audit events found
                  </TableCell>
                </TableRow>
              ) : (
                filteredEvents.map((event) => {
                  const config = signalTypeConfig[event.signal_type] || {
                    icon: Brain,
                    label: event.signal_type,
                    color: 'text-muted-foreground',
                  };
                  const Icon = config.icon;

                  return (
                    <TableRow key={event.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(event.created_at), 'MMM d, h:mm a')}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={cn('text-xs', config.color)}
                        >
                          <Icon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">
                        {JSON.stringify(event.signal_data)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* Summary */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <span>
            Showing {filteredEvents.length} of {events.length} events
          </span>
          <span>
            Last updated: {format(new Date(), 'MMM d, h:mm a')}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
