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

/**
 * Group raw DICE events into festival editions.
 */
export function groupEventsByEdition(events: DiceEventRaw[]): FestivalEdition[] {
  const editionMap = new Map<string, FestivalEdition>();

  for (const event of events) {
    const { key, label, year } = detectEdition(event);

    if (!editionMap.has(key)) {
      editionMap.set(key, { key, label, year, events: [] });
    }
    editionMap.get(key)!.events.push(event);
  }

  // Sort editions by year descending, then by label
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

/**
 * Get the official festival days for an edition.
 * Uses the hardcoded EDITION_DAYS map; falls back to extracting from events.
 */
export function getEditionDays(edition: FestivalEdition): string[] {
  if (EDITION_DAYS[edition.key]) {
    return EDITION_DAYS[edition.key];
  }

  // Fallback for editions not in the map (Pasquetta, Winter, etc.)
  const daysSet = new Set<string>();
  for (const event of edition.events) {
    for (const d of getEventDaysByDatetime(event)) {
      daysSet.add(d);
    }
  }
  return Array.from(daysSet).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
}

/**
 * Get which official edition days a specific event covers.
 * Parses the event name for day numbers (e.g. "11 Agosto", "11 - 13 Agosto")
 * and maps them to the edition's official days.
 * "Full"/"Abbonamento" events without specific days cover ALL edition days.
 */
function getEventDays(event: DiceEventRaw, editionKey?: string): string[] {
  const officialDays = editionKey && EDITION_DAYS[editionKey] ? EDITION_DAYS[editionKey] : null;

  if (!officialDays) {
    return getEventDaysByDatetime(event);
  }

  const name = event.name;

  // Extract day numbers from event name (before "Agosto" or similar month)
  const monthPattern = /(?:Agosto|agosto)/i;
  const monthMatch = name.match(monthPattern);

  if (monthMatch) {
    const beforeMonth = name.slice(0, monthMatch.index);
    const dayNumbers = beforeMonth.match(/\d{1,2}/g);
    if (dayNumbers && dayNumbers.length > 0) {
      const days = dayNumbers.map(d => parseInt(d));
      // Filter official days to only those whose date matches the extracted day numbers
      return officialDays.filter(isoDate => {
        const dateDay = new Date(isoDate + 'T12:00:00Z').getUTCDate();
        return days.includes(dateDay);
      });
    }
  }

  // Also check ticket type names for day info
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

  // "Full", "Abbonamento", "Early Bird" without specific days → all edition days
  return officialDays;
}

/**
 * Fallback: get event days from the startDatetime/endDatetime range.
 */
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

/**
 * Format an ISO date string to a readable Italian day label.
 */
export function formatDayLabel(isoDate: string): string {
  const date = new Date(isoDate + 'T12:00:00Z');
  const day = date.getUTCDate();
  const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  return `${day} ${months[date.getUTCMonth()]}`;
}

/**
 * Calculate daily attendance for an edition.
 * Each event's ticketsSold count is added to each day that event covers.
 */
export function calculateEditionAttendance(edition: FestivalEdition): DayDistribution[] {
  const days = getEditionDays(edition);
  const dayMap: Record<string, number> = {};
  for (const d of days) dayMap[d] = 0;

  for (const event of edition.events) {
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

/**
 * Get ticket rows for the edition table: each DICE event becomes a row.
 */
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
