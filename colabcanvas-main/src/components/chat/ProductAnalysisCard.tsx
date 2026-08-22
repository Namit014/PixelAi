import { useState } from 'react';
import { ChevronDown, ChevronRight, Palette, Package, Tag, ListChecks, Sparkles, Eye } from 'lucide-react';

interface ProductAnalysis {
  design: {
    composition?: string;
    packaging_shape?: string; // backward compat
    color_zones: string;
    layout_elements: string;
  };
  colors: Array<{color: string;hex_estimate: string;purpose: string;}>;
  branding: {
    brand_name: string;
    subject_name?: string;
    product_name?: string; // backward compat
    identity_elements: string;
  };
  details?: Array<{label: string;value: string;}>;
  product_details?: Array<{label: string;value: string;}>; // backward compat
  summary: string;
}

interface ExecutionPlanItem {
  imageNumber: number;
  title: string;
  description: string;
  model: string;
}

interface ProductAnalysisCardProps {
  analysis: ProductAnalysis;
  executionPlan?: ExecutionPlanItem[];
}

export const ProductAnalysisCard = ({ analysis, executionPlan }: ProductAnalysisCardProps) => {
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [isPlanOpen, setIsPlanOpen] = useState(true);

  const compositionLabel = analysis.design.composition || analysis.design.packaging_shape || '';
  const subjectLabel = analysis.branding.subject_name || analysis.branding.product_name || '';
  const detailsList = analysis.details || analysis.product_details || [];

  return (
    <div className="space-y-2 mt-2">
      {/* Image Analyzer Section */}
      <div className="rounded-xl border border-zinc-200 overflow-hidden bg-primary-foreground">
        <button
          onClick={() => setIsAnalysisOpen(!isAnalysisOpen)}
          className="w-full flex items-center px-3 text-left transition-colors py-[12px] gap-[8px] bg-primary-foreground">

          <Eye className="w-4 h-4 text-blue-500" />
          <span className="text-xs font-semibold text-zinc-700 flex-1">Image Analyzer</span>
          {isAnalysisOpen ? <ChevronDown className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />}
        </button>

        {isAnalysisOpen &&
        <div className="px-3 space-y-3 pb-[13px]">
            {/* Design */}
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Package className="w-3 h-3 text-zinc-500" />
                <span className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wide">Design</span>
              </div>
              <div className="text-xs text-zinc-600 space-y-0.5 pl-4">
                <p><span className="font-medium">Composition:</span> {compositionLabel}</p>
                <p><span className="font-medium">Color Zones:</span> {analysis.design.color_zones}</p>
                <p><span className="font-medium">Layout:</span> {analysis.design.layout_elements}</p>
              </div>
            </div>

            {/* Colors */}
            {analysis.colors && analysis.colors.length > 0 &&
          <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Palette className="w-3 h-3 text-zinc-500" />
                  <span className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wide">Colors</span>
                </div>
                <div className="pl-4 space-y-1">
                  {analysis.colors.map((c, i) =>
              <div key={i} className="flex items-center gap-2 text-xs text-zinc-600">
                      <div
                  className="w-3 h-3 rounded-sm border border-zinc-300 flex-shrink-0"
                  style={{ backgroundColor: c.hex_estimate }} />

                      <span className="font-medium">{c.color}</span>
                      <span className="text-zinc-400">—</span>
                      <span>{c.purpose}</span>
                    </div>
              )}
                </div>
              </div>
          }

            {/* Branding */}
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Tag className="w-3 h-3 text-zinc-500" />
                <span className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wide">Branding</span>
              </div>
              <div className="text-xs text-zinc-600 space-y-0.5 pl-4">
                <p><span className="font-medium">Brand:</span> {analysis.branding.brand_name}</p>
                <p><span className="font-medium">Subject:</span> {subjectLabel}</p>
                <p><span className="font-medium">Identity:</span> {analysis.branding.identity_elements}</p>
              </div>
            </div>

            {/* Details */}
            {detailsList.length > 0 &&
          <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <ListChecks className="w-3 h-3 text-zinc-500" />
                  <span className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wide">Details</span>
                </div>
                <div className="pl-4 space-y-0.5">
                  {detailsList.filter((d) => d.value && d.value !== 'Not visible').map((d, i) =>
              <p key={i} className="text-xs text-zinc-600">
                      <span className="font-medium">{d.label}:</span> {d.value}
                    </p>
              )}
                </div>
              </div>
          }
          </div>
        }
      </div>

      {/* Visual Analysis Summary */}
      {analysis.summary &&
      <div className="rounded-xl border border-zinc-200 px-3 py-2.5 bg-primary-foreground pt-[11px] pb-[12px]">
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-semibold text-zinc-700">Visual Analysis</span>
          </div>
          <p className="text-xs text-zinc-600 leading-relaxed">{analysis.summary}</p>
        </div>
      }

      {/* Execution Plan */}
      {executionPlan && executionPlan.length > 0 &&
      <div className="rounded-xl border border-zinc-200 overflow-hidden bg-primary-foreground">
          <button
          onClick={() => setIsPlanOpen(!isPlanOpen)}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors bg-primary-foreground">

            <ListChecks className="w-4 h-4 text-green-500" />
            <span className="text-xs font-semibold text-zinc-700 flex-1">Execution Plan — {executionPlan.length} Images</span>
            {isPlanOpen ? <ChevronDown className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />}
          </button>

          {isPlanOpen &&
        <div className="px-3 pb-3 space-y-1.5 pt-[20px]">
              {executionPlan.map((item) =>
          <div key={item.imageNumber} className="flex items-start gap-2 text-xs">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-primary-foreground">
                    <span className="text-[10px] font-bold text-zinc-600">{item.imageNumber}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-zinc-700">{item.title}</span>
                      <span className="text-[10px] text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded">{item.model}</span>
                    </div>
                    <p className="text-zinc-500 leading-snug">{item.description}</p>
                  </div>
                </div>
          )}
            </div>
        }
        </div>
      }
    </div>);

};

export default ProductAnalysisCard;