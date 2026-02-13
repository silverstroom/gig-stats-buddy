import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Event {
  id: string;
  name: string;
}

interface EventSelectorProps {
  events: Event[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function EventSelector({ events, selectedId, onSelect }: EventSelectorProps) {
  return (
    <Select value={selectedId || ''} onValueChange={onSelect}>
      <SelectTrigger className="w-full max-w-md glass-card">
        <SelectValue placeholder="Seleziona un evento..." />
      </SelectTrigger>
      <SelectContent>
        {events.map((event) => (
          <SelectItem key={event.id} value={event.id}>
            {event.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
