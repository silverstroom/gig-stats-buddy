import { useEffect, useRef, useCallback } from 'react';
import type { DiceEventRaw } from '@/lib/ticket-utils';

function isColorFestEvent(eventName: string): boolean {
  return /color\s*fest\s*\d/i.test(eventName);
}

export function useTicketNotifications(events: DiceEventRaw[]) {
  const prevTotalsRef = useRef<Map<string, number> | null>(null);
  const permissionRef = useRef<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      permissionRef.current = Notification.permission;
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false;
    const result = await Notification.requestPermission();
    permissionRef.current = result;
    return result === 'granted';
  }, []);

  useEffect(() => {
    if (!('Notification' in window) || events.length === 0) return;

    const cfEvents = events.filter(e => isColorFestEvent(e.name));
    const currentTotals = new Map<string, number>();
    for (const e of cfEvents) {
      currentTotals.set(e.id, e.ticketsSold);
    }

    const prev = prevTotalsRef.current;
    if (prev && permissionRef.current === 'granted') {
      let totalNew = 0;
      const newSales: string[] = [];

      for (const e of cfEvents) {
        const prevSold = prev.get(e.id) ?? e.ticketsSold;
        const delta = e.ticketsSold - prevSold;
        if (delta > 0) {
          totalNew += delta;
          newSales.push(`${e.name}: +${delta}`);
        }
      }

      if (totalNew > 0) {
        try {
          new Notification(`🎟️ +${totalNew} bigliett${totalNew === 1 ? 'o' : 'i'} vendut${totalNew === 1 ? 'o' : 'i'}!`, {
            body: newSales.join('\n'),
            icon: '/favicon.ico',
            tag: 'ticket-sale',
          });
        } catch (err) {
          console.warn('Notification error:', err);
        }
      }
    }

    prevTotalsRef.current = currentTotals;
  }, [events]);

  return { requestPermission, permission: permissionRef.current };
}
