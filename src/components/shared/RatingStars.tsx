import { Star } from "lucide-react";

interface RatingStarsProps {
  rating?: number | null;
  reviewsCount?: number;
  size?: number;
  showText?: boolean;
}

export default function RatingStars({
  rating,
  reviewsCount,
  size = 14,
  showText = true,
}: RatingStarsProps) {
  if (!rating || rating <= 0 || !reviewsCount) {
    if (!showText) return null;
    return (
      <span className="text-xs text-slate-400 font-medium">
        Newly listed
      </span>
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
