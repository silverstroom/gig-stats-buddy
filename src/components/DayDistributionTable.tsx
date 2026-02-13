import type { DayDistribution } from '@/lib/ticket-utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface DayDistributionTableProps {
  distribution: DayDistribution[];
}

const BAR_COLORS = [
  'bg-primary',
  'bg-secondary',
  'bg-muted-foreground/40',
];

export function DayDistributionTable({ distribution }: DayDistributionTableProps) {
  const total = distribution.reduce((sum, d) => sum + d.count, 0);
  const maxCount = Math.max(...distribution.map(d => d.count), 1);

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-border/50">
        <h3 className="font-bold text-lg">Presenze per Giorno</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Biglietti multi-giorno contati per ogni giorno coperto
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="border-border/50">
            <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Giorno</TableHead>
            <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Distribuzione</TableHead>
            <TableHead className="text-right text-muted-foreground text-xs font-semibold uppercase tracking-wider">Presenze</TableHead>
            <TableHead className="text-right text-muted-foreground text-xs font-semibold uppercase tracking-wider w-16">%</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {distribution.map((day, i) => {
            const pct = total > 0 ? (day.count / total) * 100 : 0;
            const barWidth = (day.count / maxCount) * 100;
            return (
              <TableRow key={day.date} className="border-border/30 hover:bg-muted/50">
                <TableCell className="font-bold text-sm">{day.day}</TableCell>
                <TableCell>
                  <div className="w-full bg-muted/50 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${BAR_COLORS[i % BAR_COLORS.length]} transition-all duration-500`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono font-bold text-base">{day.count.toLocaleString('it-IT')}</TableCell>
                <TableCell className="text-right font-mono text-muted-foreground text-sm">
                  {pct.toFixed(1)}%
                </TableCell>
              </TableRow>
            );
          })}
          <TableRow className="border-border/50 bg-primary/5 font-bold">
            <TableCell className="text-primary font-bold">Totale</TableCell>
            <TableCell />
            <TableCell className="text-right font-mono text-primary text-base">{total.toLocaleString('it-IT')}</TableCell>
            <TableCell className="text-right font-mono text-primary">100%</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
