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

const dayColors = [
  'text-chart-day1',
  'text-chart-day2',
  'text-chart-day3',
];

export function DayDistributionTable({ distribution }: DayDistributionTableProps) {
  const total = distribution.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="p-4 border-b border-border/50">
        <h3 className="font-semibold text-lg">Presenze per Giorno</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Include biglietti multi-giorno (2 Days = 2gg, Full = 3gg)
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="border-border/50">
            <TableHead className="text-muted-foreground">Giorno</TableHead>
            <TableHead className="text-right text-muted-foreground">Presenze</TableHead>
            <TableHead className="text-right text-muted-foreground">%</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {distribution.map((day, i) => (
            <TableRow key={day.date} className="border-border/30 hover:bg-muted/50">
              <TableCell className={`font-semibold ${dayColors[i]}`}>{day.date}</TableCell>
              <TableCell className="text-right font-mono font-semibold">{day.count}</TableCell>
              <TableCell className="text-right font-mono text-muted-foreground">
                {total > 0 ? ((day.count / total) * 100).toFixed(1) : 0}%
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
