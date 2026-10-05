export function SummaryKPISkeleton() {
  return (
    <div
      aria-hidden="true"
      className="w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5 animate-pulse"
    >
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="p-3 sm:p-4 rounded-xl border border-border-default bg-surface-100/60 flex flex-col justify-between gap-3 h-[96px]"
        >
          <div className="flex items-center justify-between">
            <div className="h-3 w-16 bg-surface-300 rounded" />
            <div className="size-5 bg-surface-200 rounded-md" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="h-6 w-14 bg-surface-300 rounded" />
            <div className="h-2.5 w-24 bg-surface-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PerformanceAnalyticsSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="w-full flex flex-col gap-4 rounded-xl border border-border-default bg-surface-100/60 p-4 sm:p-5 animate-pulse"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="h-4 w-44 bg-surface-300 rounded" />
          <div className="h-3 w-64 bg-surface-200 rounded" />
        </div>
        <div className="h-7 w-28 bg-surface-200 rounded-lg" />
      </div>

      {/* Filter Row */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border-default/40">
        <div className="h-5 w-48 bg-surface-200 rounded" />
        <div className="h-5 w-40 bg-surface-200 rounded" />
      </div>

      {/* Summary Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="p-2.5 rounded-lg bg-surface-200/50 border border-border-default/50 h-14 flex flex-col justify-between"
          >
            <div className="h-2.5 w-16 bg-surface-300 rounded" />
            <div className="h-5 w-12 bg-surface-300 rounded" />
          </div>
        ))}
      </div>

      {/* Chart Canvas Placeholder */}
      <div className="h-48 rounded-lg bg-surface-200/30 border border-border-default/40 flex items-end justify-between gap-3 p-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex-1 flex items-end justify-center gap-1 h-full">
            <div
              className="w-2.5 bg-surface-300/60 rounded-t"
              style={{ height: `${25 + ((i * 9) % 65)}%` }}
            />
            <div
              className="w-2.5 bg-surface-300/40 rounded-t"
              style={{ height: `${20 + ((i * 7) % 60)}%` }}
            />
            <div
              className="w-2.5 bg-surface-300/30 rounded-t"
              style={{ height: `${15 + ((i * 11) % 55)}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CourseMatrixSkeleton() {
  return (
    <div aria-hidden="true" className="w-full flex flex-col gap-4 animate-pulse">
      <div className="flex flex-col gap-1.5">
        <div className="h-4 w-52 bg-surface-300 rounded" />
        <div className="h-3 w-72 bg-surface-200 rounded" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-xl border border-border-default bg-surface-100/60 flex flex-col justify-between gap-3.5 h-[180px]"
          >
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <div className="h-3 w-16 bg-surface-300 rounded" />
                <div className="h-4 w-40 bg-surface-200 rounded" />
              </div>
              <div className="size-4 bg-surface-200 rounded" />
            </div>

            <div className="grid grid-cols-2 gap-2 border-y border-border-default/40 py-2">
              <div className="h-8 bg-surface-200/60 rounded" />
              <div className="h-8 bg-surface-200/60 rounded" />
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="h-8 bg-surface-200/40 rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmailIntelligenceSkeleton() {
  return (
    <div aria-hidden="true" className="w-full flex flex-col gap-4 animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <div className="h-4 w-40 bg-surface-300 rounded" />
          <div className="h-3 w-60 bg-surface-200 rounded" />
        </div>
        <div className="h-7 w-28 bg-surface-200 rounded" />
      </div>

      {/* Category Row */}
      <div className="flex overflow-x-auto gap-2.5 pb-1 sm:grid sm:grid-cols-3 lg:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="p-3 rounded-xl border border-border-default bg-surface-100/60 flex flex-col justify-between gap-1.5 h-16 shrink-0 min-w-[130px] sm:min-w-0"
          >
            <div className="h-2.5 w-14 bg-surface-300 rounded" />
            <div className="h-5 w-8 bg-surface-200 rounded" />
          </div>
        ))}
      </div>

      {/* Preview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="p-3.5 rounded-xl border border-border-default bg-surface-100/60 flex flex-col justify-between gap-3 h-[140px]"
          >
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between">
                <div className="h-3 w-20 bg-surface-300 rounded" />
                <div className="h-3 w-12 bg-surface-200 rounded" />
              </div>
              <div className="h-4 w-44 bg-surface-200 rounded" />
              <div className="h-3 w-full bg-surface-200/60 rounded" />
            </div>
            <div className="h-4 w-28 bg-surface-200/50 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ActivityFeedSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="w-full flex flex-col gap-4 rounded-xl border border-border-default bg-surface-100/60 p-4 sm:p-5 animate-pulse"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="h-4 w-44 bg-surface-300 rounded" />
          <div className="h-3 w-64 bg-surface-200 rounded" />
        </div>
        <div className="h-7 w-40 bg-surface-200 rounded" />
      </div>

      <div className="flex flex-col divide-y divide-border-default/40">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-8 bg-surface-200 rounded-lg shrink-0" />
              <div className="flex flex-col gap-1 min-w-0">
                <div className="h-3.5 w-48 bg-surface-300 rounded" />
                <div className="h-2.5 w-64 bg-surface-200 rounded" />
              </div>
            </div>
            <div className="h-3 w-16 bg-surface-200 rounded shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
