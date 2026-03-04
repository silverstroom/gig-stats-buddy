import type { DayDistribution } from '@/lib/ticket-utils';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
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
    <div className="soft-card overflow-hidden">
      <div className="p-5 border-b border-border/30">
        <h3 className="font-bold text-base">Presenze per Giorno</h3>
        <p className="text-[11px] text-muted-foreground mt-1">
          Multi-giorno contati per ogni giorno coperto
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="border-border/30">
            <TableHead className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">Giorno</TableHead>
            <TableHead className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">Distribuzione</TableHead>
            <TableHead className="text-right text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">Presenze</TableHead>
            <TableHead className="text-right text-muted-foreground text-[10px] font-semibold uppercase tracking-wider w-14">%</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {distribution.map((day, i) => {
            const pct = total > 0 ? (day.count / total) * 100 : 0;
            const barWidth = (day.count / maxCount) * 100;
            return (
              <TableRow key={day.date} className="border-border/20 hover:bg-muted/30">
                <TableCell className="font-bold text-xs">{day.day}</TableCell>
                <TableCell>
                  <div className="w-full bg-muted/40 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${BAR_COLORS[i % BAR_COLORS.length]} transition-all duration-500`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono font-bold text-sm">{day.count.toLocaleString('it-IT')}</TableCell>
                <TableCell className="text-right font-mono text-muted-foreground text-xs">
                  {pct.toFixed(1)}%
                </TableCell>
              </TableRow>
            );
          })}
          <TableRow className="border-border/30 bg-primary/5 font-bold">
            <TableCell className="text-primary font-bold text-xs">Totale</TableCell>
            <TableCell />
            <TableCell className="text-right font-mono text-primary text-sm">{total.toLocaleString('it-IT')}</TableCell>
            <TableCell className="text-right font-mono text-primary text-xs">100%</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
