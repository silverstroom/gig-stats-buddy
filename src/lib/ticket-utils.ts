export interface TicketType {
  name: string;
  sold: number;
}

export interface DayDistribution {
  day: string;
  date: string;
  count: number;
}

export interface DiceEventRaw {
  id: string;
  name: string;
  state: string;
  startDatetime: string;
  endDatetime: string;
  ticketTypes: { id: string; name: string; price: number; totalTicketAllocationQty: number }[];
  ticketsSold: number;
}

export interface FestivalEdition {
  key: string;
  label: string;
  year: number;
  events: DiceEventRaw[];
}

export interface EditionTicketRow {
  eventName: string;
  sold: number;
  days: string[];
}

/**
 * Official festival days for each edition.
 */
const EDITION_DAYS: Record<string, string[]> = {
  'cf-14': ['2026-08-11', '2026-08-12', '2026-08-13'],
  'cf-13': ['2025-08-12', '2025-08-13', '2025-08-14'],
  'cf-12': ['2024-08-14', '2024-08-15', '2024-08-16'],
  'cf-11': ['2023-08-11', '2023-08-12', '2023-08-13'],
  'cf-summer-2022': ['2022-08-11', '2022-08-12', '2022-08-13'],
};

export function groupEventsByEdition(events: DiceEventRaw[]): FestivalEdition[] {
  const editionMap = new Map<string, FestivalEdition>();

  for (const event of events) {
    const { key, label, year } = detectEdition(event);

    if (!editionMap.has(key)) {
      editionMap.set(key, { key, label, year, events: [] });
    }
    editionMap.get(key)!.events.push(event);
  }

  return Array.from(editionMap.values()).sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return a.label.localeCompare(b.label);
  });
}

function detectEdition(event: DiceEventRaw): { key: string; label: string; year: number } {
  const name = event.name;
  const startYear = new Date(event.startDatetime).getFullYear();
  const startMonth = new Date(event.startDatetime).getMonth();

  const numberedMatch = name.match(/Color Fest\s*(\d+)/i);
  if (numberedMatch) {
    const num = numberedMatch[1];
    return { key: `cf-${num}`, label: `Color Fest ${num}`, year: startYear };
  }

  if (/winter\s*session/i.test(name)) {
    return { key: `winter-${startYear}`, label: `Winter Session ${startYear}`, year: startYear };
  }

  if (/pasquetta/i.test(name)) {
    return { key: `pasquetta-${startYear}`, label: `Pasquetta ${startYear}`, year: startYear };
  }

  if (/color fest/i.test(name) && startMonth >= 6 && startMonth <= 8) {
    return { key: `cf-summer-${startYear}`, label: `Color Fest (${startYear})`, year: startYear };
  }

  return { key: `other-${startYear}`, label: `Altri Eventi ${startYear}`, year: startYear };
}

export function getEditionDays(edition: FestivalEdition): string[] {
  if (EDITION_DAYS[edition.key]) {
    return EDITION_DAYS[edition.key];
  }

  const daysSet = new Set<string>();
  for (const event of edition.events) {
    for (const d of getEventDaysByDatetime(event)) {
      daysSet.add(d);
    }
  }
  return Array.from(daysSet).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
}

export function isCosmoSoloEvent(event: DiceEventRaw): boolean {
  return /cosmo/i.test(event.name) && /concerto\s*al\s*mattino/i.test(event.name);
}

