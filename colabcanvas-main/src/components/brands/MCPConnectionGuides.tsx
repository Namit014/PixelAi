import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface MCPConnectionGuidesProps {
  serverUrl: string;
  authToken: string;
}

export default function MCPConnectionGuides({ serverUrl, authToken }: MCPConnectionGuidesProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
    toast.success('Copied to clipboard');
  };

  const claudeConfig = JSON.stringify({
    mcpServers: {
      "colab-brand-guidelines": {
        url: serverUrl,
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      }
    }
  }, null, 2);

  const cursorConfig = JSON.stringify({
    mcp: {
      servers: {
        "brand-guidelines": {
          command: "npx",
          args: ["-y", "@modelcontextprotocol/server-http"],
          env: {
            MCP_SERVER_URL: serverUrl,
            MCP_API_KEY: authToken
          }
        }
      }
    }
  }, null, 2);

  const continueConfig = JSON.stringify({
    models: [{
      title: "Brand Guidelines Context",
      provider: "mcp",
      model: "brand-context",
      apiBase: serverUrl,
      apiKey: authToken
    }]
  }, null, 2);

  const curlExample = `curl -X POST ${serverUrl} \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${authToken}" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"resources/list"}'`;

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Connection Guides</h3>
      
      <Tabs defaultValue="claude">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="claude">Claude</TabsTrigger>
          <TabsTrigger value="cursor">Cursor</TabsTrigger>
          <TabsTrigger value="continue">Continue</TabsTrigger>
          <TabsTrigger value="custom">Custom</TabsTrigger>
        </TabsList>

        <TabsContent value="claude" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Claude Desktop</CardTitle>
              <CardDescription>
                Add this configuration to your Claude Desktop settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Open Claude Desktop</li>
                <li>Go to Settings → Developer → Edit Config</li>
                <li>Add the configuration below to your config.json file</li>
                <li>Restart Claude Desktop</li>
              </ol>
              
              <div className="relative">
                <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
                  {claudeConfig}
                </pre>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(claudeConfig, 'claude')}
                >
                  {copied === 'claude' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cursor" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cursor IDE</CardTitle>
              <CardDescription>
                Configure MCP in Cursor's settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Open Cursor IDE</li>
                <li>Go to Settings → Features → MCP Servers</li>
                <li>Add the configuration below</li>
                <li>Restart Cursor</li>
              </ol>
              
              <div className="relative">
                <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
                  {cursorConfig}
                </pre>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(cursorConfig, 'cursor')}
                >
                  {copied === 'cursor' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="continue" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Continue.dev</CardTitle>
              <CardDescription>
                Add brand context to Continue.dev
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Open your Continue config file (~/.continue/config.json)</li>
                <li>Add the configuration below to the models array</li>
                <li>Restart your editor</li>
              </ol>
              
              <div className="relative">
                <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
                  {continueConfig}
                </pre>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(continueConfig, 'continue')}
                >
                  {copied === 'continue' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Custom Integration</CardTitle>
              <CardDescription>
                Use the MCP protocol directly with any HTTP client
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">
                Example using cURL to list available resources:
              </p>
              
              <div className="relative">
                <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
                  {curlExample}
                </pre>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(curlExample, 'curl')}
                >
                  {copied === 'curl' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>

              <div className="space-y-2 text-sm">
                <p className="font-semibold">Available MCP Methods:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><code className="text-xs bg-muted px-1 py-0.5 rounded">resources/list</code> - List all brand resources</li>
                  <li><code className="text-xs bg-muted px-1 py-0.5 rounded">resources/read</code> - Read specific resource</li>
                  <li><code className="text-xs bg-muted px-1 py-0.5 rounded">tools/list</code> - List validation tools</li>
                  <li><code className="text-xs bg-muted px-1 py-0.5 rounded">tools/call</code> - Execute a tool</li>
                  <li><code className="text-xs bg-muted px-1 py-0.5 rounded">prompts/list</code> - List available prompts</li>
                  <li><code className="text-xs bg-muted px-1 py-0.5 rounded">prompts/get</code> - Get prompt template</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}