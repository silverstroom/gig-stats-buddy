import { useState, useEffect, useMemo } from 'react';
import { Ticket, BarChart3, RefreshCw, Users, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDiceEvents } from '@/hooks/useDiceEvents';
import {
  groupEventsByEdition,
  calculateEditionAttendance,
  getEditionTicketRows,
  getTotalTickets,
  getDailySalesBreakdown,
  getTodaySalesPerDay,
  getTodaySalesBreakdown,
  getTodayPresenzeBreakdown,
  type FestivalEdition,
} from '@/lib/ticket-utils';
import { StatCard } from '@/components/StatCard';
import { TicketTypeTable } from '@/components/TicketTypeTable';
import { DayDistributionTable } from '@/components/DayDistributionTable';
import { DayBarChart } from '@/components/DayBarChart';
import { DailySalesBreakdown } from '@/components/DailySalesBreakdown';
import { WeeklySalesCard } from '@/components/WeeklySalesCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CARD_STYLES = ['soft-card-blue', 'soft-card-yellow', 'soft-card-orange', 'soft-card-mint', 'soft-card-pink'];

const Index = () => {
  const { events, loading, error, fetchEvents, snapshots } = useDiceEvents();
  const [selectedEditionKey, setSelectedEditionKey] = useState<string | null>(null);

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
    () => (selectedEdition ? calculateEditionAttendance(selectedEdition) : []),
    [selectedEdition]
  );

  const ticketRows = useMemo(
    () => (selectedEdition ? getEditionTicketRows(selectedEdition) : []),
    [selectedEdition]
  );

  const totalTickets = useMemo(
    () => (selectedEdition ? getTotalTickets(selectedEdition) : 0),
    [selectedEdition]
  );

  const totalPresenze = useMemo(
    () => distribution.reduce((s, d) => s + d.count, 0),
    [distribution]
  );

  const isLatestEdition = editions.length > 0 && selectedEditionKey === editions[0].key;

  const dailySalesBreakdown = useMemo(
    () => (isLatestEdition && selectedEdition ? getDailySalesBreakdown(selectedEdition) : []),
    [isLatestEdition, selectedEdition]
  );

  const todaySalesPerDay = useMemo(
    () =>
      isLatestEdition && selectedEdition
        ? getTodaySalesPerDay(selectedEdition, snapshots.todayBaseline, snapshots.yesterdayBaseline)
        : [],
    [isLatestEdition, selectedEdition, snapshots]
  );

  const todaySalesMap = useMemo(() => {
    const m = new Map<string, { soldToday: number; soldYesterday: number }>();
    for (const d of todaySalesPerDay) {
      m.set(d.date, { soldToday: d.soldToday, soldYesterday: d.soldYesterday });
    }
    return m;
  }, [todaySalesPerDay]);

  const todayBreakdown = useMemo(
    () =>
      isLatestEdition && selectedEdition
        ? getTodaySalesBreakdown(selectedEdition, snapshots.todayBaseline, snapshots.yesterdayBaseline)
        : [],
    [isLatestEdition, selectedEdition, snapshots]
  );

  const todayPresenzeBreakdown = useMemo(
    () =>
      isLatestEdition && selectedEdition
        ? getTodayPresenzeBreakdown(selectedEdition, snapshots.todayBaseline, snapshots.yesterdayBaseline)
        : [],
    [isLatestEdition, selectedEdition, snapshots]
  );

  const totalTicketsSoldToday = todayBreakdown.reduce((s, d) => s + d.soldToday, 0);
  const totalPresenzeSoldToday = todayPresenzeBreakdown.reduce((s, d) => s + d.soldToday, 0);
  const totalSoldYesterday = todaySalesPerDay.reduce((s, d) => s + d.soldYesterday, 0);

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="px-5 pt-8 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Ciao 👋</p>
            <h1 className="text-2xl font-bold tracking-tight mt-0.5">Color Fest</h1>
          </div>
          <Button
            onClick={fetchEvents}
            disabled={loading}
            variant="outline"
            size="icon"
            className="rounded-2xl h-10 w-10 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Edition Selector */}
        {editions.length > 0 && (
          <div className="mt-4">
            <Select value={selectedEditionKey || ''} onValueChange={setSelectedEditionKey}>
              <SelectTrigger className="w-full rounded-2xl bg-card border-border/40 font-semibold shadow-sm h-12">
                <SelectValue placeholder="Seleziona un'edizione..." />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                {editions.map((edition) => (
                  <SelectItem key={edition.key} value={edition.key} className="rounded-xl">
                    {edition.label} ({edition.events.length} eventi)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </header>

      <main className="px-5 space-y-5">
        {/* Error State */}
        {error && (
          <div className="soft-card-pink p-4">
            <p className="text-sm text-destructive font-medium">Errore: {error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Stats */}
        {selectedEdition && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                title="Biglietti"
                value={totalTickets}
                subtitle="Totali venduti"
                icon={<Ticket className="w-5 h-5" />}
                colorClass="text-primary"
                cardStyle="soft-card-blue"
                todaySales={
                  isLatestEdition && (snapshots.todayBaseline || snapshots.yesterdayBaseline)
                    ? { soldToday: totalTicketsSoldToday, soldYesterday: totalSoldYesterday }
                    : null
                }
                todayBreakdown={isLatestEdition ? todayBreakdown : undefined}
              />

              <StatCard
                title="Presenze"
                value={totalPresenze}
                subtitle="Somma giornaliere"
                icon={<Users className="w-5 h-5" />}
                colorClass="text-secondary"
                cardStyle="soft-card-yellow"
                todaySales={
                  isLatestEdition && (snapshots.todayBaseline || snapshots.yesterdayBaseline)
                    ? { soldToday: totalPresenzeSoldToday, soldYesterday: 0 }
                    : null
                }
                todayBreakdown={isLatestEdition ? todayPresenzeBreakdown : undefined}
                todayLabel="Presenze oggi"
              />

              {distribution.map((day, i) => (
                <StatCard
                  key={day.date}
                  title={day.day}
                  value={day.count}
                  subtitle={`Presenze ${day.day}`}
                  icon={<CalendarDays className="w-5 h-5" />}
                  colorClass={i === 0 ? 'text-primary' : i === 1 ? 'text-secondary' : 'text-muted-foreground'}
                  cardStyle={CARD_STYLES[(i + 2) % CARD_STYLES.length]}
                  todaySales={
                    isLatestEdition && (snapshots.todayBaseline || snapshots.yesterdayBaseline)
                      ? todaySalesMap.get(day.date) || null
                      : null
                  }
                />
              ))}
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

            {dailySalesBreakdown.length > 0 && (
              <DailySalesBreakdown breakdown={dailySalesBreakdown} />
            )}
          </>
        )}

        {!selectedEdition && !loading && events.length === 0 && (
          <div className="text-center py-16 soft-card">
            <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nessun dato disponibile</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Clicca il pulsante di aggiornamento per caricare i dati.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
