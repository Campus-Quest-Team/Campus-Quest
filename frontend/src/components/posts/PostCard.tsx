import { useState } from "react";
import {
    MdFavorite,
    MdFavoriteBorder,
    MdMoreVert,
    MdBrokenImage,
    MdEdit,
    MdDelete,
    MdVisibilityOff,
    MdFlag,
    MdPersonAdd,
    MdPersonRemove,
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
    onHide,
    isProfileView = false,
    isFriend = false,
    friendId = "",
}: PostCardProps) {
    const [likedState, setLikedState] = useState(liked);
    const [likeCount, setLikeCount] = useState(likes);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
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
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, questPostId: postId, jwtToken }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                alert(data.needsReview ? "Post flagged. It now requires review." : "Post flagged successfully.");
            } else {
                console.error("Failed to flag post:", data);
            }
        } catch (err) {
            console.error("Flag post error:", err);
        } finally {
            setMenuOpen(false);
        }
    };

    const handleDelete = async () => {
        try {
            const res = await fetch(buildPath("api/deletePost"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, postId, jwtToken }),
            });
            const data = await res.json();
            if (res.ok && data.success) onHide(postId);
        } catch (err) {
            console.error("Delete post error:", err);
        } finally {
            setMenuOpen(false);
        }
    };

    const handleEditCaption = async () => {
        const newCaption = prompt("Enter new caption:", caption);
        if (newCaption !== null) {
            try {
                const res = await fetch(buildPath("api/editCaption"), {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId, postId, caption: newCaption, jwtToken }),
                });
                const data = await res.json();
                if (res.ok && data.success) window.location.reload();
            } catch (err) {
                console.error("Edit caption error:", err);
            }
        }
    };

    const handleAddFriend = async () => {
        try {
            const res = await fetch(buildPath("api/addFriend"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, friendId, jwtToken }),
            });
            await res.json();
            window.location.reload();
        } catch (err) {
            console.error("Add friend error:", err);
        }
    };

    const handleRemoveFriend = async () => {
        try {
            const res = await fetch(buildPath("api/removeFriend"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, friendId, jwtToken }),
            });
            await res.json();
            window.location.reload();
        } catch (err) {
            console.error("Remove friend error:", err);
        }
    };

    return (
        <div className="post-card">
            {!isProfileView && (
                <div className="post-header">
                    <div className="profile-menu-wrapper">
                        <div className="profile-clickable" onClick={() => setProfileMenuOpen(prev => !prev)}>
                            <img src={pfp} alt="pfp" className="post-pfp" />
                            <p className="post-user">{user}</p>
                        </div>

                        {profileMenuOpen && (
                            <div className="profile-popup-menu">
                                <button onClick={isFriend ? handleRemoveFriend : handleAddFriend}>
                                    {isFriend ? <><MdPersonRemove /> Remove Friend</> : <><MdPersonAdd /> Add Friend</>}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="post-more-wrapper">
                        <button className="post-more" onClick={() => setMenuOpen(prev => !prev)}>
                            <MdMoreVert size={22} color="#666" />
                        </button>
                        {menuOpen && (
                            <div className="more-menu">
                                <button onClick={() => onHide(postId)}>
                                    <span style={{ marginRight: 6 }}>
                                        <MdVisibilityOff /> Hide Post
                                    </span>
                                </button>
                                <button onClick={handleFlag}>
                                    <span style={{ marginRight: 6 }}>
                                        <MdFlag /> Flag Post
                                    </span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

            )}

            <div className="post-image-wrapper">
                {imageUrl ? (
                    <img src={imageUrl} alt="post" className="post-image" />
                ) : (
                    <div className="post-image-placeholder">
                        <MdBrokenImage size={40} color="#aaa" />
                        <span>Image Not Available</span>
                    </div>
                )}
                {isProfileView && (
                    <div className="post-image-overlay">
                        <button className="post-more" onClick={() => setMenuOpen(prev => !prev)}>
                            <MdMoreVert size={22} color="#000" />
                        </button>
                        {menuOpen && (
                            <div className="more-menu">
                                <button onClick={handleEditCaption}>
                                    <span style={{ marginRight: 6 }}>
                                        <MdEdit />Edit
                                    </span>
                                </button>
                                <button onClick={handleDelete}>
                                    <span style={{ marginRight: 6 }}>
                                        <MdDelete />Delete
                                    </span>
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

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

            {
                caption && (
                    <div className="post-caption">
                        <span className="post-time">[{formatTime(new Date(timeStamp))}]</span>{" "}
                        <span>{caption}</span>
                    </div>
                )
            }
        </div >
    );
}
