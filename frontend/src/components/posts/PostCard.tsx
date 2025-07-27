import { useState } from "react";
import {
    MdFavorite,
    MdFavoriteBorder,
    MdMoreVert,
    MdBrokenImage,
} from "react-icons/md";
import '../../styles/PostCard.css';
import type { PostCardProps } from "../../types/dashboardTypes";
import buildPath from "../Path";

export function PostCard({
    user,
    title,
    imageUrl,
    timeStamp,
    caption,
    liked,
    likes,
    pfp,
    userId,
    jwtToken,
    postId,
    onHide, // Default to a no-op if not provided
}: PostCardProps) {
    const [likedState, setLikedState] = useState(liked);
    const [likeCount, setLikeCount] = useState(likes);
    const [menuOpen, setMenuOpen] = useState(false);

    function formatTime(date: Date): string {
        const now = new Date();
        const isToday =
            date.getDate() === now.getDate() &&
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear();

        return isToday
            ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : date.toLocaleDateString([], { month: "short", day: "numeric" });
    }

    const toggleLike = async () => {
        try {
            const res = await fetch(buildPath("api/likePost"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    userId,
                    questPostId: postId,
                    jwtToken,
                }),
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setLikedState(data.liked);
                setLikeCount(data.likeCount);
                // Optionally update jwtToken if needed: data.jwtToken
            } else {
                console.error("Failed to like/unlike post:", data);
            }
        } catch (err) {
            console.error("Like post error:", err);
        }
    };

    const handleFlag = async () => {
        try {
            const res = await fetch(buildPath("api/flagPost"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    userId,
                    questPostId: postId,
                    jwtToken,
                }),
            });

            const data = await res.json();
            if (res.ok && data.success) {
                alert(data.needsReview
                    ? "Post flagged. It now requires review."
                    : "Post flagged successfully.");
            } else {
                console.error("Failed to flag post:", data);
            }
        } catch (err) {
            console.error("Flag post error:", err);
        } finally {
            setMenuOpen(false);
        }
    };


    return (
        <div className="post-card">
            {/* Header */}
            <div className="post-header">
                <img src={pfp} alt="pfp" className="post-pfp" />
                <p className="post-user">{user}</p>
                <div className="post-more-wrapper">
                    <button className="post-more" onClick={() => setMenuOpen(prev => !prev)}>
                        <MdMoreVert size={22} color="#666" />
                    </button>
                    {menuOpen && (
                        <div className="more-menu">
                            <button onClick={() => onHide(postId)}>🙈 Hide Post</button>
                            <button onClick={handleFlag}>🚩 Flag Post</button>
                        </div>
                    )}

                </div>
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
                    {likedState ? (
                        <MdFavorite size={24} color="red" />
                    ) : (
                        <MdFavoriteBorder size={24} color="black" />
                    )}
                </button>
                <span className="like-count">{likeCount}</span>
                <p className="post-title-text">{title}</p>
            </div>

            {/* Caption + Timestamp */}
            {caption && (
                <div className="post-caption">
                    <span className="post-time">
                        [{formatTime(new Date(timeStamp))}]
                    </span>{" "}
                    <span>{caption}</span>
                </div>
            )}
        </div>
    );
}
