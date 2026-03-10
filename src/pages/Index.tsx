import { useState, useEffect, useMemo, useCallback } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Ticket, BarChart3, RefreshCw, Users, CalendarDays, Bell, BellOff, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { useDiceEvents } from '@/hooks/useDiceEvents';
import { useTicketNotifications } from '@/hooks/useTicketNotifications';
import { useHaptics } from '@/hooks/useHaptics';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import logoBlack from '@/assets/logo_black.png';
import {
  groupEventsByEdition,
  calculateEditionAttendance,
  getEditionTicketRows,
  getTotalTickets,
  getDailySalesBreakdown,
  getTodaySalesPerDay,
  getTodaySalesBreakdown,
  getTodayPresenzeBreakdown,
  type FestivalEdition } from
'@/lib/ticket-utils';
import { StatCard } from '@/components/StatCard';
import { TicketTypeTable } from '@/components/TicketTypeTable';
import { DayDistributionTable } from '@/components/DayDistributionTable';
import { DayBarChart } from '@/components/DayBarChart';
import { DailySalesBreakdown } from '@/components/DailySalesBreakdown';
import { WeeklySalesCard } from '@/components/WeeklySalesCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CARD_STYLES = ['soft-card-blue', 'soft-card-yellow', 'soft-card-orange', 'soft-card-mint', 'soft-card-pink'];
const DAY_CARD_STYLES = ['soft-card-teal', 'soft-card-coral', 'soft-card-deepblue'];
const DAY_COLOR_CLASSES = ['text-[hsl(168,55%,51%)]', 'text-[hsl(5,85%,65%)]', 'text-[hsl(225,100%,50%)]'];

