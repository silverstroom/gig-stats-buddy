import { User, Settings, Info } from 'lucide-react';

const Profilo = () => {
  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="px-5 pt-8 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-primary/10">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Profilo</h1>
            <p className="text-xs text-muted-foreground">Impostazioni e info</p>
          </div>
        </div>
      </header>

      <main className="px-5 space-y-4">
        <div className="soft-card-blue p-5">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold">Info App</h3>
          </div>
          <div className="space-y-2.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">App</span>
              <span className="font-semibold">Color Fest Analytics</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Versione</span>
              <span className="font-mono">1.0.0</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Dati da</span>
              <span className="font-semibold">DICE</span>
            </div>
          </div>
        </div>

        <div className="soft-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold">Impostazioni</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Le impostazioni saranno disponibili in una futura versione.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Profilo;
