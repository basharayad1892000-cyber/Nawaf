export type CardCategory = 200 | 300 | 500;

export const CARD_CATEGORIES: readonly CardCategory[] = [200, 300, 500] as const;

export interface CardHistoryLog {
  id: string;
  previousCount: number | null;
  newCount: number | null;
  timestampIso: string;
  formattedDate: string;
  note: string;
}

export interface CustomerCardEntry {
  id: string;
  category: CardCategory;
  customerName: string;
  cardCount: number | null;
  entryDate: string; // Automatically populated when cardCount is entered
  lastUpdatedIso: string | null;
  bonusesClaimed: number;
  notes?: string;
  history: CardHistoryLog[];
}

export interface BonusSettings {
  cardsPerBonus: number; // e.g., every 5 or 10 cards gives 1 free bonus card
  networkName: string;
  currencyLabel: string;
}

export interface BonusStatus {
  totalCards: number;
  earnedBonusesTotal: number;
  bonusesClaimed: number;
  availableBonusesToClaim: number;
  cardsTowardNextBonus: number;
  cardsRemainingForNextBonus: number;
  isEligibleForBonus: boolean;
}

/**
 * Converts Eastern Arabic numerals (٠١٢٣٤٥٦٧٨٩) to standard ASCII digits (0-9)
 */
export function normalizeArabicDigits(input: string): string {
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
  return input
    .replace(/[٠-٩]/g, (d) => String(arabicDigits.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(persianDigits.indexOf(d)));
}

/**
 * Parses user input for card count (supports Arabic numerals and empty strings).
 * Returns null if empty/cleared, or a non-negative integer.
 */
export function parseCardCountInput(raw: string): number | null {
  const trimmed = normalizeArabicDigits(raw).trim();
  if (trimmed === '') return null;
  const parsed = Number.parseInt(trimmed, 10);
  if (Number.isNaN(parsed) || parsed < 0) return null;
  return parsed;
}

/**
 * Formats a Date object into a clear, readable date & time string suitable for the table's Date column:
 * YYYY/MM/DD - HH:MM (in 12-hour format with ص/م)
 */
export function formatAutoEntryDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const period = hours >= 12 ? 'م' : 'ص';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const hoursStr = String(hours).padStart(2, '0');

  return `${year}/${month}/${day} · ${hoursStr}:${minutes} ${period}`;
}

/**
 * Core rule requested by user:
 * "وعندما اقوم بإدخال العدد ان يقوم التطبيق تلقائيا بكتابة التاريخ في خانه التاريخ ويكون التاريخ التلقائي في حين ادخال العدد"
 * Whenever cardCount is entered or changed to a valid positive/non-negative number,
 * entryDate is automatically populated with the exact date/time of entry.
 * If cardCount is cleared (null), entryDate is cleared to ''.
 */
export function updateEntryCountWithAutoDate(
  entry: CustomerCardEntry,
  newCountInput: number | null,
  now: Date = new Date()
): CustomerCardEntry {
  if (newCountInput === null) {
    return {
      ...entry,
      cardCount: null,
      entryDate: '',
      lastUpdatedIso: null,
    };
  }

  const sanitizedCount = Math.max(0, Math.floor(newCountInput));
  const autoDate = formatAutoEntryDate(now);
  const iso = now.toISOString();

  // Only append history if count actually changed
  const historyItem: CardHistoryLog = {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 6)}`,
    previousCount: entry.cardCount,
    newCount: sanitizedCount,
    timestampIso: iso,
    formattedDate: autoDate,
    note:
      entry.cardCount === null
        ? `إدخال العدد الأول (${sanitizedCount})`
        : `تحديث العدد من ${entry.cardCount} إلى ${sanitizedCount}`,
  };

  return {
    ...entry,
    cardCount: sanitizedCount,
    entryDate: autoDate,
    lastUpdatedIso: iso,
    history:
      entry.cardCount === sanitizedCount
        ? entry.history
        : [historyItem, ...entry.history].slice(0, 25),
  };
}

/**
 * Creates a brand new customer row in the specified category (200, 300, or 500).
 * If an initial cardCount is provided, the date is automatically written immediately.
 */
export function createCustomerEntry(params: {
  id?: string;
  category: CardCategory;
  customerName: string;
  cardCount: number | null;
  now?: Date;
  bonusesClaimed?: number;
}): CustomerCardEntry {
  const now = params.now ?? new Date();
  const hasCount = params.cardCount !== null && params.cardCount >= 0;
  const cleanCount = hasCount ? Math.floor(params.cardCount!) : null;
  const autoDate = hasCount ? formatAutoEntryDate(now) : '';
  const iso = hasCount ? now.toISOString() : null;

  return {
    id: params.id ?? `entry-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
    category: params.category,
    customerName: params.customerName.trim(),
    cardCount: cleanCount,
    entryDate: autoDate,
    lastUpdatedIso: iso,
    bonusesClaimed: params.bonusesClaimed ?? 0,
    history:
      hasCount && cleanCount !== null
        ? [
            {
              id: `init-${now.getTime()}`,
              previousCount: null,
              newCount: cleanCount,
              timestampIso: iso!,
              formattedDate: autoDate,
              note: `إدخال العدد (${cleanCount})`,
            },
          ]
        : [],
  };
}

