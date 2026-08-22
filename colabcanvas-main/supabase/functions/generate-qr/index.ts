import { getCorsHeaders } from '../_shared/cors.ts';

// QR Code generation using API
const QR_API_URL = 'https://api.qrserver.com/v1/create-qr-code/';

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, foregroundColor, backgroundColor, size = 512 } = await req.json();

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'Content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📱 Generating QR code for: ${content.substring(0, 50)}...`);

    // Format colors for API (remove # prefix)
    const fgColor = (foregroundColor || '#000000').replace('#', '');
    const bgColor = (backgroundColor || '#ffffff').replace('#', '');

    // Build QR API URL
    const params = new URLSearchParams({
      data: content,
      size: `${size}x${size}`,
      color: fgColor,
      bgcolor: bgColor,
      format: 'png',
      margin: '10',
    });

    const qrUrl = `${QR_API_URL}?${params.toString()}`;

    // Return the direct QR API URL immediately (no need to fetch + convert)
    console.log(`✅ QR code generated successfully`);

    return new Response(
      JSON.stringify({ 
        imageUrl: qrUrl,
        size: size
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('QR generation error:', error);
    const message = error instanceof Error ? error.message : 'QR generation failed';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
