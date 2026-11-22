import React from 'react';
import { X } from 'lucide-react';
import { CustomerCardEntry } from '../utils/ledgerLogic';

interface HistoryDialogProps {
  entry: CustomerCardEntry | null;
  onClose: () => void;
}

export const CustomerHistoryModal: React.FC<HistoryDialogProps> = ({
  entry,
  onClose,
}) => {
  if (!entry) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
    >
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-xl">
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h3 id="history-modal-title" className="text-base font-bold">
              سجل تواريخ الإدخال: {entry.customerName}
            </h3>
            <p className="text-xs text-slate-300 mt-0.5 tabular-nums">
              فئة {entry.category} · العدد الحالي: {entry.cardCount ?? 0}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة السجل"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 max-h-[65vh] overflow-y-auto">
          {entry.history.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">
              لم يتم تسجيل أي حركات لهذا العميل حتى الآن.
            </p>
          ) : (
            <ul className="divide-y divide-slate-200">
              {entry.history.map((item) => (
                <li
                  key={item.id}
                  className="py-3 flex items-center justify-between gap-4"
                >
                  <div className="text-sm font-medium text-slate-900">
                    {item.note}
                  </div>
                  <div className="text-xs font-mono tabular-nums text-slate-500 shrink-0">
                    {item.formattedDate}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
