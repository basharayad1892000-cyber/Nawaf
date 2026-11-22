import React, { useState } from 'react';
import { Plus, CalendarClock } from 'lucide-react';
import {
  CardCategory,
  CARD_CATEGORIES,
  formatAutoEntryDate,
  parseCardCountInput,
} from '../utils/ledgerLogic';

interface QuickEntryBarProps {
  defaultCategory: CardCategory;
  onAddEntry: (params: {
    category: CardCategory;
    customerName: string;
    cardCount: number | null;
  }) => void;
}

export const QuickEntryBar: React.FC<QuickEntryBarProps> = ({
  defaultCategory,
  onAddEntry,
}) => {
  const [category, setCategory] = useState<CardCategory>(defaultCategory);
  const [customerName, setCustomerName] = useState('');
  const [countRaw, setCountRaw] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync category if user picks a specific filter tab
  React.useEffect(() => {
    setCategory(defaultCategory);
  }, [defaultCategory]);

  const parsedCount = parseCardCountInput(countRaw);
  const previewAutoDate = parsedCount !== null ? formatAutoEntryDate(new Date()) : '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = customerName.trim();
    if (!trimmedName) {
      setValidationError('يرجى إدخال اسم العميل أولاً');
      return;
    }

    onAddEntry({
      category,
      customerName: trimmedName,
      cardCount: parsedCount,
    });

    setCustomerName('');
    setCountRaw('');
    setValidationError(null);
  };

  return (
    <section
      aria-label="إضافة عميل جديد للجدول"
      className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="text-sm font-semibold text-slate-900">
          إدخال سريع في الجدول
        </h2>
        <p className="text-xs text-slate-500">
          العمود ١: الفئة واسم العميل · العمود ٢: عدد الكروت · العمود ٣: التاريخ يُكتب تلقائياً فور إدخال العدد
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
        {/* Column 1A: Category Selector (200 / 300 / 500) */}
        <div className="md:col-span-3">
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            فئة الكرت (العمود الأول)
          </label>
          <div
            role="group"
            aria-label="اختيار فئة الكرت للإدخال الجديد"
            className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200"
          >
            {CARD_CATEGORIES.map((cat) => {
              const isSelected = category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`min-h-[38px] px-2 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  فئة {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Column 1B: Customer Name */}
        <div className="md:col-span-4">
          <label
            htmlFor="quick-customer-name"
            className="block text-xs font-medium text-slate-700 mb-1.5"
          >
            اسم العميل (العمود الأول)
          </label>
          <input
            id="quick-customer-name"
            type="text"
            value={customerName}
            onChange={(e) => {
              setCustomerName(e.target.value);
              if (validationError) setValidationError(null);
            }}
            placeholder="مثال: صالح محمد العمري..."
            className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
          />
          {validationError && (
            <p role="alert" className="mt-1 text-xs font-medium text-red-600">
              {validationError}
            </p>
          )}
        </div>

        {/* Column 2: Number of Cards */}
        <div className="md:col-span-2">
          <label
            htmlFor="quick-card-count"
            className="block text-xs font-medium text-slate-700 mb-1.5"
          >
            عدد الكروت (العمود الثاني)
          </label>
          <input
            id="quick-card-count"
            type="text"
            inputMode="numeric"
            value={countRaw}
            onChange={(e) => setCountRaw(e.target.value)}
            placeholder="أدخل العدد..."
            className="w-full min-h-[44px] px-3.5 py-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:bg-white focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
          />
        </div>

        {/* Column 3: Auto Date Preview + Submit */}
        <div className="md:col-span-3 flex flex-col">
          <span className="block text-xs font-medium text-slate-700 mb-1.5">
            التاريخ التلقائي (العمود الثالث)
          </span>
          <div className="flex items-center gap-2">
            <div
              aria-live="polite"
              className="flex-1 min-h-[44px] px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-1.5 text-slate-600 overflow-hidden"
            >
              <CalendarClock className="w-3.5 h-3.5 text-teal-700 shrink-0" />
              {previewAutoDate ? (
                <span className="font-mono tabular-nums text-slate-900 font-medium truncate">
                  {previewAutoDate}
                </span>
              ) : (
                <span className="text-slate-400 truncate">يُكتب فور إدخال العدد</span>
              )}
            </div>
            <button
              type="submit"
              className="min-h-[44px] px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة للجدول</span>
            </button>
          </div>
        </div>
      </form>
    </section>
  );
};