function getEventDays(event: DiceEventRaw, editionKey?: string): string[] {
  // COSMO solo event is tracked separately — exclude from day distribution
  if (isCosmoSoloEvent(event)) {
    return [];
  }

  const officialDays = editionKey && EDITION_DAYS[editionKey] ? EDITION_DAYS[editionKey] : null;

  if (!officialDays) {
    return getEventDaysByDatetime(event);
  }

  const name = event.name;
  const monthPattern = /(?:Agosto|agosto)/i;
  const monthMatch = name.match(monthPattern);

  if (monthMatch) {
    const beforeMonth = name.slice(0, monthMatch.index);
    const dayNumbers = beforeMonth.match(/\d{1,2}/g);
    if (dayNumbers && dayNumbers.length > 0) {
      const days = dayNumbers.map(d => parseInt(d));
      return officialDays.filter(isoDate => {
        const dateDay = new Date(isoDate + 'T12:00:00Z').getUTCDate();
        return days.includes(dateDay);
      });
    }
  }

  for (const tt of event.ticketTypes) {
    const ttMatch = tt.name.match(monthPattern);
    if (ttMatch) {
      const beforeMonth = tt.name.slice(0, ttMatch.index);
      const dayNumbers = beforeMonth.match(/\d{1,2}/g);
      if (dayNumbers && dayNumbers.length > 0) {
        const days = dayNumbers.map(d => parseInt(d));
        return officialDays.filter(isoDate => {
          const dateDay = new Date(isoDate + 'T12:00:00Z').getUTCDate();
          return days.includes(dateDay);
        });
      }
    }
  }

  return officialDays;
}

