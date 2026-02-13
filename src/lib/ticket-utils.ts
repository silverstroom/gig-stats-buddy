export interface TicketType {
  name: string;
  sold: number;
}

export interface DayDistribution {
  day: string;
  date: string;
  count: number;
}

// Ticket type mappings to days
const TICKET_DAY_MAP: Record<string, string[]> = {
  '2 Days (11-12 agosto)': ['11 agosto', '12 agosto'],
  '2 Days (12-13 agosto)': ['12 agosto', '13 agosto'],
  '1 Day (11 agosto)': ['11 agosto'],
  '1 Day (12 agosto)': ['12 agosto'],
  '1 Day (13 agosto)': ['13 agosto'],
  'Abbonamento Full': ['11 agosto', '12 agosto', '13 agosto'],
};

// Flexible matching: find the best matching key
function findTicketMapping(ticketName: string): string[] | null {
  const normalized = ticketName.toLowerCase().trim();

  for (const [key, days] of Object.entries(TICKET_DAY_MAP)) {
    if (normalized.includes(key.toLowerCase())) {
      return days;
    }
  }

  // Fuzzy matching
  if (normalized.includes('2 day') && normalized.includes('11') && normalized.includes('12')) {
    return TICKET_DAY_MAP['2 Days (11-12 agosto)'];
  }
  if (normalized.includes('2 day') && normalized.includes('12') && normalized.includes('13')) {
    return TICKET_DAY_MAP['2 Days (12-13 agosto)'];
  }
  if (normalized.includes('1 day') && normalized.includes('11')) {
    return TICKET_DAY_MAP['1 Day (11 agosto)'];
  }
  if (normalized.includes('1 day') && normalized.includes('12')) {
    return TICKET_DAY_MAP['1 Day (12 agosto)'];
  }
  if (normalized.includes('1 day') && normalized.includes('13')) {
    return TICKET_DAY_MAP['1 Day (13 agosto)'];
  }
  if (normalized.includes('abbonamento') || normalized.includes('full')) {
    return TICKET_DAY_MAP['Abbonamento Full'];
  }

  return null;
}

export function calculateDayDistribution(tickets: TicketType[]): DayDistribution[] {
  const days: Record<string, number> = {
    '11 agosto': 0,
    '12 agosto': 0,
    '13 agosto': 0,
  };

  for (const ticket of tickets) {
    const mapping = findTicketMapping(ticket.name);
    if (mapping) {
      for (const day of mapping) {
        days[day] += ticket.sold;
      }
    }
  }

  return [
    { day: '11 Ago', date: '11 agosto', count: days['11 agosto'] },
    { day: '12 Ago', date: '12 agosto', count: days['12 agosto'] },
    { day: '13 Ago', date: '13 agosto', count: days['13 agosto'] },
  ];
}

export function getTotalTickets(tickets: TicketType[]): number {
  return tickets.reduce((sum, t) => sum + t.sold, 0);
}
