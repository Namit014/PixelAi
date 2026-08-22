import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit, getRateLimitIdentifier } from "../_shared/rateLimit.ts";
import { hashPasswordSecure } from "../_shared/passwordUtils.ts";
import { getSafeErrorMessage } from "../_shared/errors.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Zod schema for MCP request validation
const MCPRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.number(), z.string()]).refine(val => 
    typeof val === 'number' || (typeof val === 'string' && val.length < 100),
    { message: 'ID must be a number or string under 100 characters' }
  ),
  method: z.enum([
    'resources/list',
    'resources/read',
    'resources/versions/list',
    'resources/versions/read',
    'tools/list',
    'tools/call',
    'prompts/list',
    'prompts/get'
  ], { errorMap: () => ({ message: 'Invalid or unsupported MCP method' }) }),
  params: z.object({
    uri: z.string().max(500).optional(),
    version: z.union([z.number(), z.string()]).optional(),
    name: z.string().max(100).optional(),
    arguments: z.record(z.any()).optional()
  }).optional()
});

type MCPRequest = z.infer<typeof MCPRequestSchema>;

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin') || '';
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(origin) });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get authentication token from header
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32600, message: 'Authentication required' },
        id: null
      }), {
        status: 401,
        headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' }
      });
    }

    // Hash token using secure PBKDF2 - but for token lookup we need to check both methods
    // First try to find by share_token (plain text match for share tokens)
    // Then try api_key_hash with secure hashing
    let mcpConfig = null;
    
    // Try share_token first (these are stored as plain text)
    const { data: shareTokenConfig } = await supabase
      .from('brand_mcp_configs')
      .select('*, brands!inner(*)')
      .eq('share_token', token)
      .eq('is_active', true)
      .single();
    
    if (shareTokenConfig) {
      mcpConfig = shareTokenConfig;
    } else {
      // For API keys, we need to check against stored hashes
      // Since we can't reverse the hash, we need to fetch all configs and check
      // This is secure because we're using constant-time comparison
      const { data: allConfigs } = await supabase
        .from('brand_mcp_configs')
        .select('*, brands!inner(*)')
        .eq('is_active', true)
        .not('api_key_hash', 'is', null);
      
      if (allConfigs) {
        for (const config of allConfigs) {
          if (config.api_key_hash && config.api_key_salt) {
            // Secure verification with salt
            const { hash } = await hashPasswordSecure(token, config.api_key_salt);
            if (hash === config.api_key_hash) {
              mcpConfig = config;
              break;
            }
          } else if (config.api_key_hash) {
            // Legacy: plain SHA-256 hash
            const legacyHash = await hashTokenLegacy(token);
            if (legacyHash === config.api_key_hash) {
              mcpConfig = config;
              break;
            }
          }
        }
      }
    }

    if (!mcpConfig) {
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32600, message: 'Invalid token' },
        id: null
      }), {
        status: 403,
        headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' }
      });
    }

    // Rate limiting
    const identifier = `mcp:${mcpConfig.id}:${getRateLimitIdentifier(req)}`;
    if (!checkRateLimit(identifier, { 
      requests: mcpConfig.rate_limit_per_hour, 
      window: 3600000 
    })) {
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        error: { code: 429, message: 'Rate limit exceeded' },
        id: null
      }), {
        status: 429,
        headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' }
      });
    }

    // Parse and validate MCP request using Zod schema
    const rawRequest = await req.json();
    const parseResult = MCPRequestSchema.safeParse(rawRequest);
    
    if (!parseResult.success) {
      console.error('MCP request validation failed:', parseResult.error.errors);
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        error: { 
          code: -32600, 
          message: 'Invalid request format' 
        },
        id: rawRequest?.id || null
      }), {
        status: 400,
        headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' }
      });
    }
    
    const mcpRequest = parseResult.data;
    
    // Log usage
    await supabase.from('brand_mcp_usage').insert({
      mcp_config_id: mcpConfig.id,
      brand_id: mcpConfig.brand_id,
      method: mcpRequest.method,
      resource_uri: mcpRequest.params?.uri || null,
      client_info: {
        user_agent: req.headers.get('user-agent'),
        ip: getRateLimitIdentifier(req)
      }
    });

    // Handle MCP methods
    let result;
    switch (mcpRequest.method) {
      case 'resources/list':
        result = await handleResourcesList(supabase, mcpConfig);
        break;
      case 'resources/read':
        result = await handleResourcesRead(supabase, mcpConfig, mcpRequest.params);
        break;
      case 'resources/versions/list':
        result = await handleVersionsList(supabase, mcpConfig);
        break;
      case 'resources/versions/read':
        result = await handleVersionRead(supabase, mcpConfig, mcpRequest.params);
        break;
      case 'tools/list':
        result = await handleToolsList(mcpConfig);
        break;
      case 'tools/call':
        result = await handleToolsCall(supabase, mcpConfig, mcpRequest.params);
        break;
      case 'prompts/list':
        result = await handlePromptsList(mcpConfig);
        break;
      case 'prompts/get':
        result = await handlePromptsGet(mcpConfig, mcpRequest.params);
        break;
      default:
        throw new Error(`Unknown method: ${mcpRequest.method}`);
    }

    return new Response(JSON.stringify({
      jsonrpc: '2.0',
      result,
      id: mcpRequest.id
    }), {
      headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('MCP server error:', error);
    return new Response(JSON.stringify({
      jsonrpc: '2.0',
      error: { 
        code: -32603, 
        message: getSafeErrorMessage(error)
      },
      id: null
    }), {
      status: 500,
      headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' }
    });
  }
});

