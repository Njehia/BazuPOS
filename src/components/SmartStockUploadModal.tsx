import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
  ArrowRight,
  Info,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ParsedStockItem, Product, StoreConfig, User } from '../types';
import { LocalDb } from '../lib/storage';

interface SmartStockUploadModalProps {
  isOpen?: boolean;
  currentUser?: User;
  storeConfig?: StoreConfig;
  onClose: () => void;
  onStockApplied?: () => void;
  onRestocked?: () => void;
}

export const SmartStockUploadModal: React.FC<SmartStockUploadModalProps> = ({
  isOpen = true,
  currentUser,
  storeConfig,
  onClose,
  onStockApplied,
  onRestocked,
}) => {
  if (isOpen === false) return null;

  const [step, setStep] = useState<'UPLOAD' | 'REVIEW' | 'SUCCESS'>('UPLOAD');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [parsedItems, setParsedItems] = useState<ParsedStockItem[]>([]);
  const [sourceFileName, setSourceFileName] = useState<string>('');
  const [sourceType, setSourceType] = useState<'PICTURE' | 'EXCEL' | 'PDF'>('PICTURE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successReport, setSuccessReport] = useState<{ updated: number; created: number; totalUnits: number } | null>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const existingProducts = useMemo(() => LocalDb.getProducts(), []);
  const existingCategories = useMemo(() => LocalDb.getCategories(), []);

  // Helper to match extracted text against current inventory
  const matchWithInventory = (rawName: string, barcode?: string): { product?: Product; confidence: 'HIGH' | 'MEDIUM' | 'LOW' } => {
    const cleanRaw = rawName.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();

    // 1. Exact barcode match
    if (barcode && barcode.trim()) {
      const matchBarcode = existingProducts.find((p) => p.barcode === barcode.trim());
      if (matchBarcode) return { product: matchBarcode, confidence: 'HIGH' };
    }

    // 2. Exact or very close name match
    const exact = existingProducts.find(
      (p) => p.name.toLowerCase().trim() === cleanRaw || p.name.toLowerCase().trim() === rawName.toLowerCase().trim()
    );
    if (exact) return { product: exact, confidence: 'HIGH' };

    // 3. Keyword / Substring match (e.g., "Tusker Lager 500ml" matches "Tusker Lager")
    const words = cleanRaw.split(/\s+/).filter((w) => w.length > 2);
    let bestMatch: Product | null = null;
    let highestScore = 0;

    for (const p of existingProducts) {
      const pClean = p.name.toLowerCase();
      let score = 0;
      for (const w of words) {
        if (pClean.includes(w)) {
          score += 1;
        }
      }
      if (score > highestScore && score >= 2) {
        highestScore = score;
        bestMatch = p;
      }
    }

    if (bestMatch) {
      return { product: bestMatch, confidence: highestScore >= 3 ? 'HIGH' : 'MEDIUM' };
    }

    return { product: undefined, confidence: 'LOW' };
  };

  // Convert File to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Handle Excel / CSV File Parsing locally via XLSX
  const processExcelFile = async (file: File) => {
    setIsProcessing(true);
    setProcessingStatus('Reading spreadsheet columns and stock records...');
    setErrorMessage(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (rows.length === 0) {
        throw new Error('Spreadsheet has no data rows.');
      }

      setProcessingStatus('Matching spreadsheet items with liquor inventory...');

      const extracted: ParsedStockItem[] = [];

      rows.forEach((row, index) => {
        // Look for column names flexibly (Product, Item, Name, Description, etc.)
        const keys = Object.keys(row);
        const nameKey = keys.find((k) => /product|item|description|name|title|beer|liquor/i.test(k)) || keys[0];
        const qtyKey = keys.find((k) => /qty|quantity|units|count|received|restock|crates/i.test(k));
        const costKey = keys.find((k) => /cost|buying|unit cost|wholesale|bp/i.test(k));
        const priceKey = keys.find((k) => /selling|price|retail|sp|rate/i.test(k));
        const catKey = keys.find((k) => /category|type|group/i.test(k));
        const barKey = keys.find((k) => /barcode|code|sku/i.test(k));

        const rawName = String(row[nameKey] || '').trim();
        if (!rawName || rawName.length < 2) return;

        let quantity = 1;
        if (qtyKey && row[qtyKey]) {
          const parsedQty = parseFloat(String(row[qtyKey]).replace(/[^0-9.]/g, ''));
          if (!isNaN(parsedQty) && parsedQty > 0) {
            quantity = Math.round(parsedQty);
          }
        }

        const costPrice = costKey && row[costKey] ? parseFloat(String(row[costKey]).replace(/[^0-9.]/g, '')) : undefined;
        const sellPrice = priceKey && row[priceKey] ? parseFloat(String(row[priceKey]).replace(/[^0-9.]/g, '')) : undefined;
        const barcode = barKey && row[barKey] ? String(row[barKey]).trim() : undefined;
        const category = catKey && row[catKey] ? String(row[catKey]).trim() : 'beer';

        const match = matchWithInventory(rawName, barcode);

        extracted.push({
          id: `item-${index}-${Date.now()}`,
          name: match.product ? match.product.name : rawName,
          category: match.product ? match.product.category : category,
          quantity,
          unit: match.product ? match.product.unit : 'Bottle',
          cost_price: !isNaN(costPrice as number) ? costPrice : undefined,
          selling_price: !isNaN(sellPrice as number) ? sellPrice : match.product?.price,
          barcode: barcode || match.product?.barcode,
          matched_product_id: match.product?.id,
          matched_product_name: match.product?.name,
          current_stock: match.product ? match.product.stock_qty : 0,
          new_stock_after: match.product ? match.product.stock_qty + quantity : quantity,
          is_new_product: !match.product,
          status: 'CONFIRMED',
          confidence: match.confidence,
        });
      });

      if (extracted.length === 0) {
        throw new Error('Could not identify any product rows in this file. Ensure column names like "Item" and "Quantity" exist.');
      }

      setSourceFileName(file.name);
      setSourceType('EXCEL');
      setParsedItems(extracted);
      setStep('REVIEW');
    } catch (err: any) {
      setErrorMessage(`Failed to read spreadsheet: ${err.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Photo or PDF file parsing via Gemini Multimodal API
  const processImageOrPdfFile = async (file: File, type: 'PICTURE' | 'PDF') => {
    setIsProcessing(true);
    setProcessingStatus(
      type === 'PICTURE'
        ? 'Analyzing photo of invoice/receipt with Gemini AI...'
        : 'Reading PDF delivery invoice with Gemini AI...'
    );
    setErrorMessage(null);

    try {
      const base64 = await fileToBase64(file);

      const response = await fetch('/api/parse-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64: base64,
          mimeType: file.type || (type === 'PDF' ? 'application/pdf' : 'image/jpeg'),
          filename: file.name,
          fileType: type,
        }),
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Gemini stock extraction failed.');
      }

      const extractedItemsRaw = resData.data?.items || [];
      if (!Array.isArray(extractedItemsRaw) || extractedItemsRaw.length === 0) {
        throw new Error('No recognizable drinks or stock items found in the uploaded image. Please ensure the receipt is clear and readable.');
      }

      setProcessingStatus('Matching extracted items with local store inventory...');

      const matchedResults: ParsedStockItem[] = extractedItemsRaw.map((raw: any, idx: number) => {
        const rawName = String(raw.name || 'Unnamed Drink').trim();
        const rawQty = Math.max(1, Math.round(Number(raw.quantity) || 1));
        const rawCost = typeof raw.cost_price === 'number' && raw.cost_price > 0 ? raw.cost_price : undefined;
        const rawSell = typeof raw.selling_price === 'number' && raw.selling_price > 0 ? raw.selling_price : undefined;

        const match = matchWithInventory(rawName, raw.barcode);

        return {
          id: `parsed-${idx}-${Date.now()}`,
          name: match.product ? match.product.name : rawName,
          category: match.product ? match.product.category : raw.category || 'beer',
          quantity: rawQty,
          unit: raw.unit || (match.product ? match.product.unit : 'Bottle'),
          cost_price: rawCost,
          selling_price: rawSell || match.product?.price,
          barcode: raw.barcode || match.product?.barcode,
          matched_product_id: match.product?.id,
          matched_product_name: match.product?.name,
          current_stock: match.product ? match.product.stock_qty : 0,
          new_stock_after: match.product ? match.product.stock_qty + rawQty : rawQty,
          is_new_product: !match.product,
          status: 'CONFIRMED',
          confidence: match.confidence || (raw.confidence as any) || 'HIGH',
        };
      });

      setSourceFileName(file.name);
      setSourceType(type);
      setParsedItems(matchedResults);
      setStep('REVIEW');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        err.message || 'Error processing document. Ensure GEMINI_API_KEY is configured and the image is clear.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Dispatch File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || lowerName.endsWith('.csv')) {
      processExcelFile(file);
    } else if (lowerName.endsWith('.pdf') || file.type === 'application/pdf') {
      processImageOrPdfFile(file, 'PDF');
    } else if (file.type.startsWith('image/')) {
      processImageOrPdfFile(file, 'PICTURE');
    } else {
      setErrorMessage('Unsupported file format. Please upload an image (JPG/PNG), Excel (.xlsx/.csv), or PDF.');
    }
  };

  // Drag and Drop support
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const lowerName = file.name.toLowerCase();
      if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || lowerName.endsWith('.csv')) {
        processExcelFile(file);
      } else if (lowerName.endsWith('.pdf') || file.type === 'application/pdf') {
        processImageOrPdfFile(file, 'PDF');
      } else if (file.type.startsWith('image/')) {
        processImageOrPdfFile(file, 'PICTURE');
      } else {
        setErrorMessage('Unsupported file format. Please upload an image (JPG/PNG), Excel (.xlsx/.csv), or PDF.');
      }
    }
  };

  // Item modifications in review table
  const handleQuantityChange = (id: string, newQty: number) => {
    setParsedItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const qty = Math.max(1, newQty);
          return {
            ...item,
            quantity: qty,
            new_stock_after: (item.current_stock || 0) + qty,
          };
        }
        return item;
      })
    );
  };

  const handlePriceChange = (id: string, newPrice: number) => {
    setParsedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selling_price: newPrice } : item))
    );
  };

  const handleToggleItemStatus = (id: string) => {
    setParsedItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: item.status === 'CONFIRMED' ? 'IGNORED' : 'CONFIRMED' }
          : item
      )
    );
  };

  const handleRemoveItem = (id: string) => {
    setParsedItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Commit & Apply to Inventory
  const handleApplyRestock = () => {
    const validItems = parsedItems.filter((i) => i.status === 'CONFIRMED');
    if (validItems.length === 0) {
      setErrorMessage('No items selected for restock.');
      return;
    }

    const res = LocalDb.applyStockRestock(validItems, currentUser.name);
    if (!res.success) {
      setErrorMessage(res.error || 'Failed to update stock.');
      return;
    }

    const totalUnits = validItems.reduce((sum, i) => sum + i.quantity, 0);
    setSuccessReport({
      updated: res.updatedCount,
      created: res.createdCount,
      totalUnits,
    });
    setStep('SUCCESS');
    if (onStockApplied) onStockApplied();
    if (onRestocked) onRestocked();
  };

  const confirmedItems = parsedItems.filter((i) => i.status === 'CONFIRMED');
  const totalUnitsToRestock = confirmedItems.reduce((sum, i) => sum + i.quantity, 0);
  const matchedCount = confirmedItems.filter((i) => !i.is_new_product).length;
  const newProductsCount = confirmedItems.filter((i) => i.is_new_product).length;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="px-5 py-4 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>Smart Stock Upload</span>
                <span className="text-[10px] uppercase tracking-wider bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-full">
                  AI + OCR + Excel
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Upload a picture of an invoice, receipt, shelf, or upload an Excel/PDF file to automatically restock
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hidden inputs */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*,application/pdf,.xlsx,.xls,.csv"
          className="hidden"
        />
        <input
          type="file"
          ref={cameraInputRef}
          onChange={handleFileChange}
          accept="image/*"
          capture="environment"
          className="hidden"
        />

        {/* Error Notification */}
        {errorMessage && (
          <div className="mx-5 mt-3 px-3 py-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-lg text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
        )}

        {/* Modal Content */}
        <div className="p-5 flex-1 overflow-y-auto">
          {/* STEP 1: UPLOAD SCREEN */}
          {step === 'UPLOAD' && (
            <div className="space-y-6 max-w-2xl mx-auto py-2">
              {isProcessing ? (
                <div className="text-center py-16 space-y-4">
                  <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                    <Loader2 className="w-12 h-12 text-amber-500 animate-spin" />
                    <Sparkles className="w-5 h-5 text-amber-500 absolute" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    Processing Document...
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto animate-pulse">
                    {processingStatus || 'Extracting products, quantities, and prices automatically...'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Drag and Drop Zone */}
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-500 dark:hover:border-amber-400 rounded-2xl p-8 text-center transition-all cursor-pointer bg-slate-50/50 dark:bg-slate-800/30 group"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform shadow-xs">
                      <Upload className="w-7 h-7" />
                    </div>

                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Drag & Drop or Click to Upload Stock File
                    </h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
                      Supports supplier invoices, delivery notes, price sheets, or receipts
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                        Photos (JPG, PNG)
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                        Excel (.xlsx, .csv)
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        <FileText className="w-3.5 h-3.5 text-rose-500" />
                        PDF Invoices
                      </span>
                    </div>
                  </div>

                  {/* Alternative Quick Action Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Snap Picture Button */}
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-500 dark:hover:border-amber-400 bg-white dark:bg-slate-800/80 flex items-center gap-3 transition-all cursor-pointer group text-left shadow-xs"
                    >
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Camera className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          Snap Photo with Camera
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Take a photo of paper receipt or delivery sheet
                        </p>
                      </div>
                    </button>

                    {/* Upload Excel / File Button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-500 dark:hover:border-amber-400 bg-white dark:bg-slate-800/80 flex items-center gap-3 transition-all cursor-pointer group text-left shadow-xs"
                    >
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          Choose Excel or PDF
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Import distributor spreadsheet or digital invoice
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* Information Callout */}
                  <div className="bg-slate-100/80 dark:bg-slate-800/40 rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-700/80 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                    <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block mb-0.5">
                        Automatic Matching & Safety Review
                      </span>
                      <span>
                        The system will automatically match detected brand names (e.g., Tusker, Gilbeys, Black Label) against your current inventory. You'll be able to review, adjust quantities, and confirm before any stock is changed.
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 2: REVIEW & VERIFICATION SCREEN */}
          {step === 'REVIEW' && (
            <div className="space-y-4">
              {/* Summary Stats Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Source Document
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white truncate max-w-xs block">
                    {sourceFileName || 'Uploaded Restock Document'} ({sourceType})
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-center px-3 border-r border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] uppercase text-slate-400 block font-bold">
                      Matched
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {matchedCount} Items
                    </span>
                  </div>

                  <div className="text-center px-3 border-r border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] uppercase text-slate-400 block font-bold">
                      New Products
                    </span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      {newProductsCount} Items
                    </span>
                  </div>

                  <div className="text-right pl-2">
                    <span className="text-[10px] uppercase text-slate-400 block font-bold">
                      Total Units to Add
                    </span>
                    <span className="text-base font-black text-slate-900 dark:text-white font-mono">
                      +{totalUnitsToRestock} Units
                    </span>
                  </div>
                </div>
              </div>

              {/* Review Table */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <div className="max-h-[50vh] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 uppercase tracking-wider sticky top-0 font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Product Name</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3 text-center">Add Qty</th>
                        <th className="py-2.5 px-3 text-center">Stock Change</th>
                        <th className="py-2.5 px-3 text-right">Selling Price</th>
                        <th className="py-2.5 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {parsedItems.map((item) => {
                        const isIgnored = item.status === 'IGNORED';

                        return (
                          <tr
                            key={item.id}
                            className={`transition-colors ${
                              isIgnored
                                ? 'opacity-40 bg-slate-100/50 dark:bg-slate-900/50'
                                : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            <td className="py-2.5 px-3 shrink-0">
                              {item.is_new_product ? (
                                <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                                  New Product
                                </span>
                              ) : (
                                <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                                  Matched
                                </span>
                              )}
                            </td>

                            <td className="py-2.5 px-3">
                              <p className="font-bold text-slate-900 dark:text-white uppercase leading-snug">
                                {item.name}
                              </p>
                              {item.matched_product_name && item.matched_product_name !== item.name && (
                                <p className="text-[10px] text-slate-400">
                                  Matched to: {item.matched_product_name}
                                </p>
                              )}
                            </td>

                            <td className="py-2.5 px-3">
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">
                                {item.category}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="number"
                                min="1"
                                disabled={isIgnored}
                                value={item.quantity}
                                onChange={(e) =>
                                  handleQuantityChange(item.id, parseInt(e.target.value) || 1)
                                }
                                className="w-16 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-center font-bold text-xs text-slate-900 dark:text-white focus:ring-1 focus:ring-amber-500"
                              />
                            </td>

                            <td className="py-2.5 px-3 text-center font-mono text-[11px]">
                              <span className="text-slate-400">{item.current_stock || 0}</span>
                              <span className="text-slate-400 mx-1">→</span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                {item.new_stock_after}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1 font-mono">
                                <span className="text-[10px] text-slate-400">KES</span>
                                <input
                                  type="number"
                                  min="0"
                                  disabled={isIgnored}
                                  value={item.selling_price || ''}
                                  onChange={(e) =>
                                    handlePriceChange(item.id, parseFloat(e.target.value) || 0)
                                  }
                                  className="w-20 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-right font-bold text-xs text-slate-900 dark:text-white focus:ring-1 focus:ring-amber-500"
                                />
                              </div>
                            </td>

                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleToggleItemStatus(item.id)}
                                  className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                                    isIgnored
                                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                      : 'bg-rose-100 hover:bg-rose-200 dark:bg-rose-950 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300'
                                  }`}
                                  title={isIgnored ? 'Include item in restock' : 'Ignore this item'}
                                >
                                  {isIgnored ? 'Include' : 'Skip'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(item.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                                  title="Delete item row"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Review Actions Bar */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep('UPLOAD')}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Upload Another File
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleApplyRestock}
                    disabled={confirmedItems.length === 0}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Apply Restock (+{totalUnitsToRestock} Units)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS CONFIRMATION SCREEN */}
          {step === 'SUCCESS' && successReport && (
            <div className="text-center py-12 max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Restock Successfully Applied!
              </h3>

              <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Existing Products Updated:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {successReport.updated}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">New Products Added to Catalog:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {successReport.created}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 font-bold">
                  <span className="text-slate-700 dark:text-slate-200">Total Units Added to Stock:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                    +{successReport.totalUnits} Units
                  </span>
                </div>
              </div>

              <div className="pt-3 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setParsedItems([]);
                    setStep('UPLOAD');
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Upload More Stock
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-xs transition-colors cursor-pointer"
                >
                  Return to Inventory
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Supports Photo, Excel spreadsheet, or PDF delivery invoices</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
