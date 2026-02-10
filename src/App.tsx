import React, { useState } from "react";
import {
  Upload,
  RefreshCw,
  Download,
  Image as ImageIcon,
  Layers,
  CheckCircle2,
  AlertCircle,
  Scissors,
  Zap,
} from "lucide-react";

import { ProcessingState, Variant } from "./types";
import { geminiService } from "./services/geminiService";
import { MEESHO_COLORS, BORDER_COLORS } from "./constants";
import {
  loadImage,
  createVariant,
  removeWhiteBackgroundClient,
} from "./utils/imageProcessing";

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

  // ✅ Debug: Check API Key in console
  console.log("VITE_API_KEY:", import.meta.env.VITE_API_KEY);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setState((prev) => ({
        ...prev,
        originalImage: dataUrl,
        productOnlyImage: null,
        variants: [],
        error: null,
      }));
    };
    reader.readAsDataURL(file);
  };

  const generateVariants = async () => {
    if (!state.originalImage) return;

    // ✅ API Key Missing Check
    if (!import.meta.env.VITE_API_KEY) {
      setState((prev) => ({
        ...prev,
        error:
          "❌ Gemini API Key missing. Please add VITE_API_KEY in Vercel Environment Variables and Redeploy.",
      }));
      return;
    }

    setState((prev) => ({ ...prev, isGenerating: true, error: null }));

    try {
      let productBase64 = state.productOnlyImage;

      // Step 1: Remove background via Gemini
      if (!productBase64) {
        const cleanWhiteBg = await geminiService.removeBackground(
          state.originalImage
        );

        productBase64 = await removeWhiteBackgroundClient(cleanWhiteBg);

        setState((prev) => ({
          ...prev,
          productOnlyImage: productBase64,
        }));
      }

      // Step 2: Load product image
      const productImg = await loadImage(productBase64!);

      // Step 3: Generate variants
      const newVariants: Variant[] = [];
      const shuffledColors = [...MEESHO_COLORS].sort(
        () => Math.random() - 0.5
      );
      const shuffledBorders = [...BORDER_COLORS].sort(
        () => Math.random() - 0.5
      );

      for (let i = 0; i < variantCount; i++) {
        const bgColor = shuffledColors[i % shuffledColors.length];
        const borderColor = shuffledBorders[i % shuffledBorders.length];

        const dataUrl = await createVariant(productImg, bgColor, borderColor);

        newVariants.push({
          id: `v-${i}-${Date.now()}`,
          dataUrl,
          bgColor,
          borderColor,
        });
      }

      setState((prev) => ({
        ...prev,
        variants: newVariants,
        isGenerating: false,
      }));
    } catch (err: any) {
      console.error("Generation error:", err);

      setState((prev) => ({
        ...prev,
        isGenerating: false,
        error: err.message || "Something went wrong.",
      }));
    }
  };

  const downloadAll = () => {
    state.variants.forEach((v, index) => {
      const link = document.createElement("a");
      link.href = v.dataUrl;
      link.download = `meesho_variant_${index + 1}.jpg`;
      link.click();
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-pink-600 rounded-lg flex items-center justify-center text-white shadow-lg">
              <Zap size={24} fill="white" />
            </div>
            <h1 className="text-xl font-bold text-pink-600">
              Meesho Optimizer Pro
            </h1>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-grow max-w-5xl mx-auto w-full px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload */}
          <div className="bg-white p-6 rounded-2xl shadow border">
            <h2 className="font-bold mb-4 flex items-center gap-2">
              <ImageIcon size={18} /> Upload Product
            </h2>

            <input type="file" accept="image/*" onChange={handleFileUpload} />

            {state.originalImage && (
              <img
                src={state.originalImage}
                className="mt-4 w-full h-64 object-contain border rounded-xl"
              />
            )}

            <div className="mt-6">
              <button
                onClick={generateVariants}
                disabled={state.isGenerating}
                className="w-full py-3 rounded-xl bg-pink-600 text-white font-bold flex items-center justify-center gap-2"
              >
                {state.isGenerating ? (
                  <>
                    <RefreshCw className="animate-spin" size={18} />
                    Processing...
                  </>
                ) : (
                  <>
                    <RefreshCw size={18} />
                    Generate Variants
                  </>
                )}
              </button>
            </div>

            {state.error && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-xl flex gap-2">
                <AlertCircle size={18} />
                {state.error}
              </div>
            )}
          </div>

          {/* Results */}
          <div className="bg-white p-6 rounded-2xl shadow border">
            <h2 className="font-bold mb-4 flex items-center gap-2">
              <Layers size={18} /> Variants ({state.variants.length})
            </h2>

            {state.variants.length > 0 && (
              <button
                onClick={downloadAll}
                className="mb-4 px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2"
              >
                <Download size={16} /> Download All
              </button>
            )}

            <div className="grid grid-cols-2 gap-4">
              {state.variants.map((v) => (
                <img
                  key={v.id}
                  src={v.dataUrl}
                  className="w-full aspect-square object-cover rounded-xl border"
                />
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 py-6">
        Designed for Meesho Sellers • 2024
      </footer>
    </div>
  );
};

export default App;
