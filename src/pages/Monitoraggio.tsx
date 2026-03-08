import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { CalendarDays, CalendarRange, TrendingUp, TrendingDown, Upload, ArrowRightLeft, RefreshCw, Ticket, Users } from 'lucide-react';
import { format, addDays, addYears, isSameDay, eachDayOfInterval, subDays, subMonths, startOfMonth } from 'date-fns';
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
  { key: 'CF14', label: 'CF 14', year: 2026, color: 'hsl(220, 90%, 55%)' },
  { key: 'CF13', label: 'CF 13', year: 2025, color: 'hsl(42, 95%, 55%)' },
  { key: 'CF12', label: 'CF 12', year: 2024, color: 'hsl(280, 60%, 55%)' },
  { key: 'CF11', label: 'CF 11', year: 2023, color: 'hsl(160, 60%, 45%)' },
  { key: 'CF10', label: 'CF 10', year: 2022, color: 'hsl(350, 75%, 55%)' },
];

const CURRENT_YEAR = 2026;

const PRESETS = [
  { label: '7 giorni', getValue: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
  { label: '30 giorni', getValue: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { label: '3 mesi', getValue: () => ({ from: subMonths(new Date(), 3), to: new Date() }) },
  { label: '6 mesi', getValue: () => ({ from: subMonths(new Date(), 6), to: new Date() }) },
  { label: 'Da settembre', getValue: () => ({ from: new Date(2025, 8, 1), to: new Date() }) },
];

interface EditionResult {
  edition: typeof EDITIONS[number];
  totalPresenze: number;
  totalBiglietti: number;
  dailyData: { sale_date: string; presenze_delta: number; tickets_delta: number }[];
}

function isColorFestEvent(eventName: string): boolean {
  return /color\s*fest\s*\d/i.test(eventName);
}

function isCF14Event(eventName: string): boolean {
  return /color\s*fest\s*14/i.test(eventName);
}

function getPresenzeMultiplier(eventName: string): number {
  if (/2\s*days?/i.test(eventName)) return 2;
  if (/(abbonamento|full)/i.test(eventName) && !/1\s*day|one\s*day/i.test(eventName)) return 3;
  return 1;
}

const Monitoraggio = () => {
  const [activePreset, setActivePreset] = useState<number>(1); // default 30 giorni
  const [dateRange, setDateRange] = useState<DateRange | undefined>(PRESETS[1].getValue());
  const [customCalendarOpen, setCustomCalendarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [hasData, setHasData] = useState<boolean | null>(null);
  const [editionResults, setEditionResults] = useState<EditionResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { events, fetchEvents } = useDiceEvents();
  const eventsRef = useRef<typeof events>([]);
  eventsRef.current = events;

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  useEffect(() => {
    supabase.from('historical_daily_presenze').select('id', { count: 'exact', head: true })
      .then(({ count }) => setHasData((count || 0) > 0));
  }, []);

  const selectedDates = useMemo(() => {
    return { from: dateRange?.from || new Date(), to: dateRange?.to || new Date() };
  }, [dateRange]);

  const handlePresetClick = (index: number) => {
    setActivePreset(index);
    setDateRange(PRESETS[index].getValue());
    setCustomCalendarOpen(false);
  };

  const handleCustomRange = (range: DateRange | undefined) => {
    setDateRange(range);
    setActivePreset(-1);
    if (range?.from && range?.to) {
      setCustomCalendarOpen(false);
    }
  };

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

  const fetchAllTicketSnapshots = useCallback(async (fromDate: string, toDate: string) => {
    const pageSize = 1000;
    let offset = 0;
    const allRows: Array<{ snapshot_date: string; event_id: string | null; event_name: string | null; tickets_sold: number }> = [];

    while (true) {
      const { data, error } = await supabase
        .from('ticket_snapshots')
        .select('snapshot_date, event_id, event_name, tickets_sold')
        .gte('snapshot_date', fromDate)
        .lte('snapshot_date', toDate)
        .order('snapshot_date')
        .range(offset, offset + pageSize - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      allRows.push(...data);
      if (data.length < pageSize) break;
      offset += pageSize;
    }

    return allRows;
  }, []);

  const computeCF14SnapshotDeltas = useCallback(async (edFrom: string, edTo: string) => {
    const dayBefore = format(addDays(new Date(edFrom), -1), 'yyyy-MM-dd');

    const allSnapshots = await fetchAllTicketSnapshots(dayBefore, edTo);
    const snapshots = allSnapshots.filter(s => isCF14Event(s.event_name || ''));
    if (snapshots.length === 0) return [];

    const byDate = new Map<string, Map<string, { sold: number; eventName: string }>>();
    for (const s of snapshots) {
      const d = s.snapshot_date.split('T')[0];
      if (!byDate.has(d)) byDate.set(d, new Map());

      const eventKey = s.event_id || `name:${s.event_name || 'unknown'}`;
      const current = byDate.get(d)!.get(eventKey);
      byDate.get(d)!.set(eventKey, {
        sold: (current?.sold || 0) + s.tickets_sold,
        eventName: s.event_name || current?.eventName || '',
      });
    }

    const sortedDates = Array.from(byDate.keys()).sort();
    const deltas: { sale_date: string; presenze_delta: number; tickets_delta: number }[] = [];

    // If the first snapshot date is after edFrom, include its absolute totals
    // as a synthetic delta (these are all sales before snapshot tracking began)
    if (sortedDates.length > 0 && sortedDates[0] >= edFrom) {
      const firstMap = byDate.get(sortedDates[0])!;
      let initialPresenze = 0;
      let initialTickets = 0;
      for (const [, event] of firstMap) {
        initialTickets += event.sold;
        initialPresenze += event.sold * getPresenzeMultiplier(event.eventName);
      }
      if (initialPresenze > 0 || initialTickets > 0) {
        deltas.push({ sale_date: sortedDates[0], presenze_delta: initialPresenze, tickets_delta: initialTickets });
      }
    }

    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = sortedDates[i - 1];
      const currDate = sortedDates[i];
      if (currDate < edFrom || currDate > edTo) continue;

      const prevMap = byDate.get(prevDate)!;
      const currMap = byDate.get(currDate)!;

      let dayPresenze = 0;
      let dayTickets = 0;
      for (const [eventKey, currEvent] of currMap) {
        const prevSold = prevMap.get(eventKey)?.sold || 0;
        const ticketDelta = Math.max(0, currEvent.sold - prevSold);
        dayTickets += ticketDelta;
        dayPresenze += ticketDelta * getPresenzeMultiplier(currEvent.eventName);
      }

      if (dayPresenze > 0 || dayTickets > 0) {
        deltas.push({ sale_date: currDate, presenze_delta: dayPresenze, tickets_delta: dayTickets });
      }
    }

    const currentEvents = eventsRef.current.filter(e => isColorFestEvent(e.name));
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' });

    if (todayStr >= edFrom && todayStr <= edTo && currentEvents.length > 0) {
      const latestSnapshotDate = sortedDates[sortedDates.length - 1];

      if (latestSnapshotDate && latestSnapshotDate < todayStr) {
        const latestMap = byDate.get(latestSnapshotDate)!;
        let todayPresenze = 0;
        let todayTickets = 0;

        for (const event of currentEvents) {
          const prevSold = latestMap.get(event.id)?.sold || 0;
          const ticketDelta = Math.max(0, event.ticketsSold - prevSold);
          todayTickets += ticketDelta;
          todayPresenze += ticketDelta * getPresenzeMultiplier(event.name);
        }

        if (todayPresenze > 0 || todayTickets > 0) {
          deltas.push({ sale_date: todayStr, presenze_delta: todayPresenze, tickets_delta: todayTickets });
        }
      } else if (latestSnapshotDate === todayStr) {
        const todayMap = byDate.get(todayStr)!;
        let todayLivePresenze = 0;
        let todayLiveTickets = 0;

        for (const event of currentEvents) {
          const baselineSold = todayMap.get(event.id)?.sold || 0;
          const ticketDelta = Math.max(0, event.ticketsSold - baselineSold);
          todayLiveTickets += ticketDelta;
          todayLivePresenze += ticketDelta * getPresenzeMultiplier(event.name);
        }

        const existingIdx = deltas.findIndex((d) => d.sale_date === todayStr);
        if (existingIdx >= 0) {
          deltas[existingIdx].presenze_delta += todayLivePresenze;
          deltas[existingIdx].tickets_delta += todayLiveTickets;
        } else if (todayLivePresenze > 0 || todayLiveTickets > 0) {
          deltas.push({ sale_date: todayStr, presenze_delta: todayLivePresenze, tickets_delta: todayLiveTickets });
        }
      }
    }

    return deltas;
  }, [fetchAllTicketSnapshots]);

  const fetchComparison = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to } = selectedDates;

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
          .select('edition_key, sale_date, presenze_delta, tickets_delta')
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
          .map(d => ({ sale_date: d.sale_date, presenze_delta: d.presenze_delta, tickets_delta: d.tickets_delta ?? 0 }));

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
        const totalBiglietti = dailyData.reduce((s, d) => s + d.tickets_delta, 0);
        return { edition: ed, totalPresenze, totalBiglietti, dailyData };
      });

      setEditionResults(results);
    } catch (err) {
      console.error(err);
      toast.error('Errore nel confronto');
    } finally {
      setLoading(false);
    }
  }, [selectedDates, computeCF14SnapshotDeltas]);

  useEffect(() => {
    if (hasData) fetchComparison();
  }, [hasData, fetchComparison]);

  const dateLabel = useMemo(() => {
    const { from, to } = selectedDates;
    if (isSameDay(from, to)) return format(from, 'd MMMM yyyy', { locale: it });
    return `${format(from, 'd MMM', { locale: it })} – ${format(to, 'd MMM yyyy', { locale: it })}`;
  }, [selectedDates]);

  const cf14Result = editionResults.find(r => r.edition.key === 'CF14');
  const cf14TotalPresenze = cf14Result?.totalPresenze || 0;
  const cf14TotalBiglietti = cf14Result?.totalBiglietti || 0;

  const lineChartData = useMemo(() => {
    if (!editionResults.length || isSameDay(selectedDates.from, selectedDates.to)) return [];

    const days = eachDayOfInterval({ start: selectedDates.from, end: selectedDates.to });

    return days.map((day) => {
      const entry: Record<string, any> = { day: format(day, 'd MMM', { locale: it }) };

      for (const result of editionResults) {
        const yearOffset = result.edition.year - CURRENT_YEAR;
        const targetDate = format(addYears(day, yearOffset), 'yyyy-MM-dd');

        const cumulativePresenze = result.dailyData
          .filter(d => d.sale_date <= targetDate)
          .reduce((s, d) => s + d.presenze_delta, 0);

        entry[result.edition.key] = cumulativePresenze;
      }

      return entry;
    });
  }, [editionResults, selectedDates]);

  const barChartData = useMemo(() => {
    return editionResults.map(r => ({
      name: r.edition.label,
      presenze: r.totalPresenze,
      biglietti: r.totalBiglietti,
      fill: r.edition.color,
    }));
  }, [editionResults]);

  const CARD_STYLES_MON = ['soft-card-blue', 'soft-card-yellow', 'soft-card-purple', 'soft-card-mint', 'soft-card-pink'];

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="px-5 pt-8 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-primary/10">
            <ArrowRightLeft className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Monitoraggio</h1>
            <p className="text-xs text-muted-foreground">Confronto presenze e biglietti YoY</p>
          </div>
        </div>
      </header>

      <main className="px-5 space-y-4">
        {/* Import Section */}
        {hasData === false && (
          <div className="soft-card-orange p-6 text-center space-y-4">
            <Upload className="w-10 h-10 text-primary mx-auto" />
            <h3 className="text-base font-bold">Importa dati storici</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Importa il CSV delle transazioni DICE per il confronto tra edizioni.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button onClick={importBundled} disabled={importing} className="gap-2 rounded-2xl">
                <Upload className="w-4 h-4" />
                {importing ? 'Importazione...' : 'Importa dati inclusi'}
              </Button>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing} className="gap-2 rounded-2xl">
                <Upload className="w-4 h-4" />
                Carica CSV
              </Button>
            </div>
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileImport} />
          </div>
        )}

        {/* Date Controls - Redesigned */}
        {hasData && (
          <div className="soft-card p-4 space-y-3">
            {/* Preset chips */}
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handlePresetClick(idx)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    activePreset === idx
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-foreground/5 text-foreground hover:bg-foreground/10'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
              <Popover open={customCalendarOpen} onOpenChange={setCustomCalendarOpen}>
                <PopoverTrigger asChild>
                  <button
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      activePreset === -1
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-foreground/5 text-foreground hover:bg-foreground/10'
                    }`}
                  >
                    <CalendarRange className="w-3 h-3" />
                    Personalizzato
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={handleCustomRange}
                    numberOfMonths={1}
                    className="p-3 pointer-events-auto"
                    locale={it}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Current range display */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarDays className="w-3.5 h-3.5" />
                <span className="font-medium">{dateLabel}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importing} className="gap-1 text-[10px] rounded-xl h-7">
                  <Upload className="w-3 h-3" />
                  CSV
                </Button>
                <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileImport} />
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground">
              Full = 3 presenze, 2 Days = 2, 1 Day = 1. CF14 usa dati live.
            </p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Results */}
        {!loading && editionResults.length > 0 && (
          <div className="space-y-4">
            {/* Edition Cards */}
            <div className="space-y-3">
              {editionResults.map((result, idx) => {
                const diffPresenze = idx > 0 && result.totalPresenze > 0
                  ? ((cf14TotalPresenze - result.totalPresenze) / result.totalPresenze * 100)
                  : null;
                const isUp = diffPresenze !== null && diffPresenze > 0;
                const isDown = diffPresenze !== null && diffPresenze < 0;

                return (
                  <div key={result.edition.key} className={`${CARD_STYLES_MON[idx % CARD_STYLES_MON.length]} p-4`}>
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <h3 className="text-sm font-bold">{result.edition.label}</h3>
                        <p className="text-[10px] text-muted-foreground">
                          {(() => {
                            const yearOffset = result.edition.year - CURRENT_YEAR;
                            const f = addYears(selectedDates.from, yearOffset);
                            const t = addYears(selectedDates.to, yearOffset);
                            if (isSameDay(f, t)) return format(f, 'd MMM yyyy', { locale: it });
                            return `${format(f, 'd MMM yyyy', { locale: it })} – ${format(t, 'd MMM yyyy', { locale: it })}`;
                          })()}
                        </p>
                      </div>
                      <div className="text-right space-y-0.5">
                        <div className="flex items-center gap-2 justify-end">
                          <div className="text-right">
                            <div className="text-xl font-extrabold font-mono" style={{ color: result.edition.color }}>
                              {result.totalPresenze.toLocaleString('it-IT')}
                            </div>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 justify-end">
                              <Users className="w-2.5 h-2.5" /> presenze
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 justify-end">
                          <span className="text-sm font-bold font-mono text-foreground/70">
                            {result.totalBiglietti.toLocaleString('it-IT')}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Ticket className="w-2.5 h-2.5" /> biglietti
                          </span>
                        </div>
                      </div>
                    </div>

                    {idx > 0 && diffPresenze !== null && result.totalPresenze > 0 && (
                      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-xl text-[10px] font-semibold ${
                        isUp ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        isDown ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        CF14 {isUp ? '+' : ''}{diffPresenze.toFixed(1)}% vs {result.edition.label}
                      </div>
                    )}

                    {idx > 0 && result.totalPresenze === 0 && (
                      <p className="text-[10px] text-muted-foreground italic">Nessun dato</p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bar Chart */}
            <div className="soft-card p-4">
              <h3 className="text-sm font-bold mb-3">Confronto diretto</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 16 }}
                    formatter={(value: number, name: string) => [
                      value.toLocaleString('it-IT'),
                      name === 'presenze' ? 'Presenze' : 'Biglietti'
                    ]}
                  />
                  <Legend formatter={(value) => value === 'presenze' ? 'Presenze' : 'Biglietti'} />
                  <Bar dataKey="presenze" radius={[10, 10, 0, 0]}>
                    {barChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                  <Bar dataKey="biglietti" radius={[10, 10, 0, 0]} opacity={0.5}>
                    {barChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Line Chart */}
            {lineChartData.length > 1 && (
              <div className="soft-card p-4">
                <h3 className="text-sm font-bold mb-3">Andamento cumulativo</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={lineChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 16 }}
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
              </div>
            )}

            {/* Summary Table */}
            <div className="soft-card overflow-hidden">
              <div className="p-4 border-b border-border/30">
                <h3 className="text-sm font-bold">Riepilogo</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="text-left py-2 px-3 text-[10px] font-semibold text-muted-foreground uppercase">Edizione</th>
                      <th className="text-right py-2 px-3 text-[10px] font-semibold text-muted-foreground uppercase">Biglietti</th>
                      <th className="text-right py-2 px-3 text-[10px] font-semibold text-muted-foreground uppercase">Presenze</th>
                      <th className="text-right py-2 px-3 text-[10px] font-semibold text-muted-foreground uppercase">vs CF14</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editionResults.map((result, idx) => {
                      const diff = idx > 0 && result.totalPresenze > 0
                        ? ((cf14TotalPresenze - result.totalPresenze) / result.totalPresenze * 100)
                        : null;
                      return (
                        <tr key={result.edition.key} className="border-b border-border/20">
                          <td className="py-2 px-3 font-semibold text-xs flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: result.edition.color }} />
                            {result.edition.label}
                          </td>
                          <td className="text-right py-2 px-3 font-mono font-bold text-xs">
                            {result.totalBiglietti.toLocaleString('it-IT')}
                          </td>
                          <td className="text-right py-2 px-3 font-mono font-bold text-xs">
                            {result.totalPresenze.toLocaleString('it-IT')}
                          </td>
                          <td className="text-right py-2 px-3 font-mono text-[10px]">
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
            </div>
          </div>
        )}

        {!loading && editionResults.length === 0 && hasData && (
          <div className="soft-card p-10 text-center">
            <ArrowRightLeft className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              Seleziona un periodo e premi "Confronta".
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Monitoraggio;
