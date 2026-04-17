import { useBusiness } from '@/hooks/useBusiness';

export function QRCodePage() {
  const { data: business } = useBusiness();
  const registrationUrl = business ? `${window.location.origin}/r/${business.slug}` : '';

  return (
    <div className="space-y-6 max-w-sm">
      <h1 className="text-2xl font-bold">QR-Code</h1>
      <div className="rounded-xl border bg-card p-6 text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          Kunden scannen diesen Code, um deinem Treueprogramm beizutreten.
        </p>
        {registrationUrl && (
          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs font-mono break-all text-foreground">{registrationUrl}</p>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          QR-Code-Generierung benötigt die <code>qrcode</code>-Bibliothek — installieren via <code>npm i qrcode</code>.
        </p>
      </div>
    </div>
  );
}
