import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeArabicDigits,
  parseCardCountInput,
  formatAutoEntryDate,
  createCustomerEntry,
  updateEntryCountWithAutoDate,
  calculateBonusStatus,
  claimCustomerBonus,
  calculateLedgerSummary,
} from './ledgerLogic';

test('normalizeArabicDigits converts Eastern Arabic numerals to ASCII digits', () => {
  assert.equal(normalizeArabicDigits('٢٠٠'), '200');
  assert.equal(normalizeArabicDigits('٣٠٠'), '300');
  assert.equal(normalizeArabicDigits('٥٠٠'), '500');
  assert.equal(normalizeArabicDigits('١٢'), '12');
});

test('parseCardCountInput parses valid ASCII and Arabic integers and returns null for empty', () => {
  assert.equal(parseCardCountInput(''), null);
  assert.equal(parseCardCountInput('   '), null);
  assert.equal(parseCardCountInput('7'), 7);
  assert.equal(parseCardCountInput('٧'), 7);
  assert.equal(parseCardCountInput('0'), 0);
  assert.equal(parseCardCountInput('-3'), null);
});

test('updateEntryCountWithAutoDate automatically sets the date when cardCount is entered', () => {
  const initial = createCustomerEntry({
    id: 'test-1',
    category: 200,
    customerName: 'عميل تجريبي',
    cardCount: null,
  });

  assert.equal(initial.cardCount, null);
  assert.equal(initial.entryDate, '');

  const fixedMoment = new Date(2026, 10, 3, 14, 5, 0); // 2026/11/03 02:05 م
  const updated = updateEntryCountWithAutoDate(initial, 4, fixedMoment);

  assert.equal(updated.cardCount, 4);
  assert.equal(updated.entryDate, formatAutoEntryDate(fixedMoment));
  assert.ok(updated.entryDate.includes('2026/11/03'));
  assert.equal(updated.history.length, 1);

  // Clearing the count clears the automatic date
  const cleared = updateEntryCountWithAutoDate(updated, null, fixedMoment);
  assert.equal(cleared.cardCount, null);
  assert.equal(cleared.entryDate, '');
});

test('calculateBonusStatus and claimCustomerBonus track Wi-Fi card bonuses accurately', () => {
  const entry = createCustomerEntry({
    category: 500,
    customerName: 'عميل البونص',
    cardCount: 12,
    bonusesClaimed: 1,
  });

  // With threshold = 5 cards per bonus: 12 cards = 2 total bonuses earned, 1 claimed => 1 available, 2/5 toward next
  const status = calculateBonusStatus(entry, 5);
  assert.equal(status.earnedBonusesTotal, 2);
  assert.equal(status.availableBonusesToClaim, 1);
  assert.equal(status.cardsTowardNextBonus, 2);
  assert.equal(status.cardsRemainingForNextBonus, 3);
  assert.equal(status.isEligibleForBonus, true);

  const afterClaim = claimCustomerBonus(entry, 5, new Date(2026, 10, 3, 15, 0, 0));
  assert.equal(afterClaim.bonusesClaimed, 2);
  const statusAfter = calculateBonusStatus(afterClaim, 5);
  assert.equal(statusAfter.availableBonusesToClaim, 0);
  assert.equal(statusAfter.isEligibleForBonus, false);
});

test('calculateLedgerSummary aggregates counts and values across categories 200, 300, 500', () => {
  const entries = [
    createCustomerEntry({ category: 200, customerName: 'أ', cardCount: 5 }),
    createCustomerEntry({ category: 300, customerName: 'ب', cardCount: 2 }),
    createCustomerEntry({ category: 500, customerName: 'ج', cardCount: 10, bonusesClaimed: 1 }),
  ];

  const summary = calculateLedgerSummary(entries, 5);
  assert.equal(summary.totalCustomers, 3);
  assert.equal(summary.totalCardsCount, 17);
  assert.equal(summary.totalValue, 5 * 200 + 2 * 300 + 10 * 500);
  assert.equal(summary.totalAvailableBonuses, 2); // 1 from 200, 0 from 300, 1 remaining from 500
});

