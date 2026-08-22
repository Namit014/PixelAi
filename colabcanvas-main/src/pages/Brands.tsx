import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, Globe, PenLine, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useBrandsData } from "@/hooks/useDashboardData";
import { useQueryClient } from "@tanstack/react-query";
import { BrandCard } from "@/components/brands/BrandCard";
import { BrandsSkeleton } from "@/components/brands/BrandsSkeleton";

export default function Brands() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"extract" | "manual">("extract");
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: brands = [], isLoading } = useBrandsData(user?.id);

  const processedBrands = brands.map((brand: any) => {
    if (!brand.logo_primary_url) {
      const logoBlock = brand.brand_sections?.
      flatMap((section: any) => section.brand_content_blocks || [])?.
      find((block: any) => block.block_type === "logo_variant");
      if (logoBlock?.content?.signed_url) {
        return { ...brand, logo_primary_url: logoBlock.content.signed_url };
      }
    }
    return brand;
  });

  const handleDeleteBrand = async (brandId: string) => {
    try {
      const { error } = await supabase.
      from("brands").
      update({ deleted_at: new Date().toISOString() }).
      eq("id", brandId);
      if (error) throw error;
      toast({ title: "Brand deleted", description: "Brand moved to trash" });
      queryClient.invalidateQueries({ queryKey: ["brands", user?.id] });
    } catch (error: any) {
      toast({
        title: "Error deleting brand",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleExtract = async () => {
    if (!inputValue.trim()) return;

    let url = inputValue.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    setExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "extract-brand-from-website",
        { body: { websiteUrl: url } }
      );
      if (error) throw error;

      if (data?.success && data?.data) {
        setExtractedData(data.data);
        toast({
          title: "Brand assets extracted!",
          description: `Found ${data.data.colors?.length || 0} colors and brand information`
        });

        // Auto-create brand after extraction
        const brandName =
        data.data.name ||
        url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0];
        await createBrand(brandName, data.data.description, data.data.industry, url, data.data);
      }
    } catch (error: any) {
      toast({
        title: "Extraction failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setExtracting(false);
    }
  };

  const handleManualCreate = async () => {
    if (!inputValue.trim()) return;
    await createBrand(inputValue.trim());
  };

  const createBrand = async (
  name: string,
  description?: string,
  industry?: string,
  websiteUrl?: string,
  extractionData?: any) =>
  {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-brand", {
        body: {
          name,
          description: description || "",
          industry: industry || "",
          useAI: activeTab === "manual",
          website_url: websiteUrl || null,
          extraction_metadata: extractionData ?
          {
            extractedAt: new Date().toISOString(),
            colors: extractionData.colors,
            typography: extractionData.typography,
            styleKeywords: extractionData.styleKeywords
          } :
          null
        }
      });

      if (error) throw error;

      toast({
        title: "Brand created",
        description: "Your brand has been created successfully"
      });

      setInputValue("");
      setExtractedData(null);
      queryClient.invalidateQueries({ queryKey: ["brands", user?.id] });
      navigate(`/brands/${data.brand.slug}`);
    } catch (error: any) {
      toast({
        title: "Error creating brand",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === "extract") {
      handleExtract();
    } else {
      handleManualCreate();
    }
  };

  const filteredBrands = processedBrands.filter((brand: any) =>
  brand.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isProcessing = loading || extracting;

  if (isLoading && !!user) return <BrandsSkeleton />;

  return (
    <div className="bg-background min-h-screen">
      {/* Hero — compact on mobile, tall on desktop */}
      <div className="w-full bg-background flex items-end min-h-[40vh] sm:min-h-[55vh]">
        <div className="container max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-8 sm:pb-14 flex flex-col items-center">
          {/* Tab Toggle */}
          <div className="flex items-center rounded-2xl bg-muted p-1 mb-6 sm:mb-10 border border-border/50">
            <button
              onClick={() => {
                setActiveTab("extract");
                setInputValue("");
                setExtractedData(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              activeTab === "extract" ?
              "bg-background text-foreground shadow-sm" :
              "text-muted-foreground hover:text-foreground"}`
              }>
              
              <Globe className="w-4 h-4" />
              Extract from website
            </button>
            <button
              onClick={() => {
                setActiveTab("manual");
                setInputValue("");
                setExtractedData(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              activeTab === "manual" ?
              "bg-background text-foreground shadow-sm" :
              "text-muted-foreground hover:text-foreground"}`
              }>
              
              <PenLine className="w-4 h-4" />
              Manual entry
            </button>
          </div>

          <h1 className="font-normal text-foreground mb-4 sm:mb-6 text-center text-2xl sm:text-3xl">
            Enter your brand
          </h1>

          <form onSubmit={handleSubmit} className="w-full max-w-lg">
            <div className="relative flex items-center">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={
                activeTab === "extract" ?
                "yourwebsite.com" :
                "Your Brand Name"
                }
                className="h-12 pr-28 rounded-2xl bg-background border-border shadow-none text-base placeholder:text-muted-foreground/60"
                disabled={isProcessing} />
              
              <Button
                type="submit"
                disabled={!inputValue.trim() || isProcessing}
                size="sm"
                className="absolute right-1.5 rounded-xl h-9 px-5 gap-2">
                
                {isProcessing ?
                <Loader2 className="w-4 h-4 animate-spin" /> :
                activeTab === "extract" ?
                <Sparkles className="w-4 h-4" /> :
                null}
                {activeTab === "extract" ? "Extract" : "Create"}
              </Button>
            </div>
          </form>

          {extractedData?.colors && extractedData.colors.length > 0 &&
          <div className="mt-6 flex items-center gap-3">
              <span className="text-xs text-muted-foreground font-medium">
                Colors found:
              </span>
              <div className="flex gap-1.5">
                {extractedData.colors.map((color: any, i: number) =>
              <div
                key={i}
                className="w-7 h-7 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: color.hex }}
                title={color.name || color.hex} />

              )}
              </div>
            </div>
          }
        </div>
      </div>

      {/* Your Brands Section */}
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="flex items-center justify-between gap-3 mb-6 sm:mb-8 flex-wrap">
          <h2 className="text-lg sm:text-xl font-normal text-foreground">Your Brands</h2>
          <div className="relative flex-1 sm:flex-none min-w-0 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search brands..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full sm:w-56 h-9 text-sm bg-muted/50 border-border/50" />
            
          </div>
        </div>

        {filteredBrands.length === 0 ?
        <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg font-medium mb-1">No brands yet</p>
            <p className="text-sm">
              Create your first brand using the form above
            </p>
          </div> :

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {filteredBrands.map((brand: any) =>
          <BrandCard
            key={brand.id}
            brand={brand}
            onDelete={handleDeleteBrand}
            onClick={() => navigate(`/brands/${brand.slug}`)} />

          )}
          </div>
        }
      </div>
    </div>);

}