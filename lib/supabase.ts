// lib/supabase.ts
// ─── Browser client (components / client hooks) ───────────────────
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// ─── Taiwan holiday database 2024–2027 ───────────────────────────
export const TW_HOLIDAYS: Record<number, { holidays: Set<string>; makeupDays: Set<string> }> = {
  2024: {
    holidays: new Set(['2024-01-01','2024-02-08','2024-02-09','2024-02-10','2024-02-11','2024-02-12','2024-02-13','2024-02-14','2024-02-28','2024-04-04','2024-04-05','2024-05-01','2024-06-10','2024-09-17','2024-10-10']),
    makeupDays: new Set(['2024-01-13','2024-02-17']),
  },
  2025: {
    holidays: new Set(['2025-01-01','2025-01-27','2025-01-28','2025-01-29','2025-01-30','2025-01-31','2025-02-03','2025-02-04','2025-02-28','2025-04-03','2025-04-04','2025-05-01','2025-05-30','2025-10-06','2025-10-10']),
    makeupDays: new Set(['2025-01-18','2025-02-08']),
  },
  2026: {
    holidays: new Set(['2026-01-01','2026-02-16','2026-02-17','2026-02-18','2026-02-19','2026-02-20','2026-02-27','2026-04-03','2026-04-06','2026-05-01','2026-06-19','2026-09-25','2026-10-09','2026-10-10']),
    makeupDays: new Set(['2026-02-14','2026-10-03']),
  },
  2027: {
    holidays: new Set(['2027-01-01','2027-02-05','2027-02-06','2027-02-07','2027-02-08','2027-02-09','2027-02-10','2027-02-11','2027-03-01','2027-04-05','2027-04-30','2027-06-09','2027-10-15','2027-10-11']),
    makeupDays: new Set(['2027-02-20']),
  },
};

export function getWeekDates(weekStr: string) {
  const [yearStr, wStr] = weekStr.split('-W');
  const y = parseInt(yearStr), wn = parseInt(wStr);
  const simple = new Date(y, 0, 1 + (wn - 1) * 7);
  const dow = simple.getDay();
  const mon = new Date(simple);
  mon.setDate(simple.getDate() - (dow === 0 ? 6 : dow - 1));
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  const sat = new Date(mon); sat.setDate(mon.getDate() + 5);
  const fri = new Date(mon); fri.setDate(mon.getDate() + 4);
  return { mon, fri, sat, sun };
}

export function getWorkDays(weekStr: string, dailyHours = 8): number {
  const { mon, sat } = getWeekDates(weekStr);
  const yr = mon.getFullYear();
  const { holidays, makeupDays } = TW_HOLIDAYS[yr] ?? { holidays: new Set(), makeupDays: new Set() };
  let count = 0;
  for (let d = new Date(mon); d <= sat; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    const dow = d.getDay();
    if (makeupDays.has(key)) count++;
    else if (dow !== 0 && dow !== 6 && !holidays.has(key)) count++;
  }
  return count;
}

export function getExpectedHours(weekStr: string, dailyHours = 8) {
  return getWorkDays(weekStr) * dailyHours;
}

export function formatDate(d: Date) {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function getCurrentWeek() {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d as any) - (yearStart as any)) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

// ─── Core data definitions ────────────────────────────────────────
export const CORE_GOALS = ['創新驅動', '雙福文化', '組織動能', '人才培育', '行政作業'] as const;
export type CoreGoal = typeof CORE_GOALS[number];

export const GOAL_COLORS: Record<CoreGoal, string> = {
  '創新驅動': '#e8872a',
  '雙福文化': '#2e8b57',
  '組織動能': '#1a3a5c',
  '人才培育': '#7b68ee',
  '行政作業': '#5a7a9a',
};

export interface WorkItemDef {
  goal: CoreGoal;
  subcat: string;
  cat: string;
  item: string;
  hint?: string;
}