test('buildStandaloneOfflineAppHtml embeds current entries and categories 200, 300, 500 for offline sharing', async () => {
  const { buildStandaloneOfflineAppHtml } = await import('./standaloneApkExport');
  const entries = [
    createCustomerEntry({ category: 200, customerName: 'عميل أوفلاين', cardCount: 6 }),
  ];
  const html = buildStandaloneOfflineAppHtml(entries, {
    cardsPerBonus: 5,
    networkName: 'شبكة البرق',
    currencyLabel: 'ريال',
  });
  assert.ok(html.includes('<!doctype html>'));
  assert.ok(html.includes('عميل أوفلاين'));
  assert.ok(html.includes('شبكة البرق'));
  assert.ok(html.includes('فئة 200'));
  assert.ok(html.includes('فئة 300'));
  assert.ok(html.includes('فئة 500'));
  assert.ok(!html.includes('stepCount('), 'Standalone app should not have +/- stepper buttons');
});

test('buildExcelWorkbook creates separate sheets and tables for categories 200, 300, and 500', async () => {
  const XLSX = await import('xlsx');
  const { buildExcelWorkbook } = await import('./excelExport');
  const entries = [
    createCustomerEntry({ category: 200, customerName: 'عميل مئتين', cardCount: 4 }),
    createCustomerEntry({ category: 300, customerName: 'عميل ثلاثمئة', cardCount: 3 }),
    createCustomerEntry({ category: 500, customerName: 'عميل خمسمئة', cardCount: 2 }),
  ];

  const wb = buildExcelWorkbook(entries);
  assert.deepEqual(wb.SheetNames, ['جميع الفئات', 'فئة 200', 'فئة 300', 'فئة 500']);

  // Verify sheet "فئة 200" only contains category 200 customer and its total
  const sheet200 = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets['فئة 200'], { header: 1 });
  assert.equal(sheet200[0][0], 'جدول كروت فئة 200');
  assert.equal(sheet200[2][1], 'عميل مئتين');
  assert.equal(sheet200[2][2], 4);
  assert.equal(sheet200[3][0], 'الإجمالي');
  assert.equal(sheet200[3][2], 4);
  const flat200 = sheet200.flat().join(' ');
  assert.ok(!flat200.includes('عميل ثلاثمئة'));
  assert.ok(!flat200.includes('عميل خمسمئة'));

  // Verify sheet "فئة 300" only contains category 300 customer
  const sheet300 = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets['فئة 300'], { header: 1 });
  assert.equal(sheet300[0][0], 'جدول كروت فئة 300');
  assert.equal(sheet300[2][1], 'عميل ثلاثمئة');

  // Verify sheet "فئة 500" only contains category 500 customer
  const sheet500 = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets['فئة 500'], { header: 1 });
  assert.equal(sheet500[0][0], 'جدول كروت فئة 500');
  assert.equal(sheet500[2][1], 'عميل خمسمئة');

  // Verify combined sheet has all 3 separate tables
  const overview = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets['جميع الفئات'], { header: 1 });
  const overviewText = overview.flat().join('\n');
  assert.ok(overviewText.includes('جدول كروت فئة 200'));
  assert.ok(overviewText.includes('جدول كروت فئة 300'));
  assert.ok(overviewText.includes('جدول كروت فئة 500'));
});

test('exportEntriesToCsv separates categories 200, 300, and 500 into distinct tables', async () => {
  const { exportEntriesToCsv } = await import('./ledgerLogic');
  const entries = [
    createCustomerEntry({ category: 200, customerName: 'سالم', cardCount: 2 }),
    createCustomerEntry({ category: 500, customerName: 'كريم', cardCount: 5 }),
  ];
  const csv = exportEntriesToCsv(entries);
  assert.ok(csv.includes('جدول كروت فئة 200'));
  assert.ok(csv.includes('جدول كروت فئة 300'));
  assert.ok(csv.includes('جدول كروت فئة 500'));
  assert.ok(csv.indexOf('جدول كروت فئة 200') < csv.indexOf('جدول كروت فئة 300'));
  assert.ok(csv.indexOf('جدول كروت فئة 300') < csv.indexOf('جدول كروت فئة 500'));
});


