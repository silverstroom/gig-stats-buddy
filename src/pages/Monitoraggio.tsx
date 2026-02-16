import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarDays, CalendarRange, BarChart3 } from 'lucide-react';
import { format, addDays, differenceInDays, isSameDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

/** Edition metadata with key matching ticket-utils */
const EDITIONS = [
  { key: 'cf-14', label: 'Color Fest 14', year: 2026, color: 'hsl(220, 100%, 55%)' },
  { key: 'cf-13', label: 'Color Fest 13', year: 2025, color: 'hsl(42, 100%, 50%)' },
  { key: 'cf-12', label: 'Color Fest 12', year: 2024, color: 'hsl(280, 80%, 55%)' },
  { key: 'cf-summer-2023', label: 'Color Fest 11', year: 2023, color: 'hsl(160, 70%, 45%)' },
  { key: 'cf-summer-2022', label: 'Color Fest 10', year: 2022, color: 'hsl(350, 80%, 55%)' },
];

/** Map edition key prefix in event names */
function editionKeyFromEventName(name: string): string | null {
  const numbered = name.match(/Color Fest\s*(\d+)/i);
  if (numbered) return `cf-${numbered[1]}`;
  if (/color fest/i.test(name)) {
    // try to infer from other patterns
    return null; // will match via event lookup
  }
  return null;
}

interface ComparisonRow {
  date: string;
  label: string;
  [editionKey: string]: string | number;
}

type Mode = 'single' | 'range';

const Monitoraggio = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('single');
  const [singleDate, setSingleDate] = useState<Date>(new Date());
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -6),
    to: new Date(),
  });
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [comparisonData, setComparisonData] = useState<ComparisonRow[]>([]);
  const [editionsFound, setEditionsFound] = useState<typeof EDITIONS>([]);

  const selectedDates = useMemo(() => {
    if (mode === 'single') {
      return { from: singleDate, to: singleDate };
    }
    return { from: dateRange?.from || new Date(), to: dateRange?.to || new Date() };
  }, [mode, singleDate, dateRange]);

  const fetchComparison = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to } = selectedDates;
      const dayCount = differenceInDays(to, from) + 1;

      // For each edition, build the equivalent date range in that edition's year
      const results: Map<string, Map<string, number>> = new Map();
      const activeEditions: typeof EDITIONS = [];

      for (const edition of EDITIONS) {
        const yearOffset = edition.year - from.getFullYear();
        const eqFrom = new Date(from.getFullYear() + yearOffset, from.getMonth(), from.getDate());
        const eqTo = new Date(to.getFullYear() + yearOffset, to.getMonth(), to.getDate());

        const fromStr = format(eqFrom, 'yyyy-MM-dd');
        const toStr = format(addDays(eqTo, 1), 'yyyy-MM-dd'); // exclusive end

        // Query snapshots for this edition's date range
        // We get the last snapshot per event per day
        const { data, error } = await supabase
          .from('ticket_snapshots')
          .select('event_name, tickets_sold, snapshot_date')
          .gte('snapshot_date', fromStr)
          .lt('snapshot_date', toStr)
          .order('snapshot_date', { ascending: true });

        if (error || !data || data.length === 0) continue;

        // Filter to events belonging to this edition
        const editionEvents = data.filter((row) => {
          const ek = editionKeyFromEventName(row.event_name || '');
          if (ek === edition.key) return true;
          // For older editions without numbered names, match by checking if
          // event name contains "Color Fest" and snapshot year matches
          if (!ek && /color fest/i.test(row.event_name || '')) {
            const snapYear = new Date(row.snapshot_date).getFullYear();
            return snapYear === edition.year;
          }
          return false;
        });

        if (editionEvents.length === 0) continue;
        activeEditions.push(edition);

        // Group by snapshot day → sum tickets_sold (take max per event per day)
        const eventDayMax = new Map<string, number>();
        for (const row of editionEvents) {
          const dayKey = row.snapshot_date.split('T')[0];
          const eventKey = `${row.event_name}::${dayKey}`;
          const prev = eventDayMax.get(eventKey) || 0;
          eventDayMax.set(eventKey, Math.max(prev, row.tickets_sold));
        }

        // Sum per day
        const dayTotals = new Map<string, number>();
        for (const [key, sold] of eventDayMax) {
          const dayKey = key.split('::')[1];
          dayTotals.set(dayKey, (dayTotals.get(dayKey) || 0) + sold);
        }

        // Map back to reference dates (offset back)
        const normalizedDayTotals = new Map<string, number>();
        for (const [dayKey, total] of dayTotals) {
          const d = new Date(dayKey + 'T12:00:00Z');
          const refDate = new Date(d.getFullYear() - yearOffset, d.getUTCMonth(), d.getUTCDate());
          const refKey = format(refDate, 'yyyy-MM-dd');
          normalizedDayTotals.set(refKey, total);
        }

        results.set(edition.key, normalizedDayTotals);
      }

      // Build comparison rows
      const rows: ComparisonRow[] = [];
      for (let i = 0; i < dayCount; i++) {
        const d = addDays(from, i);
        const key = format(d, 'yyyy-MM-dd');
        const row: ComparisonRow = {
          date: key,
          label: format(d, 'd MMM', { locale: it }),
        };
        for (const edition of activeEditions) {
          row[edition.key] = results.get(edition.key)?.get(key) || 0;
        }
        rows.push(row);
      }

      setComparisonData(rows);
      setEditionsFound(activeEditions);
    } catch (err) {
      console.error('Error fetching comparison:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDates]);

  useEffect(() => {
    fetchComparison();
  }, []);

  const dateLabel = useMemo(() => {
    const { from, to } = selectedDates;
    if (isSameDay(from, to)) {
      return format(from, 'd MMMM yyyy', { locale: it });
    }
    return `${format(from, 'd MMM yyyy', { locale: it })} – ${format(to, 'd MMM yyyy', { locale: it })}`;
  }, [selectedDates]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 hero-gradient opacity-90" />
        <div className="relative container mx-auto px-4 py-8 pb-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
                className="text-primary-foreground hover:bg-primary-foreground/20"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-primary-foreground tracking-tight">
                  Monitoraggio
                </h1>
                <p className="text-sm text-primary-foreground/70">Confronto vendite tra edizioni</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6 -mt-4">
        {/* Date Controls */}
        <Card className="glass-card rounded-2xl">
          <CardContent className="p-4 space-y-4">
            {/* Mode toggle */}
            <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="w-full">
              <TabsList className="w-full max-w-xs">
                <TabsTrigger value="single" className="gap-2 flex-1">
                  <CalendarDays className="w-4 h-4" /> Giorno
                </TabsTrigger>
                <TabsTrigger value="range" className="gap-2 flex-1">
                  <CalendarRange className="w-4 h-4" /> Periodo
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex flex-wrap items-center gap-3">
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2 font-semibold min-w-[200px] justify-start">
                    <CalendarDays className="w-4 h-4" />
                    {dateLabel}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  {mode === 'single' ? (
                    <Calendar
                      mode="single"
                      selected={singleDate}
                      onSelect={(d) => {
                        if (d) setSingleDate(d);
                        setPopoverOpen(false);
                      }}
                      className="p-3 pointer-events-auto"
                      locale={it}
                    />
                  ) : (
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={(r) => {
                        setDateRange(r);
                        if (r?.from && r?.to) setPopoverOpen(false);
                      }}
                      numberOfMonths={2}
                      className="p-3 pointer-events-auto"
                      locale={it}
                    />
                  )}
                </PopoverContent>
              </Popover>

              <Button onClick={fetchComparison} disabled={loading} className="gap-2 font-semibold">
                <BarChart3 className="w-4 h-4" />
                Confronta
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Seleziona una data o un periodo: verranno confrontati i biglietti venduti alla stessa data per ogni edizione del Color Fest.
            </p>
          </CardContent>
        </Card>

        {/* Results */}
        {loading && (
          <div className="flex justify-center py-12">
            <BarChart3 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {!loading && editionsFound.length > 0 && comparisonData.length > 0 && (
          <>
            {/* Bar Chart */}
            <Card className="glass-card rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Confronto Biglietti Venduti
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full" style={{ height: Math.max(300, comparisonData.length * 50) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip
                        contentStyle={{
                          background: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(value: number, name: string) => {
                          const ed = editionsFound.find((e) => e.key === name);
                          return [value.toLocaleString('it-IT'), ed?.label || name];
                        }}
                      />
                      <Legend
                        formatter={(value) => {
                          const ed = editionsFound.find((e) => e.key === value);
                          return ed?.label || value;
                        }}
                      />
                      {editionsFound.map((edition) => (
                        <Bar
                          key={edition.key}
                          dataKey={edition.key}
                          fill={edition.color}
                          radius={[4, 4, 0, 0]}
                          barSize={28}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Summary Table */}
            <Card className="glass-card rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Riepilogo per Edizione</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Data</th>
                        {editionsFound.map((ed) => (
                          <th key={ed.key} className="text-right py-2 px-3 font-semibold" style={{ color: ed.color }}>
                            {ed.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonData.map((row) => (
                        <tr key={row.date} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-2 px-3 font-medium">{row.label}</td>
                          {editionsFound.map((ed) => (
                            <td key={ed.key} className="text-right py-2 px-3 font-mono font-semibold">
                              {((row[ed.key] as number) || 0).toLocaleString('it-IT')}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {/* Totals row */}
                      {comparisonData.length > 1 && (
                        <tr className="border-t-2 border-border font-bold">
                          <td className="py-2 px-3">Totale</td>
                          {editionsFound.map((ed) => {
                            const total = comparisonData.reduce((s, r) => s + ((r[ed.key] as number) || 0), 0);
                            return (
                              <td key={ed.key} className="text-right py-2 px-3 font-mono" style={{ color: ed.color }}>
                                {total.toLocaleString('it-IT')}
                              </td>
                            );
                          })}
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {!loading && editionsFound.length === 0 && (
          <Card className="glass-card rounded-2xl">
            <CardContent className="py-12 text-center">
              <BarChart3 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                Nessun dato disponibile per il periodo selezionato. I dati di confronto si arricchiranno man mano che vengono raccolti snapshot giornalieri.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Monitoraggio;
