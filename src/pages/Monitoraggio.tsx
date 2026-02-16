import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarDays, CalendarRange, TrendingUp, PieChart as PieChartIcon } from 'lucide-react';
import { format, addDays, differenceInDays, isSameDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

/* ── Edition definitions ── */
const EDITIONS = [
  { key: 'CF14', label: 'Color Fest 14', year: 2026, color: 'hsl(220, 100%, 55%)' },
  { key: 'CF13', label: 'Color Fest 13', year: 2025, color: 'hsl(42, 100%, 50%)' },
  { key: 'CF12', label: 'Color Fest 12', year: 2024, color: 'hsl(280, 80%, 55%)' },
  { key: 'CF11', label: 'Color Fest 11', year: 2023, color: 'hsl(160, 70%, 45%)' },
  { key: 'CF10', label: 'Color Fest 10', year: 2022, color: 'hsl(350, 80%, 55%)' },
];

/* ── Event-ID → edition for unnumbered "Color Fest" events ── */
const EVENT_ID_EDITION_MAP: Record<string, string> = {
  // CF10 (2022) – IDs in the 110xxx–113xxx range
  'RXZlbnQ6MTEwMTkz': 'CF10', // Abbonamento Full
  'RXZlbnQ6MTExMDEz': 'CF10', // 11 Agosto One Day
  'RXZlbnQ6MTExMDE3': 'CF10', // 12 Agosto One Day
  'RXZlbnQ6MTExMDE4': 'CF10', // 13 Agosto One Day
  'RXZlbnQ6MTEyNTkz': 'CF10', // 11-12 Agosto Two Days
  'RXZlbnQ6MTEzMDM5': 'CF10', // 12-13 Agosto Two Days
  'RXZlbnQ6MTEzMDQw': 'CF10', // 11-13 Agosto Two Days
  // CF11 (2023) – IDs in the 163xxx range
  'RXZlbnQ6MTYzMDAw': 'CF11', // Abbonamento Full
  'RXZlbnQ6MTYzMzA5': 'CF11', // 11 Agosto One Day
  'RXZlbnQ6MTYzMzEx': 'CF11', // 12 Agosto One Day
  'RXZlbnQ6MTYzMzEz': 'CF11', // 11-12 Agosto Two Days
  'RXZlbnQ6MTYzMzE0': 'CF11', // 13 Agosto BECOLOR
  'RXZlbnQ6MTYzMzE1': 'CF11', // 12-13 Agosto Two Days
  'RXZlbnQ6MTYzMzE2': 'CF11', // 11-13 Agosto Two Days
};

function classifyEvent(eventName: string, eventId: string | null): string | null {
  // 1) Try numbered match: "Color Fest 14"
  const m = eventName.match(/Color Fest\s*(\d+)/i);
  if (m) return `CF${m[1]}`;
  // 2) BECOLOR @ Color Fest (unnumbered) – check event_id
  // 3) Unnumbered "Color Fest" – use event_id map
  if (eventId && EVENT_ID_EDITION_MAP[eventId]) return EVENT_ID_EDITION_MAP[eventId];
  // Exclude Winter, Pasquetta, Factory, etc.
  if (/winter|pasquetta|factory/i.test(eventName)) return null;
  // Generic "Color Fest" without ID mapping → skip
  return null;
}

type Mode = 'single' | 'range';

interface EditionTotal {
  key: string;
  label: string;
  color: string;
  total: number;
  events: { name: string; sold: number }[];
}

const PIE_COLORS = [
  'hsl(220, 100%, 55%)', 'hsl(42, 100%, 50%)', 'hsl(280, 80%, 55%)',
  'hsl(160, 70%, 45%)', 'hsl(350, 80%, 55%)', 'hsl(30, 90%, 55%)',
];

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
  const [editionTotals, setEditionTotals] = useState<EditionTotal[]>([]);
  const [snapshotDates, setSnapshotDates] = useState<string[]>([]);

  const selectedDates = useMemo(() => {
    if (mode === 'single') return { from: singleDate, to: singleDate };
    return { from: dateRange?.from || new Date(), to: dateRange?.to || new Date() };
  }, [mode, singleDate, dateRange]);

  // Fetch available snapshot dates on mount
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
      const toStr = format(addDays(to, 1), 'yyyy-MM-dd');
      const fromStr = format(from, 'yyyy-MM-dd');

      // Fetch the latest snapshot for each event within the selected date range
      const { data, error } = await supabase
        .from('ticket_snapshots')
        .select('event_id, event_name, tickets_sold, snapshot_date')
        .gte('snapshot_date', fromStr)
        .lt('snapshot_date', toStr)
        .order('snapshot_date', { ascending: false });

      if (error || !data) {
        console.error(error);
        setEditionTotals([]);
        return;
      }

      // Take the latest snapshot per event (most recent snapshot_date)
      const latestPerEvent = new Map<string, { event_id: string; event_name: string; tickets_sold: number }>();
      for (const row of data) {
        const eid = row.event_id || row.event_name || '';
        if (!latestPerEvent.has(eid)) {
          latestPerEvent.set(eid, {
            event_id: row.event_id || '',
            event_name: row.event_name || '',
            tickets_sold: row.tickets_sold,
          });
        }
      }

      // Group by edition
      const editionMap = new Map<string, { total: number; events: { name: string; sold: number }[] }>();
      for (const ev of latestPerEvent.values()) {
        const edKey = classifyEvent(ev.event_name, ev.event_id);
        if (!edKey) continue;
        if (!editionMap.has(edKey)) editionMap.set(edKey, { total: 0, events: [] });
        const entry = editionMap.get(edKey)!;
        entry.total += ev.tickets_sold;
        entry.events.push({ name: ev.event_name, sold: ev.tickets_sold });
      }

      // Build result aligned with EDITIONS
      const results: EditionTotal[] = [];
      for (const ed of EDITIONS) {
        const found = editionMap.get(ed.key);
        if (found && found.total > 0) {
          found.events.sort((a, b) => b.sold - a.sold);
          results.push({ key: ed.key, label: ed.label, color: ed.color, total: found.total, events: found.events });
        }
      }

      setEditionTotals(results);
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
    if (isSameDay(from, to)) return format(from, 'd MMMM yyyy', { locale: it });
    return `${format(from, 'd MMM yyyy', { locale: it })} – ${format(to, 'd MMM yyyy', { locale: it })}`;
  }, [selectedDates]);

  const grandTotal = editionTotals.reduce((s, e) => s + e.total, 0);

  // Highlight available snapshot dates in calendar
  const highlightedDays = useMemo(
    () => snapshotDates.map(d => new Date(d + 'T12:00:00')),
    [snapshotDates],
  );

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
              Seleziona una data o periodo per confrontare i biglietti venduti per ogni edizione del Color Fest a quella data.
              Le date con dati disponibili sono <strong>sottolineate</strong> nel calendario.
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
        {!loading && editionTotals.length > 0 && (
          <>
            {/* Main comparison pie chart */}
            <Card className="glass-card rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-primary" />
                  Confronto Totale Biglietti per Edizione
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="w-full md:w-1/2" style={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={editionTotals.map(e => ({ name: e.label, value: e.total }))}
                          cx="50%" cy="50%"
                          innerRadius={55} outerRadius={110}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="hsl(var(--background))"
                          strokeWidth={3}
                        >
                          {editionTotals.map((e, i) => (
                            <Cell key={e.key} fill={e.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px', fontSize: '12px',
                          }}
                          formatter={(value: number) => [value.toLocaleString('it-IT'), 'Biglietti']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Legend */}
                  <div className="w-full md:w-1/2 space-y-3">
                    {editionTotals.map((e) => {
                      const pct = grandTotal > 0 ? ((e.total / grandTotal) * 100).toFixed(1) : '0';
                      return (
                        <div key={e.key} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/40">
                          <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
                            <span className="font-semibold text-sm">{e.label}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-base">{e.total.toLocaleString('it-IT')}</span>
                            <span className="text-xs text-muted-foreground ml-2">({pct}%)</span>
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20">
                      <span className="font-bold text-sm">Totale</span>
                      <span className="font-mono font-bold text-base">{grandTotal.toLocaleString('it-IT')}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Per-edition detail cards with mini pie */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {editionTotals.map((ed) => {
                const topEvents = ed.events.slice(0, 8);
                const othersTotal = ed.events.slice(8).reduce((s, e) => s + e.sold, 0);
                const pieData = [
                  ...topEvents.map(e => ({ name: e.name, value: e.sold })),
                  ...(othersTotal > 0 ? [{ name: 'Altri', value: othersTotal }] : []),
                ].filter(d => d.value > 0);

                return (
                  <Card key={ed.key} className="glass-card rounded-2xl overflow-hidden">
                    <CardHeader className="pb-2" style={{ borderLeft: `4px solid ${ed.color}` }}>
                      <CardTitle className="text-base font-bold flex items-center justify-between">
                        <span>{ed.label}</span>
                        <span className="font-mono text-lg" style={{ color: ed.color }}>
                          {ed.total.toLocaleString('it-IT')}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {pieData.length > 0 && (
                        <div className="flex items-start gap-3">
                          <div className="shrink-0" style={{ width: 120, height: 120 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={pieData}
                                  cx="50%" cy="50%"
                                  innerRadius={25} outerRadius={50}
                                  paddingAngle={2}
                                  dataKey="value"
                                  stroke="hsl(var(--background))"
                                  strokeWidth={2}
                                >
                                  {pieData.map((_, i) => (
                                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip
                                  contentStyle={{
                                    background: 'hsl(var(--card))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '6px', fontSize: '11px',
                                  }}
                                  formatter={(v: number) => [v.toLocaleString('it-IT'), 'Venduti']}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex-1 space-y-1 min-w-0 max-h-[160px] overflow-y-auto pr-1">
                            {pieData.map((item, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs">
                                <div
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                                />
                                <span className="truncate flex-1 text-muted-foreground">{item.name}</span>
                                <span className="font-mono font-semibold shrink-0">{item.value.toLocaleString('it-IT')}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Comparison Table */}
            <Card className="glass-card rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Riepilogo Dettagliato</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Edizione</th>
                        <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Biglietti</th>
                        <th className="text-right py-2 px-3 font-semibold text-muted-foreground">% Totale</th>
                        <th className="text-right py-2 px-3 font-semibold text-muted-foreground">N° Eventi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editionTotals.map((ed) => (
                        <tr key={ed.key} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-2 px-3 font-semibold flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ed.color }} />
                            {ed.label}
                          </td>
                          <td className="text-right py-2 px-3 font-mono font-bold">{ed.total.toLocaleString('it-IT')}</td>
                          <td className="text-right py-2 px-3 font-mono">
                            {grandTotal > 0 ? ((ed.total / grandTotal) * 100).toFixed(1) : 0}%
                          </td>
                          <td className="text-right py-2 px-3 font-mono">{ed.events.length}</td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-border font-bold">
                        <td className="py-2 px-3">Totale</td>
                        <td className="text-right py-2 px-3 font-mono">{grandTotal.toLocaleString('it-IT')}</td>
                        <td className="text-right py-2 px-3 font-mono">100%</td>
                        <td className="text-right py-2 px-3 font-mono">
                          {editionTotals.reduce((s, e) => s + e.events.length, 0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {!loading && editionTotals.length === 0 && (
          <Card className="glass-card rounded-2xl">
            <CardContent className="py-12 text-center">
              <PieChartIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                Nessun dato disponibile per il periodo selezionato.
                Seleziona una data con dati (sottolineata nel calendario) e premi "Confronta".
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Monitoraggio;
