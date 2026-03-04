import { useState, useEffect, useMemo } from 'react';
import { Target, Edit3, Check, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDiceEvents } from '@/hooks/useDiceEvents';
import { groupEventsByEdition, getTotalTickets, calculateEditionAttendance } from '@/lib/ticket-utils';
import { Users, Ticket } from 'lucide-react';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';

function getProgressColor(pct: number): string {
  if (pct <= 50) {
    const h = (pct / 50) * 60;
    return `hsl(${h}, 85%, 50%)`;
  }
  const h = 60 + ((pct - 50) / 50) * 60;
  return `hsl(${h}, 75%, 42%)`;
}

const Obiettivo = () => {
  const [goal, setGoal] = useState<number>(() => {
    const saved = localStorage.getItem('ticket_goal');
    return saved ? parseInt(saved, 10) : 6000;
  });
  const [editing, setEditing] = useState(false);
  const [tempGoal, setTempGoal] = useState(goal.toString());

  const { events, loading, fetchEvents } = useDiceEvents();

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const editions = useMemo(() => groupEventsByEdition(events), [events]);

  const cf14Edition = useMemo(() => {
    return editions.find(e => e.key === 'cf-14') || (editions.length > 0 ? editions[0] : null);
  }, [editions]);

  const currentTickets = useMemo(() => {
    return cf14Edition ? getTotalTickets(cf14Edition) : 0;
  }, [cf14Edition]);

  const totalPresenze = useMemo(() => {
    if (!cf14Edition) return 0;
    const distribution = calculateEditionAttendance(cf14Edition);
    return distribution.reduce((s, d) => s + d.count, 0);
  }, [cf14Edition]);

  const pct = Math.min((totalPresenze / goal) * 100, 100);
  const color = getProgressColor(pct);

  const chartData = [{ name: 'Progresso', value: pct, fill: color }];

  const saveGoal = () => {
    const val = parseInt(tempGoal, 10);
    if (!isNaN(val) && val > 0) {
      setGoal(val);
      localStorage.setItem('ticket_goal', val.toString());
    }
    setEditing(false);
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="px-5 pt-8 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Obiettivo</h1>
              <p className="text-xs text-muted-foreground">
                {cf14Edition ? cf14Edition.label : 'Color Fest 14'}
              </p>
            </div>
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
      </header>

      <main className="px-5 space-y-4">
        {/* Goal setting */}
        <div className="soft-card-blue p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Obiettivo presenze</span>
            {editing ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={tempGoal}
                  onChange={(e) => setTempGoal(e.target.value)}
                  className="w-28 h-8 text-sm font-mono rounded-xl"
                  min={1}
                />
                <Button size="sm" variant="ghost" onClick={saveGoal} className="rounded-xl">
                  <Check className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => { setTempGoal(goal.toString()); setEditing(true); }} className="gap-1 rounded-xl">
                <span className="font-mono font-bold">{goal.toLocaleString('it-IT')}</span>
                <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            )}
          </div>
        </div>

        {/* Radial progress */}
        <div className="soft-card p-5">
          <h2 className="text-base font-bold text-center mb-2">Stato di Avanzamento</h2>
          {loading ? (
            <div className="w-64 h-64 flex items-center justify-center mx-auto">
              <Target className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="relative mx-auto" style={{ width: 260, height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    cx="50%" cy="50%"
                    innerRadius="72%"
                    outerRadius="100%"
                    startAngle={90}
                    endAngle={-270}
                    data={chartData}
                    barSize={18}
                  >
                    <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                    <RadialBar
                      dataKey="value"
                      cornerRadius={12}
                      background={{ fill: 'hsl(var(--muted))' }}
                      angleAxisId={0}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold font-mono" style={{ color }}>
                    {pct.toFixed(1)}%
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">completamento</span>
                </div>
              </div>

              <div className="mt-4 space-y-2.5">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/30">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="w-4 h-4" /> Presenze totali
                  </span>
                  <span className="font-mono font-bold">{totalPresenze.toLocaleString('it-IT')}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/30">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                    <Ticket className="w-4 h-4" /> Biglietti venduti
                  </span>
                  <span className="font-mono font-bold">{currentTickets.toLocaleString('it-IT')}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/30">
                  <span className="text-xs font-medium text-muted-foreground">Obiettivo</span>
                  <span className="font-mono font-bold">{goal.toLocaleString('it-IT')}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl" style={{ backgroundColor: `${color}12`, border: `1px solid ${color}25` }}>
                  <span className="text-xs font-medium" style={{ color }}>Mancanti</span>
                  <span className="font-mono font-bold" style={{ color }}>
                    {Math.max(0, goal - totalPresenze).toLocaleString('it-IT')}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Obiettivo;