const Index = () => {
  const { events, loading, error, fetchEvents, snapshots } = useDiceEvents();
  const { requestPermission } = useTicketNotifications(events);
  const { theme, setTheme } = useTheme();
  const haptics = useHaptics();
  const [selectedEditionKey, setSelectedEditionKey] = useState<string | null>(null);
  const [notifEnabled, setNotifEnabled] = useState(() => 
    'Notification' in window && Notification.permission === 'granted'
  );

  const handleRefresh = useCallback(async () => {
    await fetchEvents();
  }, [fetchEvents]);

  const { pullDistance, isRefreshing, isSettling, progress } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
    onProgressTick: () => haptics.tick(),        // Phase 1: tension ticks
    onThresholdReached: () => haptics.pop(),     // Phase 2: threshold pop
    onRefreshStart: () => haptics.confirm(),     // Phase 3: confirmation pulse
  });

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  const editions = useMemo(() => groupEventsByEdition(events), [events]);

  useEffect(() => {
    if (editions.length > 0 && !selectedEditionKey) {
      setSelectedEditionKey(editions[0].key);
    }
  }, [editions, selectedEditionKey]);

  const selectedEdition = editions.find((e) => e.key === selectedEditionKey);

  const distribution = useMemo(
    () => selectedEdition ? calculateEditionAttendance(selectedEdition) : [],
    [selectedEdition]
  );

  const ticketRows = useMemo(
    () => selectedEdition ? getEditionTicketRows(selectedEdition) : [],
    [selectedEdition]
  );

  const totalTickets = useMemo(
    () => selectedEdition ? getTotalTickets(selectedEdition) : 0,
    [selectedEdition]
  );

  const totalPresenze = useMemo(
    () => distribution.reduce((s, d) => s + d.count, 0),
    [distribution]
  );

  const isLatestEdition = editions.length > 0 && selectedEditionKey === editions[0].key;

  const dailySalesBreakdown = useMemo(
    () => isLatestEdition && selectedEdition ? getDailySalesBreakdown(selectedEdition) : [],
    [isLatestEdition, selectedEdition]
  );

  const todaySalesPerDay = useMemo(
    () =>
    isLatestEdition && selectedEdition ?
    getTodaySalesPerDay(selectedEdition, snapshots.todayBaseline, snapshots.yesterdayBaseline) :
    [],
    [isLatestEdition, selectedEdition, snapshots]
  );

  const todaySalesMap = useMemo(() => {
    const m = new Map<string, {soldToday: number;soldYesterday: number;}>();
    for (const d of todaySalesPerDay) {
      m.set(d.date, { soldToday: d.soldToday, soldYesterday: d.soldYesterday });
    }
    return m;
  }, [todaySalesPerDay]);

  const todayBreakdown = useMemo(
    () =>
    isLatestEdition && selectedEdition ?
    getTodaySalesBreakdown(selectedEdition, snapshots.todayBaseline, snapshots.yesterdayBaseline) :
    [],
    [isLatestEdition, selectedEdition, snapshots]
  );

  const todayPresenzeBreakdown = useMemo(
    () =>
    isLatestEdition && selectedEdition ?
    getTodayPresenzeBreakdown(selectedEdition, snapshots.todayBaseline, snapshots.yesterdayBaseline) :
    [],
    [isLatestEdition, selectedEdition, snapshots]
  );

  const totalTicketsSoldToday = todayBreakdown.reduce((s, d) => s + d.soldToday, 0);
  const totalPresenzeSoldToday = todayPresenzeBreakdown.reduce((s, d) => s + d.soldToday, 0);
  const totalSoldYesterday = todaySalesPerDay.reduce((s, d) => s + d.soldYesterday, 0);

  return (
    <div className="min-h-screen bg-background pb-32 relative">
      {/* Pull-to-refresh indicator */}
      {(pullDistance > 0 || isRefreshing || isSettling) && (
        <div
          className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
          style={{
            transform: `translateY(${Math.min(pullDistance - 20, 36)}px)`,
            transition: isSettling ? 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease'
              : isRefreshing ? 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              : 'none',
            opacity: isSettling ? 0 : Math.min(pullDistance / 20, 1),
          }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center glass"
            style={{
              transform: `scale(${isSettling ? 0.2 : isRefreshing ? 1 : 0.5 + progress * 0.5})`,
              transition: isSettling ? 'transform 0.25s ease-in'
                : isRefreshing ? 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
                : 'none',
            }}
          >
            {isRefreshing ? (
              <RefreshCw
                className="w-[18px] h-[18px] text-primary"
                style={{ animation: 'ptr-spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite' }}
                strokeWidth={2.5}
              />
            ) : (
              <RefreshCw
                className="w-[18px] h-[18px]"
                strokeWidth={2.5}
                style={{
                  color: progress >= 1 ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                  transform: `rotate(${progress * 270}deg)`,
                  opacity: 0.3 + progress * 0.7,
                  transition: 'color 0.15s ease',
                }}
              />
            )}
          </div>
        </div>
      )}
      {/* Header */}
      <header className="px-5 pt-8 pb-5">
        <div className="flex items-start justify-between">
          <div>
            <img src={logoBlack} alt="Color Fest" className="h-12 dark:invert" />
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              variant="outline"
              size="icon"
              className="rounded-2xl h-9 w-9 shadow-sm"
              title={theme === 'dark' ? 'Modalità chiara' : 'Modalità scura'}>
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button
              onClick={async () => {
                const granted = await requestPermission();
                setNotifEnabled(granted);
              }}
              variant="outline"
              size="icon"
              className="rounded-2xl h-9 w-9 shadow-sm"
              title={notifEnabled ? 'Notifiche attive' : 'Attiva notifiche'}>
              {notifEnabled ? <Bell className="w-4 h-4 text-primary" /> : <BellOff className="w-4 h-4" />}
            </Button>
            <Button
              onClick={() => {
                haptics.light();
                handleRefresh();
              }}
              disabled={loading}
              variant="outline"
              size="icon"
              className="rounded-2xl h-9 w-9 shadow-sm">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin-bounce' : ''}`} />
            </Button>
          </div>
        </div>
        <p className="text-sm text-foreground/70 dark:text-foreground/80 font-semibold mt-3 tracking-tight">
          {(() => {
            const hour = new Date().getHours();
            const greeting = hour < 12 ? 'Buongiorno ☀️' : hour < 18 ? 'Buon pomeriggio 🌤️' : 'Buonasera 🌙';
            const dateStr = format(new Date(), "EEEE d MMMM", { locale: it });
            const capitalized = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
            return `${greeting}  ·  ${capitalized}`;
          })()}
        </p>

        {/* Edition Selector */}
        {editions.length > 0 &&
        <div className="mt-4">
            <Select value={selectedEditionKey || ''} onValueChange={setSelectedEditionKey}>
              <SelectTrigger className="w-fit min-w-[200px] max-w-[320px] rounded-2xl bg-card border-border/40 font-semibold shadow-sm h-10 text-sm">
                <SelectValue placeholder="Seleziona un'edizione..." />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                {editions.map((edition) =>
              <SelectItem key={edition.key} value={edition.key} className="rounded-xl">
                    {edition.label} ({edition.events.length} eventi)
                  </SelectItem>
              )}
              </SelectContent>
            </Select>
          </div>
        }
      </header>

      <main className="px-5 space-y-5">
        {/* Error State */}
        {error &&
        <div className="soft-card-pink p-4">
            <p className="text-sm text-destructive font-medium">Errore: {error}</p>
          </div>
        }

        {/* Loading */}
        {loading &&
        <div className="flex items-center justify-center py-16">
            <LoadingSpinner />
          </div>
        }

        {/* Stats */}
        {selectedEdition &&
        <>
            {/* Cumulative totals — visually separated */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-[1.75rem] bg-foreground/[0.04] border border-foreground/10 shadow-md dark:bg-foreground/[0.06] dark:border-foreground/10">
              <StatCard
              title="Biglietti"
              value={totalTickets}
              subtitle="Totali venduti"
              icon={<Ticket className="w-5 h-5" />}
              colorClass="text-primary"
              cardStyle="soft-card-blue"
              todaySales={
              isLatestEdition && snapshots.yesterdayBaseline ?
              { soldToday: totalTicketsSoldToday, soldYesterday: totalSoldYesterday } :
              null
              }
              todayBreakdown={isLatestEdition ? todayBreakdown : undefined} />

              <StatCard
              title="Presenze"
              value={totalPresenze}
              subtitle="Somma giornaliere"
              icon={<Users className="w-5 h-5" />}
              colorClass="text-secondary"
              cardStyle="soft-card-yellow"
              todaySales={
              isLatestEdition && snapshots.yesterdayBaseline ?
              { soldToday: totalPresenzeSoldToday, soldYesterday: 0 } :
              null
              }
              todayBreakdown={isLatestEdition ? todayPresenzeBreakdown : undefined}
              todayLabel="Presenze oggi" />
            </div>

            {/* Per-day breakdown */}
            <div className="grid grid-cols-2 gap-3">
              {distribution.map((day, i) =>
            <StatCard
              key={day.date}
              title={day.day}
              value={day.count}
              subtitle={`Presenze ${day.day}`}
              icon={<CalendarDays className="w-5 h-5" />}
              colorClass={DAY_COLOR_CLASSES[i % DAY_COLOR_CLASSES.length]}
              cardStyle={DAY_CARD_STYLES[i % DAY_CARD_STYLES.length]}
              todaySales={
              isLatestEdition && snapshots.yesterdayBaseline ?
              todaySalesMap.get(day.date) || null :
              null
              } />
            )}
            </div>

            {/* Weekly Sales */}
            {isLatestEdition && <WeeklySalesCard events={selectedEdition.events} />}

            {/* Chart */}
            <DayBarChart distribution={distribution} />

            {/* Tables */}
            <div className="space-y-5">
              <TicketTypeTable rows={ticketRows} />
              <DayDistributionTable distribution={distribution} />
            </div>

            {dailySalesBreakdown.length > 0 &&
          <DailySalesBreakdown breakdown={dailySalesBreakdown} />
          }
          </>
        }

        {!selectedEdition && !loading && events.length === 0 &&
        <div className="text-center py-16 soft-card">
            <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nessun dato disponibile</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Clicca il pulsante di aggiornamento per caricare i dati.
            </p>
          </div>
        }
      </main>
    </div>);

};

export default Index;