function getEventDaysByDatetime(event: DiceEventRaw): string[] {
  const start = new Date(event.startDatetime);
  const end = new Date(event.endDatetime);
  const days: string[] = [];

  const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  let endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  if (end.getHours() < 12 && endDate.getTime() > startDate.getTime()) {
    endDate = new Date(endDate.getTime() - 86400000);
  }

  const current = new Date(startDate);
  while (current <= endDate) {
    days.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  if (days.length === 0) {
    days.push(startDate.toISOString().split('T')[0]);
  }

  return days;
}

export function formatDayLabel(isoDate: string): string {
  const date = new Date(isoDate + 'T12:00:00Z');
  const day = date.getUTCDate();
  const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  return `${day} ${months[date.getUTCMonth()]}`;
}

export function calculateEditionAttendance(edition: FestivalEdition): DayDistribution[] {
  const days = getEditionDays(edition);
  const dayMap: Record<string, number> = {};
  for (const d of days) dayMap[d] = 0;

  for (const event of edition.events) {
    // COSMO solo is excluded from per-day distribution (tracked separately)
    if (isCosmoSoloEvent(event)) continue;
    const eventDays = getEventDays(event, edition.key);
    for (const d of eventDays) {
      if (d in dayMap) {
        dayMap[d] += event.ticketsSold;
      }
    }
  }

  return days.map((d) => ({
    day: formatDayLabel(d),
    date: d,
    count: dayMap[d],
  }));
}

export function getEditionTicketRows(edition: FestivalEdition): EditionTicketRow[] {
  return edition.events
    .map((event) => ({
      eventName: event.name,
      sold: event.ticketsSold,
      days: getEventDays(event, edition.key).map(formatDayLabel),
    }))
    .sort((a, b) => b.sold - a.sold);
}

export function getTotalTickets(edition: FestivalEdition): number {
  return edition.events.reduce((sum, e) => sum + e.ticketsSold, 0);
}

export interface TodaySalesPerDay {
  date: string;
  soldToday: number;
  soldYesterday: number;
}

export interface TodaySalesEventDetail {
  eventName: string;
  soldToday: number;
}

/**
 * Compute how many tickets were sold today for each festival day.
 * Uses todayBaseline (first snapshot of today) as primary reference.
 * Falls back to yesterdayBaseline only if todayBaseline is not available yet.
 */
export function getTodaySalesPerDay(
  edition: FestivalEdition,
  _todayBaseline: { event_id: string; tickets_sold: number }[] | null,
  yesterdayBaseline: { event_id: string; tickets_sold: number }[] | null,
): TodaySalesPerDay[] {
  const days = getEditionDays(edition);
  // Always compare live data vs yesterday's snapshot (= last known state from previous day)
  // This correctly captures overnight sales that would be missed by today's first-fetch baseline
  if (!yesterdayBaseline) return days.map(d => ({ date: d, soldToday: 0, soldYesterday: 0 }));

  const referenceMap = new Map(yesterdayBaseline.map(s => [s.event_id, s.tickets_sold]));

  const soldTodayPerDay: Record<string, number> = {};
  for (const d of days) {
    soldTodayPerDay[d] = 0;
  }

  for (const event of edition.events) {
    // COSMO solo is excluded from per-day sales (tracked separately)
    if (isCosmoSoloEvent(event)) continue;

    const refSold = referenceMap.get(event.id) ?? event.ticketsSold;
    const diffToday = Math.max(0, event.ticketsSold - refSold);

    const eventDays = getEventDays(event, edition.key);
    for (const d of eventDays) {
      if (d in soldTodayPerDay) {
        soldTodayPerDay[d] += diffToday;
      }
    }
  }

  return days.map(d => ({
    date: d,
    soldToday: soldTodayPerDay[d],
    soldYesterday: 0,
  }));
}

/**
 * Get per-event breakdown of today's sales.
 * Uses todayBaseline as primary reference.
 */
export function getTodaySalesBreakdown(
  edition: FestivalEdition,
  _todayBaseline: { event_id: string; tickets_sold: number }[] | null,
  yesterdayBaseline?: { event_id: string; tickets_sold: number }[] | null,
): TodaySalesEventDetail[] {
  if (!yesterdayBaseline) return [];

  const refMap = new Map(yesterdayBaseline.map(s => [s.event_id, s.tickets_sold]));
  const details: TodaySalesEventDetail[] = [];

  for (const event of edition.events) {
    const refSold = refMap.get(event.id) ?? event.ticketsSold;
    const diffToday = Math.max(0, event.ticketsSold - refSold);
    if (diffToday > 0) {
      details.push({ eventName: event.name, soldToday: diffToday });
    }
  }

  return details.sort((a, b) => b.soldToday - a.soldToday);
}

export interface DailySalesDetail {
  day: string;
  date: string;
  events: { eventName: string; sold: number }[];
  total: number;
}

export function getDailySalesBreakdown(edition: FestivalEdition): DailySalesDetail[] {
  const days = getEditionDays(edition);

  return days.map((d) => {
    const label = formatDayLabel(d);
    const eventsForDay: { eventName: string; sold: number }[] = [];

    for (const event of edition.events) {
      const eventDays = getEventDays(event, edition.key);
      if (eventDays.includes(d)) {
        eventsForDay.push({ eventName: event.name, sold: event.ticketsSold });
      }
    }

    eventsForDay.sort((a, b) => b.sold - a.sold);

    return {
      day: label,
      date: d,
      events: eventsForDay,
      total: eventsForDay.reduce((s, e) => s + e.sold, 0),
    };
  });
}

/**
 * Get today's presenze breakdown per event.
 * Uses todayBaseline as primary reference.
 */
export function getTodayPresenzeBreakdown(
  edition: FestivalEdition,
  _todayBaseline: { event_id: string; tickets_sold: number }[] | null,
  yesterdayBaseline?: { event_id: string; tickets_sold: number }[] | null,
): TodaySalesEventDetail[] {
  if (!yesterdayBaseline) return [];

  const refMap = new Map(yesterdayBaseline.map(s => [s.event_id, s.tickets_sold]));
  const details: TodaySalesEventDetail[] = [];

  for (const event of edition.events) {
    const refSold = refMap.get(event.id) ?? event.ticketsSold;
    const diffToday = Math.max(0, event.ticketsSold - refSold);
    if (diffToday > 0) {
      const days = getEventDays(event, edition.key);
      // COSMO solo counts as 1 presence even though excluded from day distribution
      const dayCount = isCosmoSoloEvent(event) ? 1 : days.length;
      const presenze = diffToday * dayCount;
      details.push({ eventName: event.name, soldToday: presenze });
    }
  }

  return details.sort((a, b) => b.soldToday - a.soldToday);
}
