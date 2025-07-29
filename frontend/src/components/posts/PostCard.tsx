import { lazy, Suspense, useState } from "react";

const MdFavorite = lazy(() => import("react-icons/md").then(mod => ({ default: mod.MdFavorite })));
const MdFavoriteBorder = lazy(() => import("react-icons/md").then(mod => ({ default: mod.MdFavoriteBorder })));
const MdBrokenImage = lazy(() => import("react-icons/md").then(mod => ({ default: mod.MdBrokenImage })));
const MdEdit = lazy(() => import("react-icons/md").then(mod => ({ default: mod.MdEdit })));
const MdDelete = lazy(() => import("react-icons/md").then(mod => ({ default: mod.MdDelete })));
const MdVisibilityOff = lazy(() => import("react-icons/md").then(mod => ({ default: mod.MdVisibilityOff })));
const MdFlag = lazy(() => import("react-icons/md").then(mod => ({ default: mod.MdFlag })));
const MdPersonAdd = lazy(() => import("react-icons/md").then(mod => ({ default: mod.MdPersonAdd })));
const MdPersonRemove = lazy(() => import("react-icons/md").then(mod => ({ default: mod.MdPersonRemove })));


import '../../styles/PostCard.css';
import type { PostCardProps } from "../../types/dashboardTypes";
import buildPath from "../Path";
import { MdMoreVert } from "react-icons/md";
import { ExpandableText } from "../posts/ExpandableText"


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
                    <div className="post-header-left">
                        <div className="profile-clickable" onClick={() => setProfileMenuOpen(prev => !prev)}>
                            <img src={pfp} alt="pfp" className="post-pfp" loading="lazy" />
                            <p className="post-user">{user}</p>
                        </div>
                        {profileMenuOpen && (
                            <div className="profile-popup-menu">
                                <button onClick={isFriend ? handleRemoveFriend : handleAddFriend}>
                                    {isFriend ? (
                                        <>
                                            <Suspense fallback={null}><MdPersonRemove /></Suspense> Remove Friend
                                        </>
                                    ) : (
                                        <>
                                            <Suspense fallback={null}><MdPersonAdd /></Suspense> Add Friend
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="post-header-right">
                        <ExpandableText text={title} />
                    </div>
                </div>
            )}

            <div className="post-image-wrapper">
                {imageUrl ? (
                    <img src={imageUrl} alt="post" className="post-image" loading="lazy" />
                ) : (
                    <div className="post-image-placeholder">
                        <Suspense fallback={null}><MdBrokenImage size={40} color="#aaa" /></Suspense>
                        <span>Image Not Available</span>
                    </div>
                )}
            </div>

            <div className="post-interaction">
                <button className="like-btn" onClick={toggleLike} alt-text="Like Post">
                    {likedState ? (
                        <Suspense fallback={null}><MdFavorite size={24} color="red" /></Suspense>
                    ) : (
                        <Suspense fallback={null}><MdFavoriteBorder size={24} color="black" /></Suspense>
                    )}
                </button>
                <span className="like-count">{likeCount}</span>

                {/* CAPTION MOVED HERE */}
                {caption && (
                    <div className="post-caption-inline">
                        <ExpandableText text={`${formatTime(new Date(timeStamp))}: ${caption}`} />
                    </div>

                )}

                {/* MENU BUTTON MOVED HERE */}
                <div className="post-more-wrapper">
                    <button className="post-more" onClick={() => setMenuOpen(prev => !prev)} about="More Options">
                        <MdMoreVert size={22} color="#666" />
                    </button>
                    {menuOpen && (
                        <div className="more-menu">
                            {isProfileView ? (
                                <>
                                    <button onClick={handleEditCaption}>
                                        <span style={{ display: "flex", marginRight: 6 }}>
                                            <Suspense fallback={null}><MdEdit /></Suspense> Edit
                                        </span>
                                    </button>
                                    <button onClick={handleDelete}>
                                        <span style={{ display: "flex", marginRight: 6 }}>
                                            <Suspense fallback={null}><MdDelete /></Suspense> Delete
                                        </span>
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => onHide(postId)}>
                                        <span style={{ display: "flex", marginRight: 6 }}>
                                            <Suspense fallback={null}><MdVisibilityOff /></Suspense> Hide
                                        </span>
                                    </button>
                                    <button onClick={handleFlag}>
                                        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                            <Suspense fallback={null}><MdFlag /></Suspense>
                                            Flag
                                        </span>

                                    </button>
                                </>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div >
    );
}
