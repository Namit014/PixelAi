import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== Upload Template Images Function Started ===");
    console.log("📅 Timestamp:", new Date().toISOString());
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      const error = "Missing required environment variables";
      console.error("❌ FATAL:", error);
      throw new Error(error);
    }

    console.log("✅ Environment variables loaded");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      const error = "Missing authorization header";
      console.error("❌ AUTH ERROR:", error);
      throw new Error(error);
    }

    console.log("✅ Authorization header present");

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify JWT and get user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

    if (claimsError || !claimsData?.claims?.sub) {
      console.error("❌ JWT VERIFICATION FAILED:", claimsError);
      throw new Error("Invalid authentication token");
    }
    const user = { id: claimsData.claims.sub as string };

    console.log("✅ User authenticated:", user.id);

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (roleError || !roleData) {
      console.error("❌ AUTHORIZATION FAILED:", roleError);
      throw new Error("Unauthorized: Admin access required");
    }

    console.log("✅ Admin role verified");

    // Parse form data
    console.log("📦 Parsing form data...");
    const formData = await req.formData();
    const categoryId = formData.get("category_id") as string;
    const imageFiles = formData.getAll("images") as File[];

    console.log("📊 Form data parsed:", {
      categoryId,
      fileCount: imageFiles.length,
      fileNames: imageFiles.map(f => f.name),
      fileSizes: imageFiles.map(f => `${(f.size / 1024).toFixed(2)}KB`)
    });

    if (!categoryId) {
      console.error("❌ VALIDATION ERROR: Missing category_id");
      throw new Error("Missing category_id");
    }

    if (!imageFiles || imageFiles.length === 0) {
      console.error("❌ VALIDATION ERROR: No images provided");
      throw new Error("No images provided");
    }

    console.log(`📤 Starting upload of ${imageFiles.length} image(s)...`);

    // Upload images to storage
    const uploadedUrls: string[] = [];

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const fileName = `${crypto.randomUUID()}-${file.name}`;
      const filePath = `${categoryId}/${fileName}`;

      console.log(`  [${i + 1}/${imageFiles.length}] ⬆️ Uploading: ${filePath}`);
      console.log(`    File type: ${file.type}, Size: ${(file.size / 1024).toFixed(2)}KB`);

      const arrayBuffer = await file.arrayBuffer();
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("template-instructions")
        .upload(filePath, arrayBuffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error(`  ❌ Upload failed for ${fileName}:`, {
          error: uploadError,
          message: uploadError.message
        });
        throw uploadError;
      }

      console.log(`  ✅ Uploaded successfully: ${uploadData.path}`);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("template-instructions")
        .getPublicUrl(filePath);

      uploadedUrls.push(urlData.publicUrl);
      console.log(`  🔗 Public URL: ${urlData.publicUrl}`);
    }

    console.log(`✅ All ${uploadedUrls.length} images uploaded to storage`);

    // Get existing template_images array
    console.log("📖 Fetching existing images for category:", categoryId);
    
    const { data: categoryData, error: fetchError } = await supabase
      .from("design_template_categories")
      .select("template_images")
      .eq("id", categoryId)
      .single();

    if (fetchError) {
      console.error("❌ DATABASE FETCH ERROR:", {
        error: fetchError,
        message: fetchError.message,
        details: fetchError.details,
        hint: fetchError.hint
      });
      throw fetchError;
    }

    console.log("📦 Current category data:", {
      existingImages: categoryData?.template_images,
      existingCount: (categoryData?.template_images as string[] || []).length
    });

    const existingImages = (categoryData?.template_images as string[]) || [];
    const updatedImages = [...existingImages, ...uploadedUrls];

    console.log("🔄 Preparing database update:", {
      existingCount: existingImages.length,
      newCount: uploadedUrls.length,
      totalCount: updatedImages.length
    });

    // Update the category with new images
    const { error: updateError } = await supabase
      .from("design_template_categories")
      .update({ template_images: updatedImages })
      .eq("id", categoryId);

    if (updateError) {
      console.error("❌ DATABASE UPDATE ERROR:", {
        error: updateError,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint
      });
      throw updateError;
    }

    console.log("✅ Database updated successfully");
    console.log("=== Upload Template Images Function Completed Successfully ===");

    return new Response(
      JSON.stringify({
        success: true,
        uploaded_urls: uploadedUrls,
        total_images: updatedImages.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("=== ❌ FATAL ERROR IN UPLOAD FUNCTION ===");
    console.error("Error type:", error.constructor?.name);
    console.error("Error message:", error.message);
    console.error("Error details:", error.details);
    console.error("Error hint:", error.hint);
    console.error("Error code:", error.code);
    console.error("Full error object:", JSON.stringify(error, null, 2));
    console.error("Stack trace:", error.stack);
    console.error("=== END ERROR TRACE ===");
    
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
        details: error.details || error.toString(),
        type: error.constructor?.name,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
