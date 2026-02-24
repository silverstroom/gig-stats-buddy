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
  type FestivalEdition } from
'@/lib/ticket-utils';
import { StatCard } from '@/components/StatCard';
import { TicketTypeTable } from '@/components/TicketTypeTable';
import { DayDistributionTable } from '@/components/DayDistributionTable';
import { DayBarChart } from '@/components/DayBarChart';
import { DailySalesBreakdown } from '@/components/DailySalesBreakdown';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import colorfestBg from '@/assets/colorfest-bg.webp';

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
    () => (isLatestEdition && selectedEdition) ? getDailySalesBreakdown(selectedEdition) : [],
    [isLatestEdition, selectedEdition]
  );

  const todaySalesPerDay = useMemo(
    () => (isLatestEdition && selectedEdition)
      ? getTodaySalesPerDay(selectedEdition, snapshots.todayBaseline, snapshots.yesterdayBaseline)
      : [],
    [isLatestEdition, selectedEdition, snapshots]
  );

  // Map date -> today sales for quick lookup
  const todaySalesMap = useMemo(() => {
    const m = new Map<string, { soldToday: number; soldYesterday: number }>();
    for (const d of todaySalesPerDay) {
      m.set(d.date, { soldToday: d.soldToday, soldYesterday: d.soldYesterday });
    }
    return m;
  }, [todaySalesPerDay]);

  const totalSoldToday = todaySalesPerDay.reduce((s, d) => s + d.soldToday, 0);
  const totalSoldYesterday = todaySalesPerDay.reduce((s, d) => s + d.soldYesterday, 0);

  const todayBreakdown = useMemo(
    () => (isLatestEdition && selectedEdition)
      ? getTodaySalesBreakdown(selectedEdition, snapshots.todayBaseline)
      : [],
    [isLatestEdition, selectedEdition, snapshots]
  );

  const todayPresenzeBreakdown = useMemo(
    () => (isLatestEdition && selectedEdition)
      ? getTodayPresenzeBreakdown(selectedEdition, snapshots.todayBaseline)
      : [],
    [isLatestEdition, selectedEdition, snapshots]
  );

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Hero Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 hero-gradient opacity-90" />
        <div
          className="absolute inset-0 opacity-10 bg-cover bg-center mix-blend-overlay"
          style={{ backgroundImage: `url(${colorfestBg})` }}
        />
        <div className="relative container mx-auto px-4 py-8 pb-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-primary-foreground/20 backdrop-blur-sm">
                <BarChart3 className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-primary-foreground tracking-tight">
                  Color Fest Analytics
                </h1>
                <p className="text-sm text-primary-foreground/70">Monitoraggio vendite in tempo reale</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={fetchEvents}
                disabled={loading}
                variant="secondary"
                size="sm"
                className="gap-2 font-semibold shadow-lg">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Aggiorna
              </Button>
            </div>
          </div>

          {/* Edition Selector inside header */}
          {editions.length > 0 && (
            <div className="mt-6">
              <Select value={selectedEditionKey || ''} onValueChange={setSelectedEditionKey}>
                <SelectTrigger className="w-full max-w-md bg-primary-foreground/15 backdrop-blur-sm border-primary-foreground/20 text-primary-foreground font-semibold">
                  <SelectValue placeholder="Seleziona un'edizione..." />
                </SelectTrigger>
                <SelectContent>
                  {editions.map((edition) => (
                    <SelectItem key={edition.key} value={edition.key}>
                      {edition.label} ({edition.events.length} eventi)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8 -mt-4">
        {/* Error State */}
        {error && (
          <div className="glass-card rounded-2xl p-4 border-destructive/50 bg-destructive/5">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Biglietti Totali"
                value={totalTickets}
                subtitle="Biglietti venduti"
                icon={<Ticket className="w-5 h-5" />}
                colorClass="text-primary"
                todaySales={isLatestEdition && snapshots.todayBaseline ? { soldToday: totalSoldToday, soldYesterday: totalSoldYesterday } : null}
                todayBreakdown={isLatestEdition ? todayBreakdown : undefined}
              />

              <StatCard
                title="Presenze Totali"
                value={totalPresenze}
                subtitle="Somma presenze giornaliere"
                icon={<Users className="w-5 h-5" />}
                colorClass="text-secondary"
                glowClass="stat-glow-gold"
                todaySales={isLatestEdition && snapshots.todayBaseline ? { soldToday: totalSoldToday, soldYesterday: totalSoldYesterday } : null}
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
                  todaySales={isLatestEdition && snapshots.todayBaseline ? todaySalesMap.get(day.date) || null : null}
                />
              ))}
            </div>

            {/* Chart */}
            <DayBarChart distribution={distribution} />

            {/* Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TicketTypeTable rows={ticketRows} />
              <DayDistributionTable distribution={distribution} />
            </div>

            {dailySalesBreakdown.length > 0 && (
              <DailySalesBreakdown breakdown={dailySalesBreakdown} />
            )}
          </>
        )}

        {!selectedEdition && !loading && events.length === 0 && (
          <div className="text-center py-16 glass-card rounded-2xl">
            <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nessun dato disponibile</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Clicca "Aggiorna" per caricare i dati da DICE.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
