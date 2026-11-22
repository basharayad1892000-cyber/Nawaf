/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Download,
  RotateCcw,
} from 'lucide-react';
import {
  CardCategory,
  CARD_CATEGORIES,
  CustomerCardEntry,
  getInitialSeedEntries,
  createCustomerEntry,
  updateEntryCountWithAutoDate,
  calculateLedgerSummary,
} from './utils/ledgerLogic';
import { downloadEntriesAsExcel } from './utils/excelExport';
import { QuickEntryBar } from './components/QuickEntryBar';
import { CategoryLedgerTable } from './components/CategoryLedgerTable';
import { CustomerHistoryModal } from './components/BonusAndApkModal';

const STORAGE_ENTRIES_KEY = 'wifi_cards_ledger_entries_v1';

type FilterMode = 'all' | 200 | 300 | 500;

export default function App() {
  const [entries, setEntries] = useState<CustomerCardEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ENTRIES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore storage errors
    }
    return getInitialSeedEntries();
  });

  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [recentlyStampedId, setRecentlyStampedId] = useState<string | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);
  const [historyEntryId, setHistoryEntryId] = useState<string | null>(null);

  // Persist entries to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ENTRIES_KEY, JSON.stringify(entries));
    } catch {
      // ignore quota errors
    }
  }, [entries]);

  const showTransientFeedback = (message: string, entryId?: string) => {
    setStatusFeedback(message);
    if (entryId) {
      setRecentlyStampedId(entryId);
    }
    setTimeout(() => {
      setStatusFeedback((prev) => (prev === message ? null : prev));
      if (entryId) {
        setRecentlyStampedId((prev) => (prev === entryId ? null : prev));
      }
    }, 2800);
  };

  // Handlers
  const handleAddEntry = (params: {
    category: CardCategory;
    customerName: string;
    cardCount: number | null;
  }) => {
    const now = new Date();
    const newEntry = createCustomerEntry({
      category: params.category,
      customerName: params.customerName,
      cardCount: params.cardCount,
      now,
    });

    setEntries((prev) => [newEntry, ...prev]);

    if (params.cardCount !== null) {
      showTransientFeedback(
        `تمت إضافة "${newEntry.customerName}" (فئة ${newEntry.category}) وكتابة التاريخ تلقائياً: ${newEntry.entryDate}`,
        newEntry.id
      );
    } else {
      showTransientFeedback(
        `تمت إضافة "${newEntry.customerName}" في جدول فئة ${newEntry.category}. سيُكتب التاريخ تلقائياً فور إدخال العدد.`
      );
    }
  };

  const handleUpdateCustomerName = (id: string, newName: string) => {
    setEntries((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, customerName: newName } : item
      )
    );
  };

  const handleUpdateCardCount = (id: string, newCount: number | null) => {
    const now = new Date();
    let updatedCustomerName = '';
    let updatedDateStr = '';

    setEntries((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = updateEntryCountWithAutoDate(item, newCount, now);
        updatedCustomerName = updated.customerName;
        updatedDateStr = updated.entryDate;
        return updated;
      })
    );

    if (newCount !== null) {
      showTransientFeedback(
        `تم إدخال العدد (${newCount}) للعميل "${updatedCustomerName}" وتدوين التاريخ تلقائياً (${updatedDateStr})`,
        id
      );
    } else {
      showTransientFeedback(
        `تم مسح العدد والتاريخ للعميل "${updatedCustomerName}"`
      );
    }
  };

  const handleDeleteEntry = (id: string) => {
    const target = entries.find((e) => e.id === id);
    setEntries((prev) => prev.filter((item) => item.id !== id));
    if (target) {
      showTransientFeedback(`تم حذف سجل العميل "${target.customerName}"`);
    }
  };

  const handleExportExcel = () => {
    downloadEntriesAsExcel(entries);
    showTransientFeedback(
      'تم تصدير ملف الإكسل (.xlsx) بنجاح مع فصل كل فئة (٢٠٠ · ٣٠٠ · ٥٠٠) في جدول وورقة مستقلة'
    );
  };

  // Filtered entries
  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return entries.filter((entry) => {
      if (filterMode === 200 && entry.category !== 200) return false;
      if (filterMode === 300 && entry.category !== 300) return false;
      if (filterMode === 500 && entry.category !== 500) return false;
      if (q && !entry.customerName.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [entries, filterMode, searchQuery]);

  const summary = useMemo(() => calculateLedgerSummary(entries, 5), [entries]);

  const visibleCategories: CardCategory[] = useMemo(() => {
    if (filterMode === 200) return [200];
    if (filterMode === 300) return [300];
    if (filterMode === 500) return [500];
    return [...CARD_CATEGORIES];
  }, [filterMode]);

  const activeHistoryEntry = useMemo(
    () => entries.find((e) => e.id === historyEntryId) ?? null,
    [entries, historyEntryId]
  );

  const defaultQuickCategory: CardCategory =
    filterMode === 200 || filterMode === 300 || filterMode === 500
      ? filterMode
      : 200;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Strict 3-Zone Top Navigation Bar Contract */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-8 no-print">
        {/* Zone 1: Brand Title (Single text element, one line) */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setFilterMode('all');
          }}
          className="text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          سجل كروت الواي فاي
        </a>

        {/* Zone 2: 4 Concise Single-Line Navigation Links */}
        <nav
          aria-label="التنقل بين فئات الكروت"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
        >
          <a
            href="#all-categories"
            onClick={(e) => {
              e.preventDefault();
              setFilterMode('all');
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
              filterMode === 'all' ? 'text-teal-700 font-semibold underline underline-offset-8' : ''
            }`}
          >
            كل الفئات
          </a>
          <a
            href="#category-200"
            onClick={(e) => {
              e.preventDefault();
              setFilterMode(200);
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
              filterMode === 200 ? 'text-teal-700 font-semibold underline underline-offset-8' : ''
            }`}
          >
            فئة 200
          </a>
          <a
            href="#category-300"
            onClick={(e) => {
              e.preventDefault();
              setFilterMode(300);
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
              filterMode === 300 ? 'text-teal-700 font-semibold underline underline-offset-8' : ''
            }`}
          >
            فئة 300
          </a>
          <a
            href="#category-500"
            onClick={(e) => {
              e.preventDefault();
              setFilterMode(500);
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
              filterMode === 500 ? 'text-teal-700 font-semibold underline underline-offset-8' : ''
            }`}
          >
            فئة 500
          </a>
        </nav>

        {/* Zone 3: 1 Primary Action Button */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={handleExportExcel}
            className="min-h-[40px] px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير الجدول (Excel)</span>
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main id="top" className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Title Bar */}
        <div className="border-b border-slate-200 pb-4">
          <p className="text-xs text-slate-500 mb-1">
            نظام تدوين وحفظ كروت العملاء مع كتابة التاريخ تلقائياً عند إدخال العدد
          </p>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            جدول كروت العملاء والتاريخ التلقائي (فئات ٢٠٠ · ٣٠٠ · ٥٠٠)
          </h1>
        </div>

        {/* Live Feedback Banner when count is entered and date is auto-stamped */}
        {statusFeedback && (
          <div
            role="status"
            aria-live="polite"
            className="px-4 py-3 bg-teal-900 text-white text-xs sm:text-sm font-medium rounded-xl flex items-center justify-between gap-3"
          >
            <span>{statusFeedback}</span>
            <button
              type="button"
              onClick={() => setStatusFeedback(null)}
              className="text-xs text-teal-200 hover:text-white underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              إخفاء
            </button>
          </div>
        )}

        {/* Compact 4-Column Summary KPI Strip */}
        <section
          aria-label="ملخص الكروت حسب الفئة"
          className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4"
        >
          <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4">
            <div className="text-xs text-slate-500">كروت فئة 200</div>
            <div className="mt-0.5 text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-900">
              {summary.byCategory[200].cardsCount}
            </div>
            <div className="mt-0.5 text-xs text-slate-500 tabular-nums">
              {summary.byCategory[200].customerCount} عميل · {summary.byCategory[200].totalValue.toLocaleString('en-US')} ريال
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4">
            <div className="text-xs text-slate-500">كروت فئة 300</div>
            <div className="mt-0.5 text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-900">
              {summary.byCategory[300].cardsCount}
            </div>
            <div className="mt-0.5 text-xs text-slate-500 tabular-nums">
              {summary.byCategory[300].customerCount} عميل · {summary.byCategory[300].totalValue.toLocaleString('en-US')} ريال
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4">
            <div className="text-xs text-slate-500">كروت فئة 500</div>
            <div className="mt-0.5 text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-900">
              {summary.byCategory[500].cardsCount}
            </div>
            <div className="mt-0.5 text-xs text-slate-500 tabular-nums">
              {summary.byCategory[500].customerCount} عميل · {summary.byCategory[500].totalValue.toLocaleString('en-US')} ريال
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4">
            <div className="text-xs text-slate-500">إجمالي الكروت الكلي</div>
            <div className="mt-0.5 text-xl sm:text-2xl font-bold font-mono tabular-nums text-teal-700">
              {summary.totalCardsCount}
            </div>
            <div className="mt-0.5 text-xs text-slate-500 tabular-nums">
              {summary.totalCustomers} عميل · {summary.totalValue.toLocaleString('en-US')} ريال
            </div>
          </div>
        </section>

        {/* Filter & Search Toolbar */}
        <section
          aria-label="تصفية وبحث في الجداول"
          className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 no-print"
        >
          {/* Interactive Segmented Category Filter Controls */}
          <div
            role="group"
            aria-label="تصفية الجداول حسب الفئة"
            className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-xl overflow-x-auto"
          >
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`min-h-[38px] px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              جميع الفئات (200 · 300 · 500)
            </button>

            {CARD_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterMode(cat)}
                className={`min-h-[38px] px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 tabular-nums cursor-pointer ${
                  filterMode === cat
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                جدول فئة {cat}
              </button>
            ))}
          </div>

          {/* Customer Search Input */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              aria-label="بحث باسم العميل"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن اسم العميل..."
              className="w-full min-h-[40px] pr-9 pl-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none"
            />
          </div>
        </section>

        {/* Empty State if search has 0 results */}
        {filteredEntries.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
            <p className="text-base font-semibold text-slate-900">
              لا توجد سجلات مطابقة للبحث الحالي
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              يمكنك عرض جميع الفئات (٢٠٠، ٣٠٠، ٥٠٠) أو إضافة عميل جديد مباشرة إلى الجدول.
            </p>
            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setFilterMode('all');
                  setSearchQuery('');
                }}
                className="min-h-[40px] px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إظهار كافة الجداول</span>
              </button>
            </div>
          </div>
        ) : (
          /* Render the 3 Category Tables (200, 300, 500) */
          <div className="space-y-6">
            {visibleCategories.map((cat) => {
              const catEntries = filteredEntries.filter(
                (item) => item.category === cat
              );
              return (
                <CategoryLedgerTable
                  key={cat}
                  category={cat}
                  entries={catEntries}
                  recentlyStampedId={recentlyStampedId}
                  onUpdateCustomerName={handleUpdateCustomerName}
                  onUpdateCardCount={handleUpdateCardCount}
                  onDeleteEntry={handleDeleteEntry}
                  onInspectHistory={(entry) => setHistoryEntryId(entry.id)}
                  onQuickAddRowInCategory={handleAddEntry}
                />
              );
            })}
          </div>
        )}

        {/* Quick Entry Bar (Add customer + optional initial count with instant auto-date) */}
        <QuickEntryBar
          defaultCategory={defaultQuickCategory}
          onAddEntry={handleAddEntry}
        />
      </main>

      {/* Quiet Footer */}
      <footer className="mt-12 border-t border-slate-200 bg-white py-4 px-4 sm:px-6 text-xs text-slate-500 no-print">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <span>
            سجل كروت الواي فاي — يتم حفظ جميع الإدخالات والتواريخ تلقائياً على جهازك
          </span>
        </div>
      </footer>

      {/* Customer Date History Modal */}
      <CustomerHistoryModal
        entry={activeHistoryEntry}
        onClose={() => setHistoryEntryId(null)}
      />
    </div>
  );
}
