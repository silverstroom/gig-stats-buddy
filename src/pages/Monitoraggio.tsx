import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { CalendarDays, CalendarRange, TrendingUp, TrendingDown, Upload, ArrowRightLeft, RefreshCw } from 'lucide-react';
import { format, addDays, addYears, isSameDay, eachDayOfInterval } from 'date-fns';
import { it } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useDiceEvents } from '@/hooks/useDiceEvents';
import { LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

const EDITIONS = [
  { key: 'CF14', label: 'CF 14', year: 2026, color: 'hsl(220, 100%, 55%)' },
  { key: 'CF13', label: 'CF 13', year: 2025, color: 'hsl(42, 100%, 50%)' },
  { key: 'CF12', label: 'CF 12', year: 2024, color: 'hsl(280, 80%, 55%)' },
  { key: 'CF11', label: 'CF 11', year: 2023, color: 'hsl(160, 70%, 45%)' },
  { key: 'CF10', label: 'CF 10', year: 2022, color: 'hsl(350, 80%, 55%)' },
];

const CURRENT_YEAR = 2026;

type Mode = 'single' | 'range';

interface EditionResult {
  edition: typeof EDITIONS[number];
  totalPresenze: number;
  dailyData: { sale_date: string; presenze_delta: number }[];
}

function getPresenzeMultiplier(eventName: string): number {
  if (/winter/i.test(eventName)) return /abbonamento/i.test(eventName) ? 2 : 1;
  if (/pasquetta/i.test(eventName)) return 1;
  if (/2\s*days?/i.test(eventName)) return 2;
  if (/(abbonamento|full)/i.test(eventName) && !/1\s*day|one\s*day/i.test(eventName)) return 3;
  return 1;
}

const Monitoraggio = () => {
  const [mode, setMode] = useState<Mode>('range');
  const [singleDate, setSingleDate] = useState<Date>(new Date());
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [hasData, setHasData] = useState<boolean | null>(null);
  const [editionResults, setEditionResults] = useState<EditionResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { events, fetchEvents } = useDiceEvents();
  const eventsRef = useRef<typeof events>([]);
  eventsRef.current = events;

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Check if historical data exists
  useEffect(() => {
    supabase.from('historical_daily_presenze').select('id', { count: 'exact', head: true })
      .then(({ count }) => setHasData((count || 0) > 0));
  }, []);


  const selectedDates = useMemo(() => {
    if (mode === 'single') return { from: singleDate, to: singleDate };
    return { from: dateRange?.from || new Date(), to: dateRange?.to || new Date() };
  }, [mode, singleDate, dateRange]);

  // Import bundled CSV
  const importBundled = useCallback(async () => {
    setImporting(true);
    try {
      const resp = await fetch('/data/historical-transactions.csv');
      const csvText = await resp.text();
      const { data, error } = await supabase.functions.invoke('import-historical-csv', { body: { csvText } });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error);
      toast.success(`Importati ${data.uniqueDays} giorni per ${data.editions?.join(', ')}`);
      setHasData(true);
    } catch (err: any) {
      toast.error('Errore: ' + (err?.message || 'Sconosciuto'));
    } finally {
      setImporting(false);
    }
  }, []);

  // Import from file upload
  const handleFileImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const csvText = await file.text();
      const { data, error } = await supabase.functions.invoke('import-historical-csv', { body: { csvText } });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error);
      toast.success(`Importati ${data.uniqueDays} giorni per ${data.editions?.join(', ')}`);
      setHasData(true);
    } catch (err: any) {
      toast.error('Errore: ' + (err?.message || 'Sconosciuto'));
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, []);

  // Compute CF14 daily presenze deltas from ticket_snapshots
  const computeCF14SnapshotDeltas = useCallback(async (edFrom: string, edTo: string) => {
    const dayBefore = format(addDays(new Date(edFrom), -1), 'yyyy-MM-dd');
    
    const { data: snapshots } = await supabase
      .from('ticket_snapshots')
      .select('snapshot_date, event_name, tickets_sold')
      .gte('snapshot_date', dayBefore)
      .lte('snapshot_date', edTo)
      .order('snapshot_date');

    if (!snapshots || snapshots.length === 0) return [];

    const byDate = new Map<string, Map<string, number>>();
    for (const s of snapshots) {
      const d = s.snapshot_date.split('T')[0];
      if (!byDate.has(d)) byDate.set(d, new Map());
      byDate.get(d)!.set(s.event_name || '', (byDate.get(d)!.get(s.event_name || '') || 0) + s.tickets_sold);
    }

    const sortedDates = Array.from(byDate.keys()).sort();
    const deltas: { sale_date: string; presenze_delta: number }[] = [];

    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = sortedDates[i - 1];
      const currDate = sortedDates[i];
      if (currDate < edFrom || currDate > edTo) continue;

      const prevMap = byDate.get(prevDate)!;
      const currMap = byDate.get(currDate)!;
      
      let dayPresenze = 0;
      for (const [eventName, currSold] of currMap) {
        const prevSold = prevMap.get(eventName) || 0;
        const ticketDelta = Math.max(0, currSold - prevSold);
        dayPresenze += ticketDelta * getPresenzeMultiplier(eventName);
      }

      if (dayPresenze > 0) {
        deltas.push({ sale_date: currDate, presenze_delta: dayPresenze });
      }
    }

    // Add today's live delta using ref to avoid dep cycle
    const currentEvents = eventsRef.current;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    if (todayStr >= edFrom && todayStr <= edTo && currentEvents.length > 0) {
      const latestSnapshotDate = sortedDates[sortedDates.length - 1];
      if (latestSnapshotDate && latestSnapshotDate < todayStr) {
        const latestMap = byDate.get(latestSnapshotDate)!;
        let todayPresenze = 0;
        for (const event of currentEvents) {
          const prevSold = latestMap.get(event.name) || 0;
          const ticketDelta = Math.max(0, event.ticketsSold - prevSold);
          todayPresenze += ticketDelta * getPresenzeMultiplier(event.name);
        }
        if (todayPresenze > 0) {
          deltas.push({ sale_date: todayStr, presenze_delta: todayPresenze });
        }
      } else if (latestSnapshotDate === todayStr) {
        const todayMap = byDate.get(todayStr)!;
        let todayLiveDelta = 0;
        for (const event of currentEvents) {
          const baselineSold = todayMap.get(event.name) || 0;
          const ticketDelta = Math.max(0, event.ticketsSold - baselineSold);
          todayLiveDelta += ticketDelta * getPresenzeMultiplier(event.name);
        }
        const existingIdx = deltas.findIndex(d => d.sale_date === todayStr);
        if (existingIdx >= 0) {
          deltas[existingIdx].presenze_delta += todayLiveDelta;
        } else if (todayLiveDelta > 0) {
          deltas.push({ sale_date: todayStr, presenze_delta: todayLiveDelta });
        }
      }
    }

    return deltas;
  }, []); // No deps - uses eventsRef

  // Fetch YoY comparison
  const fetchComparison = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to } = selectedDates;

      // Single batch query for all historical data
      const allEdFromTo = EDITIONS.map(ed => {
        const yearOffset = ed.year - CURRENT_YEAR;
        return {
          key: ed.key,
          from: format(addYears(from, yearOffset), 'yyyy-MM-dd'),
          to: format(addYears(to, yearOffset), 'yyyy-MM-dd'),
        };
      });

      const globalFrom = allEdFromTo.reduce((min, e) => e.from < min ? e.from : min, allEdFromTo[0].from);
      const globalTo = allEdFromTo.reduce((max, e) => e.to > max ? e.to : max, allEdFromTo[0].to);

      const [{ data: allHistorical }, cf14Deltas] = await Promise.all([
        supabase
          .from('historical_daily_presenze')
          .select('edition_key, sale_date, presenze_delta')
          .gte('sale_date', globalFrom)
          .lte('sale_date', globalTo)
          .order('sale_date'),
        computeCF14SnapshotDeltas(
          allEdFromTo.find(e => e.key === 'CF14')!.from,
          allEdFromTo.find(e => e.key === 'CF14')!.to
        ),
      ]);

      const results = EDITIONS.map((ed) => {
        const edDates = allEdFromTo.find(e => e.key === ed.key)!;
        let dailyData = (allHistorical || [])
          .filter(d => d.edition_key === ed.key && d.sale_date >= edDates.from && d.sale_date <= edDates.to)
          .map(d => ({ sale_date: d.sale_date, presenze_delta: d.presenze_delta }));

        if (ed.key === 'CF14') {
          const historicalDates = new Set(dailyData.map(d => d.sale_date));
          for (const sd of cf14Deltas) {
            if (!historicalDates.has(sd.sale_date)) {
              dailyData.push(sd);
            }
          }
          dailyData.sort((a, b) => a.sale_date.localeCompare(b.sale_date));
        }

        const totalPresenze = dailyData.reduce((s, d) => s + d.presenze_delta, 0);
        return { edition: ed, totalPresenze, dailyData };
      });

      setEditionResults(results);
    } catch (err) {
      console.error(err);
      toast.error('Errore nel confronto');
    } finally {
      setLoading(false);
    }
  }, [selectedDates, computeCF14SnapshotDeltas]);

  // Auto-fetch when data becomes available or dates/mode change
  useEffect(() => {
    if (hasData) fetchComparison();
  }, [hasData, fetchComparison]);

  const dateLabel = useMemo(() => {
    const { from, to } = selectedDates;
    if (isSameDay(from, to)) return format(from, 'd MMMM yyyy', { locale: it });
    return `${format(from, 'd MMM', { locale: it })} – ${format(to, 'd MMM yyyy', { locale: it })}`;
  }, [selectedDates]);

  const cf14Total = editionResults.find(r => r.edition.key === 'CF14')?.totalPresenze || 0;

  // Line chart data (cumulative within period)
  const lineChartData = useMemo(() => {
    if (!editionResults.length || isSameDay(selectedDates.from, selectedDates.to)) return [];

    const days = eachDayOfInterval({ start: selectedDates.from, end: selectedDates.to });

    return days.map((day) => {
      const entry: Record<string, any> = { day: format(day, 'd MMM', { locale: it }) };

      for (const result of editionResults) {
        const yearOffset = result.edition.year - CURRENT_YEAR;
        const targetDate = format(addYears(day, yearOffset), 'yyyy-MM-dd');

        const cumulative = result.dailyData
          .filter(d => d.sale_date <= targetDate)
          .reduce((s, d) => s + d.presenze_delta, 0);

        entry[result.edition.key] = cumulative;
      }

      return entry;
    });
  }, [editionResults, selectedDates]);

  // Bar chart data
  const barChartData = useMemo(() => {
    return editionResults.map(r => ({
      name: r.edition.label,
      presenze: r.totalPresenze,
      fill: r.edition.color,
    }));
  }, [editionResults]);

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 hero-gradient opacity-90" />
        <div className="relative container mx-auto px-4 py-8 pb-10">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-primary-foreground/20 backdrop-blur-sm">
              <ArrowRightLeft className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-primary-foreground tracking-tight">
                Monitoraggio
              </h1>
              <p className="text-sm text-primary-foreground/70">Confronto presenze YoY tra edizioni</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6 -mt-4">
        {/* Import Section */}
        {hasData === false && (
          <Card className="glass-card rounded-2xl border-dashed border-2 border-primary/30">
            <CardContent className="py-8 text-center space-y-4">
              <Upload className="w-10 h-10 text-primary mx-auto" />
              <h3 className="text-lg font-bold">Importa dati storici</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Importa il CSV delle transazioni DICE per visualizzare il confronto tra edizioni.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button onClick={importBundled} disabled={importing} className="gap-2">
                  <Upload className="w-4 h-4" />
                  {importing ? 'Importazione...' : 'Importa dati inclusi'}
                </Button>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing} className="gap-2">
                  <Upload className="w-4 h-4" />
                  Carica CSV personalizzato
                </Button>
              </div>
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileImport} />
            </CardContent>
          </Card>
        )}

        {/* Date Controls */}
        {hasData && (
          <Card className="glass-card rounded-2xl">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="w-auto">
                  <TabsList>
                    <TabsTrigger value="single" className="gap-2">
                      <CalendarDays className="w-4 h-4" /> Giorno
                    </TabsTrigger>
                    <TabsTrigger value="range" className="gap-2">
                      <CalendarRange className="w-4 h-4" /> Periodo
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importing} className="gap-1 text-xs">
                  <Upload className="w-3 h-3" />
                  Aggiorna CSV
                </Button>
                <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileImport} />
              </div>

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
                        onSelect={(d) => { if (d) setSingleDate(d); setPopoverOpen(false); }}
                        className="p-3 pointer-events-auto"
                        locale={it}
                      />
                    ) : (
                      <Calendar
                        mode="range"
                        selected={dateRange}
                        onSelect={(r) => { setDateRange(r); if (r?.from && r?.to) setPopoverOpen(false); }}
                        numberOfMonths={2}
                        className="p-3 pointer-events-auto"
                        locale={it}
                      />
                    )}
                  </PopoverContent>
                </Popover>

                <Button onClick={fetchComparison} disabled={loading} className="gap-2 font-semibold">
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                  Confronta
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Confronta le presenze vendute nello stesso periodo per ogni edizione.
                Presenze: Full = 3, 2 Days = 2, 1 Day = 1. CF14 usa dati live DICE.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Results */}
        {!loading && editionResults.length > 0 && (
          <div className="space-y-6">
            {/* Edition Cards */}
            <div className="space-y-4">
              {editionResults.map((result, idx) => {
                const diff = idx > 0 && result.totalPresenze > 0
                  ? ((cf14Total - result.totalPresenze) / result.totalPresenze * 100)
                  : null;
                const isUp = diff !== null && diff > 0;
                const isDown = diff !== null && diff < 0;

                return (
                  <Card key={result.edition.key} className="glass-card rounded-2xl overflow-hidden">
                    <div className="flex items-stretch">
                      <div className="w-1.5 shrink-0" style={{ backgroundColor: result.edition.color }} />
                      <div className="flex-1 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h3 className="text-base font-bold">{result.edition.label}</h3>
                            <p className="text-xs text-muted-foreground">
                              {(() => {
                                const yearOffset = result.edition.year - CURRENT_YEAR;
                                const f = addYears(selectedDates.from, yearOffset);
                                const t = addYears(selectedDates.to, yearOffset);
                                if (isSameDay(f, t)) return format(f, 'd MMM yyyy', { locale: it });
                                return `${format(f, 'd MMM yyyy', { locale: it })} – ${format(t, 'd MMM yyyy', { locale: it })}`;
                              })()}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-extrabold font-mono" style={{ color: result.edition.color }}>
                              {result.totalPresenze.toLocaleString('it-IT')}
                            </div>
                            <span className="text-xs text-muted-foreground">presenze</span>
                          </div>
                        </div>

                        {idx > 0 && diff !== null && result.totalPresenze > 0 && (
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${
                            isUp ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            isDown ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            CF14 {isUp ? '+' : ''}{diff.toFixed(1)}% vs {result.edition.label}
                          </div>
                        )}

                        {idx > 0 && result.totalPresenze === 0 && (
                          <p className="text-xs text-muted-foreground italic">Nessun dato per questo periodo</p>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Bar Chart */}
            <Card className="glass-card rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">Confronto diretto presenze</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={barChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12 }}
                      formatter={(value: number) => [value.toLocaleString('it-IT'), 'Presenze']}
                    />
                    <Bar dataKey="presenze" radius={[8, 8, 0, 0]}>
                      {barChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Line Chart */}
            {lineChartData.length > 1 && (
              <Card className="glass-card rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold">Andamento cumulativo nel periodo</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={lineChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12 }}
                        formatter={(value: number, name: string) => {
                          const ed = EDITIONS.find(e => e.key === name);
                          return [value.toLocaleString('it-IT'), ed?.label || name];
                        }}
                      />
                      <Legend formatter={(value) => {
                        const ed = EDITIONS.find(e => e.key === value);
                        return ed?.label || value;
                      }} />
                      {EDITIONS.map(ed => (
                        <Line
                          key={ed.key}
                          type="monotone"
                          dataKey={ed.key}
                          stroke={ed.color}
                          strokeWidth={ed.key === 'CF14' ? 3 : 1.5}
                          dot={false}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Summary Table */}
            <Card className="glass-card rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">Riepilogo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-2 text-xs font-semibold text-muted-foreground">Edizione</th>
                        <th className="text-right py-2 px-2 text-xs font-semibold text-muted-foreground">Presenze</th>
                        <th className="text-right py-2 px-2 text-xs font-semibold text-muted-foreground">vs CF14</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editionResults.map((result, idx) => {
                        const diff = idx > 0 && result.totalPresenze > 0
                          ? ((cf14Total - result.totalPresenze) / result.totalPresenze * 100)
                          : null;
                        return (
                          <tr key={result.edition.key} className="border-b border-border/50">
                            <td className="py-2 px-2 font-semibold flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: result.edition.color }} />
                              {result.edition.label}
                            </td>
                            <td className="text-right py-2 px-2 font-mono font-bold">
                              {result.totalPresenze.toLocaleString('it-IT')}
                            </td>
                            <td className="text-right py-2 px-2 font-mono text-xs">
                              {idx === 0 ? '—' : diff !== null ? (
                                <span className={diff >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                  {diff >= 0 ? '+' : ''}{diff.toFixed(1)}%
                                </span>
                              ) : 'N/D'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {!loading && editionResults.length === 0 && hasData && (
          <Card className="glass-card rounded-2xl">
            <CardContent className="py-12 text-center">
              <ArrowRightLeft className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                Seleziona un periodo e premi "Confronta".
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Monitoraggio;