/**
 * Calculates how many bonuses a customer has earned and how many are ready to be claimed.
 */
export function calculateBonusStatus(
  entry: Pick<CustomerCardEntry, 'cardCount' | 'bonusesClaimed'>,
  cardsPerBonus: number
): BonusStatus {
  const safeThreshold = Math.max(1, Math.floor(cardsPerBonus));
  const totalCards = Math.max(0, entry.cardCount ?? 0);
  const earnedBonusesTotal = Math.floor(totalCards / safeThreshold);
  const bonusesClaimed = Math.max(0, entry.bonusesClaimed);
  const availableBonusesToClaim = Math.max(0, earnedBonusesTotal - bonusesClaimed);
  const cardsTowardNextBonus = totalCards % safeThreshold;
  const cardsRemainingForNextBonus = safeThreshold - cardsTowardNextBonus;

  return {
    totalCards,
    earnedBonusesTotal,
    bonusesClaimed,
    availableBonusesToClaim,
    cardsTowardNextBonus,
    cardsRemainingForNextBonus,
    isEligibleForBonus: availableBonusesToClaim > 0,
  };
}

/**
 * Claims 1 available bonus for a customer and records it in their history.
 */
export function claimCustomerBonus(
  entry: CustomerCardEntry,
  cardsPerBonus: number,
  now: Date = new Date()
): CustomerCardEntry {
  const status = calculateBonusStatus(entry, cardsPerBonus);
  if (!status.isEligibleForBonus) {
    return entry;
  }

  const autoDate = formatAutoEntryDate(now);
  const iso = now.toISOString();

  const bonusLog: CardHistoryLog = {
    id: `bonus-${now.getTime()}-${Math.random().toString(36).slice(2, 6)}`,
    previousCount: entry.cardCount,
    newCount: entry.cardCount,
    timestampIso: iso,
    formattedDate: autoDate,
    note: `صرف كرت بونص مجاني (فئة ${entry.category})`,
  };

  return {
    ...entry,
    bonusesClaimed: entry.bonusesClaimed + 1,
    history: [bonusLog, ...entry.history].slice(0, 25),
  };
}

/**
 * Computes summary statistics across all entries or per category.
 */
export function calculateLedgerSummary(
  entries: CustomerCardEntry[],
  cardsPerBonus: number
) {
  let totalCustomers = entries.length;
  let totalCardsCount = 0;
  let totalValue = 0;
  let totalAvailableBonuses = 0;
  let totalClaimedBonuses = 0;

  const byCategory: Record<
    CardCategory,
    {
      customerCount: number;
      cardsCount: number;
      totalValue: number;
      availableBonuses: number;
    }
  > = {
    200: { customerCount: 0, cardsCount: 0, totalValue: 0, availableBonuses: 0 },
    300: { customerCount: 0, cardsCount: 0, totalValue: 0, availableBonuses: 0 },
    500: { customerCount: 0, cardsCount: 0, totalValue: 0, availableBonuses: 0 },
  };

  for (const item of entries) {
    const count = item.cardCount ?? 0;
    const val = count * item.category;
    const bonus = calculateBonusStatus(item, cardsPerBonus);

    totalCardsCount += count;
    totalValue += val;
    totalAvailableBonuses += bonus.availableBonusesToClaim;
    totalClaimedBonuses += item.bonusesClaimed;

    byCategory[item.category].customerCount += 1;
    byCategory[item.category].cardsCount += count;
    byCategory[item.category].totalValue += val;
    byCategory[item.category].availableBonuses += bonus.availableBonusesToClaim;
  }

  return {
    totalCustomers,
    totalCardsCount,
    totalValue,
    totalAvailableBonuses,
    totalClaimedBonuses,
    byCategory,
  };
}

