import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, Check, Zap, Activity } from "lucide-react";
import MCPConnectionGuides from "./MCPConnectionGuides";
import { WebhooksTab } from "./WebhooksTab";
import { VersionsTab } from "./VersionsTab";
import { InsightsTab } from "./InsightsTab";

interface MCPServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  brandName: string;
}

export default function MCPServerDialog({ open, onOpenChange, brandId, brandName }: MCPServerDialogProps) {
  const [configName, setConfigName] = useState(`${brandName} MCP Server`);
  const [apiKey, setApiKey] = useState("");
  const [shareToken, setShareToken] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [rateLimit, setRateLimit] = useState(1000);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mcpConfig, setMcpConfig] = useState<any>(null);
  const [usageStats, setUsageStats] = useState<any>(null);
  
  const [enabledResources, setEnabledResources] = useState({
    overview: true,
    colors: true,
    typography: true,
    logos: true,
    voice: true,
    guidelines: true,
  });
  
  const [enabledTools, setEnabledTools] = useState({
    validate_color: true,
    check_font: true,
    verify_logo: true,
  });

  useEffect(() => {
    if (open) {
      loadMcpConfig();
      loadUsageStats();
    }
  }, [open, brandId]);

  const loadMcpConfig = async () => {
    const { data } = await supabase
      .from('brand_mcp_configs')
      .select('*')
      .eq('brand_id', brandId)
      .eq('is_active', true)
      .single();
    
    if (data) {
      setMcpConfig(data);
      setConfigName(data.config_name);
      setShareToken(data.share_token || "");
      setRateLimit(data.rate_limit_per_hour);
      setIsActive(data.is_active);
      
      const resources = (data.enabled_resources as string[]) || [];
      setEnabledResources({
        overview: resources.includes('overview'),
        colors: resources.includes('colors'),
        typography: resources.includes('typography'),
        logos: resources.includes('logos'),
        voice: resources.includes('voice'),
        guidelines: resources.includes('guidelines'),
      });
      
      const tools = (data.enabled_tools as string[]) || [];
      setEnabledTools({
        validate_color: tools.includes('validate_color'),
        check_font: tools.includes('check_font'),
        verify_logo: tools.includes('verify_logo'),
      });
    }
  };

  const loadUsageStats = async () => {
    const { data } = await supabase
      .from('brand_mcp_usage')
      .select('*')
      .eq('brand_id', brandId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    
    if (data) {
      setUsageStats({
        total24h: data.length,
        byMethod: data.reduce((acc: any, item) => {
          acc[item.method] = (acc[item.method] || 0) + 1;
          return acc;
        }, {}),
      });
    }
  };

  const generateApiKey = () => {
    const key = `mcp_${Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')}`;
    setApiKey(key);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const resources = Object.keys(enabledResources).filter(k => enabledResources[k as keyof typeof enabledResources]);
      const tools = Object.keys(enabledTools).filter(k => enabledTools[k as keyof typeof enabledTools]);

      // Hash API key if provided
      let apiKeyHash = null;
      if (apiKey) {
        const encoder = new TextEncoder();
        const data = encoder.encode(apiKey);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        apiKeyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      }

      if (mcpConfig) {
        // Update existing config
        const { error } = await supabase
          .from('brand_mcp_configs')
          .update({
            config_name: configName,
            enabled_resources: resources,
            enabled_tools: tools,
            rate_limit_per_hour: rateLimit,
            is_active: isActive,
            ...(apiKeyHash && { api_key_hash: apiKeyHash }),
          })
          .eq('id', mcpConfig.id);

        if (error) throw error;
      } else {
        // Create new config with generated share_token
        const newShareToken = shareToken || crypto.randomUUID();
        setShareToken(newShareToken); // Set it immediately for display
        
        const { error } = await supabase
          .from('brand_mcp_configs')
          .insert({
            brand_id: brandId,
            user_id: user.id,
            config_name: configName,
            api_key_hash: apiKeyHash,
            share_token: newShareToken,
            enabled_resources: resources,
            enabled_tools: tools,
            rate_limit_per_hour: rateLimit,
            is_active: isActive,
          });

        if (error) throw error;
      }

      toast.success('MCP server configured successfully');
      // CRITICAL: Reload config after save to persist the token
      await loadMcpConfig();
    } catch (error) {
      console.error('Error saving MCP config:', error);
      toast.error('Failed to save MCP configuration');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard');
  };

  const mcpServerUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mcp-brand-server`;
  const authToken = apiKey || shareToken || mcpConfig?.share_token;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="pb-4 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Zap className="w-5 h-5 text-zinc-500" />
            MCP Server Configuration
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="quickstart" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full grid grid-cols-6 gap-0 h-10 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg mb-4 shrink-0">
            <TabsTrigger value="quickstart" className="text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800">Quick Start</TabsTrigger>
            <TabsTrigger value="config" className="text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800">Config</TabsTrigger>
            <TabsTrigger value="webhooks" className="text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800">Webhooks</TabsTrigger>
            <TabsTrigger value="versions" className="text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800">Versions</TabsTrigger>
            <TabsTrigger value="insights" className="text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800">Insights</TabsTrigger>
            <TabsTrigger value="usage" className="text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800">Usage</TabsTrigger>
          </TabsList>

          <TabsContent value="quickstart" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-[calc(90vh-180px)] w-full pr-4">
              <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base">Connect Your AI Tools</CardTitle>
                  <CardDescription className="text-sm">
                    Copy these credentials to connect AI tools to your brand
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {authToken && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">MCP Server URL</Label>
                        <div className="flex gap-2">
                          <Input value={mcpServerUrl} readOnly className="h-10 text-sm bg-zinc-50 dark:bg-zinc-900" />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-10 px-3"
                            onClick={() => copyToClipboard(mcpServerUrl)}
                          >
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Authentication Token</Label>
                        <div className="flex gap-2">
                          <Input value={authToken} readOnly type="password" className="h-10 text-sm bg-zinc-50 dark:bg-zinc-900" />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-10 px-3"
                            onClick={() => copyToClipboard(authToken)}
                          >
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>

                      <Separator className="my-4" />
                      
                      <MCPConnectionGuides 
                        serverUrl={mcpServerUrl}
                        authToken={authToken}
                      />
                    </>
                  )}
                  
                  {!authToken && (
                    <div className="text-center py-12 text-sm text-zinc-500">
                      Configure the MCP server in the Config tab to get started
                    </div>
                  )}
                </CardContent>
              </Card>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="config" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-[calc(90vh-180px)] w-full pr-4">
              <div className="space-y-4">
                <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base">General Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="configName" className="text-sm font-medium">Configuration Name</Label>
                      <Input
                        id="configName"
                        value={configName}
                        onChange={(e) => setConfigName(e.target.value)}
                        className="h-10 text-sm bg-zinc-50 dark:bg-zinc-900"
                      />
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <div>
                        <Label className="text-sm font-medium">Active</Label>
                        <p className="text-xs text-zinc-500">Enable MCP server access</p>
                      </div>
                      <Switch checked={isActive} onCheckedChange={setIsActive} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rateLimit" className="text-sm font-medium">Rate Limit (req/hour)</Label>
                      <Input
                        id="rateLimit"
                        type="number"
                        value={rateLimit}
                        onChange={(e) => setRateLimit(parseInt(e.target.value))}
                        className="h-10 text-sm bg-zinc-50 dark:bg-zinc-900"
                      />
                    </div>

                    <Separator className="my-4" />

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">API Key</Label>
                      <p className="text-xs text-zinc-500 mb-2">
                        For programmatic access
                      </p>
                      <div className="flex gap-2">
                        <Input
                          value={apiKey}
                          readOnly
                          placeholder="Generate an API key"
                          type="password"
                          className="h-10 text-sm bg-zinc-50 dark:bg-zinc-900"
                        />
                        <Button onClick={generateApiKey} variant="outline" size="sm" className="h-10 px-4 text-sm">
                          Generate
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base">Resources & Tools</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Enabled Resources</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(enabledResources).map(([key, value]) => (
                          <div key={key} className="flex items-center gap-3 p-2 rounded-md border border-zinc-200 dark:border-zinc-800">
                            <Switch
                              checked={value}
                              onCheckedChange={(checked) =>
                                setEnabledResources({ ...enabledResources, [key]: checked })
                              }
                            />
                            <Label className="capitalize text-sm cursor-pointer">{key.replace('_', ' ')}</Label>
                          </div>
                        ))}
                      </div>

                      <Separator className="my-4" />

                      <Label className="text-sm font-medium">Enabled Tools</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(enabledTools).map(([key, value]) => (
                          <div key={key} className="flex items-center gap-3 p-2 rounded-md border border-zinc-200 dark:border-zinc-800">
                            <Switch
                              checked={value}
                              onCheckedChange={(checked) =>
                                setEnabledTools({ ...enabledTools, [key]: checked })
                              }
                            />
                            <Label className="capitalize text-sm cursor-pointer">{key.replace('_', ' ')}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Button onClick={handleSave} disabled={loading} className="w-full h-10 text-sm bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200">
                  {loading ? 'Saving...' : 'Save Configuration'}
                </Button>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="webhooks" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-[calc(90vh-180px)] w-full pr-4">
              <WebhooksTab brandId={brandId} mcpConfigId={mcpConfig?.id || null} />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="versions" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-[calc(90vh-180px)] w-full pr-4">
              <VersionsTab brandId={brandId} mcpConfigId={mcpConfig?.id || null} />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="insights" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-[calc(90vh-180px)] w-full pr-4">
              <InsightsTab brandId={brandId} />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="usage" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-[calc(90vh-180px)] w-full pr-4">
              <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Activity className="w-5 h-5 text-zinc-500" />
                    Usage Statistics (Last 24 Hours)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {usageStats ? (
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <div className="flex-1 text-center p-3 bg-zinc-50 dark:bg-zinc-900 rounded">
                          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{usageStats.total24h}</div>
                          <div className="text-[10px] text-zinc-500">Total Requests</div>
                        </div>
                        <div className="flex-1 text-center p-3 bg-zinc-50 dark:bg-zinc-900 rounded">
                          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                            {Object.keys(usageStats.byMethod || {}).length}
                          </div>
                          <div className="text-[10px] text-zinc-500">Methods Used</div>
                        </div>
                      </div>

                      <Separator className="my-2" />

                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Requests by Method</h4>
                        {Object.entries(usageStats.byMethod || {}).map(([method, count]) => (
                          <div key={method} className="flex justify-between items-center">
                            <span className="text-xs text-zinc-600 dark:text-zinc-400">{method}</span>
                            <Badge variant="outline" className="bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-xs h-5">
                              {count as number}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-xs text-zinc-500">
                      No usage data available yet
                    </div>
                  )}
                </CardContent>
              </Card>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}