import { useState, useMemo, useCallback, useEffect } from 'react';
import { CalendarDays, CalendarRange, TrendingUp, TrendingDown, Minus, ArrowRightLeft } from 'lucide-react';
import { format, addDays, isSameDay, subYears } from 'date-fns';
import { it } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';

/* ── Edition definitions ── */
const EDITIONS = [
  { key: 'CF14', label: 'CF 14', year: 2026, color: 'hsl(220, 100%, 55%)' },
  { key: 'CF13', label: 'CF 13', year: 2025, color: 'hsl(42, 100%, 50%)' },
  { key: 'CF12', label: 'CF 12', year: 2024, color: 'hsl(280, 80%, 55%)' },
  { key: 'CF11', label: 'CF 11', year: 2023, color: 'hsl(160, 70%, 45%)' },
  { key: 'CF10', label: 'CF 10', year: 2022, color: 'hsl(350, 80%, 55%)' },
];

/* ── Event-ID → edition for unnumbered "Color Fest" events ── */
const EVENT_ID_EDITION_MAP: Record<string, string> = {
  'RXZlbnQ6MTEwMTkz': 'CF10', 'RXZlbnQ6MTExMDEz': 'CF10', 'RXZlbnQ6MTExMDE3': 'CF10',
  'RXZlbnQ6MTExMDE4': 'CF10', 'RXZlbnQ6MTEyNTkz': 'CF10', 'RXZlbnQ6MTEzMDM5': 'CF10',
  'RXZlbnQ6MTEzMDQw': 'CF10',
  'RXZlbnQ6MTYzMDAw': 'CF11', 'RXZlbnQ6MTYzMzA5': 'CF11', 'RXZlbnQ6MTYzMzEx': 'CF11',
  'RXZlbnQ6MTYzMzEz': 'CF11', 'RXZlbnQ6MTYzMzE0': 'CF11', 'RXZlbnQ6MTYzMzE1': 'CF11',
  'RXZlbnQ6MTYzMzE2': 'CF11',
};

function classifyEvent(eventName: string, eventId: string | null): string | null {
  const m = eventName.match(/Color Fest\s*(\d+)/i);
  if (m) return `CF${m[1]}`;
  if (/BECOLOR.*Color Fest\s*(\d+)/i.test(eventName)) {
    const bm = eventName.match(/Color Fest\s*(\d+)/i);
    if (bm) return `CF${bm[1]}`;
  }
  if (eventId && EVENT_ID_EDITION_MAP[eventId]) return EVENT_ID_EDITION_MAP[eventId];
  if (/winter|pasquetta|factory/i.test(eventName)) return null;
  return null;
}

type Mode = 'single' | 'range';

interface YearComparison {
  edition: typeof EDITIONS[number];
  periodLabel: string;
  total: number;
  events: { name: string; sold: number }[];
}

