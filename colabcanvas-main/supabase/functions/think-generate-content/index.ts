import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Verify user
    const supabaseUser = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } }
    });

    const jwt = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(jwt);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const user = { id: claimsData.claims.sub as string };

    const { type, prompt, conversationId, userId, format } = await req.json();

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Supported document formats
    const DOCUMENT_FORMATS = {
      markdown: { extension: 'md', mime: 'text/markdown', label: 'Markdown' },
      pdf: { extension: 'html', mime: 'text/html', label: 'PDF-Ready HTML' },
      presentation: { extension: 'html', mime: 'text/html', label: 'Presentation' },
    };

    // Handle conversation
    let activeConversationId = conversationId;
    if (!activeConversationId) {
      const title = `${type === 'image' ? '🎨' : '📄'} ${prompt.slice(0, 50)}...`;
      const { data: newConv } = await supabase
        .from('think_conversations')
        .insert({ user_id: user.id, title })
        .select('id')
        .single();
      activeConversationId = newConv?.id;
    }

    // Save user message
    if (activeConversationId) {
      await supabase.from('think_messages').insert({
        conversation_id: activeConversationId,
        role: 'user',
        content: `Create ${type}: ${prompt}`
      });
    }

    if (type === 'image') {
      // Generate image using Lovable AI image model
      console.log('[think-generate] Generating image:', prompt);
      
      const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [
            { 
              role: "system", 
              content: "You are an expert image generator. Create high-quality, detailed images based on the user's description. Focus on composition, lighting, and artistic quality." 
            },
            { role: "user", content: prompt }
          ],
        }),
      });

      if (!imageResponse.ok) {
        const errorText = await imageResponse.text();
        console.error('[think-generate] Image generation failed:', errorText);
        throw new Error("Failed to generate image");
      }

      const imageData = await imageResponse.json();
      const content = imageData.choices?.[0]?.message?.content || '';
      
      // Check if there's an image in the response
      const imageUrl = imageData.choices?.[0]?.message?.image_url || null;
      
      let responseMessage = "I've created an image based on your description.";
      let attachments: any[] = [];

      if (imageUrl) {
        // Upload to storage
        const imageBlob = await fetch(imageUrl).then(r => r.blob());
        const fileName = `think/${user.id}/${Date.now()}-generated.png`;
        
        await supabase.storage.from('design-tool-uploads').upload(fileName, imageBlob, {
          contentType: 'image/png',
          upsert: true
        });

        const { data: signedData } = await supabase.storage
          .from('design-tool-uploads')
          .createSignedUrl(fileName, 3600);

        if (signedData?.signedUrl) {
          attachments.push({
            url: signedData.signedUrl,
            name: 'generated-image.png',
            type: 'image/png'
          });
          responseMessage = `Here's your generated image!\n\n**Prompt:** ${prompt}\n\nYou can download it or continue refining the concept.`;
        }
      } else {
        // Fallback: describe what would be created
        responseMessage = `I understand you want to create: "${prompt}"\n\n${content}\n\n*Note: To generate actual images, use Canvas which has full image generation capabilities.*`;
      }

      // Save assistant message
      if (activeConversationId) {
        await supabase.from('think_messages').insert({
          conversation_id: activeConversationId,
          role: 'assistant',
          content: responseMessage
        });
        await supabase.from('think_conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', activeConversationId);
      }

      return new Response(
        JSON.stringify({ 
          message: responseMessage,
          attachments: attachments.length > 0 ? attachments : undefined,
          conversationId: activeConversationId
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (type === 'document' || type === 'pdf' || type === 'presentation') {
      // Determine document format
      const docFormat = type === 'pdf' ? 'pdf' : type === 'presentation' ? 'presentation' : (format || 'markdown');
      const formatInfo = DOCUMENT_FORMATS[docFormat as keyof typeof DOCUMENT_FORMATS] || DOCUMENT_FORMATS.markdown;
      
      console.log(`[think-generate] Generating ${formatInfo.label}:`, prompt);

      // Different system prompts based on format
      let systemPrompt = '';
      
      if (type === 'presentation' || docFormat === 'presentation') {
        systemPrompt = `You are an expert presentation creator. Generate professional slide content in Reveal.js HTML format.

When creating presentations:
1. Create 5-10 slides with clear headings
2. Use bullet points for key ideas (3-5 per slide)
3. Include speaker notes where helpful
4. Make content visually scannable
5. End with a summary or call-to-action slide

Output format: Generate complete HTML that works with Reveal.js framework.

Example structure:
\`\`\`html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@4.5.0/dist/reveal.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@4.5.0/dist/theme/white.min.css">
</head>
<body>
<div class="reveal">
  <div class="slides">
    <section><h1>Title</h1></section>
    <section><h2>Slide 2</h2><ul><li>Point 1</li></ul></section>
  </div>
</div>
<script src="https://cdn.jsdelivr.net/npm/reveal.js@4.5.0/dist/reveal.min.js"></script>
<script>Reveal.initialize();</script>
</body>
</html>
\`\`\``;
      } else if (type === 'pdf' || docFormat === 'pdf') {
        systemPrompt = `You are an expert document creator. Generate professional, print-ready HTML documents.

When creating documents:
1. Use semantic HTML with proper headings (h1, h2, h3)
2. Include inline CSS for professional styling
3. Use tables where data needs organization
4. Add page break hints for multi-page documents
5. Make it visually professional

Output a complete HTML document with embedded CSS that looks good when printed/saved as PDF.

Include this style block:
<style>
  body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; padding: 2rem; line-height: 1.6; }
  h1 { color: #1a1a1a; border-bottom: 2px solid #333; padding-bottom: 0.5rem; }
  h2 { color: #333; margin-top: 2rem; }
  table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
  th, td { border: 1px solid #ddd; padding: 0.75rem; text-align: left; }
  th { background: #f5f5f5; }
  @media print { .page-break { page-break-after: always; } }
</style>`;
      } else {
        systemPrompt = `You are an expert document creator. Generate professional, well-structured documents based on user requests.

When creating documents:
1. Use proper headings and formatting (markdown)
2. Include relevant sections based on the document type
3. Be thorough but concise
4. Add placeholder text where specific details would be needed
5. Include any relevant tables, lists, or structured content

Document types you can create:
- Business proposals and plans
- Marketing briefs and strategies  
- Project documentation
- Research reports
- Creative briefs
- Meeting agendas and notes
- Email templates
- Presentations outlines
- Legal documents (basic templates)
- Technical documentation

Format your response as a complete, ready-to-use document.`;
      }

      const docResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Create a ${formatInfo.label}: ${prompt}` }
          ],
        }),
      });

      if (!docResponse.ok) {
        const errorText = await docResponse.text();
        console.error('[think-generate] Document generation failed:', errorText);
        throw new Error("Failed to generate document");
      }

      const docData = await docResponse.json();
      const documentContent = docData.choices?.[0]?.message?.content || '';

      // Create the file
      const fileName = `think/${user.id}/${Date.now()}-${type}.${formatInfo.extension}`;
      const contentBlob = new Blob([documentContent], { type: formatInfo.mime });
      
      await supabase.storage.from('design-tool-uploads').upload(fileName, contentBlob, {
        contentType: formatInfo.mime,
        upsert: true
      });

      const { data: signedData } = await supabase.storage
        .from('design-tool-uploads')
        .createSignedUrl(fileName, 3600);

      let responseMessage = '';
      if (type === 'presentation') {
        responseMessage = `# 📊 Presentation Created\n\nI've created your presentation slides.\n\n${signedData?.signedUrl ? `**[🎯 Open Presentation](${signedData.signedUrl})** (opens in new tab - use browser print to save as PDF)\n\n---\n\n` : ''}Preview of slides:\n\n${documentContent.replace(/<[^>]*>/g, ' ').slice(0, 500)}...`;
      } else if (type === 'pdf') {
        responseMessage = `# 📄 Document Created\n\nI've created your professional document.\n\n${signedData?.signedUrl ? `**[📥 Download Document](${signedData.signedUrl})** (HTML format - use browser print to save as PDF)\n\n---\n\n` : ''}${documentContent.replace(/<[^>]*>/g, ' ').slice(0, 800)}...`;
      } else {
        responseMessage = `# Generated Document\n\n${documentContent}\n\n---\n\n${signedData?.signedUrl ? '📥 [Download Document](' + signedData.signedUrl + ')' : ''}`; 
      }

      // Save assistant message
      if (activeConversationId) {
        await supabase.from('think_messages').insert({
          conversation_id: activeConversationId,
          role: 'assistant',
          content: responseMessage
        });
        await supabase.from('think_conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', activeConversationId);
      }

      return new Response(
        JSON.stringify({ 
          message: responseMessage,
          conversationId: activeConversationId
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error(`Unknown content type: ${type}`);

  } catch (error) {
    console.error("[think-generate] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
