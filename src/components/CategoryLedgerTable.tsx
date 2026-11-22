import React, { useState } from 'react';
import { Plus, Trash2, History, Check } from 'lucide-react';
import {
  CardCategory,
  CustomerCardEntry,
  parseCardCountInput,
} from '../utils/ledgerLogic';

interface CategoryLedgerTableProps {
  category: CardCategory;
  entries: CustomerCardEntry[];
  recentlyStampedId: string | null;
  onUpdateCustomerName: (id: string, newName: string) => void;
  onUpdateCardCount: (id: string, newCount: number | null) => void;
  onDeleteEntry: (id: string) => void;
  onInspectHistory: (entry: CustomerCardEntry) => void;
  onQuickAddRowInCategory: (params: {
    category: CardCategory;
    customerName: string;
    cardCount: number | null;
  }) => void;
}

export const CategoryLedgerTable: React.FC<CategoryLedgerTableProps> = ({
  category,
  entries,
  recentlyStampedId,
  onUpdateCustomerName,
  onUpdateCardCount,
  onDeleteEntry,
  onInspectHistory,
  onQuickAddRowInCategory,
}) => {
  const [inlineNewName, setInlineNewName] = useState('');
  const [inlineNewCount, setInlineNewCount] = useState('');

  const totalCardsInCategory = entries.reduce(
    (sum, item) => sum + (item.cardCount ?? 0),
    0
  );

  const handleInlineRowAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inlineNewName.trim();
    if (!trimmed) return;
    const parsedCount = parseCardCountInput(inlineNewCount);
    onQuickAddRowInCategory({
      category,
      customerName: trimmed,
      cardCount: parsedCount,
    });
    setInlineNewName('');
    setInlineNewCount('');
  };

  return (
    <div
      data-testid={`ledger-table-${category}`}
      className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col"
    >
      {/* Category Table Header Banner */}
      <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between gap-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <h3 className="text-base font-bold tracking-tight whitespace-nowrap">
            جدول كروت فئة <span className="font-mono tabular-nums text-teal-400">{category}</span>
          </h3>
          <span className="text-slate-500" aria-hidden="true">·</span>
          <span className="text-xs text-slate-300 tabular-nums">
            {entries.length} عميل
          </span>
        </div>

        <div className="text-xs text-slate-300 flex items-center gap-2 tabular-nums">
          <span>إجمالي الكروت: {totalCardsInCategory}</span>
        </div>
      </div>

      {/* Exact 3-Column Spreadsheet Table */}
      <div className="overflow-x-auto">
        <table
          aria-label={`جدول فئة ${category}`}
          className="w-full text-right border-collapse"
        >
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-700">
              <th scope="col" className="py-3 px-3.5 w-[42%] border-l border-slate-200">
                العمود الأول: فئة الكرت ({category}) / اسم العميل
              </th>
              <th scope="col" className="py-3 px-3.5 w-[24%] border-l border-slate-200">
                العمود الثاني: عدد الكروت
              </th>
              <th scope="col" className="py-3 px-3.5 w-[34%]">
                العمود الثالث: التاريخ (تلقائي عند إدخال العدد)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-8 px-4 text-center text-slate-500 text-xs">
                  لا يوجد عملاء مسجلون في فئة {category} حالياً. أضف اسم العميل بالأسفل للبدء.
                </td>
              </tr>
            ) : (
              entries.map((entry, idx) => {
                const isJustStamped = recentlyStampedId === entry.id;

                return (
                  <tr
                    key={entry.id}
                    className={`transition-colors ${
                      isJustStamped
                        ? 'bg-teal-50/70'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* COLUMN 1: Card Category + Customer Name */}
                    <td className="py-2.5 px-3 border-l border-slate-200 align-middle">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono tabular-nums text-slate-400 select-none w-5 shrink-0">
                          {idx + 1}.
                        </span>
                        <div className="flex-1 min-w-[120px]">
                          <input
                            type="text"
                            aria-label={`اسم العميل في فئة ${category} صف ${idx + 1}`}
                            value={entry.customerName}
                            onChange={(e) =>
                              onUpdateCustomerName(entry.id, e.target.value)
                            }
                            className="w-full px-2 py-1.5 text-sm font-medium text-slate-900 bg-transparent border border-transparent hover:border-slate-300 focus:border-teal-600 focus:bg-white rounded-md focus:outline-none transition-colors"
                          />
                          <div className="px-2 mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                            <span className="tabular-nums">فئة {entry.category}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* COLUMN 2: Number of Cards (Direct numeric input only) */}
                    <td className="py-2.5 px-3 border-l border-slate-200 align-middle">
                      <input
                        type="text"
                        inputMode="numeric"
                        aria-label={`عدد الكروت للعميل ${entry.customerName}`}
                        value={entry.cardCount === null ? '' : String(entry.cardCount)}
                        placeholder="أدخل العدد"
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val.trim() === '') {
                            onUpdateCardCount(entry.id, null);
                            return;
                          }
                          const parsed = parseCardCountInput(val);
                          if (parsed !== null) {
                            onUpdateCardCount(entry.id, parsed);
                          }
                        }}
                        className="w-full max-w-[140px] min-h-[40px] px-3 py-1.5 text-center font-mono tabular-nums text-sm font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20 placeholder:font-sans placeholder:text-xs placeholder:font-normal placeholder:text-slate-400"
                      />
                    </td>

                    {/* COLUMN 3: Automatic Entry Date & Row Actions */}
                    <td className="py-2.5 px-3 align-middle">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-[140px]">
                          {entry.entryDate ? (
                            <div className="flex items-center gap-1.5">
                              <span
                                data-testid={`entry-date-${entry.id}`}
                                className={`font-mono tabular-nums text-xs font-medium ${
                                  isJustStamped ? 'text-teal-800 font-semibold' : 'text-slate-800'
                                }`}
                              >
                                {entry.entryDate}
                              </span>
                              {isJustStamped && (
                                <span className="inline-flex items-center gap-0.5 text-[11px] text-teal-700 font-medium">
                                  <Check className="w-3 h-3" />
                                  <span>تلقائي</span>
                                </span>
                              )}
                            </div>
                          ) : (
                            <span
                              data-testid={`entry-date-${entry.id}`}
                              className="text-xs text-slate-400 italic"
                            >
                              يُكتب تلقائياً عند إدخال العدد
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0 no-print">
                          <button
                            type="button"
                            onClick={() => onInspectHistory(entry)}
                            aria-label={`سجل تواريخ ${entry.customerName}`}
                            title="عرض سجل التواريخ"
                            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onDeleteEntry(entry.id)}
                            aria-label={`حذف العميل ${entry.customerName}`}
                            title="حذف السطر"
                            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}

            {/* Inline Quick-Add Row directly inside the Category Table */}
            <tr className="bg-slate-50/90 border-t border-slate-200 no-print">
              <td className="py-2 px-3 border-l border-slate-200">
                <input
                  type="text"
                  aria-label={`إضافة عميل جديد مباشرة في فئة ${category}`}
                  value={inlineNewName}
                  onChange={(e) => setInlineNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleInlineRowAdd(e);
                  }}
                  placeholder={`+ اكتب اسم عميل جديد في فئة ${category}...`}
                  className="w-full min-h-[38px] px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none"
                />
              </td>
              <td className="py-2 px-3 border-l border-slate-200">
                <input
                  type="text"
                  inputMode="numeric"
                  aria-label={`إدخال عدد الكروت لعميل جديد في فئة ${category}`}
                  value={inlineNewCount}
                  onChange={(e) => setInlineNewCount(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleInlineRowAdd(e);
                  }}
                  placeholder="العدد (اختياري)"
                  className="w-full max-w-[110px] min-h-[38px] px-2.5 py-1 text-center font-mono tabular-nums text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-teal-600 focus:outline-none"
                />
              </td>
              <td className="py-2 px-3">
                <button
                  type="button"
                  onClick={handleInlineRowAdd}
                  disabled={!inlineNewName.trim()}
                  className="min-h-[38px] px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إدراج بالجدول</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
