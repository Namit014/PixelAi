import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  onScheduled?: () => void;
}

export const ScheduleCallSheet = ({ open, onOpenChange, projectId, onScheduled }: Props) => {
  const [date, setDate] = useState<Date | undefined>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return d;
  });
  const [time, setTime] = useState('10:00');
  const [duration, setDuration] = useState(30);
  const [title, setTitle] = useState('Working session');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!date) return toast.error('Pick a date');
    const [h, m] = time.split(':').map(Number);
    const when = new Date(date);
    when.setHours(h || 10, m || 0, 0, 0);
    if (when.getTime() < Date.now() + 60_000) {
      return toast.error('Pick a time at least a minute in the future');
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('talent-create-meeting', {
        body: {
          project_id: projectId,
          title: title.trim() || 'Scheduled call',
          scheduled_for: when.toISOString(),
          duration_min: duration,
        },
      });
      if (error) throw error;
      toast.success(`Call scheduled for ${format(when, 'PPp')}`);
      onScheduled?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not schedule');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Schedule a call</SheetTitle>
          <SheetDescription>Pick a date and time. Everyone on the project gets an invite.</SheetDescription>
        </SheetHeader>
        <div className="space-y-5 mt-6">
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-600">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Working session" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-600">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  className={cn('p-3 pointer-events-auto')}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-600">Time</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-600">Duration (min)</Label>
              <Input type="number" min={5} max={240} step={5} value={duration} onChange={(e) => setDuration(Number(e.target.value) || 30)} />
            </div>
          </div>

          <Button onClick={submit} disabled={submitting} className="w-full bg-zinc-900 hover:bg-zinc-800 rounded-full">
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CalendarIcon className="w-4 h-4 mr-2" />}
            Schedule call
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
