import { useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  FileSpreadsheet, CheckCircle2, Loader2, Eye,
  ImageIcon, AlertTriangle, ChevronRight, Upload, Link2, X, FileText,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  parseExcelToMarkdown, extractImagesFromExcel,
  parseCsvWithImages, fetchImageAsBase64, CsvParseResult,
} from '@/lib/excelParser';

type FileMode = 'excel' | 'csv' | null;

const Talent = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File state ───────────────────────────────────────────────────
  const [file, setFile] = useState<File | null>(null);
  const [fileMode, setFileMode] = useState<FileMode>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // ── Excel-specific ───────────────────────────────────────────────
  const [embeddedImageCount, setEmbeddedImageCount] = useState(0);

  // ── CSV-specific ─────────────────────────────────────────────────
  const [csvResult, setCsvResult] = useState<CsvParseResult | null>(null);
  const [csvPreviews, setCsvPreviews] = useState<string[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [isFetchingPreviews, setIsFetchingPreviews] = useState(false);

  // ── Process uploaded file ────────────────────────────────────────
  const processFile = useCallback(async (f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase() || '';
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      toast.error('Please upload an Excel (.xlsx/.xls) or CSV (.csv) file.');
      return;
    }

    setFile(f);
    setFileMode(null);
    setCsvResult(null);
    setCsvPreviews([]);
    setSelectedIdx(0);
    setEmbeddedImageCount(0);

    try {
      if (ext === 'csv') {
        // CSV mode — look for image URL column
        setFileMode('csv');
        const result = await parseCsvWithImages(f);
        setCsvResult(result);

        if (result.imageUrls.length === 0) {
          toast.warning('No image URL column found. Add a column with "Image URL" or "Photo" in the header.', { duration: 6000 });
        } else {
          toast.success(`Found ${result.imageUrls.length} image URL${result.imageUrls.length > 1 ? 's' : ''} across ${result.totalRows} product row${result.totalRows > 1 ? 's' : ''}.`);
          setIsFetchingPreviews(true);
          const previews: string[] = [];
          for (const url of result.imageUrls.slice(0, 5)) {
            try { previews.push(await fetchImageAsBase64(url)); }
            catch { previews.push(''); }
          }
          setCsvPreviews(previews);
          setIsFetchingPreviews(false);
        }
      } else {
        // Excel mode — try embedded images first, fallback to URL columns
        setFileMode('excel');

        // Quick peek: try to extract embedded images
        const images = await extractImagesFromExcel(f);
        setEmbeddedImageCount(images.length);

        if (images.length === 0) {
          // Might still have URL columns — try CSV parser on the Excel file
          try {
            const result = await parseCsvWithImages(f);
            if (result.imageUrls.length > 0) {
              setFileMode('csv');
              setCsvResult(result);
              toast.success(`No embedded images found, but detected ${result.imageUrls.length} image URL${result.imageUrls.length > 1 ? 's' : ''} in columns.`);
              setIsFetchingPreviews(true);
              const previews: string[] = [];
              for (const url of result.imageUrls.slice(0, 5)) {
                try { previews.push(await fetchImageAsBase64(url)); }
                catch { previews.push(''); }
              }
              setCsvPreviews(previews);
              setIsFetchingPreviews(false);
              return;
            }
          } catch { /* ignore */ }
          toast.warning('No embedded images or image URLs found. Make sure your file has product images.', { duration: 6000 });
        } else {
          toast.success(`Excel loaded — ${images.length} embedded image${images.length > 1 ? 's' : ''} detected.`);
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to parse file.');
      setFile(null);
    }
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
    e.target.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) processFile(f);
  };

  const clearFile = () => {
    setFile(null);
    setFileMode(null);
    setCsvResult(null);
    setCsvPreviews([]);
    setSelectedIdx(0);
    setEmbeddedImageCount(0);
  };

  // ── Run analysis ─────────────────────────────────────────────────
  const handleRun = async () => {
    if (!file || !fileMode) return;
    setIsProcessing(true);

    try {
      const markdownSpec = await parseExcelToMarkdown(file);
      if (!markdownSpec.trim()) {
        toast.error('No product specifications found in the file.'); return;
      }

      let imageBase64: string;

      if (fileMode === 'excel') {
        const images = await extractImagesFromExcel(file);
        if (!images.length) {
          toast.error('No embedded product images found. Please embed images directly into the Excel cells, or use a CSV with image URLs.', { duration: 7000 });
          return;
        }
        imageBase64 = images[0];
      } else {
        // CSV mode — fetch selected URL
        if (!csvResult?.imageUrls.length) {
          toast.error('No image URLs found in the file.'); return;
        }
        try {
          imageBase64 = await fetchImageAsBase64(csvResult.imageUrls[selectedIdx]);
        } catch {
          toast.error(`Could not fetch image at row ${selectedIdx + 1}. Check the URL is publicly accessible.`);
          return;
        }
      }

      localStorage.setItem('trueVisionSpec', markdownSpec);
      localStorage.setItem('trueVisionImage', imageBase64);
      localStorage.setItem('trueVisionMode', 'comparison');
      toast.success('Compiled! Opening TrueVision workspace…');
      navigate('/canvas?newProject=true');
    } catch (err: any) {
      toast.error(err.message || 'Failed to process file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const canRun = file && fileMode &&
    (fileMode === 'excel' ? embeddedImageCount > 0 : (csvResult?.imageUrls.length ?? 0) > 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col">
      <div className="flex-1 flex flex-col items-center max-w-3xl mx-auto w-full px-6 pt-24 pb-20">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-violet-50 text-violet-700 text-sm font-medium px-4 py-1.5 rounded-full mb-5 border border-violet-100">
            <Eye className="w-4 h-4" /> TrueVision Spec Check
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-slate-900 mb-3">
            Hey, {user?.user_metadata?.full_name?.split(' ')[0] || 'there'}!
          </h1>
          <p className="text-lg text-slate-500 max-w-md mx-auto">
            Upload your specification file and TrueVision will check every product detail and flag mismatches.
          </p>
        </div>

        {/* ── Main card ─────────────────────────────────────────── */}
        <Card className="w-full p-8 rounded-3xl border border-slate-200 shadow-sm bg-white">

          {/* Supported formats chips */}
          <div className="flex items-center gap-2 mb-6">
            <span className="text-xs text-slate-400 font-medium">Supports:</span>
            <Badge variant="outline" className="gap-1 text-xs text-emerald-600 border-emerald-200 bg-emerald-50">
              <FileSpreadsheet className="w-3 h-3" /> Excel (.xlsx) — embedded images
            </Badge>
            <Badge variant="outline" className="gap-1 text-xs text-violet-600 border-violet-200 bg-violet-50">
              <FileText className="w-3 h-3" /> CSV / Excel — image URLs
            </Badge>
          </div>

          {/* Drop zone */}
          <div
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-4 cursor-pointer transition-all mb-6 ${
              isDragging
                ? 'border-violet-400 bg-violet-50'
                : file
                  ? fileMode === 'excel'
                    ? 'border-emerald-400 bg-emerald-50/30'
                    : 'border-violet-400 bg-violet-50/30'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            {!file ? (
              <>
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-slate-400" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-slate-700">Drop your spec file here</p>
                  <p className="text-sm text-slate-400 mt-1">or click to browse — .xlsx, .xls, .csv</p>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-4 w-full">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  fileMode === 'excel' ? 'bg-emerald-50 text-emerald-600' : 'bg-violet-50 text-violet-600'
                }`}>
                  {fileMode === 'excel'
                    ? <FileSpreadsheet className="w-6 h-6" />
                    : <FileText className="w-6 h-6" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate text-sm">{file.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {fileMode === 'excel'
                      ? `${embeddedImageCount} embedded image${embeddedImageCount !== 1 ? 's' : ''} detected`
                      : `${csvResult?.totalRows ?? 0} products · ${csvResult?.imageUrls.length ?? 0} image URLs`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs border-0 ${
                    fileMode === 'excel' ? 'bg-emerald-100 text-emerald-700' : 'bg-violet-100 text-violet-700'
                  }`}>
                    {fileMode === 'excel' ? 'Excel Mode' : 'CSV Mode'}
                  </Badge>
                  <button
                    onClick={(e) => { e.stopPropagation(); clearFile(); }}
                    className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".xlsx,.xls,.csv"
              onChange={onFileChange}
            />
          </div>

          {/* ── CSV image row selector ──────────────────────────── */}
          {fileMode === 'csv' && csvResult && csvResult.imageUrls.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
                Select which product image to analyze
              </p>
              <div className="flex gap-2.5 overflow-x-auto pb-2">
                {csvResult.imageUrls.map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedIdx(idx)}
                    className={`relative flex-shrink-0 w-18 h-18 w-[72px] h-[72px] rounded-xl border-2 overflow-hidden transition-all ${
                      selectedIdx === idx
                        ? 'border-violet-500 shadow-lg shadow-violet-100 scale-105'
                        : 'border-slate-200 hover:border-violet-300'
                    }`}
                  >
                    {isFetchingPreviews && idx < 5 && !csvPreviews[idx] ? (
                      <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                      </div>
                    ) : csvPreviews[idx] ? (
                      <img src={csvPreviews[idx]} alt={`Row ${idx + 1}`} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                        <ImageIcon className="w-4 h-4 text-slate-300" />
                      </div>
                    )}
                    <div className={`absolute bottom-0 inset-x-0 text-[9px] font-bold text-center py-0.5 ${
                      selectedIdx === idx ? 'bg-violet-500 text-white' : 'bg-black/40 text-white'
                    }`}>
                      Row {idx + 1}
                    </div>
                    {selectedIdx === idx && (
                      <div className="absolute top-1 right-1 w-3.5 h-3.5 bg-violet-500 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-2 h-2 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <div className="mt-2.5 bg-slate-50 rounded-xl px-3 py-2 flex items-center gap-2">
                <Link2 className="w-3 h-3 text-slate-400 flex-shrink-0" />
                <span className="text-xs text-slate-400 truncate">{csvResult.imageUrls[selectedIdx]}</span>
              </div>
            </div>
          )}

          {/* ── Inline warnings ─────────────────────────────────── */}
          {file && fileMode === 'excel' && embeddedImageCount === 0 && !csvResult && (
            <div className="flex gap-2.5 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-6">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 leading-relaxed">
                No embedded images or image URL columns found. In Excel, embed images via <strong>Insert → Picture → Place in Cell</strong>, or use a CSV file with an Image URL column.
              </p>
            </div>
          )}

          {file && fileMode === 'csv' && csvResult && csvResult.imageUrls.length === 0 && (
            <div className="flex gap-2.5 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-6">
              <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 leading-relaxed">
                No image URL column detected. Add a column whose header contains <strong>Image</strong>, <strong>Photo</strong>, or <strong>URL</strong> with product image links.
              </p>
            </div>
          )}

          {/* ── Run button ──────────────────────────────────────── */}
          <Button
            onClick={handleRun}
            disabled={!canRun || isProcessing}
            className={`w-full h-12 rounded-xl text-white font-medium gap-2 disabled:opacity-50 transition-all ${
              fileMode === 'csv'
                ? 'bg-violet-600 hover:bg-violet-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {isProcessing ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Analyzing…</>
            ) : (
              <><Eye className="w-4 h-4" />Run TrueVision Check<ChevronRight className="w-4 h-4 ml-auto" /></>
            )}
          </Button>
        </Card>

        {/* ── CSV format hint ─────────────────────────────────── */}
        <div className="w-full mt-5 p-5 rounded-2xl border border-slate-100 bg-slate-50">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">CSV with image URLs — expected format</p>
          <div className="overflow-x-auto">
            <table className="text-xs w-full">
              <thead>
                <tr>
                  {['Product', 'Color', 'Material', 'Image URL ✦'].map(h => (
                    <th key={h} className={`px-2.5 py-1.5 text-left font-semibold rounded border border-slate-100 bg-white ${h.includes('✦') ? 'text-violet-600' : 'text-slate-500'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Aura Jacket', 'Midnight Blue', 'Cotton', 'https://example.com/jacket.jpg'],
                  ['Aura Cap', 'White', 'Wool', 'https://example.com/cap.jpg'],
                ].map((row, i) => (
                  <tr key={i}>
                    {row.map((v, j) => (
                      <td key={j} className={`px-2.5 py-1.5 border border-slate-100 ${j === 3 ? 'text-violet-400' : 'text-slate-400'}`}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Talent;
