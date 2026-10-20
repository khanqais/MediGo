import { Star } from "lucide-react";

interface RatingStarsProps {
  rating?: number | null;
  reviewsCount?: number;
  size?: number;
  showText?: boolean;
  compact?: boolean;
}

export default function RatingStars({
  rating,
  reviewsCount,
  size = 14,
  showText = true,
  compact = false,
}: RatingStarsProps) {
  if (!rating || rating <= 0 || !reviewsCount) {
    if (!showText) return null;
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground/80 bg-muted/60 px-2 py-0.5 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
        <span>Newly listed</span>
      </span>
    );
  }

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-md text-[11px] font-bold">
        <Star size={size || 11} className="fill-amber-500 text-amber-500 shrink-0" />
        <span>{rating.toFixed(1)}</span>
        {reviewsCount !== undefined && showText && (
          <span className="text-[10px] text-muted-foreground font-normal">
            ({reviewsCount})
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={size}
            className={`${
              star <= Math.round(rating)
                ? "text-amber-400 fill-amber-400"
                : "text-slate-200 fill-slate-100"
            }`}
          />
        ))}
      </div>
      {showText && (
        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
          <span>{rating.toFixed(1)}</span>
          {reviewsCount !== undefined && (
            <span className="text-slate-400 font-normal">({reviewsCount})</span>
          )}
        </span>
      )}
    </div>
  );
}

