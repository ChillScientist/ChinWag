import React from 'react';
import { Button } from '@/components/ui/button';
import { Bookmark, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BookmarksFavoritesProps {
  isBookmarked: boolean;
  isFavorite: boolean;
  onToggleBookmark: () => void;
  onToggleFavorite: () => void;
  className?: string;
}

const BookmarksFavorites = ({
  isBookmarked,
  isFavorite,
  onToggleBookmark,
  onToggleFavorite,
  className
}: BookmarksFavoritesProps) => {
  return (
    <div className={cn("flex gap-1", className)}>
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleBookmark}
        className="h-8 w-8"
        title={isBookmarked ? "Remove bookmark" : "Add bookmark"}
      >
        <Bookmark 
          className={cn(
            "h-4 w-4 transition-colors",
            isBookmarked ? "fill-blue-500 text-blue-500" : "text-gray-500 hover:text-blue-500"
          )} 
        />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleFavorite}
        className="h-8 w-8"
        title={isFavorite ? "Remove from favorites" : "Add to favorites"}
      >
        <Star 
          className={cn(
            "h-4 w-4 transition-colors",
            isFavorite ? "fill-yellow-400 text-yellow-400" : "text-gray-500 hover:text-yellow-400"
          )} 
        />
      </Button>
    </div>
  );
};

export default BookmarksFavorites;