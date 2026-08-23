const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { currentPrompt, selectedImages } = await req.json();
    
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    console.log('Generating prompt suggestion for:', currentPrompt);

    // Build messages array with image context if available
    const messages: any[] = [
      {
        role: 'system',
        content: `You are a helpful assistant that suggests the next 3-5 words to complete a design prompt. 
- Analyze the current prompt and image context
- For multiple images, suggest compositing/integration terms
- Suggest natural, creative continuation (3-5 words max)
- Make suggestions specific to design/visual context
- Return ONLY the suggested words, no explanations
- Keep it concise and actionable`
      }
    ];

    if (selectedImages && selectedImages.length > 0) {
      const userContent: any[] = [
        {
          type: 'text',
          text: selectedImages.length > 1
            ? `Based on these ${selectedImages.length} images and the current prompt: "${currentPrompt}", suggest the next 3-5 words to continue the prompt naturally. Consider terms like: composite, integrate, blend, merge, overlay.`
            : `Based on this image and the current prompt: "${currentPrompt}", suggest the next 3-5 words to continue the prompt naturally.`
        }
      ];

      // Add all images to the message
      for (const img of selectedImages) {
        if (img?.src) {
          userContent.push({
            type: 'image_url',
            image_url: {
              url: img.src
            }
          });
        }
      }

      messages.push({
        role: 'user',
        content: userContent
      });
    } else {
      messages.push({
        role: 'user',
        content: `Current prompt: "${currentPrompt}". Suggest the next 3-5 words to continue this design prompt naturally.`
      });
    }

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GEMINI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
        messages,
        max_tokens: 20,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI generation limit reached. Please try again later.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Too many requests. Please try again shortly.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const suggestion = data.choices?.[0]?.message?.content?.trim() || '';
    
    console.log('Generated suggestion:', suggestion);

    return new Response(
      JSON.stringify({ suggestion }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in prompt-suggest:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});