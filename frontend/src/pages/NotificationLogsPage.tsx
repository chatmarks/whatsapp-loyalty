export function NotificationLogsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Benachrichtigungsprotokoll</h1>
      <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
        WhatsApp-Zustellungsprotokolle — <code>GET /api/v1/logs</code>-Endpunkt hinzufügen, um aus <code>notification_logs</code> zu laden.
      </div>
    </div>
  );
}
