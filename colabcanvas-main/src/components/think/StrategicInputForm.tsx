import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Sparkles, Target, Users, Globe, Gauge, BarChart3, LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Brand } from '@/hooks/useProjectMonitor';
import type { StrategicInput } from '@/hooks/useCreativeIntelligence';

interface StrategicInputFormProps {
  brands: Brand[];
  onSubmit: (input: StrategicInput) => void;
  isLoading: boolean;
}

const platforms = [
  { value: 'social', label: 'Social Media' },
  { value: 'web', label: 'Web / Digital' },
  { value: 'print', label: 'Print / Physical' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'video', label: 'Video / Motion' },
  { value: 'mixed', label: 'Multi-Platform' },
];

export function StrategicInputForm({ brands, onSubmit, isLoading }: StrategicInputFormProps) {
  const [goal, setGoal] = useState('');
  const [audience, setAudience] = useState('');
  const [platform, setPlatform] = useState('social');
  const [riskTolerance, setRiskTolerance] = useState([50]);
  const [successMetrics, setSuccessMetrics] = useState('');
  const [brandId, setBrandId] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim() || !audience.trim()) return;

    onSubmit({
      goal: goal.trim(),
      audience: audience.trim(),
      platform,
      riskTolerance: riskTolerance[0],
      successMetrics: successMetrics.trim() || undefined,
      brandId: brandId || undefined,
    });
  };

  const isValid = goal.trim().length > 0 && audience.trim().length > 0;

  const riskLabel = riskTolerance[0] < 30 ? 'Conservative' : riskTolerance[0] > 70 ? 'Experimental' : 'Balanced';

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {/* Business Goal */}
      <div className="space-y-2">
        <Label htmlFor="goal" className="flex items-center gap-2 text-sm font-medium">
          <Target className="w-4 h-4 text-primary" />
          Business Goal
          <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="goal"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="What do you want to achieve? e.g., Launch new product line, increase brand awareness, drive signups..."
          className="min-h-[100px] resize-none"
        />
      </div>

      {/* Target Audience */}
      <div className="space-y-2">
        <Label htmlFor="audience" className="flex items-center gap-2 text-sm font-medium">
          <Users className="w-4 h-4 text-primary" />
          Target Audience
          <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="audience"
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          placeholder="Who are you trying to reach? Describe demographics, interests, pain points..."
          className="min-h-[80px] resize-none"
        />
      </div>

      {/* Platform & Brand Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Platform Context */}
        <div className="space-y-2">
          <Label htmlFor="platform" className="flex items-center gap-2 text-sm font-medium">
            <Globe className="w-4 h-4 text-primary" />
            Platform Context
          </Label>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger id="platform">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {platforms.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Link to Brand */}
        <div className="space-y-2">
          <Label htmlFor="brand" className="flex items-center gap-2 text-sm font-medium">
            <LinkIcon className="w-4 h-4 text-primary" />
            Link to Brand
          </Label>
          <Select value={brandId} onValueChange={(val) => setBrandId(val === 'none' ? '' : val)}>
            <SelectTrigger id="brand">
              <SelectValue placeholder="Select a brand (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No brand selected</SelectItem>
              {brands.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Risk Tolerance */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Gauge className="w-4 h-4 text-primary" />
            Risk Tolerance
          </Label>
          <span className={cn(
            "text-sm font-medium px-2 py-0.5 rounded",
            riskTolerance[0] < 30 && "bg-green-500/10 text-green-600",
            riskTolerance[0] >= 30 && riskTolerance[0] <= 70 && "bg-amber-500/10 text-amber-600",
            riskTolerance[0] > 70 && "bg-red-500/10 text-red-600"
          )}>
            {riskLabel}
          </span>
        </div>
        <Slider
          value={riskTolerance}
          onValueChange={setRiskTolerance}
          min={0}
          max={100}
          step={5}
          className="py-2"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Conservative</span>
          <span>Experimental</span>
        </div>
      </div>

      {/* Success Metrics */}
      <div className="space-y-2">
        <Label htmlFor="metrics" className="flex items-center gap-2 text-sm font-medium">
          <BarChart3 className="w-4 h-4 text-primary" />
          Success Metrics
          <span className="text-xs text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="metrics"
          value={successMetrics}
          onChange={(e) => setSuccessMetrics(e.target.value)}
          placeholder="How will you measure success? e.g., 10K impressions, 500 clicks, 50 signups..."
        />
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        size="lg"
        disabled={!isValid || isLoading}
        className="w-full bg-gradient-to-r from-primary to-violet-600 hover:from-primary/90 hover:to-violet-600/90"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Analyzing Strategic Directions...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5 mr-2" />
            Generate Creative Directions
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        RUMI will analyze your context and generate 3-5 strategic creative paths with business reasoning, risk assessment, and performance predictions.
      </p>
    </motion.form>
  );
}
