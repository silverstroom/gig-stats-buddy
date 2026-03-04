import type { EditionTicketRow } from '@/lib/ticket-utils';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface TicketTypeTableProps {
  rows: EditionTicketRow[];
}

export function TicketTypeTable({ rows }: TicketTypeTableProps) {
  const total = rows.reduce((sum, r) => sum + r.sold, 0);

  return (
    <div className="soft-card overflow-hidden">
      <div className="p-5 border-b border-border/30">
        <h3 className="font-bold text-base">Biglietti per Tipologia</h3>
        <p className="text-[11px] text-muted-foreground mt-1">
          Ogni riga = un evento DICE con i giorni coperti
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="border-border/30">
            <TableHead className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">Tipologia</TableHead>
            <TableHead className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">Giorni</TableHead>
            <TableHead className="text-right text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">Venduti</TableHead>
            <TableHead className="text-right text-muted-foreground text-[10px] font-semibold uppercase tracking-wider w-14">%</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => {
            const pct = total > 0 ? ((row.sold / total) * 100).toFixed(1) : '0';
            return (
              <TableRow key={i} className="border-border/20 hover:bg-muted/30">
                <TableCell className="font-medium text-xs max-w-[180px]">
                  <span className="line-clamp-2">{row.eventName}</span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {row.days.map((d) => (
                      <Badge key={d} variant="secondary" className="text-[9px] font-mono px-1.5 py-0 rounded-lg">
                        {d}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono font-bold text-sm">{row.sold.toLocaleString('it-IT')}</TableCell>
                <TableCell className="text-right font-mono text-muted-foreground text-xs">{pct}%</TableCell>
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
