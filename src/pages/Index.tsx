import { useState, useEffect, useMemo } from 'react';
import { Ticket, BarChart3, Calendar, RefreshCw, Edit3, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDiceEvents } from '@/hooks/useDiceEvents';
import { calculateDayDistribution, getTotalTickets, type TicketType } from '@/lib/ticket-utils';
import { StatCard } from '@/components/StatCard';
import { TicketTypeTable } from '@/components/TicketTypeTable';
import { DayDistributionTable } from '@/components/DayDistributionTable';
import { DayBarChart } from '@/components/DayBarChart';
import { EventSelector } from '@/components/EventSelector';
import { ManualTicketInput } from '@/components/ManualTicketInput';

const Index = () => {
  const { events, loading, error, fetchEvents } = useDiceEvents();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [manualTickets, setManualTickets] = useState<TicketType[] | null>(null);
  const [mode, setMode] = useState<'api' | 'manual'>('api');

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  const tickets = useMemo(() => {
    if (mode === 'manual' && manualTickets) return manualTickets;
    return selectedEvent?.ticketTypes || [];
  }, [mode, manualTickets, selectedEvent]);

  const distribution = useMemo(() => calculateDayDistribution(tickets), [tickets]);
  const totalTickets = useMemo(() => getTotalTickets(tickets), [tickets]);
  const totalPresenze = useMemo(() => distribution.reduce((s, d) => s + d.count, 0), [distribution]);

  const handleManualSubmit = (t: TicketType[]) => {
    setManualTickets(t);
    setMode('manual');
  };

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
              <h1 className="text-xl font-bold font-display tracking-tight">DICE Analytics</h1>
              <p className="text-xs text-muted-foreground">Monitoraggio Vendite Biglietti</p>
            </div>
          </div>
          <Button
            onClick={fetchEvents}
            disabled={loading}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Aggiorna
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Error State */}
        {error && (
          <div className="glass-card rounded-xl p-4 border-destructive/50 bg-destructive/5">
            <p className="text-sm text-destructive font-medium">Errore: {error}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Puoi usare l'inserimento manuale qui sotto.
            </p>
          </div>
        )}

        {/* Mode Tabs */}
        <Tabs value={mode} onValueChange={(v) => setMode(v as 'api' | 'manual')}>
          <TabsList className="glass-card">
            <TabsTrigger value="api" className="gap-2">
              <Wifi className="w-4 h-4" />
              Dati API DICE
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-2">
              <Edit3 className="w-4 h-4" />
              Inserimento Manuale
            </TabsTrigger>
          </TabsList>

          <TabsContent value="api" className="space-y-6 mt-6">
            {events.length > 0 && (
              <EventSelector
                events={events}
                selectedId={selectedEventId}
                onSelect={setSelectedEventId}
              />
            )}

            {loading && (
              <div className="flex items-center justify-center py-16">
                <RefreshCw className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}
          </TabsContent>

          <TabsContent value="manual" className="mt-6">
            <ManualTicketInput
              onSubmit={handleManualSubmit}
              initialValues={
                manualTickets
                  ? Object.fromEntries(manualTickets.map((t) => [t.name, t.sold]))
                  : undefined
              }
            />
          </TabsContent>
        </Tabs>

        {/* Stats */}
        {tickets.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Biglietti Totali"
                value={totalTickets}
                subtitle="Biglietti venduti"
                icon={<Ticket className="w-5 h-5" />}
                colorClass="text-primary"
              />
              <StatCard
                title="Presenze Totali"
                value={totalPresenze}
                subtitle="Ingressi giornalieri"
                icon={<Calendar className="w-5 h-5" />}
                colorClass="text-accent"
              />
              <StatCard
                title="11 Agosto"
                value={distribution[0]?.count || 0}
                subtitle="Presenze Day 1"
                colorClass="text-chart-day1"
              />
              <StatCard
                title="12 Agosto"
                value={distribution[1]?.count || 0}
                subtitle="Presenze Day 2"
                colorClass="text-chart-day2"
              />
            </div>

            {/* Chart */}
            <DayBarChart distribution={distribution} />

            {/* Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TicketTypeTable tickets={tickets} />
              <DayDistributionTable distribution={distribution} />
            </div>
          </>
        )}

        {tickets.length === 0 && !loading && (
          <div className="text-center py-16 glass-card rounded-xl">
            <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nessun dato disponibile</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Seleziona un evento dall'API oppure inserisci i dati manualmente per vedere l'analisi.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
