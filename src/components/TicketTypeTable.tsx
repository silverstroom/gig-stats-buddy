import type { TicketType } from '@/lib/ticket-utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface TicketTypeTableProps {
  tickets: TicketType[];
}

export function TicketTypeTable({ tickets }: TicketTypeTableProps) {
  const total = tickets.reduce((sum, t) => sum + t.sold, 0);

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="p-4 border-b border-border/50">
        <h3 className="font-semibold text-lg">Biglietti per Tipologia</h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="border-border/50">
            <TableHead className="text-muted-foreground">Tipologia</TableHead>
            <TableHead className="text-right text-muted-foreground">Venduti</TableHead>
            <TableHead className="text-right text-muted-foreground">%</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket, i) => (
            <TableRow key={i} className="border-border/30 hover:bg-muted/50">
              <TableCell className="font-medium">{ticket.name}</TableCell>
              <TableCell className="text-right font-mono font-semibold">{ticket.sold}</TableCell>
              <TableCell className="text-right font-mono text-muted-foreground">
                {total > 0 ? ((ticket.sold / total) * 100).toFixed(1) : 0}%
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="border-border/50 bg-muted/30 font-bold">
            <TableCell>Totale</TableCell>
            <TableCell className="text-right font-mono">{total}</TableCell>
            <TableCell className="text-right font-mono">100%</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
