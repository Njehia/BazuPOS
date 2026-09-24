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
  Printer,
  Tag,
  ShieldCheck,
  CheckCheck,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ParsedStockItem, Product, StoreConfig, User } from '../types';
import { LocalDb } from '../lib/storage';

interface RestockSuccessReport {
  updated: number;
  created: number;
  totalUnits: number;
  totalValuationAdded: number;
  appliedItems: Array<{
    name: string;
    category: string;
    quantityAdded: number;
    previousStock: number;
    newStock: number;
    sellingPrice: number;
    costPrice?: number;
    isNewProduct: boolean;
  }>;
  processedAt: string;
  processedBy: string;
}

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
  const [successReport, setSuccessReport] = useState<RestockSuccessReport | null>(null);

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

  const STOP_WORDS = useMemo(
    () =>
      new Set([
        'bottle', 'bottles', 'can', 'cans', 'crate', 'crates', 'pack', 'packs', 'box', 'boxes',
        'beer', 'lager', 'spirit', 'spirits', 'liquor', 'drink', 'drinks', 'case', 'cases',
        'carton', 'cartons', '500ml', '750ml', '330ml', '350ml', '1000ml', '1l', '250ml',
        'kes', 'shs', 'pcs', 'unit', 'units', 'the', 'and', 'with', 'for'
      ]),
    []
  );

  // Helper to match extracted text against current inventory
  const matchWithInventory = (rawName: string, barcode?: string): { product?: Product; confidence: 'HIGH' | 'MEDIUM' | 'LOW' } => {
    const cleanRaw = rawName.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();

    // 1. Exact barcode match
    if (barcode && barcode.trim()) {
      const b = barcode.trim();
      const matchBarcode = existingProducts.find((p) => p.barcode && p.barcode.trim() === b);
      if (matchBarcode) return { product: matchBarcode, confidence: 'HIGH' };
    }

    // 2. Exact or very close name match
    const exact = existingProducts.find(
      (p) => {
        const pClean = p.name.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
        return pClean === cleanRaw || p.name.toLowerCase().trim() === rawName.toLowerCase().trim();
      }
    );
    if (exact) return { product: exact, confidence: 'HIGH' };

    // 3. Keyword / Substring match on distinctive brand words (excluding stop words like 500ml, beer, can)
    const rawBrandWords = cleanRaw
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

    if (rawBrandWords.length === 0) {
      return { product: undefined, confidence: 'LOW' };
    }

    let bestMatch: Product | null = null;
    let highestScore = 0;

    for (const p of existingProducts) {
      const pClean = p.name.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
      const pBrandWords = pClean
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

      if (pBrandWords.length === 0) continue;

      // Check if all brand words of existing product appear in raw receipt name
      const allProductWordsInRaw = pBrandWords.every((w) => cleanRaw.includes(w));
      if (allProductWordsInRaw) {
        return { product: p, confidence: 'HIGH' };
      }

      let matchCount = 0;
      for (const w of rawBrandWords) {
        if (pBrandWords.includes(w)) {
          matchCount += 1;
        }
      }

      const minRequired = pBrandWords.length === 1 ? 1 : 2;
      if (matchCount >= minRequired && matchCount > highestScore) {
        highestScore = matchCount;
        bestMatch = p;
      }
    }

    if (bestMatch) {
      return { product: bestMatch, confidence: highestScore >= 2 ? 'HIGH' : 'MEDIUM' };
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

  // Compress & optimize image files using HTML5 Canvas to prevent upload timeouts
  const compressAndOptimizeImage = async (
    file: File,
    maxDimension = 2048,
    quality = 0.85
  ): Promise<{ base64: string; mimeType: string }> => {
    const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|bmp|gif)$/i.test(file.name);

    // If not an image (e.g. PDF), read base64 directly
    if (!isImage) {
      const b64 = await fileToBase64(file);
      return { base64: b64, mimeType: file.type || 'application/pdf' };
    }

    return new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(width, 100);
        canvas.height = Math.max(height, 100);
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          fileToBase64(file).then((b64) => resolve({ base64: b64, mimeType: 'image/jpeg' }));
          return;
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve({ base64: dataUrl, mimeType: 'image/jpeg' });
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        fileToBase64(file).then((b64) => resolve({ base64: b64, mimeType: file.type || 'image/jpeg' }));
      };

      img.src = objectUrl;
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
        ? 'Optimizing receipt image...'
        : 'Reading PDF delivery invoice...'
    );
    setErrorMessage(null);

    try {
      // Compress camera photos to prevent upload timeouts
      const { base64, mimeType } = await compressAndOptimizeImage(file);

      setProcessingStatus(
        type === 'PICTURE'
          ? 'Scanning receipt text & detecting stock with Gemini AI...'
          : 'Extracting PDF invoice items with Gemini AI...'
      );

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

      let response: Response;
      try {
        response = await fetch('/api/parse-stock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            fileBase64: base64,
            mimeType: mimeType,
            filename: file.name,
            fileType: type,
          }),
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        let errDetail = '';
        try {
          const errJson = await response.json();
          errDetail = errJson?.error || '';
        } catch {
          // ignore
        }
        throw new Error(errDetail || `Stock extraction server responded with error ${response.status}.`);
      }

      const resData = await response.json();
      if (!resData?.success) {
        throw new Error(resData?.error || 'Document extraction failed.');
      }

      const extractedItemsRaw = resData.data?.items || [];
      if (!Array.isArray(extractedItemsRaw) || extractedItemsRaw.length === 0) {
        const note = resData.data?.notes ? ` (${resData.data.notes})` : '';
        throw new Error(
          `No recognizable items could be extracted from this document${note}. Please ensure the receipt is clear and readable, or use Quick Manual Entry.`
        );
      }

      setProcessingStatus('Matching extracted items with local store inventory...');

      const matchedResults: ParsedStockItem[] = extractedItemsRaw.map((raw: any, idx: number) => {
        const rawName = String(raw.name || 'Unnamed Product').trim();
        const rawQty = Math.max(1, Math.round(Number(raw.quantity) || 1));
        const rawCost = typeof raw.cost_price === 'number' && raw.cost_price > 0 ? raw.cost_price : undefined;
        const rawSell = typeof raw.selling_price === 'number' && raw.selling_price > 0 ? raw.selling_price : undefined;

        const match = matchWithInventory(rawName, raw.barcode);

        return {
          id: `parsed-${idx}-${Date.now()}`,
          name: rawName,
          category: match.product ? match.product.category : (raw.category ? String(raw.category).toLowerCase() : 'beer'),
          quantity: rawQty,
          unit: raw.unit || (match.product ? match.product.unit : 'Bottle'),
          cost_price: rawCost,
          selling_price: rawSell || match.product?.price || (rawCost ? Math.round(rawCost * 1.25) : 250),
          barcode: raw.barcode || match.product?.barcode || '',
          matched_product_id: match.product ? match.product.id : undefined,
          matched_product_name: match.product ? match.product.name : undefined,
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
      console.error('Receipt parse error:', err);
      if (err.name === 'AbortError') {
        setErrorMessage('Document processing timed out. Please check your connection or try a smaller image.');
      } else {
        setErrorMessage(
          err.message || 'Error processing document. Ensure the image is clear or use Quick Manual Entry.'
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Quick Manual Restock (Direct Entry without camera/document)
  const handleStartQuickManualEntry = () => {
    setErrorMessage(null);
    setSourceFileName('Physical Receipt Entry');
    setSourceType('PICTURE');
    const defaultProduct = existingProducts[0];
    const initialItem: ParsedStockItem = defaultProduct
      ? {
          id: `manual-1-${Date.now()}`,
          name: defaultProduct.name,
          category: defaultProduct.category,
          quantity: 1,
          unit: defaultProduct.unit,
          cost_price: undefined,
          selling_price: defaultProduct.price,
          barcode: defaultProduct.barcode,
          matched_product_id: defaultProduct.id,
          matched_product_name: defaultProduct.name,
          current_stock: defaultProduct.stock_qty,
          new_stock_after: defaultProduct.stock_qty + 1,
          is_new_product: false,
          status: 'CONFIRMED',
          confidence: 'HIGH',
        }
      : {
          id: `manual-1-${Date.now()}`,
          name: 'Tusker Lager 500ml',
          category: 'beer',
          quantity: 24,
          unit: 'Bottle',
          cost_price: 180,
          selling_price: 220,
          current_stock: 0,
          new_stock_after: 24,
          is_new_product: true,
          status: 'CONFIRMED',
          confidence: 'HIGH',
        };

    setParsedItems([initialItem]);
    setStep('REVIEW');
  };

  // Add another line item while reviewing
  const handleAddLineItem = () => {
    const unusedProduct =
      existingProducts.find((p) => !parsedItems.some((i) => i.matched_product_id === p.id)) ||
      existingProducts[0];

    const newItem: ParsedStockItem = unusedProduct
      ? {
          id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: unusedProduct.name,
          category: unusedProduct.category,
          quantity: 1,
          unit: unusedProduct.unit,
          cost_price: undefined,
          selling_price: unusedProduct.price,
          barcode: unusedProduct.barcode,
          matched_product_id: unusedProduct.id,
          matched_product_name: unusedProduct.name,
          current_stock: unusedProduct.stock_qty,
          new_stock_after: unusedProduct.stock_qty + 1,
          is_new_product: false,
          status: 'CONFIRMED',
          confidence: 'HIGH',
        }
      : {
          id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: '',
          category: 'beer',
          quantity: 1,
          unit: 'Bottle',
          selling_price: 200,
          current_stock: 0,
          new_stock_after: 1,
          is_new_product: true,
          status: 'CONFIRMED',
          confidence: 'HIGH',
        };

    setParsedItems((prev) => [...prev, newItem]);
  };

  // Re-match or switch product mapping for a line item
  const handleProductSelect = (id: string, productId: string) => {
    if (productId === '__new__') {
      setParsedItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                matched_product_id: undefined,
                matched_product_name: undefined,
                is_new_product: true,
                current_stock: 0,
                new_stock_after: i.quantity,
              }
            : i
        )
      );
      return;
    }

    const prod = existingProducts.find((p) => String(p.id) === String(productId));
    if (!prod) return;

    setParsedItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              name: prod.name,
              category: prod.category,
              matched_product_id: prod.id,
              matched_product_name: prod.name,
              current_stock: prod.stock_qty,
              new_stock_after: prod.stock_qty + i.quantity,
              selling_price: i.selling_price || prod.price,
              barcode: prod.barcode || i.barcode,
              is_new_product: false,
              confidence: 'HIGH',
            }
          : i
      )
    );
  };

  const handleUpdateItemName = (id: string, newName: string) => {
    setParsedItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const match = matchWithInventory(newName);
        if (match.product) {
          return {
            ...i,
            name: newName,
            category: match.product.category,
            matched_product_id: match.product.id,
            matched_product_name: match.product.name,
            current_stock: match.product.stock_qty,
            new_stock_after: match.product.stock_qty + i.quantity,
            selling_price: i.selling_price || match.product.price,
            barcode: match.product.barcode || i.barcode,
            is_new_product: false,
            confidence: match.confidence,
          };
        }
        return {
          ...i,
          name: newName,
          matched_product_id: undefined,
          matched_product_name: undefined,
          is_new_product: true,
          current_stock: 0,
          new_stock_after: i.quantity,
        };
      })
    );
  };

  // Dispatch File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
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

    const userName = currentUser?.name || 'Cashier';
    const userRole = currentUser?.role || 'SALES_CASHIER';
    const res = LocalDb.applyStockRestock(validItems, userName, userRole);
    if (!res.success) {
      setErrorMessage(res.error || 'Failed to update stock.');
      return;
    }

    setSuccessReport({
      updated: res.updatedCount,
      created: res.createdCount,
      totalUnits: res.totalUnits,
      totalValuationAdded: res.totalValuationAdded,
      appliedItems: res.appliedItems,
      processedAt: new Date().toLocaleString('en-KE', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      processedBy: userName,
    });
    setStep('SUCCESS');
    if (onStockApplied) onStockApplied();
    if (onRestocked) onRestocked();
  };

  const handleLoadSampleReceipt = () => {
    const sampleItems: ParsedStockItem[] = [
      {
        id: `sample-1-${Date.now()}`,
        name: 'Tusker Lager 500ml',
        category: 'beer',
        quantity: 24,
        unit: 'Bottle',
        cost_price: 180,
        selling_price: 220,
        current_stock: 12,
        new_stock_after: 36,
        status: 'CONFIRMED',
        confidence: 'HIGH',
        is_new_product: false,
      },
      {
        id: `sample-2-${Date.now()}`,
        name: 'White Cap Crisp 500ml',
        category: 'beer',
        quantity: 24,
        unit: 'Bottle',
        cost_price: 190,
        selling_price: 230,
        current_stock: 8,
        new_stock_after: 32,
        status: 'CONFIRMED',
        confidence: 'HIGH',
        is_new_product: false,
      },
      {
        id: `sample-3-${Date.now()}`,
        name: 'Gilbeys Special Dry Gin 750ml',
        category: 'gin',
        quantity: 6,
        unit: 'Bottle',
        cost_price: 1100,
        selling_price: 1350,
        current_stock: 4,
        new_stock_after: 10,
        status: 'CONFIRMED',
        confidence: 'HIGH',
        is_new_product: false,
      },
      {
        id: `sample-4-${Date.now()}`,
        name: 'Johnnie Walker Black Label 750ml',
        category: 'whisky',
        quantity: 3,
        unit: 'Bottle',
        cost_price: 3200,
        selling_price: 3900,
        current_stock: 2,
        new_stock_after: 5,
        status: 'CONFIRMED',
        confidence: 'HIGH',
        is_new_product: false,
      },
    ];

    const matched = sampleItems.map((item) => {
      const match = matchWithInventory(item.name);
      if (match.product) {
        return {
          ...item,
          name: match.product.name,
          category: match.product.category,
          matched_product_id: match.product.id,
          matched_product_name: match.product.name,
          current_stock: match.product.stock_qty,
          new_stock_after: match.product.stock_qty + item.quantity,
          selling_price: item.selling_price || match.product.price,
        };
      }
      return item;
    });

    setErrorMessage(null);
    setSourceFileName('EABL_Distributor_Delivery_Receipt_#88419.pdf');
    setSourceType('PDF');
    setParsedItems(matched);
    setStep('REVIEW');
  };

  const confirmedItems = parsedItems.filter((i) => i.status === 'CONFIRMED');
  const totalUnitsToRestock = confirmedItems.reduce((sum, i) => sum + i.quantity, 0);
  const totalValuationToRestock = confirmedItems.reduce((sum, i) => sum + (i.quantity * (i.selling_price || 0)), 0);
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
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>Scan Receipt & Add Stock</span>
                <span className="text-[10px] uppercase tracking-wider bg-emerald-500 text-slate-950 font-black px-2 py-0.5 rounded-full">
                  Cashier Receipt Portal
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Scan supplier receipt, set retail selling prices, and confirm inventory additions
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
        {errorMessage && step === 'UPLOAD' && (
          <div className="mx-5 mt-3 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">{errorMessage}</span>
                <span className="text-[11px] text-rose-700/80 dark:text-rose-300/80">
                  Tip: If your photo or network fails, you can switch to Quick Manual Entry to add receipt items without delay.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleStartQuickManualEntry}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer shadow-xs whitespace-nowrap"
              >
                Quick Manual Entry
              </button>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>
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
                    Scanning Receipt Document...
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto animate-pulse">
                    {processingStatus || 'Extracting products, quantities, and prices automatically...'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Cashier Policy Notice Banner */}
                  <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3 text-xs text-emerald-900 dark:text-emerald-200">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-bold text-emerald-950 dark:text-emerald-100">
                        Cashier Stock Addition Protocol
                      </p>
                      <p className="text-emerald-800 dark:text-emerald-300/90 leading-relaxed">
                        Cashiers cannot directly alter stock counts. Stock additions are authorized exclusively by scanning or uploading a supplier delivery receipt. You can set the selling price for each item during upload and receive a verified confirmation receipt upon completion.
                      </p>
                    </div>
                  </div>

                  {/* Primary Action Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Snap Picture Button */}
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-400 bg-white dark:bg-slate-800/80 flex flex-col items-start gap-2.5 transition-all cursor-pointer group text-left shadow-xs hover:shadow-md"
                    >
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Camera className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                            Scan with Camera
                          </h4>
                          <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.2 rounded">
                            Fast
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          Take a photo of paper receipt or delivery slip
                        </p>
                      </div>
                    </button>

                    {/* Upload File / Document Button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-amber-500 dark:hover:border-amber-400 bg-white dark:bg-slate-800/80 flex flex-col items-start gap-2.5 transition-all cursor-pointer group text-left shadow-xs hover:shadow-md"
                    >
                      <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                          Upload Document
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          Upload photo (JPG/PNG), PDF invoice, or Excel
                        </p>
                      </div>
                    </button>

                    {/* Quick Manual Entry Button */}
                    <button
                      type="button"
                      onClick={handleStartQuickManualEntry}
                      className="p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 bg-white dark:bg-slate-800/80 flex flex-col items-start gap-2.5 transition-all cursor-pointer group text-left shadow-xs hover:shadow-md"
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                          Quick Receipt Entry
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          Type or pick items directly from paper receipt
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* Drag and Drop Zone */}
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-500 dark:hover:border-amber-400 rounded-2xl p-6 text-center transition-all cursor-pointer bg-slate-50/50 dark:bg-slate-800/30 group"
                  >
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mb-1">
                      Or drag and drop receipt file here
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Supports EABL delivery sheets, distributor invoices, and paper photos
                    </p>
                  </div>

                  {/* Quick Test Receipt Demo Button */}
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={handleLoadSampleReceipt}
                      className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-bold inline-flex items-center gap-1.5 cursor-pointer py-1 px-3 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Test with Sample Distributor Delivery Receipt (EABL #88419)</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 2: REVIEW & VERIFICATION SCREEN */}
          {step === 'REVIEW' && (
            <div className="space-y-4">
              {/* Guidance Callout: Setting selling prices */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                <Tag className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block mb-0.5">
                    Verify Quantities & Set Selling Prices
                  </span>
                  <span>
                    Confirm the received quantities and set the retail selling price (KES) for each item below before confirming additions. Confirmed prices and stock counts will immediately update the POS terminal catalog.
                  </span>
                </div>
              </div>

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

              {/* Quick Crate / Pack Fast-Add Bar */}
              <div className="flex flex-wrap items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Quick Add Crate/Pack:
                </span>
                {existingProducts.slice(0, 5).map((prod) => {
                  const defaultPackQty = prod.category === 'beer' ? 24 : prod.category === 'spirits' || prod.category === 'whisky' || prod.category === 'gin' ? 6 : 12;
                  return (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => {
                        setParsedItems((prev) => {
                          const existingIndex = prev.findIndex((i) => i.matched_product_id === prod.id || i.name.toLowerCase() === prod.name.toLowerCase());
                          if (existingIndex !== -1) {
                            return prev.map((item, idx) =>
                              idx === existingIndex
                                ? {
                                    ...item,
                                    quantity: item.quantity + defaultPackQty,
                                    new_stock_after: (item.current_stock || prod.stock_qty) + (item.quantity + defaultPackQty),
                                  }
                                : item
                            );
                          }
                          return [
                            ...prev,
                            {
                              id: `quick-${prod.id}-${Date.now()}`,
                              name: prod.name,
                              category: prod.category,
                              quantity: defaultPackQty,
                              unit: prod.unit || 'Bottle',
                              cost_price: undefined,
                              selling_price: prod.price,
                              barcode: prod.barcode,
                              matched_product_id: prod.id,
                              matched_product_name: prod.name,
                              current_stock: prod.stock_qty,
                              new_stock_after: prod.stock_qty + defaultPackQty,
                              is_new_product: false,
                              status: 'CONFIRMED',
                              confidence: 'HIGH',
                            },
                          ];
                        });
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-slate-200 dark:border-slate-600 hover:border-amber-400 text-slate-700 dark:text-slate-200 text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-1 shadow-xs"
                    >
                      <Plus className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      <span>{prod.name} ({defaultPackQty})</span>
                    </button>
                  );
                })}
              </div>

              {/* Review Table */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <div className="max-h-[48vh] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 uppercase tracking-wider sticky top-0 font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Product Name</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3 text-center">Add Qty</th>
                        <th className="py-2.5 px-3 text-center">Stock Change</th>
                        <th className="py-2.5 px-3 text-right">
                          <span className="text-amber-600 dark:text-amber-400 font-black">Set Selling Price</span>
                        </th>
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

                            <td className="py-2.5 px-3 min-w-[180px]">
                              {item.is_new_product ? (
                                <div className="space-y-1">
                                  <input
                                    type="text"
                                    value={item.name}
                                    onChange={(e) => handleUpdateItemName(item.id, e.target.value)}
                                    placeholder="Enter drink name..."
                                    className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded text-xs font-bold text-slate-900 dark:text-white uppercase focus:ring-1 focus:ring-amber-500"
                                  />
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-slate-400">Or map to:</span>
                                    <select
                                      value={item.matched_product_id || '__new__'}
                                      onChange={(e) => handleProductSelect(item.id, e.target.value)}
                                      className="text-[11px] py-0.5 px-1 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300 max-w-[140px] truncate"
                                    >
                                      <option value="__new__">+ New Product</option>
                                      {existingProducts.map((p) => (
                                        <option key={p.id} value={p.id}>
                                          {p.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <p className="font-bold text-slate-900 dark:text-white uppercase leading-snug">
                                    {item.name}
                                  </p>
                                  {item.matched_product_name && item.matched_product_name !== item.name && (
                                    <p className="text-[10px] text-slate-400">
                                      Matched to: {item.matched_product_name}
                                    </p>
                                  )}
                                </div>
                              )}
                            </td>

                            <td className="py-2.5 px-3">
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">
                                {item.category}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  disabled={isIgnored || item.quantity <= 1}
                                  onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                  className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 font-bold text-xs disabled:opacity-30 cursor-pointer"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  disabled={isIgnored}
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleQuantityChange(item.id, parseInt(e.target.value) || 1)
                                  }
                                  className="w-14 px-1 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-center font-bold text-xs text-slate-900 dark:text-white focus:ring-1 focus:ring-amber-500"
                                />
                                <button
                                  type="button"
                                  disabled={isIgnored}
                                  onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                  className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 font-bold text-xs disabled:opacity-30 cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            </td>

                            <td className="py-2.5 px-3 text-center font-mono text-[11px]">
                              <span className="text-slate-400">{item.current_stock || 0}</span>
                              <span className="text-slate-400 mx-1">→</span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                {item.new_stock_after}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 text-right">
                              <div className="flex flex-col items-end gap-0.5">
                                <div className="flex items-center justify-end gap-1 font-mono">
                                  <span className="text-[10px] text-slate-400 font-bold">KES</span>
                                  <input
                                    type="number"
                                    min="0"
                                    disabled={isIgnored}
                                    value={item.selling_price || ''}
                                    onChange={(e) =>
                                      handlePriceChange(item.id, parseFloat(e.target.value) || 0)
                                    }
                                    className="w-24 px-2 py-1.5 bg-white dark:bg-slate-800 border-2 border-amber-400/80 dark:border-amber-500/80 rounded-lg text-right font-bold text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 shadow-xs"
                                    placeholder="Set Price"
                                  />
                                </div>
                                {item.cost_price && (
                                  <span className="text-[10px] text-slate-400">
                                    Cost: KES {item.cost_price}
                                  </span>
                                )}
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
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStep('UPLOAD')}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Upload Another Receipt
                  </button>

                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="px-3.5 py-2 rounded-xl border border-dashed border-amber-500/80 dark:border-amber-500/80 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Another Item</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleApplyRestock}
                    disabled={confirmedItems.length === 0}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 active:scale-98"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Stock Additions & Prices (+{totalUnitsToRestock} Units)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS CONFIRMATION SCREEN */}
          {step === 'SUCCESS' && successReport && (
            <div className="space-y-6 max-w-2xl mx-auto py-4">
              {/* Header Confirmation Banner */}
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm ring-8 ring-emerald-50 dark:ring-emerald-900/30">
                  <CheckCheck className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    Stock Additions Successfully Confirmed & Applied!
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Scanned receipt confirmed by <span className="font-bold text-slate-700 dark:text-slate-200">{successReport.processedBy}</span>. All stock additions and set retail prices have been updated in live store inventory.
                  </p>
                </div>
              </div>

              {/* 4-Stat Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl p-3 text-center">
                  <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">
                    Total Units Added
                  </span>
                  <span className="text-xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
                    +{successReport.totalUnits}
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Catalog Items
                  </span>
                  <span className="text-xl font-black text-slate-900 dark:text-white font-mono">
                    {successReport.appliedItems.length}
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Total Valuation
                  </span>
                  <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
                    KES {successReport.totalValuationAdded.toLocaleString()}
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Confirmed At
                  </span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {successReport.processedAt}
                  </span>
                </div>
              </div>

              {/* Itemized Confirmation Breakdown Table */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-800/30">
                <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Confirmed Receipt Inventory Additions</span>
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Status: Active in Catalog
                  </span>
                </div>

                <div className="max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold text-[10px] uppercase">
                      <tr>
                        <th className="py-2 px-3">Product</th>
                        <th className="py-2 px-3 text-center">Added</th>
                        <th className="py-2 px-3 text-center">Stock Level</th>
                        <th className="py-2 px-3 text-right">Selling Price Set</th>
                        <th className="py-2 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700/60">
                      {successReport.appliedItems.map((item, idx) => (
                        <tr key={`applied-${idx}`} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/50">
                          <td className="py-2 px-3">
                            <span className="font-bold text-slate-900 dark:text-white uppercase block leading-tight">
                              {item.name}
                            </span>
                            <span className="text-[10px] text-slate-400 capitalize">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                            +{item.quantityAdded}
                          </td>
                          <td className="py-2 px-3 text-center font-mono text-[11px] text-slate-500">
                            {item.previousStock} → <span className="font-bold text-slate-900 dark:text-white">{item.newStock}</span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                            KES {item.sellingPrice.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                              ✓ Live
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actions: Print Slip, Scan Another, Return */}
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 text-white dark:text-slate-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all active:scale-98"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Confirmation Slip</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setParsedItems([]);
                    setStep('UPLOAD');
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Scan Another Receipt
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-sm transition-colors cursor-pointer active:scale-98"
                >
                  Done / Return to Register
                </button>
              </div>

              {/* DEDICATED PRINTABLE SLIP FOR BROWSER PRINT (window.print()) */}
              <div className="hidden print:block font-mono text-black p-4 text-xs leading-normal bg-white">
                <div className="text-center pb-2 border-b border-black">
                  <div className="font-black text-sm uppercase">{storeConfig?.store_name || 'BAZU POS'}</div>
                  <div className="text-[11px]">{storeConfig?.branch || 'Nairobi Branch'}</div>
                  <div className="font-bold text-[11px] mt-1">STOCK RESTOCK CONFIRMATION SLIP</div>
                  <div className="text-[10px] mt-0.5">{successReport.processedAt}</div>
                  <div className="text-[10px]">Staff/Cashier: {successReport.processedBy}</div>
                </div>

                <div className="py-2 border-b border-black text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span>Source Receipt:</span>
                    <span className="font-bold truncate max-w-[160px]">{sourceFileName || 'Scanned Receipt'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Items Confirmed:</span>
                    <span className="font-bold">{successReport.appliedItems.length} Products</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Units Added:</span>
                    <span className="font-black text-sm">+{successReport.totalUnits} Units</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Valuation Added:</span>
                    <span className="font-bold">KES {successReport.totalValuationAdded.toLocaleString()}</span>
                  </div>
                </div>

                <div className="py-2 border-b border-black text-[10px]">
                  <div className="font-bold mb-1 pb-0.5 border-b border-dashed border-black flex justify-between">
                    <span>ITEM / CATEGORY</span>
                    <span>QTY / PRICE</span>
                  </div>
                  {successReport.appliedItems.map((item, idx) => (
                    <div key={`print-item-${idx}`} className="py-1 border-b border-dashed border-gray-300">
                      <div className="font-bold">{item.name}</div>
                      <div className="flex justify-between text-[9px] text-gray-700">
                        <span>+{item.quantityAdded} units ({item.previousStock} → {item.newStock})</span>
                        <span className="font-bold">KES {item.sellingPrice.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="text-center pt-2 text-[9px] text-gray-600">
                  <div>Stock added via verified receipt upload.</div>
                  <div>Thank you for keeping store records accurate!</div>
                </div>
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
