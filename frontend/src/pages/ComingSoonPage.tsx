import { Clock } from 'lucide-react';

interface Props {
  title: string;
  description?: string;
}

export function ComingSoonPage({ title, description }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Clock className="h-8 w-8 text-muted-foreground" />
      </div>
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-xs">
          {description ?? 'Diese Funktion ist in Entwicklung und wird bald verfügbar sein.'}
        </p>
      </div>
      <span className="rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
        Demnächst
      </span>
    </div>
  );
}
