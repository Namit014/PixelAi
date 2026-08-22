import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Send, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

interface WebhooksTabProps {
  brandId: string;
  mcpConfigId: string | null;
}

export function WebhooksTab({ brandId, mcpConfigId }: WebhooksTabProps) {
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([
    "brand.updated",
    "colors.changed",
    "typography.changed",
    "logo.added"
  ]);
  const [loading, setLoading] = useState(false);

  const availableEvents = [
    { value: "brand.updated", label: "Brand Updated" },
    { value: "colors.changed", label: "Colors Changed" },
    { value: "typography.changed", label: "Typography Changed" },
    { value: "logo.added", label: "Logo Added" },
    { value: "section.created", label: "Section Created" },
    { value: "block.updated", label: "Block Updated" }
  ];

  useEffect(() => {
    if (mcpConfigId) {
      loadWebhooks();
      loadDeliveries();
    }
  }, [mcpConfigId]);

  const loadWebhooks = async () => {
    const { data } = await supabase
      .from("brand_mcp_webhooks")
      .select("*")
      .eq("brand_id", brandId);
    
    if (data) setWebhooks(data);
  };

  const loadDeliveries = async () => {
    const { data } = await supabase
      .from("brand_mcp_webhook_deliveries")
      .select("*, webhook:brand_mcp_webhooks(webhook_url)")
      .order("created_at", { ascending: false })
      .limit(10);
    
    if (data) setDeliveries(data);
  };

  const addWebhook = async () => {
    if (!newWebhookUrl || !mcpConfigId) return;

    setLoading(true);
    const { error } = await supabase.from("brand_mcp_webhooks").insert({
      mcp_config_id: mcpConfigId,
      brand_id: brandId,
      webhook_url: newWebhookUrl,
      events: selectedEvents,
      secret: crypto.randomUUID()
    });

    if (error) {
      toast.error("Failed to add webhook");
    } else {
      toast.success("Webhook added");
      setNewWebhookUrl("");
      loadWebhooks();
    }
    setLoading(false);
  };

  const deleteWebhook = async (webhookId: string) => {
    const { error } = await supabase
      .from("brand_mcp_webhooks")
      .delete()
      .eq("id", webhookId);

    if (!error) {
      toast.success("Webhook deleted");
      loadWebhooks();
    }
  };

  const testWebhook = async (webhookId: string, webhookUrl: string) => {
    setLoading(true);
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "test",
          brand_id: brandId,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        toast.success("Webhook test successful");
      } else {
        toast.error(`Webhook test failed: ${response.status}`);
      }
    } catch (error) {
      toast.error("Webhook test failed");
    }
    setLoading(false);
  };

  const toggleEvent = (event: string) => {
    setSelectedEvents(prev =>
      prev.includes(event)
        ? prev.filter(e => e !== event)
        : [...prev, event]
    );
  };

  return (
    <div className="space-y-4">
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Add Webhook</CardTitle>
          <CardDescription className="text-xs">
            Get notified when your brand guidelines change
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Webhook URL</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
                placeholder="https://your-service.com/webhook"
                className="h-8 text-xs"
              />
              <Button
                onClick={addWebhook}
                disabled={!newWebhookUrl || loading}
                size="sm"
                className="h-8 px-3"
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-xs mb-2 block">Events to Subscribe</Label>
            <div className="grid grid-cols-2 gap-2">
              {availableEvents.map((event) => (
                <div key={event.value} className="flex items-center gap-2">
                  <Switch
                    checked={selectedEvents.includes(event.value)}
                    onCheckedChange={() => toggleEvent(event.value)}
                    className="scale-75"
                  />
                  <span className="text-xs text-zinc-700 dark:text-zinc-300">
                    {event.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Active Webhooks</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-40">
            {webhooks.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-4">
                No webhooks configured
              </p>
            ) : (
              <div className="space-y-2">
                {webhooks.map((webhook) => (
                  <div
                    key={webhook.id}
                    className="flex items-center justify-between p-2 rounded bg-zinc-50 dark:bg-zinc-900"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {webhook.webhook_url}
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        {JSON.parse(webhook.events).length} events
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => testWebhook(webhook.id, webhook.webhook_url)}
                        className="h-7 px-2"
                      >
                        <Send className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteWebhook(webhook.id)}
                        className="h-7 px-2 text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Recent Deliveries</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-32">
            {deliveries.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-4">
                No deliveries yet
              </p>
            ) : (
              <div className="space-y-2">
                {deliveries.map((delivery) => (
                  <div
                    key={delivery.id}
                    className="flex items-center justify-between p-2 rounded bg-zinc-50 dark:bg-zinc-900"
                  >
                    <div className="flex items-center gap-2">
                      {delivery.status === "success" ? (
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                      ) : delivery.status === "failed" ? (
                        <XCircle className="w-3 h-3 text-red-500" />
                      ) : (
                        <Clock className="w-3 h-3 text-zinc-400" />
                      )}
                      <div>
                        <p className="text-xs font-medium">{delivery.event_type}</p>
                        <p className="text-[10px] text-zinc-500">
                          {new Date(delivery.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {delivery.response_code && (
                      <Badge variant="outline" className="text-[10px] h-5">
                        {delivery.response_code}
                      </Badge>
                    )}
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
