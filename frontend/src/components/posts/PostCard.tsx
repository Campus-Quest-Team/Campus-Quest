import { useState } from "react";
import { MdFavorite, MdFavoriteBorder, MdMoreVert, MdBrokenImage } from "react-icons/md";
import '../../styles/PostCard.css';
import type { PostCardProps } from "../../types/dashboardTypes";

export function PostCard({ user, title, imageUrl, timeStamp, caption, likes, pfp }: PostCardProps) {
    const [liked, setLiked] = useState(false);

    function formatTime(date: Date): string {
        const now = new Date();
        const isToday =
            date.getDate() === now.getDate() &&
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear();

        return isToday
            ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    const toggleLike = () => setLiked(prev => !prev);

    return (
        <div className="post-card">
            {/* Header */}
            <div className="post-header">
                <img src={pfp} alt="pfp" className="post-pfp" />
                <p className="post-user">{user}</p>
                <button className="post-more">
                    <MdMoreVert size={22} color="#666" />
                </button>
            </div>

            {/* Image */}
            {imageUrl ? (
                <div className="post-image-wrapper">
                    <img src={imageUrl} alt="post" className="post-image" />
                </div>

            ) : (
                <div className="post-image-placeholder">
                    <MdBrokenImage size={40} color="#aaa" />
                    <span>Image Not Available</span>
                </div>
            )}

            {/* Interactions */}
            <div className="post-interaction">
                <button className="like-btn" onClick={toggleLike}>
                    {liked ? <MdFavorite size={24} color="red" /> : <MdFavoriteBorder size={24} color="black" />}
                </button>
                <span className="like-count">{likes}</span>
                <p className="post-title-text">{title}</p>
            </div>

            {/* Caption + Timestamp */}
            {caption && (
                <div className="post-caption">
                    <span className="post-time">[{formatTime(new Date(timeStamp))}] </span>
                    <span>{caption}</span>
                </div>
            )}

        </div>
    );
}