export const WORK_ITEMS: WorkItemDef[] = [
  // 創新驅動
  { goal:'創新驅動', subcat:'政策與服務研發',    cat:'會議-外部會議',   item:'政府會議' },
  { goal:'創新驅動', subcat:'政策與服務研發',    cat:'會議-外部會議',   item:'NGO會議' },
  { goal:'創新驅動', subcat:'政策與服務研發',    cat:'支援-伊甸',       item:'主管交辦（創新驅動）' },
  { goal:'創新驅動', subcat:'國際新知與服務模組', cat:'專業督核',        item:'實地訪視海外服務據點-2次/年' },
  // 雙福文化
  { goal:'雙福文化', subcat:'雙福事工推動', cat:'落實雙福', item:'參加晨午更-每週2.5小時', hint:'2.5h/週' },
  { goal:'雙福文化', subcat:'雙福事工推動', cat:'落實雙福', item:'參加全會禱告會-52次' },
  { goal:'雙福文化', subcat:'雙福事工推動', cat:'落實雙福', item:'參加福音時間' },
  { goal:'雙福文化', subcat:'雙福事工推動', cat:'落實雙福', item:'不定期利害關係人關懷2位' },
  { goal:'雙福文化', subcat:'雙福事工推動', cat:'會議-雙福輔導團會議', item:'充電營/發電營/愛宴' },
  { goal:'雙福文化', subcat:'海外雙福合作', cat:'專業督核', item:'實地訪視海外服務據點（雙福）' },
  // 組織動能
  { goal:'組織動能', subcat:'服務策略轉型協作', cat:'專業督核', item:'團長室同工督導-8人' },
  { goal:'組織動能', subcat:'服務策略轉型協作', cat:'專業督核', item:'單位主管/同工督導-4個單位' },
  { goal:'組織動能', subcat:'服務策略轉型協作', cat:'專業督核', item:'單位月例會-175.408.446.460' },
  { goal:'組織動能', subcat:'服務策略轉型協作', cat:'專業督核', item:'單位業務執行或討論' },
  { goal:'組織動能', subcat:'服務策略轉型協作', cat:'會議-雙福輔導團會議', item:'雙福輔導團團例會' },
  { goal:'組織動能', subcat:'服務策略轉型協作', cat:'會議-雙福輔導團會議', item:'團長室會議(含行政會議)' },
  { goal:'組織動能', subcat:'服務策略轉型協作', cat:'會議-雙福輔導團會議', item:'雙福輔導團主管會議' },
  { goal:'組織動能', subcat:'政策與服務建議', cat:'會議-伊甸會議', item:'區處長會議(含副執團隊會議)' },
  { goal:'組織動能', subcat:'政策與服務建議', cat:'會議-伊甸會議', item:'執辦會議(個督)' },
  { goal:'組織動能', subcat:'政策與服務建議', cat:'會議-伊甸會議', item:'執辦-內控政策會議' },
  { goal:'組織動能', subcat:'政策與服務建議', cat:'會議-伊甸會議', item:'執辦會議(預算個督)' },
  { goal:'組織動能', subcat:'政策與服務建議', cat:'會議-伊甸會議', item:'治理層級會議' },
  { goal:'組織動能', subcat:'推展實務研究',   cat:'支援-雙福輔導團', item:'主管交辦（組織動能）' },
  // 人才培育
  { goal:'人才培育', subcat:'人才培訓架構', cat:'支援-單位內',     item:'主管交辦（人才培育）' },
  { goal:'人才培育', subcat:'人才培訓架構', cat:'支援-雙福輔導團', item:'主管交辦（人才培訓）' },
  // 行政作業
  { goal:'行政作業', subcat:'共同項目-行政管理',   cat:'行政管理', item:'公文與BPM表單核決審理（每日）', hint:'5h/週' },
  { goal:'行政作業', subcat:'共同項目-行政管理',   cat:'行政管理', item:'審閱與回覆365信件' },
  { goal:'行政作業', subcat:'共同項目-行政管理',   cat:'行政管理', item:'雙福輔導團人事' },
  { goal:'行政作業', subcat:'共同項目-行政管理',   cat:'行政管理', item:'預算、追加減核決審理(3次/年)' },
  { goal:'行政作業', subcat:'共同項目-行政管理',   cat:'行政管理', item:'績效考核核決審理(1次/年)' },
  { goal:'行政作業', subcat:'共同項目-個人行政庶務', cat:'個人行政', item:'個人行事曆登錄' },
  { goal:'行政作業', subcat:'共同項目-個人行政庶務', cat:'個人行政', item:'工作時數統計' },
  { goal:'行政作業', subcat:'共同項目-個人行政庶務', cat:'個人行政', item:'ERP人薪作業' },
];
