import { supabase } from '@/integrations/supabase/client';

export type ExportFormat = 'json' | 'css' | 'tailwind' | 'figma' | 'wix' | 'framer' | 'colab';

export interface ExportResult {
  content: string | object;
  fileName: string;
  contentType: string;
}

export async function exportStyleGuide(
  projectId: string,
  format: ExportFormat
): Promise<ExportResult> {
  const { data, error } = await supabase.functions.invoke('mcp-style-guide', {
    body: { action: 'export', project_id: projectId, format }
  });
  
  if (error) throw error;
  
  return data;
}

export async function generateShareLink(
  projectId: string,
  expiresInDays: number | null
): Promise<{ shareUrl: string; expiresAt: string | null }> {
  const { data, error } = await supabase.functions.invoke('mcp-style-guide', {
    body: { 
      action: 'share',
      project_id: projectId,
      expires_in_days: expiresInDays 
    }
  });
  
  if (error) throw error;
  return data;
}

export function downloadFile(content: string, fileName: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function getFileExtension(format: ExportFormat): string {
  const extensions: Record<ExportFormat, string> = {
    json: 'json',
    css: 'css',
    tailwind: 'config.js',
    figma: 'figma.json',
    wix: 'wix.json',
    framer: 'framer.tsx',
    colab: 'colab.json'
  };
  return extensions[format] || 'txt';
}

// MCP Server Functions
export async function enableMCPServer(
  brandId: string,
  config: {
    configName: string;
    enabledResources: string[];
    enabledTools: string[];
    rateLimit: number;
  }
): Promise<{ success: boolean; configId?: string }> {
  const { data, error } = await supabase.functions.invoke('mcp-brand-server', {
    body: { 
      action: 'enable',
      brand_id: brandId,
      ...config
    }
  });
  
  if (error) throw error;
  return data;
}

export async function generateMCPApiKey(
  configId: string
): Promise<{ apiKey: string }> {
  const { data, error } = await supabase.functions.invoke('mcp-brand-server', {
    body: { 
      action: 'generate_api_key',
      config_id: configId
    }
  });
  
  if (error) throw error;
  return data;
}

export async function getMCPUsageStats(
  brandId: string,
  timeRange: '24h' | '7d' | '30d' = '24h'
): Promise<any> {
  const hoursBack = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();
  
  const { data, error } = await supabase
    .from('brand_mcp_usage')
    .select('*')
    .eq('brand_id', brandId)
    .gte('created_at', since);
    
  if (error) throw error;
  
  return {
    total: data.length,
    byMethod: data.reduce((acc: any, item) => {
      acc[item.method] = (acc[item.method] || 0) + 1;
      return acc;
    }, {}),
    recentRequests: data.slice(0, 10)
  };
}

export async function testMCPConnection(
  serverUrl: string,
  authToken: string
): Promise<{ success: boolean; resources?: any[]; error?: string }> {
  try {
    const response = await fetch(serverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'resources/list'
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      return { success: false, error: data.error.message };
    }
    
    return { success: true, resources: data.result?.resources || [] };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Connection failed' 
    };
  }
}
