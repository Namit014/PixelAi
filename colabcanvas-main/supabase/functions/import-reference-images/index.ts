import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(jwt);
    if (claimsError || !claimsData?.claims?.sub) {
      throw new Error('Unauthorized');
    }
    const user = { id: claimsData.claims.sub as string };

    const { driveUrl, projectId } = await req.json();

    if (!driveUrl) {
      throw new Error('Google Drive URL is required');
    }

    console.log('Importing from Drive URL:', driveUrl);

    // Extract folder ID from Drive URL
    let folderId = '';
    if (driveUrl.includes('/folders/')) {
      folderId = driveUrl.split('/folders/')[1].split('?')[0];
    } else if (driveUrl.includes('id=')) {
      folderId = driveUrl.split('id=')[1].split('&')[0];
    }

    if (!folderId) {
      throw new Error('Invalid Google Drive URL. Please provide a folder URL.');
    }

    // Get files from Google Drive folder using Google Drive API
    const googleApiKey = Deno.env.get('GOOGLE_API_KEY');
    if (!googleApiKey) {
      throw new Error('Google API key not configured');
    }

    const driveApiUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType+contains+'image/'&fields=files(id,name,mimeType,thumbnailLink,webContentLink)&key=${googleApiKey}`;
    
    const driveResponse = await fetch(driveApiUrl);
    if (!driveResponse.ok) {
      throw new Error('Failed to fetch files from Google Drive');
    }

    const driveData = await driveResponse.json();
    const files = driveData.files || [];

    console.log(`Found ${files.length} images in Drive folder`);

    if (files.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No images found in the specified folder' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Download and store images
    const importedImages = [];
    for (const file of files) {
      try {
        // Download image from Google Drive
        const downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${googleApiKey}`;
        const imageResponse = await fetch(downloadUrl);
        
        if (!imageResponse.ok) {
          console.error(`Failed to download ${file.name}`);
          continue;
        }

        const imageBlob = await imageResponse.blob();
        const fileExt = file.mimeType.split('/')[1] || 'jpg';
        const fileName = `ref-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabaseClient.storage
          .from('design-assets')
          .upload(filePath, imageBlob, {
            contentType: file.mimeType,
            upsert: false
          });

        if (uploadError) {
          console.error(`Failed to upload ${file.name}:`, uploadError);
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabaseClient.storage
          .from('design-assets')
          .getPublicUrl(filePath);

        // Save to reference_images table
        const { error: dbError } = await supabaseClient
          .from('reference_images')
          .insert({
            user_id: user.id,
            project_id: projectId,
            image_url: publicUrl,
            thumbnail_url: file.thumbnailLink,
            file_name: file.name,
            title: file.name,
            source: 'google_drive'
          });

        if (dbError) {
          console.error(`Failed to save ${file.name} to database:`, dbError);
          continue;
        }

        importedImages.push({
          name: file.name,
          url: publicUrl
        });

        console.log(`✅ Imported: ${file.name}`);
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        continue;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: importedImages.length,
        images: importedImages
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error importing reference images:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to import images';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
