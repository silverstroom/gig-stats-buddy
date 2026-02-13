import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { TicketType } from '@/lib/ticket-utils';

const TICKET_TYPES = [
  '2 Days (11-12 agosto)',
  '1 Day (11 agosto)',
  'Abbonamento Full',
  '2 Days (12-13 agosto)',
  '1 Day (12 agosto)',
  '1 Day (13 agosto)',
];

interface ManualTicketInputProps {
  onSubmit: (tickets: TicketType[]) => void;
  initialValues?: Record<string, number>;
}

export function ManualTicketInput({ onSubmit, initialValues }: ManualTicketInputProps) {
  const [values, setValues] = useState<Record<string, number>>(
    initialValues || Object.fromEntries(TICKET_TYPES.map((t) => [t, 0]))
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tickets: TicketType[] = TICKET_TYPES.map((name) => ({
      name,
      sold: values[name] || 0,
    }));
    onSubmit(tickets);
  };

  return (
    <form onSubmit={handleSubmit} className="glass-card rounded-xl p-6 space-y-4">
      <h3 className="font-semibold text-lg mb-2">Inserimento Manuale</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Inserisci i dati di vendita manualmente se l'API non restituisce le tipologie attese.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TICKET_TYPES.map((type) => (
          <div key={type} className="space-y-1">
            <Label className="text-sm">{type}</Label>
            <Input
              type="number"
              min={0}
              value={values[type] || 0}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [type]: parseInt(e.target.value) || 0 }))
              }
              className="font-mono"
            />
          </div>
        ))}
      </div>
      <Button type="submit" className="w-full gradient-primary text-primary-foreground font-semibold">
        Calcola Distribuzione
      </Button>
    </form>
  );
}