const Monitoraggio = () => {
  const [mode, setMode] = useState<Mode>('range');
  const [singleDate, setSingleDate] = useState<Date>(new Date());
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -6),
    to: new Date(),
  });
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [comparisons, setComparisons] = useState<YearComparison[]>([]);
  const [snapshotDates, setSnapshotDates] = useState<string[]>([]);

  const selectedDates = useMemo(() => {
    if (mode === 'single') return { from: singleDate, to: singleDate };
    return { from: dateRange?.from || new Date(), to: dateRange?.to || new Date() };
  }, [mode, singleDate, dateRange]);

  useEffect(() => {
    supabase
      .from('ticket_snapshots')
      .select('snapshot_date')
      .order('snapshot_date', { ascending: false })
      .limit(1000)
      .then(({ data }) => {
        if (data) {
          const unique = [...new Set(data.map(r => r.snapshot_date.split('T')[0]))];
          setSnapshotDates(unique);
        }
      });
  }, []);

  const fetchComparison = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to } = selectedDates;
      
      // For each edition year, compute the equivalent period and query snapshots
      const results: YearComparison[] = [];

      for (const edition of EDITIONS) {
        const yearDiff = 2026 - edition.year; // e.g., CF14=0, CF13=1, CF12=2
        const eqFrom = subYears(from, yearDiff);
        const eqTo = subYears(to, yearDiff);
        const fromStr = format(eqFrom, 'yyyy-MM-dd');
        const toStr = format(addDays(eqTo, 1), 'yyyy-MM-dd');

        // Find snapshots in this period
        const { data, error } = await supabase
          .from('ticket_snapshots')
          .select('event_id, event_name, tickets_sold, snapshot_date')
          .gte('snapshot_date', fromStr)
          .lt('snapshot_date', toStr)
          .order('snapshot_date', { ascending: false });

        if (error || !data || data.length === 0) {
          // No data for this period, still show with 0
          const periodLabel = isSameDay(eqFrom, eqTo)
            ? format(eqFrom, 'd MMM yyyy', { locale: it })
            : `${format(eqFrom, 'd MMM yyyy', { locale: it })} – ${format(eqTo, 'd MMM yyyy', { locale: it })}`;
          results.push({ edition, periodLabel, total: 0, events: [] });
          continue;
        }

        // Take latest snapshot per event_name (most recent date)
        const latestPerEvent = new Map<string, { event_name: string; event_id: string; tickets_sold: number }>();
        for (const row of data) {
          const key = row.event_name || row.event_id || '';
          if (!latestPerEvent.has(key)) {
            latestPerEvent.set(key, {
              event_name: row.event_name || '',
              event_id: row.event_id || '',
              tickets_sold: row.tickets_sold,
            });
          }
        }

        // Filter only events belonging to this edition
        let total = 0;
        const events: { name: string; sold: number }[] = [];
        for (const ev of latestPerEvent.values()) {
          const edKey = classifyEvent(ev.event_name, ev.event_id);
          if (edKey !== edition.key) continue;
          total += ev.tickets_sold;
          events.push({ name: ev.event_name, sold: ev.tickets_sold });
        }
        events.sort((a, b) => b.sold - a.sold);

        const periodLabel = isSameDay(eqFrom, eqTo)
          ? format(eqFrom, 'd MMM yyyy', { locale: it })
          : `${format(eqFrom, 'd MMM yyyy', { locale: it })} – ${format(eqTo, 'd MMM yyyy', { locale: it })}`;

        results.push({ edition, periodLabel, total, events });
      }

      setComparisons(results);
    } catch (err) {
      console.error('Error fetching comparison:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDates]);

  useEffect(() => { fetchComparison(); }, []);

  const dateLabel = useMemo(() => {
    const { from, to } = selectedDates;
    if (isSameDay(from, to)) return format(from, 'd MMMM yyyy', { locale: it });
    return `${format(from, 'd MMM yyyy', { locale: it })} – ${format(to, 'd MMM yyyy', { locale: it })}`;
  }, [selectedDates]);

  const highlightedDays = useMemo(
    () => snapshotDates.map(d => new Date(d + 'T12:00:00')),
    [snapshotDates],
  );

  // Reference is CF14 (index 0)
  const cf14Total = comparisons.length > 0 ? comparisons[0].total : 0;

  return (
    <div className="min-h-screen bg-background pb-24">
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
              <p className="text-sm text-primary-foreground/70">Confronto vendite tra edizioni per periodo</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6 -mt-4">
        {/* Date Controls */}
        <Card className="glass-card rounded-2xl">
          <CardContent className="p-4 space-y-4">
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
                      onSelect={(d) => { if (d) setSingleDate(d); setPopoverOpen(false); }}
                      modifiers={{ hasData: highlightedDays }}
                      modifiersStyles={{ hasData: { fontWeight: 700, textDecoration: 'underline' } }}
                      className="p-3 pointer-events-auto"
                      locale={it}
                    />
                  ) : (
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={(r) => { setDateRange(r); if (r?.from && r?.to) setPopoverOpen(false); }}
                      modifiers={{ hasData: highlightedDays }}
                      modifiersStyles={{ hasData: { fontWeight: 700, textDecoration: 'underline' } }}
                      numberOfMonths={2}
                      className="p-3 pointer-events-auto"
                      locale={it}
                    />
                  )}
                </PopoverContent>
              </Popover>

              <Button onClick={fetchComparison} disabled={loading} className="gap-2 font-semibold">
                <TrendingUp className="w-4 h-4" />
                Confronta
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Seleziona un periodo nel 2026. Il sistema confronta automaticamente lo stesso periodo negli anni precedenti 
              (es. 1-15 gen 2026 vs 1-15 gen 2025 vs 1-15 gen 2024...).
            </p>
          </CardContent>
        </Card>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <TrendingUp className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Results */}
        {!loading && comparisons.length > 0 && (
          <div className="space-y-4">
            {comparisons.map((comp, idx) => {
              const diff = idx > 0 && comp.total > 0 ? ((cf14Total - comp.total) / comp.total * 100) : null;
              const isUp = diff !== null && diff > 0;
              const isDown = diff !== null && diff < 0;
              const isFlat = diff !== null && diff === 0;

              return (
                <Card key={comp.edition.key} className="glass-card rounded-2xl overflow-hidden">
                  <div className="flex items-stretch">
                    {/* Color bar */}
                    <div className="w-1.5 shrink-0" style={{ backgroundColor: comp.edition.color }} />

                    <div className="flex-1 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="text-base font-bold">{comp.edition.label}</h3>
                          <p className="text-xs text-muted-foreground">{comp.periodLabel}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-extrabold font-mono" style={{ color: comp.edition.color }}>
                            {comp.total.toLocaleString('it-IT')}
                          </div>
                          <span className="text-xs text-muted-foreground">biglietti</span>
                        </div>
                      </div>

                      {/* Comparison badge vs CF14 */}
                      {idx > 0 && comp.total > 0 && diff !== null && (
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${
                          isUp ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          isDown ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {isUp && <TrendingUp className="w-3 h-3" />}
                          {isDown && <TrendingDown className="w-3 h-3" />}
                          {isFlat && <Minus className="w-3 h-3" />}
                          CF14 {isUp ? '+' : ''}{diff.toFixed(1)}% vs {comp.edition.label}
                        </div>
                      )}

                      {idx > 0 && comp.total === 0 && (
                        <p className="text-xs text-muted-foreground italic">Nessun dato disponibile per questo periodo</p>
                      )}

                      {/* Event breakdown */}
                      {comp.events.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {comp.events.slice(0, 5).map((ev, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground truncate flex-1 mr-2">{ev.name}</span>
                              <span className="font-mono font-semibold shrink-0">{ev.sold.toLocaleString('it-IT')}</span>
                            </div>
                          ))}
                          {comp.events.length > 5 && (
                            <p className="text-[10px] text-muted-foreground">+{comp.events.length - 5} altri eventi</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}

            {/* Summary */}
            <Card className="glass-card rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">Riepilogo Confronto</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-2 text-xs font-semibold text-muted-foreground">Edizione</th>
                        <th className="text-left py-2 px-2 text-xs font-semibold text-muted-foreground">Periodo</th>
                        <th className="text-right py-2 px-2 text-xs font-semibold text-muted-foreground">Biglietti</th>
                        <th className="text-right py-2 px-2 text-xs font-semibold text-muted-foreground">vs CF14</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisons.map((comp, idx) => {
                        const diff = idx > 0 && comp.total > 0
                          ? ((cf14Total - comp.total) / comp.total * 100)
                          : null;
                        return (
                          <tr key={comp.edition.key} className="border-b border-border/50">
                            <td className="py-2 px-2 font-semibold flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: comp.edition.color }} />
                              {comp.edition.label}
                            </td>
                            <td className="py-2 px-2 text-xs text-muted-foreground">{comp.periodLabel}</td>
                            <td className="text-right py-2 px-2 font-mono font-bold">{comp.total.toLocaleString('it-IT')}</td>
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

        {!loading && comparisons.length === 0 && (
          <Card className="glass-card rounded-2xl">
            <CardContent className="py-12 text-center">
              <ArrowRightLeft className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                Seleziona un periodo e premi "Confronta" per vedere il confronto tra edizioni.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Monitoraggio;
