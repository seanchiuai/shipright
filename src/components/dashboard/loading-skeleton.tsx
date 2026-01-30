export function LoadingSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-card/50 border border-border rounded-2xl p-6 animate-pulse"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-muted" />
            <div className="w-20 h-6 rounded-full bg-muted" />
          </div>
          <div className="h-6 w-3/4 rounded bg-muted mb-2" />
          <div className="h-4 w-1/2 rounded bg-muted mb-4" />
          <div className="pt-4 border-t border-border/50">
            <div className="h-4 w-24 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
