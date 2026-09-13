import React, { useState, useMemo } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  MessageSquare,
  Phone,
  Send,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { CustomerSummary, StoreConfig } from '../types';

interface WhatsAppModalProps {
  customerSummary: CustomerSummary;
  storeConfig: StoreConfig;
  cashierName: string;
  onClose: () => void;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  customerSummary,
  storeConfig,
  cashierName,
  onClose,
}) => {
  const { customer, totalSpent, totalPaid, outstandingDebt, hasDebt } = customerSummary;
  const [templateType, setTemplateType] = useState<'debt' | 'statement' | 'custom'>(
    hasDebt ? 'debt' : 'statement'
  );
  const [phoneInput, setPhoneInput] = useState(customer.phone);
  const [copied, setCopied] = useState(false);

  // Normalize Kenyan / International phone format for wa.me URL
  const cleanPhone = useMemo(() => {
    let digits = phoneInput.replace(/[^0-9]/g, '');
    if (digits.startsWith('0') && digits.length === 10) {
      // e.g. 0712345678 -> 254712345678
      digits = '254' + digits.substring(1);
    } else if (digits.startsWith('254') && digits.length === 12) {
      // already 254...
    } else if (digits.length === 9) {
      // 712345678 -> 254712345678
      digits = '254' + digits;
    }
    return digits;
  }, [phoneInput]);

  // Pre-crafted message templates
  const defaultMessages = useMemo(() => {
    const store = storeConfig.store_name || 'Bazu Wines & Spirits';
    const till = storeConfig.till_number || '';
    const branch = storeConfig.branch ? ` (${storeConfig.branch})` : '';

    const debtTemplate = `Habari ${customer.name},

Greetings from *${store}*${branch}!

This is a friendly reminder regarding your outstanding bill:
• *Total Purchases:* KES ${totalSpent.toLocaleString()}
• *Total Paid:* KES ${totalPaid.toLocaleString()}
• *Outstanding Balance / Debt:* *KES ${outstandingDebt.toLocaleString()}*

You can conveniently settle your bill via:
📱 *Lipa na M-Pesa Buy Goods Till: ${till}*
Store Name: ${store}

Kindly share your M-Pesa confirmation message or drop by. We greatly appreciate your continued patronage! 🍷

_Cashier: ${cashierName}_
_Date: ${new Date().toLocaleDateString('en-GB')}_`;

    const statementTemplate = `Habari ${customer.name},

Here is your account statement from *${store}*${branch}:

• *Customer:* ${customer.name}
• *Total Lifetime Spend:* KES ${totalSpent.toLocaleString()}
• *Total Payments Recorded:* KES ${totalPaid.toLocaleString()}
• *Current Balance / Debt:* *${
      outstandingDebt > 0
        ? `KES ${outstandingDebt.toLocaleString()} (Pending)`
        : 'KES 0 (Fully Cleared ✓)'
    }*

${
  outstandingDebt > 0
    ? `You can clear your balance via M-Pesa Till *${till}*.\n`
    : 'Your account is in excellent standing! Thank you for choosing us.\n'
}Asante sana, we look forward to serving you again soon! 🥂

_${store} Management_`;

    const customTemplate = `Habari ${customer.name},

Regarding your bill at *${store}*:
Current Outstanding Balance: *KES ${outstandingDebt.toLocaleString()}*.

M-Pesa Till: *${till}* (${store}).
Thank you!`;

    return {
      debt: debtTemplate,
      statement: statementTemplate,
      custom: customTemplate,
    };
  }, [customer, totalSpent, totalPaid, outstandingDebt, storeConfig, cashierName]);

  const [messageText, setMessageText] = useState(defaultMessages[templateType]);

  // Update text when switching template tab if user hasn't heavily customized
  const handleSelectTemplate = (type: 'debt' | 'statement' | 'custom') => {
    setTemplateType(type);
    setMessageText(defaultMessages[type]);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    const encodedText = encodeURIComponent(messageText);
    const url = `https://wa.me/${cleanPhone}?text=${encodedText}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      id="whatsapp-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in"
    >
      <div
        id="whatsapp-modal-container"
        className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-emerald-950 flex items-center justify-between bg-[#064E3B] text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
              <MessageSquare className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-300 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" /> WhatsApp Notification
              </span>
              <h2 className="text-lg font-bold text-white leading-tight">
                Bill & Debt Notice to {customer.name}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer & Debt Snapshot Header */}
        <div className="p-4 bg-emerald-50/70 border-b border-emerald-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold">
              <User className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-900">{customer.name}</div>
              <div className="text-slate-500 font-mono text-[11px]">{customer.phone}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-slate-500">Current Debt</div>
              <div
                className={`font-black font-mono text-sm ${
                  hasDebt ? 'text-rose-600' : 'text-emerald-700'
                }`}
              >
                {hasDebt ? `KES ${outstandingDebt.toLocaleString()}` : 'KES 0 (Cleared)'}
              </div>
            </div>
            <div className="text-right pl-3 border-l border-emerald-200">
              <div className="text-[10px] uppercase font-bold text-slate-500">Lifetime Spend</div>
              <div className="font-bold font-mono text-slate-800 text-sm">
                KES {totalSpent.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-slate-800">
          {/* Phone verification input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Recipient WhatsApp Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="e.g. 0722112233 or 254722112233"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Format for WhatsApp: <span className="font-mono text-emerald-700 font-bold">+{cleanPhone}</span>
            </span>
          </div>

          {/* Template Choice Tabs */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Message Template
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleSelectTemplate('debt')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                  templateType === 'debt'
                    ? 'bg-rose-50 border-rose-400 text-rose-800 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                ⚠️ Debt Reminder
              </button>
              <button
                type="button"
                onClick={() => handleSelectTemplate('statement')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                  templateType === 'statement'
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                📊 Statement / Bill
              </button>
              <button
                type="button"
                onClick={() => handleSelectTemplate('custom')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                  templateType === 'custom'
                    ? 'bg-blue-50 border-blue-400 text-blue-800 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                ✏️ Custom
              </button>
            </div>
          </div>

          {/* Message Text Editor */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Message Preview & Customization
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy Text
                  </>
                )}
              </button>
            </div>
            <textarea
              rows={8}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-sans leading-relaxed transition-colors"
            />
          </div>

          {/* M-Pesa Till reassurance */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-center justify-between">
            <div>
              <span className="font-bold">Store Buy Goods Till:</span>{' '}
              <span className="font-mono font-bold">{storeConfig.till_number}</span>
            </div>
            <span className="text-amber-800 font-medium">Included in message</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition-all cursor-pointer shadow-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSendWhatsApp}
            disabled={!cleanPhone}
            className="flex-1 py-2.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>Send WhatsApp to +{cleanPhone}</span>
            <ExternalLink className="w-3.5 h-3.5 ml-1 opacity-70" />
          </button>
        </div>
      </div>
    </div>
  );
};
