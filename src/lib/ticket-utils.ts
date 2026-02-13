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
 * Group raw DICE events into festival editions.
 * Editions are detected by name patterns like "Color Fest 14", "Color Fest 13", etc.
 * Events without an edition number are grouped by year.
 * Non-summer events (Pasquetta, Winter) get their own groups.
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
  const startMonth = new Date(event.startDatetime).getMonth(); // 0-indexed

  // Check for numbered editions: "Color Fest 14", "Color Fest 13", etc.
  const numberedMatch = name.match(/Color Fest\s*(\d+)/i);
  if (numberedMatch) {
    const num = numberedMatch[1];
    return { key: `cf-${num}`, label: `Color Fest ${num}`, year: startYear };
  }

  // Winter Session
  if (/winter\s*session/i.test(name)) {
    return { key: `winter-${startYear}`, label: `Winter Session ${startYear}`, year: startYear };
  }

  // Pasquetta
  if (/pasquetta/i.test(name)) {
    return { key: `pasquetta-${startYear}`, label: `Pasquetta ${startYear}`, year: startYear };
  }

  // Summer Color Fest without number (old editions)
  if (/color fest/i.test(name) && startMonth >= 6 && startMonth <= 8) {
    // Check if it's the early bird for numbered edition
    return { key: `cf-summer-${startYear}`, label: `Color Fest ${startYear}`, year: startYear };
  }

  // Fallback
  return { key: `other-${startYear}`, label: `Altri Eventi ${startYear}`, year: startYear };
}

/**
 * Get the list of unique festival days for an edition, sorted chronologically.
 */
export function getEditionDays(edition: FestivalEdition): string[] {
  const daysSet = new Set<string>();

  for (const event of edition.events) {
    const eventDays = getEventDays(event);
    for (const d of eventDays) {
      daysSet.add(d);
    }
  }

  return Array.from(daysSet).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
}

/**
 * Get the calendar days an event covers by parsing the event name.
 * Event names contain explicit day info like "11 Agosto", "11 - 13 Agosto", etc.
 * For "Full"/"Early Bird" events, checks ticket type names or falls back to datetime range.
 * Returns ISO date strings (YYYY-MM-DD).
 */
function getEventDays(event: DiceEventRaw): string[] {
  const name = event.name;
  const start = new Date(event.startDatetime);
  const year = start.getFullYear();
  const month = start.getMonth(); // 0-indexed

  // Try to extract explicit day numbers from event name before a month keyword
  // Handles: "11 Agosto", "11 - 12 Agosto", "11 - 12 - 13 Agosto"
  const monthPattern = /(?:Agosto|Aprile|Dicembre|Gennaio|Febbraio|Marzo|Giugno|Luglio|Settembre|Ottobre|Novembre)/i;
  const monthMatch = name.match(monthPattern);
  
  if (monthMatch) {
    const beforeMonth = name.slice(0, monthMatch.index);
    const dayNumbers = beforeMonth.match(/\d{1,2}/g);
    if (dayNumbers && dayNumbers.length > 0) {
      return dayNumbers
        .map(d => {
          const date = new Date(year, month, parseInt(d));
          return date.toISOString().split('T')[0];
        })
        .sort();
    }
  }

  // For "Full" / "Early Bird" / "Abbonamento" events without explicit days in name,
  // check ticket type names for day info
  if (/abbonamento|full|early\s*bird/i.test(name)) {
    for (const tt of event.ticketTypes) {
      const ttMonthMatch = tt.name.match(monthPattern);
      if (ttMonthMatch) {
        const beforeMonth = tt.name.slice(0, ttMonthMatch.index);
        const dayNumbers = beforeMonth.match(/\d{1,2}/g);
        if (dayNumbers && dayNumbers.length > 0) {
          return dayNumbers
            .map(d => {
              const date = new Date(year, month, parseInt(d));
              return date.toISOString().split('T')[0];
            })
            .sort();
        }
      }
    }
  }

  // Fallback: use datetime range for events without parseable day info
  return getEventDaysByDatetime(event);
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
    const eventDays = getEventDays(event);
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
      days: getEventDays(event).map(formatDayLabel),
    }))
    .sort((a, b) => b.sold - a.sold);
}

export function getTotalTickets(edition: FestivalEdition): number {
  return edition.events.reduce((sum, e) => sum + e.ticketsSold, 0);
}
