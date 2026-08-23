import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';

interface ExecutionNode {
  id: string;
  type: string;
  data: any;
  dependencies: string[];
}

// Parse workflow graph into execution DAG
function parseWorkflowGraph(nodes: any[], edges: any[]): ExecutionNode[] {
  const executionNodes: ExecutionNode[] = [];
  const dependencyMap = new Map<string, string[]>();
  
  edges.forEach(edge => {
    const deps = dependencyMap.get(edge.target) || [];
    deps.push(edge.source);
    dependencyMap.set(edge.target, deps);
  });
  
  nodes.forEach(node => {
    executionNodes.push({
      id: node.id,
      type: node.data.nodeType,
      data: node.data,
      dependencies: dependencyMap.get(node.id) || [],
    });
  });
  
  return executionNodes;
}

// Topological sort to determine execution order
function topologicalSort(executionNodes: ExecutionNode[]): string[][] {
  const nodeMap = new Map(executionNodes.map(n => [n.id, n]));
  const visited = new Set<string>();
  const levels: string[][] = [];
  
  let currentLevel = executionNodes
    .filter(n => n.dependencies.length === 0)
    .map(n => n.id);
  
  while (currentLevel.length > 0) {
    levels.push(currentLevel);
    currentLevel.forEach(id => visited.add(id));
    
    const nextLevel = executionNodes
      .filter(n => !visited.has(n.id))
      .filter(n => n.dependencies.every(dep => visited.has(dep)))
      .map(n => n.id);
    
    currentLevel = nextLevel;
  }
  
  return levels;
}

