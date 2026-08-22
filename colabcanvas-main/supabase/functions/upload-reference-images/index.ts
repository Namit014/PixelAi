// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { getSafeErrorMessage, sanitizeLog } from '../_shared/errors.ts';

const ALLOWED_CATEGORIES = ['logo', 'branding', 'poster', 'illustration', 'character', 'mockup', 'campaign', 'social'];
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('CRITICAL: Missing Supabase environment variables');
      throw new Error("Service temporarily unavailable");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify user authentication
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims?.sub) {
      throw new Error("Invalid authentication");
    }
    const user = { id: claimsData.claims.sub as string };

    // Verify admin role - check if user has admin among their roles
    const { data: roleData, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (roleError) {
      console.error("❌ Role check error:", roleError);
      throw new Error("Failed to verify user role");
    }

    const hasAdminRole = roleData?.some(r => r.role === "admin");
    
    if (!hasAdminRole) {
      console.error("❌ Unauthorized access attempt:", sanitizeLog({ userId: user.id }));
      throw new Error("Unauthorized: Admin access required");
    }

    console.log("✅ Admin authenticated:", sanitizeLog({ userId: user.id }));

    // Parse multipart form data
    const formData = await req.formData();
    const categoryRaw = formData.get("category") as string;
    const files = formData.getAll("images") as File[];

    // Validate category
    if (!categoryRaw || !ALLOWED_CATEGORIES.includes(categoryRaw)) {
      return new Response(
        JSON.stringify({ success: false, error: `Invalid category. Must be one of: ${ALLOWED_CATEGORIES.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const category = categoryRaw;

    if (!files || files.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No images provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (files.length > 50) {
      return new Response(
        JSON.stringify({ success: false, error: "Too many files. Maximum 50 images per upload. Please upload in smaller batches." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📤 Uploading ${files.length} images to category: ${category}`);

    const uploadedUrls: string[] = [];
    const errors: string[] = [];

    // Upload each file
    for (const file of files) {
      try {
        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          errors.push(`${file.name}: File exceeds 10MB limit`);
          continue;
        }

        // Validate MIME type
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
          errors.push(`${file.name}: Invalid file type. Allowed: JPG, PNG, WebP, GIF`);
          continue;
        }

        // Sanitize filename
        const fileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 255);
        const fileExt = fileName.split(".").pop();
        const filePath = `${category}/${Date.now()}_${fileName}`;

        // Convert File to ArrayBuffer then to Uint8Array
        const arrayBuffer = await file.arrayBuffer();
        const fileData = new Uint8Array(arrayBuffer);

        // Upload to storage
        const { error: uploadError } = await supabaseClient.storage
          .from("reference-images")
          .upload(filePath, fileData, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          console.error(`❌ Upload error for ${fileName}:`, uploadError);
          errors.push(`${fileName}: ${uploadError.message}`);
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabaseClient.storage
          .from("reference-images")
          .getPublicUrl(filePath);

        // Insert into database and get the inserted record
        const { data: insertData, error: dbError } = await supabaseClient
          .from("reference_images")
          .insert({
            user_id: user.id,
            image_url: publicUrl,
            file_name: fileName,
            title: fileName.replace(/\.[^/.]+$/, ""), // Remove extension
            source: "admin_upload",
            tags: [category, "curated", "reference"],
          })
          .select()
          .single();

        if (dbError || !insertData) {
          console.error(`❌ Database error for ${fileName}:`, dbError);
          errors.push(`${fileName}: Upload failed. Please try again.`);
          
          // Cleanup: delete from storage if DB insert fails
          await supabaseClient.storage
            .from("reference-images")
            .remove([filePath]);
          continue;
        }

        uploadedUrls.push(publicUrl);
        console.log(`✅ Uploaded: ${fileName}`);

        // Trigger AI analysis in background (don't wait for it)
        try {
          supabaseClient.functions.invoke('analyze-reference-image', {
            body: { 
              image_id: insertData.id, 
              image_url: publicUrl 
            }
          }).then(({ error: analysisError }) => {
            if (analysisError) {
              console.error(`⚠️ AI analysis failed for ${fileName}:`, analysisError);
            } else {
              console.log(`🤖 AI analysis triggered for ${fileName}`);
            }
          });
        } catch (analysisError) {
          console.error(`⚠️ Failed to trigger analysis for ${fileName}:`, analysisError);
          // Don't fail the upload if analysis fails
        }
      } catch (error: any) {
        console.error(`❌ Error processing ${file.name}:`, error);
        errors.push(`${file.name}: ${error.message}`);
      }
    }

    console.log(`✅ Upload complete: ${uploadedUrls.length} success, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        uploaded: uploadedUrls.length,
        total: files.length,
        urls: uploadedUrls,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    const origin = req.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin);
    return new Response(
      JSON.stringify({
        success: false,
        error: getSafeErrorMessage(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
