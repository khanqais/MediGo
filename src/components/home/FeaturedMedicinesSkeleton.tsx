export default function FeaturedMedicinesSkeleton() {
  return (
    <section className="py-12 bg-white animate-pulse" aria-busy="true" aria-label="Loading featured medicines">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="h-4 w-36 bg-slate-200 rounded-sm mb-2" />
            <div className="h-8 w-48 bg-slate-200 rounded-md mb-2" />
            <div className="h-4 w-72 max-w-full bg-slate-200 rounded-sm" />
          </div>
          <div className="hidden sm:block h-6 w-28 bg-slate-200 rounded-md" />
        </div>

        {/* 5-Column Skeleton Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-full"
            >
              {/* Image container skeleton matching pt-[90%] */}
              <div className="relative pt-[90%] bg-slate-100 border-b border-slate-100">
                <div className="absolute inset-0 flex items-center justify-center p-3">
                  <div className="w-2/3 h-2/3 bg-slate-200/70 rounded-lg" />
                </div>
              </div>

              {/* Card body */}
              <div className="p-4 flex flex-col flex-1">
                <div className="h-3 w-16 bg-slate-200 rounded mb-2" />
                <div className="h-4 w-full bg-slate-200 rounded mb-1" />
                <div className="h-4 w-3/4 bg-slate-200 rounded mb-2" />
                <div className="h-3 w-24 bg-slate-200 rounded mb-3" />
                <div className="h-3.5 w-20 bg-slate-200 rounded mb-4" />

                <div className="mt-auto pt-2 border-t border-slate-100">
                  <div className="flex items-baseline justify-between mb-2">
                    <div className="h-5 w-16 bg-slate-200 rounded" />
                    <div className="h-3.5 w-12 bg-slate-200 rounded" />
                  </div>
                  <div className="h-9 w-full bg-slate-200 rounded-full mt-2.5" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile footer placeholder */}
        <div className="mt-8 sm:hidden">
          <div className="h-11 w-full bg-slate-200 rounded-full" />
        </div>
      </div>
    </section>
  );
}
