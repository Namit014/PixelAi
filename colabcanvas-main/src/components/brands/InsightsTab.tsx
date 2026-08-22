import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Lightbulb, CheckCircle, X, Eye } from "lucide-react";
import { toast } from "sonner";

interface InsightsTabProps {
  brandId: string;
}

export function InsightsTab({ brandId }: InsightsTabProps) {
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadInsights();
  }, [brandId]);

  const loadInsights = async () => {
    const { data } = await supabase
      .from("brand_mcp_insights")
      .select("*")
      .eq("brand_id", brandId)
      .order("created_at", { ascending: false });
    
    if (data) setInsights(data);
  };

  const updateInsightStatus = async (insightId: string, status: string) => {
    setLoading(true);
    const { error } = await supabase
      .from("brand_mcp_insights")
      .update({ status })
      .eq("id", insightId);

    if (!error) {
      toast.success(`Insight ${status}`);
      loadInsights();
    }
    setLoading(false);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "low":
        return "bg-zinc-100 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200";
      default:
        return "bg-zinc-100 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200";
    }
  };

  const activeInsights = insights.filter(i => i.status === "new");
  const acknowledgedInsights = insights.filter(i => i.status === "acknowledged");
  const resolvedInsights = insights.filter(i => i.status === "resolved");

  return (
    <div className="space-y-4">
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-zinc-500" />
            AI Usage Insights
          </CardTitle>
          <CardDescription className="text-xs">
            Suggestions based on how AI tools use your brand
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 text-center">
            <div className="flex-1">
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {activeInsights.length}
              </p>
              <p className="text-[10px] text-zinc-500">Active</p>
            </div>
            <div className="flex-1">
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {acknowledgedInsights.length}
              </p>
              <p className="text-[10px] text-zinc-500">Acknowledged</p>
            </div>
            <div className="flex-1">
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {resolvedInsights.length}
              </p>
              <p className="text-[10px] text-zinc-500">Resolved</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Active Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            {activeInsights.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-8">
                No active insights. Keep using AI tools with your brand guidelines to get suggestions!
              </p>
            ) : (
              <div className="space-y-3">
                {activeInsights.map((insight) => (
                  <div
                    key={insight.id}
                    className="p-3 rounded border border-zinc-200 dark:border-zinc-800"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Badge className={`text-[10px] h-5 ${getSeverityColor(insight.severity)}`}>
                        {insight.severity} priority
                      </Badge>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateInsightStatus(insight.id, "acknowledged")}
                          disabled={loading}
                          className="h-7 px-2"
                          title="Acknowledge"
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateInsightStatus(insight.id, "resolved")}
                          disabled={loading}
                          className="h-7 px-2"
                          title="Mark as resolved"
                        >
                          <CheckCircle className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateInsightStatus(insight.id, "dismissed")}
                          disabled={loading}
                          className="h-7 px-2 text-red-500"
                          title="Dismiss"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <h4 className="text-xs font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                      {insight.insight_type.replace(/_/g, " ").toUpperCase()}
                    </h4>
                    
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 mb-2">
                      {insight.description}
                    </p>
                    
                    {insight.suggestion && (
                      <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-900 mb-2">
                        <p className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                          Suggestion:
                        </p>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300">
                          {insight.suggestion}
                        </p>
                      </div>
                    )}
                    
                    {insight.evidence && (
                      <p className="text-[10px] text-zinc-500">
                        Based on {Object.keys(insight.evidence).length} usage patterns
                      </p>
                    )}
                    
                    <p className="text-[10px] text-zinc-400 mt-1">
                      {new Date(insight.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
