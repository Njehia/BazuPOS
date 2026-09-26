import React, { useState, useEffect } from 'react';
import {
  X,
  Barcode,
  Camera,
  Sparkles,
  Save,
  Trash2,
  Package,
  DollarSign,
  Tag,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { BarcodeScannerModal } from './BarcodeScannerModal';

export interface EditableProductData {
  id: string;
  name: string;
  category: string;
  price: number;
  costPrice?: number;
  stockQuantity: number;
  barcode: string;
  quickKey?: boolean;
  unit?: string;
  lowStockThreshold?: number;
}

interface EditProductModalProps {
  isOpen: boolean;
  product: EditableProductData | null;
  categories: Array<{ id: string; name: string; icon?: string }>;
  onClose: () => void;
  onSave: (id: string, updates: Partial<EditableProductData>) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
  onOpenAddCategory?: () => void;
}

export const EditProductModal: React.FC<EditProductModalProps> = ({
  isOpen,
  product,
  categories,
  onClose,
  onSave,
  onDelete,
  onOpenAddCategory,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState<number | string>('');
  const [costPrice, setCostPrice] = useState<number | string>('');
  const [stockQuantity, setStockQuantity] = useState<number | string>('');
  const [barcode, setBarcode] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [lowStockThreshold, setLowStockThreshold] = useState<number | string>(10);
  const [quickKey, setQuickKey] = useState(false);

  // Scanner modal state
  const [showScanner, setShowScanner] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setCategory(product.category || (categories[0]?.name ?? 'General'));
      setPrice(product.price ?? 0);
      setCostPrice(product.costPrice ?? Math.round((product.price || 0) * 0.75));
      setStockQuantity(product.stockQuantity ?? 0);
      setBarcode(product.barcode || '');
      setUnit(product.unit || 'pcs');
      setLowStockThreshold(product.lowStockThreshold ?? 10);
      setQuickKey(!!product.quickKey);
      setError(null);
      setSaveSuccess(false);
    }
  }, [product, categories]);

  if (!isOpen || !product) return null;

  // Generate random 13-digit EAN barcode
  const handleGenerateBarcode = () => {
    const random12 = '616' + Math.floor(100000000 + Math.random() * 900000000).toString();
    // Calculate simple EAN check digit
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(random12[i], 10);
      sum += i % 2 === 0 ? digit : digit * 3;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    const generated = random12 + checkDigit;
    setBarcode(generated);
  };

  const handleStockDelta = (delta: number) => {
    const current = Number(stockQuantity) || 0;
    const next = Math.max(0, current + delta);
    setStockQuantity(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Product name cannot be empty.');
      return;
    }
    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      setError('Please enter a valid selling price.');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      await onSave(product.id, {
        name: name.trim(),
        category: category.trim(),
        price: numPrice,
        costPrice: Number(costPrice) || Math.round(numPrice * 0.75),
        stockQuantity: Number(stockQuantity) || 0,
        barcode: barcode.trim(),
        unit: unit.trim() || 'pcs',
        lowStockThreshold: Number(lowStockThreshold) || 10,
        quickKey,
      });

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err?.message || 'Failed to update product.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
        <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Edit Product & Barcode</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Update stock, category, price, and barcode</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-600 dark:text-red-300 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {saveSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-300 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Product updated successfully!</span>
              </div>
            )}

            {/* Product Name */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Product name"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-sm font-semibold"
              />
            </div>

            {/* Barcode Section (The highlight of the request) */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Barcode className="w-4 h-4 text-amber-500" />
                  <span>Product Barcode / UPC / EAN</span>
                </label>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  {barcode ? `${barcode.length} chars` : 'No barcode set'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="Scan or enter barcode number"
                    className="w-full pl-3.5 pr-8 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-sm tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                  />
                  {barcode && (
                    <button
                      type="button"
                      onClick={() => setBarcode('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      title="Clear barcode"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Scan Barcode with Camera */}
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer shrink-0"
                  title="Scan physical barcode using device camera"
                >
                  <Camera className="w-4 h-4" />
                  <span>Scan</span>
                </button>

                {/* Auto-generate Barcode */}
                <button
                  type="button"
                  onClick={handleGenerateBarcode}
                  className="px-2.5 py-2 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition-colors cursor-pointer shrink-0"
                  title="Generate a random unique barcode"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                Tip: Click <strong>Scan</strong> to activate your camera or scanner. You can also manually type or paste any manufacturer barcode.
              </p>
            </div>

            {/* Category & Unit Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Category
                  </label>
                  {onOpenAddCategory && (
                    <button
                      type="button"
                      onClick={onOpenAddCategory}
                      className="text-amber-600 dark:text-amber-400 font-bold hover:underline flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" />
                      <span>New Category</span>
                    </button>
                  )}
                </div>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 font-medium"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.icon || '🏷️'} {c.name}
                    </option>
                  ))}
                  {/* If product has category not in list, keep it */}
                  {category && !categories.some((c) => c.name === category) && (
                    <option value={category}>{category}</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Unit / Size
                </label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="e.g. 500ml, 750ml, pcs, 1kg, pack"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                />
              </div>
            </div>

            {/* Pricing Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Selling Price (KES) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">KSh</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0"
                    className="w-full pl-12 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Cost / Buying Price (KES)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">KSh</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    placeholder="0"
                    className="w-full pl-12 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Stock Quantity Stepper */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-800 dark:text-slate-200">
                  Current Stock Available
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleStockDelta(-1)}
                    className="w-6 h-6 rounded-md bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    className="w-20 px-2 py-1 text-center font-bold text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => handleStockDelta(1)}
                    className="w-6 h-6 rounded-md bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Quick Restock Pills */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] text-slate-400">Quick Add:</span>
                <button
                  type="button"
                  onClick={() => handleStockDelta(5)}
                  className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold hover:bg-amber-200 transition-colors"
                >
                  +5
                </button>
                <button
                  type="button"
                  onClick={() => handleStockDelta(12)}
                  className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold hover:bg-amber-200 transition-colors"
                >
                  +12 (Dozen)
                </button>
                <button
                  type="button"
                  onClick={() => handleStockDelta(24)}
                  className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold hover:bg-amber-200 transition-colors"
                >
                  +24 (Crate)
                </button>
                <button
                  type="button"
                  onClick={() => handleStockDelta(50)}
                  className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold hover:bg-amber-200 transition-colors"
                >
                  +50
                </button>
              </div>

              {/* Reorder quantity threshold warning limit */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800/80 gap-2">
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs block">
                    Reorder Quantity Threshold:
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Triggers automated reorder alerts when stock is at or below this level
                  </span>
                </div>
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <input
                    type="number"
                    min="0"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(e.target.value)}
                    className="w-20 px-2 py-1 text-center font-bold text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                  <span className="text-xs text-slate-400 font-medium">units</span>
                </div>
              </div>
            </div>

            {/* Quick Key Checkbox */}
            <div className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
              <input
                type="checkbox"
                id="quick-key-checkbox"
                checked={quickKey}
                onChange={(e) => setQuickKey(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500/30 border-slate-300 dark:border-slate-700"
              />
              <label htmlFor="quick-key-checkbox" className="font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                Star as Quick-Key product (1-tap fast cashier access)
              </label>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              {onDelete ? (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Delete product "${product.name}"?`)) {
                      onDelete(product.id);
                      onClose();
                    }
                  }}
                  className="px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !name.trim()}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-slate-950 shadow-md shadow-amber-500/20 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center gap-1.5"
                >
                  {isSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Camera Barcode Scanner Modal */}
      {showScanner && (
        <BarcodeScannerModal
          isOpen={true}
          onScan={(scannedCode) => {
            setBarcode(scannedCode);
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
          title={`Scan Barcode for ${name || 'Product'}`}
        />
      )}
    </>
  );
};
