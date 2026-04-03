export default function LookLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-pulse">
      {/* Breadcrumb skeleton */}
      <div className="h-4 w-48 bg-muted rounded mb-6" />

      <div className="lg:grid lg:grid-cols-[1fr_420px] lg:gap-8">
        {/* Image skeleton */}
        <div className="aspect-[4/5] bg-muted rounded-lg" />

        {/* Right column skeleton */}
        <div className="mt-6 lg:mt-0 space-y-4">
          <div className="h-8 w-3/4 bg-muted rounded" />
          <div className="h-4 w-1/2 bg-muted rounded" />
          <div className="space-y-3 mt-6">
            <div className="h-24 bg-muted rounded-lg" />
            <div className="h-24 bg-muted rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  )
}
