import { useState, useEffect, useMemo } from 'react';
import { Target, Edit3, Check, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  // Use the same grouping logic as the Home page
  const editions = useMemo(() => groupEventsByEdition(events), [events]);

  // Find CF14 (latest edition, or first one sorted by year desc)
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

  // Use presenze totali for goal progress
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
    <div className="min-h-screen bg-background pb-24">
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 hero-gradient opacity-90" />
        <div className="relative container mx-auto px-4 py-8 pb-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-primary-foreground/20 backdrop-blur-sm">
                <Target className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-primary-foreground tracking-tight">
                  Obiettivo Vendite
                </h1>
                <p className="text-sm text-primary-foreground/70">
                  {cf14Edition ? cf14Edition.label : 'Color Fest 14'}
                </p>
              </div>
            </div>
            <Button
              onClick={fetchEvents}
              disabled={loading}
              variant="secondary"
              size="sm"
              className="gap-2 font-semibold shadow-lg"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6 -mt-4">
        {/* Goal setting */}
        <Card className="glass-card rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">Obiettivo biglietti</span>
              {editing ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={tempGoal}
                    onChange={(e) => setTempGoal(e.target.value)}
                    className="w-28 h-8 text-sm font-mono"
                    min={1}
                  />
                  <Button size="sm" variant="ghost" onClick={saveGoal}>
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => { setTempGoal(goal.toString()); setEditing(true); }} className="gap-1">
                  <span className="font-mono font-bold">{goal.toLocaleString('it-IT')}</span>
                  <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Radial progress chart */}
        <Card className="glass-card rounded-2xl">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg font-bold text-center">Stato di Avanzamento</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center py-6">
            {loading ? (
              <div className="w-64 h-64 flex items-center justify-center">
                <Target className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="relative" style={{ width: 280, height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                      cx="50%" cy="50%"
                      innerRadius="70%"
                      outerRadius="100%"
                      startAngle={90}
                      endAngle={-270}
                      data={chartData}
                      barSize={20}
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
                    <span className="text-4xl font-extrabold font-mono" style={{ color }}>
                      {pct.toFixed(1)}%
                    </span>
                    <span className="text-sm text-muted-foreground mt-1">completamento</span>
                  </div>
                </div>

                <div className="mt-6 w-full max-w-sm space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                    <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Users className="w-4 h-4" /> Presenze totali
                    </span>
                    <span className="font-mono font-bold text-lg">{totalPresenze.toLocaleString('it-IT')}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                    <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Ticket className="w-4 h-4" /> Biglietti venduti
                    </span>
                    <span className="font-mono font-bold text-lg">{currentTickets.toLocaleString('it-IT')}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                    <span className="text-sm font-medium text-muted-foreground">Obiettivo presenze</span>
                    <span className="font-mono font-bold text-lg">{goal.toLocaleString('it-IT')}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>
                    <span className="text-sm font-medium" style={{ color }}>Mancanti</span>
                    <span className="font-mono font-bold text-lg" style={{ color }}>
                      {Math.max(0, goal - totalPresenze).toLocaleString('it-IT')}
                    </span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Obiettivo;
