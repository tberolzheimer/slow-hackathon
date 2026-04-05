import { Skeleton } from "@/components/ui/skeleton"

export default function VibeLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-16">
      <div className="max-w-xl mx-auto text-center mb-10">
        <Skeleton className="h-12 w-48 mx-auto mb-3" />
        <Skeleton className="h-4 w-72 mx-auto" />
      </div>
      <div className="columns-2 sm:columns-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[3/4] rounded-lg mb-4" />
        ))}
      </div>
    </div>
  )
}
