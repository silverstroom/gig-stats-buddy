import type { EditionTicketRow } from '@/lib/ticket-utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface TicketTypeTableProps {
  rows: EditionTicketRow[];
}

export function TicketTypeTable({ rows }: TicketTypeTableProps) {
  const total = rows.reduce((sum, r) => sum + r.sold, 0);

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="p-4 border-b border-border/50">
        <h3 className="font-semibold text-lg">Biglietti per Tipologia</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Ogni riga = un evento DICE con i giorni che copre
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="border-border/50">
            <TableHead className="text-muted-foreground">Tipologia</TableHead>
            <TableHead className="text-muted-foreground">Giorni</TableHead>
            <TableHead className="text-right text-muted-foreground">Venduti</TableHead>
            <TableHead className="text-right text-muted-foreground">%</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i} className="border-border/30 hover:bg-muted/50">
              <TableCell className="font-medium text-sm">{row.eventName}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{row.days.join(', ')}</TableCell>
              <TableCell className="text-right font-mono font-semibold">{row.sold}</TableCell>
              <TableCell className="text-right font-mono text-muted-foreground">
                {total > 0 ? ((row.sold / total) * 100).toFixed(1) : 0}%
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="border-border/50 bg-muted/30 font-bold">
            <TableCell>Totale</TableCell>
            <TableCell />
            <TableCell className="text-right font-mono">{total}</TableCell>
            <TableCell className="text-right font-mono">100%</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
