
import React, { useState, useCallback } from 'react';
import { 
  Upload, 
  RefreshCw, 
  Download, 
  Image as ImageIcon, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  Scissors,
  Zap
} from 'lucide-react';
import { ProcessingState, Variant } from './types';
import { geminiService } from './services/geminiService';
import { MEESHO_COLORS, BORDER_COLORS } from './constants';
import { loadImage, createVariant, removeWhiteBackgroundClient } from './utils/imageProcessing';

const App: React.FC = () => {
  const [state, setState] = useState<ProcessingState>({
    isUploading: false,
    isGenerating: false,
    error: null,
    originalImage: null,
    productOnlyImage: null,
    variants: [],
  });

  const [variantCount, setVariantCount] = useState<number>(3);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setState(prev => ({ 
        ...prev, 
        originalImage: dataUrl, 
        productOnlyImage: null, 
        variants: [], 
        error: null 
      }));
    };
    reader.readAsDataURL(file);
  };

  const generateVariants = async () => {
    if (!state.originalImage) return;

    setState(prev => ({ ...prev, isGenerating: true, error: null }));

    try {
      let productBase64 = state.productOnlyImage;

      // Step 1: Remove background via Gemini if not already done
      if (!productBase64) {
        const cleanWhiteBg = await geminiService.removeBackground(state.originalImage);
        productBase64 = await removeWhiteBackgroundClient(cleanWhiteBg);
        setState(prev => ({ ...prev, productOnlyImage: productBase64 }));
      }

      // Step 2: Load the product image for canvas operations
      const productImg = await loadImage(productBase64!);

      // Step 3: Generate variants
      const newVariants: Variant[] = [];
      const shuffledColors = [...MEESHO_COLORS].sort(() => Math.random() - 0.5);
      const shuffledBorders = [...BORDER_COLORS].sort(() => Math.random() - 0.5);

      for (let i = 0; i < variantCount; i++) {
        const bgColor = shuffledColors[i % shuffledColors.length];
        const borderColor = shuffledBorders[i % shuffledBorders.length];
        
        const dataUrl = await createVariant(productImg, bgColor, borderColor);
        newVariants.push({
          id: `v-${i}-${Date.now()}`,
          dataUrl,
          bgColor,
          borderColor
        });
      }

      setState(prev => ({ ...prev, variants: newVariants, isGenerating: false }));
    } catch (error: any) {
      console.error(error);
      setState(prev => ({ 
        ...prev, 
        isGenerating: false, 
        error: error.message || "Something went wrong during generation." 
      }));
    }
  };

  const downloadAll = () => {
    state.variants.forEach((v, index) => {
      const link = document.createElement('a');
      link.href = v.dataUrl;
      link.download = `meesho_variant_${index + 1}.jpg`;
      link.click();
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-pink-600 rounded-lg flex items-center justify-center text-white shadow-lg">
              <Zap size={24} fill="white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-pink-600 to-orange-500 bg-clip-text text-transparent">
              Meesho Optimizer Pro
            </h1>
          </div>
          <div className="hidden md:flex items-center gap-4 text-sm font-medium text-slate-500">
            <span className="flex items-center gap-1"><CheckCircle2 size={16} className="text-green-500" /> Catalog Ready</span>
            <span className="flex items-center gap-1"><CheckCircle2 size={16} className="text-green-500" /> Optimized Size</span>
            <span className="flex items-center gap-1"><CheckCircle2 size={16} className="text-green-500" /> High Quality</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-6xl mx-auto w-full px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Panel: Upload & Config */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ImageIcon size={20} className="text-pink-600" /> Upload Product
              </h2>
              
              <div className="relative group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className={`
                  border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all duration-200
                  ${state.originalImage ? 'border-green-300 bg-green-50' : 'border-slate-300 group-hover:border-pink-400 group-hover:bg-pink-50'}
                `}>
                  {state.originalImage ? (
                    <img src={state.originalImage} alt="Original" className="w-full h-48 object-contain rounded-lg shadow-sm mb-4" />
                  ) : (
                    <div className="text-center">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                        <Upload size={24} />
                      </div>
                      <p className="text-sm text-slate-600 font-medium">Click to upload or drag & drop</p>
                      <p className="text-xs text-slate-400 mt-1">Supports PNG, JPG (Max 5MB)</p>
                    </div>
                  )}
                  {state.originalImage && (
                    <p className="text-xs font-semibold text-green-600 uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 size={12} /> Image Loaded
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Layers size={20} className="text-pink-600" /> Optimization Config
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Number of Variants</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 3, 5, 10].map(n => (
                      <button
                        key={n}
                        onClick={() => setVariantCount(n)}
                        className={`py-2 rounded-lg text-sm font-semibold border transition-all ${
                          variantCount === n 
                          ? 'bg-pink-600 text-white border-pink-600 shadow-md ring-2 ring-pink-100' 
                          : 'bg-white text-slate-600 border-slate-200 hover:border-pink-300'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2 rounded-lg">
                    <Scissors size={14} /> <span>Smart Background Removal</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2 rounded-lg">
                    <RefreshCw size={14} /> <span>Perfect 1000x1000 Resolution</span>
                  </div>
                </div>

                <button
                  onClick={generateVariants}
                  disabled={!state.originalImage || state.isGenerating}
                  className={`
                    w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-white shadow-lg transition-all
                    ${!state.originalImage || state.isGenerating 
                      ? 'bg-slate-300 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-pink-600 to-orange-500 hover:scale-[1.02] active:scale-95'}
                  `}
                >
                  {state.isGenerating ? (
                    <>
                      <RefreshCw className="animate-spin" size={20} />
                      Processing AI...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={20} />
                      Generate Variants
                    </>
                  )}
                </button>
              </div>
            </div>

            {state.error && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-3 text-red-700 text-sm">
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <p>{state.error}</p>
              </div>
            )}
          </div>

          {/* Right Panel: Results */}
          <div className="lg:col-span-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <CheckCircle2 size={20} className="text-green-500" /> 
                  Optimized Variants {state.variants.length > 0 && `(${state.variants.length})`}
                </h2>
                {state.variants.length > 0 && (
                  <button
                    onClick={downloadAll}
                    className="text-sm font-bold text-pink-600 hover:text-pink-700 flex items-center gap-1 border border-pink-100 bg-pink-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Download size={16} /> Download All
                  </button>
                )}
              </div>

              {state.variants.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 overflow-y-auto max-h-[70vh] pr-2 custom-scrollbar">
                  {state.variants.map((v, i) => (
                    <div key={v.id} className="group relative bg-slate-50 rounded-2xl p-4 border border-slate-100 hover:border-pink-200 transition-all shadow-sm">
                      <div className="aspect-square relative rounded-xl overflow-hidden shadow-inner bg-white">
                        <img src={v.dataUrl} alt={`Variant ${i+1}`} className="w-full h-full object-cover" />
                        <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a 
                            href={v.dataUrl} 
                            download={`meesho_${i+1}.jpg`}
                            className="bg-white/90 backdrop-blur p-2 rounded-full shadow-lg text-pink-600 hover:bg-pink-600 hover:text-white transition-all"
                          >
                            <Download size={18} />
                          </a>
                        </div>
                        <div className="absolute bottom-2 left-2 flex gap-1">
                          <span className="text-[10px] font-bold bg-white/80 backdrop-blur px-2 py-1 rounded-full text-slate-600 shadow-sm border border-white/50">
                            1000x1000
                          </span>
                          <span className="text-[10px] font-bold bg-white/80 backdrop-blur px-2 py-1 rounded-full text-slate-600 shadow-sm border border-white/50">
                            JPEG
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full border border-slate-200" style={{ backgroundColor: v.bgColor }}></div>
                          <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: v.borderColor }}></div>
                          <span className="text-xs font-medium text-slate-500">Variant #{i + 1}</span>
                        </div>
                        <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                          &lt; 200 KB
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-grow flex flex-col items-center justify-center text-slate-400 py-20 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  {state.isGenerating ? (
                    <div className="text-center">
                      <div className="relative w-20 h-20 mx-auto mb-4">
                        <div className="absolute inset-0 rounded-full border-4 border-slate-200"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-pink-600 border-t-transparent animate-spin"></div>
                        <RefreshCw className="absolute inset-0 m-auto text-pink-600" size={32} />
                      </div>
                      <p className="font-semibold text-slate-600">AI is working its magic...</p>
                      <p className="text-sm">Removing background & generating high-quality variants</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 text-slate-200">
                        <ImageIcon size={32} />
                      </div>
                      <p className="font-semibold">No variants generated yet</p>
                      <p className="text-sm">Upload an image and click generate to see results</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer / Features Bar */}
      <footer className="bg-white border-t border-slate-200 py-6">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex gap-8 text-xs font-semibold text-slate-400 uppercase tracking-widest">
            <div className="flex items-center gap-2"><Scissors size={14} /> Background Remover</div>
            <div className="flex items-center gap-2"><RefreshCw size={14} /> Resizer</div>
            <div className="flex items-center gap-2"><CheckCircle2 size={14} /> Quality Optimizer</div>
          </div>
          <p className="text-sm text-slate-400 font-medium">
            Designed for Meesho Sellers • 2024
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
