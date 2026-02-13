import { useState, useEffect, useMemo } from 'react';
import { Ticket, BarChart3, Calendar, RefreshCw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDiceEvents } from '@/hooks/useDiceEvents';
import {
  groupEventsByEdition,
  calculateEditionAttendance,
  getEditionTicketRows,
  getTotalTickets,
  type FestivalEdition } from
'@/lib/ticket-utils';
import { StatCard } from '@/components/StatCard';
import { TicketTypeTable } from '@/components/TicketTypeTable';
import { DayDistributionTable } from '@/components/DayDistributionTable';
import { DayBarChart } from '@/components/DayBarChart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const Index = () => {
  const { events, loading, error, fetchEvents } = useDiceEvents();
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg gradient-primary">
              <BarChart3 className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-display tracking-tight">DICE Analytics - Color Fest </h1>
              <p className="text-xs text-muted-foreground">Monitoraggio Vendite Biglietti</p>
            </div>
          </div>
          <Button
            onClick={fetchEvents}
            disabled={loading}
            variant="outline"
            size="sm"
            className="gap-2">

            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Aggiorna
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Error State */}
        {error &&
        <div className="glass-card rounded-xl p-4 border-destructive/50 bg-destructive/5">
            <p className="text-sm text-destructive font-medium">Errore: {error}</p>
          </div>
        }

        {/* Loading */}
        {loading &&
        <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          </div>
        }

        {/* Edition Selector */}
        {editions.length > 0 &&
        <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Seleziona Edizione</label>
            <Select value={selectedEditionKey || ''} onValueChange={setSelectedEditionKey}>
              <SelectTrigger className="w-full max-w-md glass-card">
                <SelectValue placeholder="Seleziona un'edizione..." />
              </SelectTrigger>
              <SelectContent>
                {editions.map((edition) =>
              <SelectItem key={edition.key} value={edition.key}>
                    {edition.label} ({edition.events.length} eventi)
                  </SelectItem>
              )}
              </SelectContent>
            </Select>
          </div>
        }

        {/* Stats */}
        {selectedEdition &&
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
              title="Biglietti Totali"
              value={totalTickets}
              subtitle="Biglietti venduti"
              icon={<Ticket className="w-5 h-5" />}
              colorClass="text-primary" />

              <StatCard
              title="Presenze Totali"
              value={totalPresenze}
              subtitle="Somma presenze giornaliere"
              icon={<Users className="w-5 h-5" />}
              colorClass="text-accent" />

              {distribution.map((day, i) =>
            <StatCard
              key={day.date}
              title={day.day}
              value={day.count}
              subtitle={`Presenze ${day.day}`}
              colorClass={`text-chart-day${i % 3 + 1}`} />

            )}
            </div>

            {/* Chart */}
            <DayBarChart distribution={distribution} />

            {/* Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TicketTypeTable rows={ticketRows} />
              <DayDistributionTable distribution={distribution} />
            </div>
          </>
        }

        {!selectedEdition && !loading && events.length === 0 &&
        <div className="text-center py-16 glass-card rounded-xl">
            <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nessun dato disponibile</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Clicca "Aggiorna" per caricare i dati da DICE.
            </p>
          </div>
        }
      </main>
    </div>);

};

export default Index;