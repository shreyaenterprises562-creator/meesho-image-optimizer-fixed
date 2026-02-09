
export interface Variant {
  id: string;
  dataUrl: string;
  bgColor: string;
  borderColor: string;
}

export interface ProcessingState {
  isUploading: boolean;
  isGenerating: boolean;
  error: string | null;
  originalImage: string | null;
  productOnlyImage: string | null;
  variants: Variant[];
}