// Execute a single node
async function executeNode(
  node: ExecutionNode,
  results: Map<string, any>,
  supabase: any,
  userId: string
): Promise<{ result: any; creditsUsed: number }> {
  console.log(`Executing node ${node.id} of type ${node.type}`);
  
  // Get input data from dependencies
  const inputs: Record<string, any> = {};
  for (const depId of node.dependencies) {
    inputs[depId] = results.get(depId);
  }
  
  switch (node.type) {
    case 'textInput':
      return { result: { text: node.data.config.text || '' }, creditsUsed: 0 };
    
    case 'promptInput':
      return { result: { prompt: node.data.config.prompt || '' }, creditsUsed: 0 };
    
    case 'upload':
      return { result: { imageUrl: node.data.config.imageUrl || '' }, creditsUsed: 0 };
    
    case 'assistant': {
      console.log(`🤖 Starting AI assistant enhancement...`);
      
      // Gather all input text
      const allInputs = Object.values(inputs);
      let combinedText = node.data.config.instruction || '';
      
      allInputs.forEach(input => {
        if ((input as any)?.text) combinedText = `${combinedText}\n${(input as any).text}`;
        if ((input as any)?.prompt) combinedText = `${combinedText}\n${(input as any).prompt}`;
      });

      console.log(`📝 Combined text for enhancement (${combinedText.length} chars):`, combinedText.substring(0, 200));

      // Call Lovable AI for enhancement
      const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
      if (!GEMINI_API_KEY) {
        console.error(`❌ GEMINI_API_KEY not configured`);
        throw new Error('GEMINI_API_KEY not configured');
      }

      console.log(`🔑 Calling Lovable AI...`);
      const aiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GEMINI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: 'You are a creative assistant. Enhance and expand the given prompt with vivid details, technical specifications, and artistic direction. Return ONLY the enhanced text.',
            },
            {
              role: 'user',
              content: combinedText.trim(),
            },
          ],
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error(`❌ AI call failed (${aiResponse.status}):`, errorText);
        throw new Error(`AI call failed: ${aiResponse.statusText} - ${errorText}`);
      }

      const aiData = await aiResponse.json();
      const enhancedOutput = aiData.choices[0]?.message?.content || combinedText;

      console.log(`✅ AI enhancement complete (${enhancedOutput.length} chars):`, enhancedOutput.substring(0, 200));
      return { result: { output: enhancedOutput }, creditsUsed: 1 };
    }
    
    case 'imageGenerator': {
      // Gather ALL text and prompt inputs
      const allInputs = Object.values(inputs);
      let finalPrompt = node.data.config.prompt || '';
      
      // Combine text inputs
      allInputs.forEach(input => {
        if ((input as any)?.text) finalPrompt = `${finalPrompt}\n${(input as any).text}`;
        if ((input as any)?.prompt) finalPrompt = `${finalPrompt}\n${(input as any).prompt}`;
        if ((input as any)?.output) finalPrompt = (input as any).output; // Assistant takes precedence
      });
      
      // Get reference image if any
      let referenceImageUrl: string | undefined;
      allInputs.forEach(input => {
        if ((input as any)?.imageUrl) referenceImageUrl = (input as any).imageUrl;
      });
      
      console.log('ImageGenerator - Final prompt:', finalPrompt);
      console.log('ImageGenerator - Reference URL:', referenceImageUrl);
      
      // Validate prompt is not empty
      if (!finalPrompt.trim()) {
        throw new Error('Prompt cannot be empty. Connect text or prompt inputs.');
      }
      
      // Call generate-design with ALL required parameters
      const { data, error } = await supabase.functions.invoke('generate-design', {
        body: {
          prompt: finalPrompt.trim(),
          model: node.data.config.model || 'gemini-2.5-flash-image',
          design_type: node.data.config.designType || 'design',
          referenceImageUrl: referenceImageUrl, // undefined if not present
          conversationId: null,
          userId: userId,
        },
      });
      
      if (error) {
        console.error('Generate-design error:', error);
        throw error;
      }
      
      console.log('ImageGenerator - Generated imageUrl:', data?.imageUrl);
      
      const creditsUsed = node.data.config.highRes ? 5 : 2;
      return { result: { imageUrl: data.imageUrl }, creditsUsed };
    }
    
    case 'videoGenerator': {
      let prompt = node.data.config.prompt || '';
      for (const input of Object.values(inputs)) {
        if ((input as any)?.prompt) prompt = (input as any).prompt;
        if ((input as any)?.text) prompt = (input as any).text;
      }
      
      const { data, error } = await supabase.functions.invoke('sora-generate', {
        body: { prompt },
      });
      
      if (error) throw error;
      
      return { result: { videoUrl: data.videoUrl }, creditsUsed: 15 };
    }
    
    case 'upscaler': {
      let imageUrl = '';
      for (const input of Object.values(inputs)) {
        if ((input as any)?.imageUrl) imageUrl = (input as any).imageUrl;
      }
      
      // Upscaling logic would go here
      return { result: { imageUrl }, creditsUsed: 1 };
    }
    
    case 'batchGenerator': {
      let prompt = node.data.config.prompt || '';
      for (const input of Object.values(inputs)) {
        if ((input as any)?.prompt) prompt = (input as any).prompt;
        if ((input as any)?.text) prompt = (input as any).text;
      }
      
      const count = node.data.config.count || 4;
      const imageUrls: string[] = [];
      
      for (let i = 0; i < count; i++) {
        const { data, error } = await supabase.functions.invoke('generate-design', {
          body: {
            prompt: `${prompt} (variation ${i + 1})`,
            design_type: node.data.config.designType || 'design',
          },
        });
        
        if (error) throw error;
        imageUrls.push(data.imageUrl);
      }
      
      return { result: { imageUrls }, creditsUsed: count * 2 };
    }
    
    case 'conditional': {
      // SECURITY: Never use eval() - use safe structured condition evaluation
      const conditionConfig = node.data.config.condition;
      let conditionResult = true;
      
      // Only allow structured conditions, not arbitrary code
      if (typeof conditionConfig === 'object' && conditionConfig !== null) {
        const { operator, left, right } = conditionConfig;
        const leftValue = inputs[left] || left;
        
        switch (operator) {
          case 'equals':
            conditionResult = leftValue === right;
            break;
          case 'notEquals':
            conditionResult = leftValue !== right;
            break;
          case 'contains':
            conditionResult = String(leftValue).includes(String(right));
            break;
          case 'greaterThan':
            conditionResult = Number(leftValue) > Number(right);
            break;
          case 'lessThan':
            conditionResult = Number(leftValue) < Number(right);
            break;
          case 'isEmpty':
            conditionResult = !leftValue || leftValue === '' || leftValue === null;
            break;
          case 'isNotEmpty':
            conditionResult = !!leftValue && leftValue !== '' && leftValue !== null;
            break;
          default:
            console.warn(`Unknown condition operator: ${operator}, defaulting to true`);
            conditionResult = true;
        }
      } else if (typeof conditionConfig === 'boolean') {
        conditionResult = conditionConfig;
      } else if (conditionConfig === 'true' || conditionConfig === 'false') {
        conditionResult = conditionConfig === 'true';
      } else {
        // For any other string value, default to true for safety
        console.warn('Conditional node received non-structured condition, defaulting to true');
        conditionResult = true;
      }
      
      return { result: { condition: conditionResult }, creditsUsed: 0 };
    }
    
    case 'merge': {
      const imageUrls: string[] = [];
      for (const input of Object.values(inputs)) {
        if ((input as any)?.imageUrl) imageUrls.push((input as any).imageUrl);
        if ((input as any)?.imageUrls) imageUrls.push(...(input as any).imageUrls);
      }
      return { result: { imageUrls }, creditsUsed: 0 };
    }
    
    case 'random': {
      const options = node.data.config.options || [];
      const selected = options[Math.floor(Math.random() * options.length)];
      return { result: { selected }, creditsUsed: 0 };
    }
    
    case 'loop': {
      const iterations = node.data.config.iterations || 1;
      const results: any[] = [];
      
      for (let i = 0; i < iterations; i++) {
        // Execute loop body (would need sub-graph execution)
        results.push({ iteration: i });
      }
      
      return { result: { results }, creditsUsed: 0 };
    }
    
    case 'imageOutput':
    case 'export':
      // Pass through input data
      for (const input of Object.values(inputs)) {
        if (input) return { result: input, creditsUsed: 0 };
      }
      return { result: {}, creditsUsed: 0 };
    
    default:
      return { result: {}, creditsUsed: 0 };
  }
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log(`\n🎬 ========== NEW WORKFLOW EXECUTION ==========`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(jwt);
    if (claimsError || !claimsData?.claims?.sub) {
      console.error(`❌ Authentication failed: Invalid token`);
      throw new Error('Unauthorized');
    }
    const user = { id: claimsData.claims.sub as string };

    console.log(`👤 User authenticated: ${user.id}`);

    const { workflowId, nodes, edges, targetNodeId } = await req.json();
    console.log(`📊 Workflow details:`, {
      workflowId,
      nodesCount: nodes?.length,
      edgesCount: edges?.length,
      targetNodeId,
    });

    // Check user credits
    const { data: credits } = await supabase
      .from('credits')
      .select('balance')
      .eq('user_id', user.id)
      .single();
    
    console.log(`💳 Current credit balance: ${credits?.balance || 0}`);
    
    if (!credits || credits.balance < 10) {
      console.warn(`⚠️ Insufficient credits: ${credits?.balance || 0}`);
      return new Response(
        JSON.stringify({ error: 'Insufficient credits' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create execution record only if workflow is saved
    let execution = null;
    if (workflowId) {
      console.log(`📝 Creating execution record for workflow: ${workflowId}`);
      const { data: exec, error: execError } = await supabase
        .from('workflow_executions')
        .insert({
          workflow_id: workflowId,
          user_id: user.id,
          status: 'running',
        })
        .select()
        .single();

      if (execError) {
        console.error(`❌ Failed to create execution record:`, execError);
        throw execError;
      }
      execution = exec;
      console.log(`✅ Execution record created: ${execution.id}`);
    }

    // Parse graph and get execution order
    console.log(`🔍 Parsing workflow graph...`);
    const executionNodes = parseWorkflowGraph(nodes, edges);
    console.log(`📝 Execution nodes created: ${executionNodes.length}`);
    
    // If targetNodeId specified, filter to only execute up to that node
    let nodesToExecute = executionNodes;
    if (targetNodeId) {
      console.log(`🎯 Filtering for target node: ${targetNodeId}`);
      const visited = new Set<string>();
      const queue = [targetNodeId];
      
      while (queue.length > 0) {
        const nodeId = queue.shift()!;
        if (visited.has(nodeId)) continue;
        visited.add(nodeId);
        
        const node = executionNodes.find(n => n.id === nodeId);
        if (node) {
          queue.push(...node.dependencies);
        }
      }
      
      nodesToExecute = executionNodes.filter(n => visited.has(n.id));
      console.log(`📋 Nodes to execute: ${nodesToExecute.length} (filtered from ${executionNodes.length})`);
    }
    
    console.log(`🔄 Performing topological sort...`);
    const levels = topologicalSort(nodesToExecute);
    console.log(`📊 Execution levels: ${levels.length}`, levels);

    // Execute nodes level by level
    const results = new Map<string, any>();
    let totalCreditsUsed = 0;

    for (let levelIndex = 0; levelIndex < levels.length; levelIndex++) {
      const level = levels[levelIndex];
      console.log(`\n🎯 ========== LEVEL ${levelIndex + 1}/${levels.length} ==========`);
      console.log(`📦 Nodes in level: ${level.join(', ')}`);
      // Execute all nodes in this level in parallel
      const promises = level.map(async (nodeId) => {
        const node = executionNodes.find(n => n.id === nodeId);
        if (!node) return;

        console.log(`\n▶️  Starting node: ${nodeId} (${node.type})`);

        try {
          // Mark node as running (only if execution record exists)
          if (execution) {
            await supabase
              .from('node_execution_results')
              .insert({
                execution_id: execution.id,
                node_id: nodeId,
                node_type: node.type,
                status: 'running',
              });
          }

          // Execute node
          const { result, creditsUsed } = await executeNode(node, results, supabase, user.id);
          results.set(nodeId, result);
          totalCreditsUsed += creditsUsed;

          console.log(`✅ Node ${nodeId} completed:`, {
            status: 'success',
            creditsUsed,
            hasData: !!result,
          });

          // Deduct credits if used
          if (creditsUsed > 0) {
            await supabase.rpc('deduct_credits', {
              _user_id: user.id,
              _amount: creditsUsed,
              _description: `Workflow node execution: ${node.type}`,
            });
          }

          // Mark node as success (only if execution record exists)
          if (execution) {
            await supabase
              .from('node_execution_results')
              .update({
                status: 'success',
                result_data: result,
                credits_used: creditsUsed,
              })
              .eq('execution_id', execution.id)
              .eq('node_id', nodeId);
          }
        } catch (error) {
          console.error(`❌ Error executing node ${nodeId}:`, error);
          console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
          
          // Mark node as error (only if execution record exists)
          if (execution) {
            await supabase
              .from('node_execution_results')
              .update({
                status: 'error',
                error_message: error instanceof Error ? error.message : 'Unknown error',
              })
              .eq('execution_id', execution.id)
              .eq('node_id', nodeId);
          }
          
          throw error; // Re-throw to stop execution
        }
      });

      await Promise.all(promises);
    }

    // Update execution as completed (only if execution record exists)
    if (execution) {
      await supabase
        .from('workflow_executions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          credits_used: totalCreditsUsed,
        })
        .eq('id', execution.id);
    }


    console.log(`\n✅ ========== EXECUTION COMPLETE ==========`);
    console.log(`💰 Total credits used: ${totalCreditsUsed}`);
    console.log(`📊 Results generated: ${results.size}`);

    // Update execution as completed (only if execution record exists)
    if (execution) {
      await supabase
        .from('workflow_executions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          credits_used: totalCreditsUsed,
        })
        .eq('id', execution.id);
      
      console.log(`✅ Execution record updated: ${execution.id}`);
    }

    const responseData = {
      executionId: execution?.id || null,
      status: 'completed',
      creditsUsed: totalCreditsUsed,
      results: Object.fromEntries(results),
    };

    console.log(`📤 Returning response with ${Object.keys(responseData.results).length} results`);

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error(`\n❌ ========== EXECUTION FAILED ==========`);
    console.error('Error:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
