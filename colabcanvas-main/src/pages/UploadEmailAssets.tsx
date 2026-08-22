import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function UploadEmailAssets() {
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<Record<string, "pending" | "success" | "error">>({
    "colab-logo-light.svg": "pending",
    "colab-logo-dark.svg": "pending",
    "signature.png": "pending",
  });

  const uploadAssets = async () => {
    setUploading(true);
    const files = [
      { name: "colab-logo-light.svg", path: "/email-assets/colab-logo-light.svg" },
      { name: "colab-logo-dark.svg", path: "/email-assets/colab-logo-dark.svg" },
      { name: "signature.png", path: "/email-assets/signature.png" },
    ];

    for (const file of files) {
      try {
        // Fetch the file from public directory
        const response = await fetch(file.path);
        if (!response.ok) throw new Error(`Failed to fetch ${file.name}`);
        
        const blob = await response.blob();
        
        // Upload to Supabase Storage
        const { error } = await supabase.storage
          .from("email-assets")
          .upload(file.name, blob, {
            contentType: blob.type,
            upsert: true,
          });

        if (error) throw error;

        setStatus((prev) => ({ ...prev, [file.name]: "success" }));
        toast.success(`${file.name} uploaded successfully`);
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        setStatus((prev) => ({ ...prev, [file.name]: "error" }));
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setUploading(false);
    
    const allSuccess = Object.values(status).every((s) => s === "success");
    if (allSuccess) {
      toast.success("All email assets uploaded successfully!");
    }
  };

  const getStatusIcon = (fileStatus: string) => {
    if (fileStatus === "success") return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (fileStatus === "error") return <XCircle className="w-5 h-5 text-red-500" />;
    return <div className="w-5 h-5" />;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Upload Email Assets</h1>
          <p className="text-sm text-muted-foreground">
            This will upload the logo and signature files to the email-assets storage bucket.
          </p>
        </div>

        <div className="space-y-3">
          {Object.entries(status).map(([fileName, fileStatus]) => (
            <div key={fileName} className="flex items-center justify-between p-3 rounded-lg border">
              <span className="text-sm font-medium">{fileName}</span>
              {getStatusIcon(fileStatus)}
            </div>
          ))}
        </div>

        <Button
          onClick={uploadAssets}
          disabled={uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            "Upload Assets"
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          This page can be deleted after successful upload.
        </p>
      </Card>
    </div>
  );
}
