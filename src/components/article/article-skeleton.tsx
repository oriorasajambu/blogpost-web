const bar = 'rounded-md bg-raised';

/** Static tint placeholders; there is no shimmer, so reduced motion needs no special case. */
export function ArticleSkeleton({ announce = true }: { announce?: boolean }) {
  return (
    <div
      role={announce ? 'status' : undefined}
      aria-label={announce ? 'Loading articles' : undefined}
      aria-hidden={!announce || undefined}
      className="flex flex-col gap-10"
    >
      {announce && <span className="sr-only">Loading articles…</span>}
      <div className="grid gap-8 md:grid-cols-[7fr_5fr]" aria-hidden="true">
        <div className={`${bar} aspect-[16/9] rounded-xl`} />
        <div className="flex flex-col justify-center gap-3.5">
          <div className={`${bar} h-3 w-[30%]`} />
          <div className={`${bar} h-7 w-[92%]`} />
          <div className={`${bar} h-7 w-[70%]`} />
          <div className={`${bar} mt-2 h-3.5 w-[80%]`} />
          <div className={`${bar} h-3.5 w-[40%]`} />
        </div>
      </div>
      <div className="grid gap-8 md:grid-cols-2" aria-hidden="true">
        {Array.from({ length: 2 }, (_, index) => (
          <div className="flex flex-col gap-3" key={index}>
            <div className={`${bar} aspect-[16/9] rounded-[10px]`} />
            <div className={`${bar} h-5 w-[85%]`} />
            <div className={`${bar} h-3 w-1/2`} />
          </div>
        ))}
      </div>
    </div>
  );
}
