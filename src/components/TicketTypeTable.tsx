import type { EditionTicketRow } from '@/lib/ticket-utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface TicketTypeTableProps {
  rows: EditionTicketRow[];
}

export function TicketTypeTable({ rows }: TicketTypeTableProps) {
  const total = rows.reduce((sum, r) => sum + r.sold, 0);

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-border/50">
        <h3 className="font-bold text-lg">Biglietti per Tipologia</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Ogni riga = un evento DICE con i giorni che copre
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="border-border/50">
            <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Tipologia</TableHead>
            <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Giorni</TableHead>
            <TableHead className="text-right text-muted-foreground text-xs font-semibold uppercase tracking-wider">Venduti</TableHead>
            <TableHead className="text-right text-muted-foreground text-xs font-semibold uppercase tracking-wider w-16">%</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => {
            const pct = total > 0 ? ((row.sold / total) * 100).toFixed(1) : '0';
            return (
              <TableRow key={i} className="border-border/30 hover:bg-muted/50">
                <TableCell className="font-medium text-sm max-w-[200px]">
                  <span className="line-clamp-2">{row.eventName}</span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {row.days.map((d) => (
                      <Badge key={d} variant="secondary" className="text-[10px] font-mono px-1.5 py-0">
                        {d}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono font-bold text-base">{row.sold.toLocaleString('it-IT')}</TableCell>
                <TableCell className="text-right font-mono text-muted-foreground text-sm">{pct}%</TableCell>
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
