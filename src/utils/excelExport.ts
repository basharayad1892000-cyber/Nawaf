import * as XLSX from 'xlsx';
import {
  CARD_CATEGORIES,
  CardCategory,
  CustomerCardEntry,
} from './ledgerLogic';

type CellValue = string | number;

const SHEET_COLUMN_WIDTHS: XLSX.ColInfo[] = [
  { wch: 10 }, // م / الإجمالي
  { wch: 30 }, // اسم العميل
  { wch: 16 }, // عدد الكروت
  { wch: 28 }, // تاريخ إدخال العدد
];

/**
 * Builds the rows for a single standalone category table (title, column headers, customer rows, total row).
 */
export function buildCategoryTableRows(
  category: CardCategory,
  entries: CustomerCardEntry[]
): CellValue[][] {
  const catEntries = entries.filter((e) => e.category === category);
  const totalCards = catEntries.reduce((sum, e) => sum + (e.cardCount ?? 0), 0);
  const totalValue = totalCards * category;

  const rows: CellValue[][] = [
    [`جدول كروت فئة ${category}`, '', '', ''],
    ['م', `اسم العميل (فئة ${category})`, 'عدد الكروت', 'تاريخ إدخال العدد'],
  ];

  if (catEntries.length === 0) {
    rows.push(['', 'لا يوجد عملاء مسجلون في هذه الفئة', '', '']);
  } else {
    catEntries.forEach((entry, idx) => {
      rows.push([
        idx + 1,
        entry.customerName,
        entry.cardCount !== null ? entry.cardCount : '',
        entry.entryDate || '',
      ]);
    });
  }

  rows.push([
    'الإجمالي',
    `${catEntries.length} عميل`,
    totalCards,
    `القيمة: ${totalValue.toLocaleString('en-US')} ريال`,
  ]);

  return rows;
}

/**
 * Builds an Excel (.xlsx) workbook where each card category (200, 300, 500)
 * is separated into its own standalone table:
 *  - Sheet 1 ("جميع الفئات"): 3 separate tables (200, 300, 500) spaced with blank rows
 *  - Sheet 2 ("فئة 200"): Standalone table for category 200
 *  - Sheet 3 ("فئة 300"): Standalone table for category 300
 *  - Sheet 4 ("فئة 500"): Standalone table for category 500
 */
export function buildExcelWorkbook(entries: CustomerCardEntry[]): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();

  // 1. Combined overview sheet with 3 distinct separated tables
  const overviewRows: CellValue[][] = [];
  const overviewMerges: XLSX.Range[] = [];

  CARD_CATEGORIES.forEach((category, index) => {
    if (index > 0) {
      overviewRows.push(['', '', '', '']);
      overviewRows.push(['', '', '', '']);
    }
    const titleRowIndex = overviewRows.length;
    const tableRows = buildCategoryTableRows(category, entries);
    overviewRows.push(...tableRows);
    overviewMerges.push({
      s: { r: titleRowIndex, c: 0 },
      e: { r: titleRowIndex, c: 3 },
    });
  });

  const overviewSheet = XLSX.utils.aoa_to_sheet(overviewRows);
  overviewSheet['!cols'] = SHEET_COLUMN_WIDTHS;
  overviewSheet['!merges'] = overviewMerges;
  overviewSheet['!views'] = [{ RTL: true }];
  XLSX.utils.book_append_sheet(workbook, overviewSheet, 'جميع الفئات');

  // 2. Dedicated separate sheet for each category (200, 300, 500)
  for (const category of CARD_CATEGORIES) {
    const tableRows = buildCategoryTableRows(category, entries);
    const sheet = XLSX.utils.aoa_to_sheet(tableRows);
    sheet['!cols'] = SHEET_COLUMN_WIDTHS;
    sheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
    sheet['!views'] = [{ RTL: true }];
    XLSX.utils.book_append_sheet(workbook, sheet, `فئة ${category}`);
  }

  return workbook;
}

/**
 * Triggers a browser download of the multi-table Excel (.xlsx) workbook.
 */
export function downloadEntriesAsExcel(
  entries: CustomerCardEntry[],
  dateStamp: string = new Date().toISOString().slice(0, 10)
): string {
  const workbook = buildExcelWorkbook(entries);
  const filename = `سجل-كروت-الواي-فاي-${dateStamp}.xlsx`;
  XLSX.writeFile(workbook, filename);
  return filename;
}