/**
 * Exports the ledger entries to a UTF-8 BOM CSV string with each card category
 * (200, 300, 500) separated into its own standalone table with header and subtotal.
 */
export function exportEntriesToCsv(
  entries: CustomerCardEntry[],
  _cardsPerBonus: number = 5
): string {
  const sections: string[] = [];

  for (const cat of CARD_CATEGORIES) {
    const catEntries = entries.filter((e) => e.category === cat);
    const totalCards = catEntries.reduce((sum, e) => sum + (e.cardCount ?? 0), 0);
    const totalValue = totalCards * cat;

    const lines: string[] = [
      `"جدول كروت فئة ${cat}",,,`,
      ['م', `اسم العميل (فئة ${cat})`, 'عدد الكروت', 'تاريخ إدخال العدد'].join(','),
    ];

    if (catEntries.length === 0) {
      lines.push(',"لا يوجد عملاء في هذه الفئة",,');
    } else {
      catEntries.forEach((e, idx) => {
        const safeName = `"${e.customerName.replace(/"/g, '""')}"`;
        const countStr = e.cardCount !== null ? String(e.cardCount) : '';
        const safeDate = `"${e.entryDate}"`;
        lines.push([String(idx + 1), safeName, countStr, safeDate].join(','));
      });
    }

    lines.push(
      [
        '"الإجمالي"',
        `"${catEntries.length} عميل"`,
        String(totalCards),
        `"القيمة: ${totalValue.toLocaleString('en-US')} ريال"`,
      ].join(',')
    );

    sections.push(lines.join('\n'));
  }

  return '\uFEFF' + sections.join('\n\n');
}

/**
 * Initial deterministic seed data so the user immediately sees their 3 categories (200, 300, 500)
 * in the exact 3-column table structure, ready to edit or add to.
 */
export function getInitialSeedEntries(): CustomerCardEntry[] {
  const baseDate1 = new Date('2026-11-03T09:30:00');
  const baseDate2 = new Date('2026-11-03T10:15:00');
  const baseDate3 = new Date('2026-11-03T11:45:00');
  const baseDate4 = new Date('2026-11-03T12:20:00');

  return [
    // فئة 200
    createCustomerEntry({
      id: 'seed-200-1',
      category: 200,
      customerName: 'محمد عبدالله الصالح',
      cardCount: 6,
      now: baseDate1,
      bonusesClaimed: 0,
    }),
    createCustomerEntry({
      id: 'seed-200-2',
      category: 200,
      customerName: 'أحمد يحيى الحربي',
      cardCount: 3,
      now: baseDate2,
      bonusesClaimed: 0,
    }),
    createCustomerEntry({
      id: 'seed-200-3',
      category: 200,
      customerName: 'خالد سعيد المقطري',
      cardCount: null, // Empty count row ready to test automatic date upon typing a number!
      now: baseDate2,
      bonusesClaimed: 0,
    }),

    // فئة 300
    createCustomerEntry({
      id: 'seed-300-1',
      category: 300,
      customerName: 'عبدالرحمن قاسم',
      cardCount: 5,
      now: baseDate3,
      bonusesClaimed: 0,
    }),
    createCustomerEntry({
      id: 'seed-300-2',
      category: 300,
      customerName: 'ياسر علي النعيمي',
      cardCount: 2,
      now: baseDate3,
      bonusesClaimed: 0,
    }),

    // فئة 500
    createCustomerEntry({
      id: 'seed-500-1',
      category: 500,
      customerName: 'بشار عياد',
      cardCount: 10,
      now: baseDate4,
      bonusesClaimed: 1,
    }),
    createCustomerEntry({
      id: 'seed-500-2',
      category: 500,
      customerName: 'نبيل منصور الشرعبي',
      cardCount: 4,
      now: baseDate4,
      bonusesClaimed: 0,
    }),
  ];
}
