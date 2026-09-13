import React, { useState } from 'react';
import { Mail, Phone, Save, User, UserPlus, X } from 'lucide-react';
import { Customer } from '../types';
import { LocalDb } from '../lib/storage';

interface CustomerFormModalProps {
  customerToEdit?: Customer | null;
  onClose: () => void;
  onCustomerSaved: (customer: Customer) => void;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  customerToEdit,
  onClose,
  onCustomerSaved,
}) => {
  const isEditing = Boolean(customerToEdit);
  const [name, setName] = useState(customerToEdit ? customerToEdit.name : '');
  const [phone, setPhone] = useState(customerToEdit ? customerToEdit.phone : '');
  const [email, setEmail] = useState(customerToEdit?.email || '');
  const [notes, setNotes] = useState(customerToEdit?.notes || '');
  const [error, setError] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter the customer full name.');
      return;
    }
    if (!phone.trim()) {
      setError('Please enter a valid phone number for customer contact & WhatsApp.');
      return;
    }

    if (isEditing && customerToEdit) {
      const res = LocalDb.updateCustomer(customerToEdit.id, {
        name,
        phone,
        email,
        notes,
      });
      if (res.success && res.customer) {
        onCustomerSaved(res.customer);
      } else {
        setError(res.error || 'Failed to update customer details.');
      }
    } else {
      const res = LocalDb.addCustomer({
        name,
        phone,
        email,
        notes,
      });
      if (res.success && res.customer) {
        onCustomerSaved(res.customer);
      } else {
        setError(res.error || 'Failed to register new customer.');
      }
    }
  };

  return (
    <div
      id="customer-form-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in"
    >
      <div
        id="customer-form-modal-container"
        className="bg-white border border-slate-200 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-indigo-950 flex items-center justify-between bg-[#1E1B4B] text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              {isEditing ? <User className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <span className="text-[11px] font-bold tracking-wider uppercase text-amber-400">
                {isEditing ? 'Customer Directory' : 'New Customer'}
              </span>
              <h2 className="text-lg font-bold text-white leading-tight">
                {isEditing ? `Edit ${customerToEdit?.name}` : 'Register Client Account'}
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

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-slate-800">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Customer Full Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Kennedy Ochieng"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mobile Phone / WhatsApp <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0712 345 678 or 2547..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Used for bill reminders, debt alerts, and receipts via WhatsApp.
            </span>
          </div>

          {/* Optional Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address (Optional)
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. customer@example.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Account Notes / Tag (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Regular VIP customer, prefers Captain Morgan"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-3 flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isEditing ? 'Save Changes' : 'Register Customer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
