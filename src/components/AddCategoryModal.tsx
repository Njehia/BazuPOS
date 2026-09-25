import React, { useState } from 'react';
import { X, Tag, Sparkles, Check, Plus } from 'lucide-react';

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (category: { name: string; icon?: string; description?: string }) => Promise<void> | void;
}

const POPULAR_EMOJIS = [
  '🏷️', '🍺', '🍷', '🥃', '🍸', '🍾', '🍹', '🥤', '⚡', '💧',
  '🧃', '🍿', '🍫', '🍞', '🧀', '🥩', '☕', '🚬', '🧼', '🧴',
  '🔌', '📦', '🛒', '🍗', '💊', '📱', '🍬', '🍔', '🍕', '🥬'
];

export const AddCategoryModal: React.FC<AddCategoryModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🏷️');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError('Please provide a category name.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        name: cleanName,
        icon: icon || '🏷️',
        description: description.trim() || undefined,
      });
      setName('');
      setDescription('');
      setIcon('🏷️');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create category.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Add New Category</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Create a department or classification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-600 dark:text-red-300 font-medium">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Category Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Energy Drinks, Fresh Bakery, Spirits"
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-sm font-medium"
              />
            </div>
          </div>

          {/* Icon / Emoji Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Category Badge / Icon</span>
              <span className="text-xs font-mono text-amber-500 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md">
                Selected: {icon}
              </span>
            </label>
            <div className="grid grid-cols-10 gap-1.5 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 max-h-28 overflow-y-auto">
              {POPULAR_EMOJIS.map((emoji) => (
                <button
                  type="button"
                  key={emoji}
                  onClick={() => setIcon(emoji)}
                  className={`w-7 h-7 text-base rounded-lg flex items-center justify-center transition-transform hover:scale-110 ${
                    icon === emoji
                      ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-400'
                      : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Description <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Canned & bottled energy boosters and refreshments"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-xs"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-slate-950 shadow-md shadow-amber-500/20 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Save Category</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