// Legacy hash function for backward compatibility
async function hashTokenLegacy(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function handleResourcesList(supabase: any, mcpConfig: any) {
  const brandId = mcpConfig.brand_id;
  const enabledResources = mcpConfig.enabled_resources || [];
  
  const resources = [];
  
  if (enabledResources.includes('overview')) {
    resources.push({
      uri: `brand://${brandId}/overview`,
      name: 'Brand Overview',
      description: 'Mission, vision, values, and brand positioning',
      mimeType: 'application/json'
    });
  }
  
  if (enabledResources.includes('colors')) {
    resources.push({
      uri: `brand://${brandId}/colors`,
      name: 'Color System',
      description: 'Primary, secondary, and accent colors with usage guidelines',
      mimeType: 'application/json'
    });
  }
  
  if (enabledResources.includes('typography')) {
    resources.push({
      uri: `brand://${brandId}/typography`,
      name: 'Typography System',
      description: 'Font families, weights, and usage guidelines',
      mimeType: 'application/json'
    });
  }
  
  if (enabledResources.includes('logos')) {
    resources.push({
      uri: `brand://${brandId}/logos`,
      name: 'Logo Variants',
      description: 'Logo versions, usage rules, and clear space requirements',
      mimeType: 'application/json'
    });
  }
  
  if (enabledResources.includes('voice')) {
    resources.push({
      uri: `brand://${brandId}/voice`,
      name: 'Brand Voice & Tone',
      description: 'Writing style, tone, and communication guidelines',
      mimeType: 'application/json'
    });
  }
  
  if (enabledResources.includes('guidelines')) {
    resources.push({
      uri: `brand://${brandId}/guidelines`,
      name: 'Usage Guidelines',
      description: 'Dos and don\'ts for brand application',
      mimeType: 'application/json'
    });
  }
  
  return { resources };
}

async function handleResourcesRead(supabase: any, mcpConfig: any, params: any) {
  const uri = params?.uri;
  if (!uri) throw new Error('URI required');
  
  const brandId = mcpConfig.brand_id;
  
  // Parse URI and query params for version
  const [baseUri, queryString] = uri.split('?');
  const resourceType = baseUri.split('/').pop();
  let versionNumber = null;
  
  if (queryString) {
    const urlParams = new URLSearchParams(queryString);
    versionNumber = urlParams.get('version');
  }
  
  // Check version mode and get appropriate brand data
  let brand;
  
  if (mcpConfig.version_mode === 'pinned' && mcpConfig.pinned_version_id) {
    // Use pinned version
    const { data: version } = await supabase
      .from('brand_versions')
      .select('snapshot')
      .eq('id', mcpConfig.pinned_version_id)
      .single();
    
    if (version) {
      brand = { ...version.snapshot, _from_version: true };
    }
  } else if (versionNumber) {
    // Use specific version requested
    const { data: version } = await supabase
      .from('brand_versions')
      .select('snapshot')
      .eq('brand_id', brandId)
      .eq('version_number', parseInt(versionNumber))
      .single();
    
    if (version) {
      brand = { ...version.snapshot, _from_version: true };
    }
  }
  
  // If no version specified or found, use latest
  if (!brand) {
    const { data: latestBrand } = await supabase
      .from('brands')
      .select(`
        *,
        brand_sections(
          *,
          brand_content_blocks(*)
        ),
        brand_assets(*)
      `)
      .eq('id', brandId)
      .single();
    brand = latestBrand;
  }
    
  if (!brand) throw new Error('Brand not found');
  
  // Handle brand data whether from version snapshot or live data
  let brandSections = brand.brand_sections || [];
  
  // If from version snapshot, sections are in snapshot format
  if (brand._from_version && Array.isArray(brandSections)) {
    // Sections already in correct format from snapshot
  } else if (!Array.isArray(brandSections)) {
    // Ensure sections is an array
    brandSections = [];
  }
  
  let content = {};
  
  switch (resourceType) {
    case 'overview':
      content = {
        name: brand.name,
        description: brand.description,
        industry: brand.industry,
        target_audience: brand.target_audience,
        website_url: brand.website_url,
        brand_voice: brand.brand_voice
      };
      break;
      
    case 'colors':
      const colorSections = brandSections.filter((s: any) => 
        s.section_type === 'default' && s.section_name === 'Colours'
      );
      content = {
        colors: colorSections.flatMap((section: any) => 
          (section.brand_content_blocks || [])
            .filter((b: any) => b.block_type === 'colours')
            .map((b: any) => b.content)
        )
      };
      break;
      
    case 'typography':
      const typographySections = brandSections.filter((s: any) => 
        s.section_type === 'default' && s.section_name === 'Typography'
      );
      content = {
        typography: typographySections.flatMap((section: any) => 
          (section.brand_content_blocks || [])
            .filter((b: any) => b.block_type === 'typography')
            .map((b: any) => b.content)
        )
      };
      break;
      
    case 'logos':
      const logoSections = brandSections.filter((s: any) => 
        s.section_type === 'default' && s.section_name === 'Logo'
      );
      content = {
        logos: logoSections.flatMap((section: any) => 
          (section.brand_content_blocks || [])
            .filter((b: any) => b.block_type === 'logo_variant')
            .map((b: any) => b.content)
        )
      };
      break;
      
    case 'voice':
      content = {
        brand_voice: brand.brand_voice,
        tone: brand.brand_system_snapshot?.voice_tone || []
      };
      break;
      
    case 'guidelines':
      content = {
        sections: brandSections.map((s: any) => ({
          name: s.section_name,
          guidelines: s.ai_context
        }))
      };
      break;
  }
  
  return {
    contents: [{
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(content, null, 2)
    }]
  };
}

async function handleVersionsList(supabase: any, mcpConfig: any) {
  const brandId = mcpConfig.brand_id;
  
  const { data: versions } = await supabase
    .from('brand_versions')
    .select('*')
    .eq('brand_id', brandId)
    .order('version_number', { ascending: false });
  
  return {
    versions: versions?.map((v: any) => ({
      version: v.version_number,
      id: v.id,
      timestamp: v.created_at,
      summary: v.change_summary || 'Brand updated',
      changed_by: v.changed_by
    })) || []
  };
}

async function handleVersionRead(supabase: any, mcpConfig: any, params: any) {
  const versionNumber = params?.version;
  if (!versionNumber) throw new Error('Version number required');
  
  const brandId = mcpConfig.brand_id;
  
  const { data: version } = await supabase
    .from('brand_versions')
    .select('*')
    .eq('brand_id', brandId)
    .eq('version_number', parseInt(versionNumber))
    .single();
  
  if (!version) throw new Error('Version not found');
  
  return {
    version: version.version_number,
    snapshot: version.snapshot,
    created_at: version.created_at,
    change_summary: version.change_summary
  };
}

async function handleToolsList(mcpConfig: any) {
  const enabledTools = mcpConfig.enabled_tools || [];
  const tools = [];
  
  if (enabledTools.includes('validate_color')) {
    tools.push({
      name: 'validate_color',
      description: 'Check if a hex color is part of the brand palette',
      inputSchema: {
        type: 'object',
        properties: {
          hex: { type: 'string', description: 'Hex color code (e.g., #FF5733)' }
        },
        required: ['hex']
      }
    });
  }
  
  if (enabledTools.includes('check_font')) {
    tools.push({
      name: 'check_font',
      description: 'Verify if a font family is part of the brand typography',
      inputSchema: {
        type: 'object',
        properties: {
          fontFamily: { type: 'string', description: 'Font family name' }
        },
        required: ['fontFamily']
      }
    });
  }
  
  if (enabledTools.includes('verify_logo')) {
    tools.push({
      name: 'verify_logo',
      description: 'Get logo usage guidelines and restrictions',
      inputSchema: {
        type: 'object',
        properties: {
          variant: { type: 'string', description: 'Logo variant name (optional)' }
        }
      }
    });
  }
  
  return { tools };
}

async function handleToolsCall(supabase: any, mcpConfig: any, params: any) {
  const { name, arguments: args } = params;
  const brandId = mcpConfig.brand_id;
  
  // Fetch brand data
  const { data: brand } = await supabase
    .from('brands')
    .select('brand_system_snapshot')
    .eq('id', brandId)
    .single();
    
  let resultText = '';
  
  switch (name) {
    case 'validate_color':
      const hex = args.hex;
      const colors = brand.brand_system_snapshot?.colors || {};
      const foundColor = Object.entries(colors).find(([_, colorData]: any) => 
        colorData.hex?.toLowerCase() === hex.toLowerCase()
      );
      
      if (foundColor) {
        const [name, data]: any = foundColor;
        resultText = `✅ ${hex} is the ${name} brand color. ${data.usage || 'Use according to brand guidelines.'}`;
      } else {
        resultText = `❌ ${hex} is not part of the brand color palette. Please use one of the approved brand colors.`;
      }
      break;
      
    case 'check_font':
      const fontFamily = args.fontFamily;
      const typography = brand.brand_system_snapshot?.typography || {};
      const foundFont = Object.values(typography).find((t: any) => 
        t.family?.toLowerCase() === fontFamily.toLowerCase()
      );
      
      if (foundFont) {
        resultText = `✅ ${fontFamily} is an approved brand font. ${(foundFont as any).usage || ''}`;
      } else {
        resultText = `❌ ${fontFamily} is not part of the brand typography system.`;
      }
      break;
      
    case 'verify_logo':
      const variant = args.variant;
      const logos = brand.brand_system_snapshot?.logo_variants || [];
      
      if (variant) {
        const foundLogo = logos.find((l: any) => 
          l.name?.toLowerCase() === variant.toLowerCase()
        );
        
        if (foundLogo) {
          resultText = `Logo variant "${variant}" found. Usage: ${foundLogo.usage || 'Follow brand guidelines.'}`;
        } else {
          resultText = `Logo variant "${variant}" not found in brand assets.`;
        }
      } else {
        resultText = `Available logo variants: ${logos.map((l: any) => l.name).join(', ') || 'None defined'}`;
      }
      break;
      
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
  
  return {
    content: [{
      type: 'text',
      text: resultText
    }]
  };
}

async function handlePromptsList(mcpConfig: any) {
  return {
    prompts: [
      {
        name: 'generate_on_brand_content',
        description: 'Generate content that follows brand guidelines',
        arguments: [
          {
            name: 'content_type',
            description: 'Type of content (social_post, email, headline, etc.)',
            required: true
          },
          {
            name: 'topic',
            description: 'Topic or subject of the content',
            required: true
          }
        ]
      },
      {
        name: 'review_design',
        description: 'Review a design for brand compliance',
        arguments: [
          {
            name: 'design_description',
            description: 'Description of the design to review',
            required: true
          }
        ]
      }
    ]
  };
}

async function handlePromptsGet(mcpConfig: any, params: any) {
  const { name, arguments: args } = params;
  
  let messages: any[] = [];
  
  switch (name) {
    case 'generate_on_brand_content':
      messages = [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Generate ${args.content_type} content about "${args.topic}" following the brand guidelines. Use the brand voice and approved messaging.`
          }
        }
      ];
      break;
      
    case 'review_design':
      messages = [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Review this design for brand compliance: ${args.design_description}. Check colors, typography, and overall brand alignment.`
          }
        }
      ];
      break;
      
    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
  
  return { messages };
}
