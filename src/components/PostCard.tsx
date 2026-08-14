import React, { useState } from 'react';
import { Heart, Share2, MapPin, ArrowLeft, CheckCircle, Play } from 'lucide-react';
import { FeedPost } from '../types';

interface PostCardProps {
  post: FeedPost;
  locationLabel?: string;
  isLiked: boolean;
  onToggleLike: (postId: string) => void;
  onOpenMedia: (post: FeedPost) => void;
  onOpenTarget: (post: FeedPost) => void;
  onBookTarget: (post: FeedPost) => void;
  exploreStyle?: boolean;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  locationLabel,
  isLiked,
  onToggleLike,
  onOpenMedia,
  onOpenTarget,
  onBookTarget,
  exploreStyle = false,
}) => {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      className={`bg-white rounded-2xl border shadow-2xs hover:shadow-md transition-all overflow-hidden ${exploreStyle ? 'border-lime-200/90 ring-1 ring-emerald-800/10 shadow-[0_10px_30px_rgba(6,95,70,0.08)]' : 'border-gray-200/90'}`}
      id={`post-card-${post.id}`}
    >
      {/* Header: Author Info */}
      <div className="p-3.5 flex items-center justify-between border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => onOpenTarget(post)}
            className="shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            aria-label={`فتح صفحة ${post.authorName}`}
          >
            <img
              src={post.authorAvatar}
              alt={post.authorName}
              className="w-10 h-10 rounded-full object-cover border border-emerald-200 shadow-2xs hover:ring-2 hover:ring-emerald-500 transition"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';
              }}
            />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <button
                type="button"
                onClick={() => onOpenTarget(post)}
                className="min-w-0 text-right text-sm font-bold text-gray-900 hover:text-emerald-800 hover:underline underline-offset-4 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded"
                aria-label={`فتح صفحة ${post.authorName}`}
              >
                <span className="block truncate">{post.authorName}</span>
              </button>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.2 rounded-full">
                {post.authorRole}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
              <span className="flex items-center gap-0.5">
                <MapPin className="w-3 h-3 text-emerald-600" />
                {locationLabel || post.city}
              </span>
              <span>•</span>
              <span>{post.createdAt}</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => onOpenTarget(post)}
          className="text-xs font-semibold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition-colors"
          id={`post-view-profile-btn-${post.id}`}
        >
          زيارة الصفحة
        </button>
      </div>

      {/* Media Image / Video Container */}
      <div 
        className="relative w-full aspect-4/3 sm:aspect-16/9 bg-black overflow-hidden cursor-pointer"
        onClick={() => onOpenMedia(post)}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onOpenMedia(post); }}
        aria-label={`فتح عمل ${post.title}`}
      >
        {post.mediaType === 'video' ? (
          <>
            <video src={post.mediaUrl} poster={post.thumbnailUrl} muted playsInline preload="metadata" className="w-full h-full object-cover hover:scale-102 transition-transform duration-300" />
            <span className="absolute inset-0 grid place-items-center pointer-events-none">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm border border-white/25"><Play className="h-7 w-7 fill-current" /></span>
            </span>
          </>
        ) : (
          <img
            src={post.mediaUrl}
            alt={post.title}
            className="w-full h-full object-cover hover:scale-102 transition-transform duration-300"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80';
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
        
        {/* Title Badge on Bottom Left of Image */}
        <div className="absolute bottom-3 right-3 left-3 text-white pointer-events-none">
          <h3 className="text-sm font-extrabold line-clamp-1 drop-shadow-md text-amber-200">
            {post.title}
          </h3>
        </div>
      </div>

      {/* Caption & Description */}
      <div className="p-4">
        <p className="text-xs text-gray-700 leading-relaxed mb-3">
          {post.caption}
        </p>

        {/* Post Actions (Likes, Shares, Direct Book) */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-4">
            
            {/* Like Button */}
            <button
              onClick={() => onToggleLike(post.id)}
              className={`flex items-center gap-1.5 text-xs font-bold transition-all ${
                isLiked ? 'text-rose-600 scale-105' : 'text-gray-600 hover:text-rose-500'
              }`}
              id={`like-post-btn-${post.id}`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current text-rose-600' : ''}`} />
              <span>{post.likesCount + (isLiked ? 1 : 0)}</span>
            </button>

            {/* Share Button */}
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-emerald-700 transition-colors"
              id={`share-post-btn-${post.id}`}
            >
              {copied ? (
                <span className="text-emerald-700 text-[11px] font-bold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> تم نسخ الرابط!
                </span>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>مشاركة ({post.sharesCount})</span>
                </>
              )}
            </button>

          </div>

          {/* Quick Book Action */}
          <button
            onClick={() => onBookTarget(post)}
            className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1 active:scale-95 transition-all"
            id={`post-quick-book-${post.id}`}
          >
            <span>احجز العرض</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
