export function TableSkeleton({ rows = 5, columns = 5 }) {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex gap-4 mb-4 pb-3 border-b border-border">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="flex-1">
            <div className="h-4 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex gap-4 py-3 border-b border-border"
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex} className="flex-1">
              <div className="h-4 bg-muted/50 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-card rounded-lg shadow p-6 animate-pulse">
      <div className="h-4 bg-muted rounded w-1/3 mb-4" />
      <div className="h-8 bg-muted rounded w-1/2 mb-2" />
      <div className="h-3 bg-muted rounded w-1/4" />
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-card rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 bg-muted rounded w-1/3 animate-pulse" />
        <div className="w-10 h-10 bg-muted rounded-full animate-pulse" />
      </div>
      <div className="h-8 bg-muted rounded w-1/2 mb-2 animate-pulse" />
      <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-card rounded-lg shadow p-6">
      <div className="h-5 bg-muted rounded w-1/4 mb-6 animate-pulse" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-end gap-2 h-32">
            {Array.from({ length: 7 }).map((_, j) => (
              <div
                key={j}
                className="flex-1 bg-muted rounded animate-pulse"
                style={{ height: `${Math.random() * 100}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ListSkeleton({ items = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="bg-card rounded-lg shadow p-4 animate-pulse"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-muted rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
            <div className="h-8 bg-muted rounded w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="h-10 bg-muted rounded w-24" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>

      {/* Content Sections */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-card rounded-lg shadow p-6"
          >
            <div className="h-5 bg-muted rounded w-1/4 mb-4" />
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-5/6" />
              <div className="h-4 bg-muted rounded w-4/6" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
