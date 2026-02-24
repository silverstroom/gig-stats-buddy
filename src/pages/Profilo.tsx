import { User, Settings, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Profilo = () => {
  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 hero-gradient opacity-90" />
        <div className="relative container mx-auto px-4 py-8 pb-10">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-primary-foreground/20 backdrop-blur-sm">
              <User className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-primary-foreground tracking-tight">
                Profilo
              </h1>
              <p className="text-sm text-primary-foreground/70">Impostazioni e informazioni</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-4 -mt-4">
        <Card className="glass-card rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" /> Informazioni App
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">App</span>
              <span className="font-semibold">Color Fest Analytics</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Versione</span>
              <span className="font-mono">1.0.0</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Dati da</span>
              <span className="font-semibold">DICE</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" /> Impostazioni
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Le impostazioni saranno disponibili in una futura versione.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Profilo;
