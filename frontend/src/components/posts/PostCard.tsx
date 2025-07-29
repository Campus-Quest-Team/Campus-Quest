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
import { handleJWTError } from "../handleJWTError";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";


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
    const navigate = useNavigate();
    const [likedState, setLikedState] = useState(liked);
    const [likeCount, setLikeCount] = useState(likes);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [isFriendLocal, setIsFriendLocal] = useState(isFriend);
    const [menuOpen, setMenuOpen] = useState(false);
    const [captionState, setCaptionState] = useState(caption);
    const [imageLoading, setImageLoading] = useState(true);

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
            if (handleJWTError(data, navigate)) return;
            if (res.ok && data.success) {
                toast.success(data.needsReview ? 'Post flagged for review' : 'Post flagged');
            } else {
                toast.error('Failed to flag post');
            }

        } catch (err) {
            console.error("Flag post error:", err);
        } finally {
            setMenuOpen(false);
        }
    };

    const confirmDeletePost = async () => {
        try {
            const res = await fetch(buildPath("api/deletePost"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, postId, jwtToken }),
            });
            const data = await res.json();
            if (handleJWTError(data, navigate)) return;
            if (res.ok && data.success) {
                onHide(postId);
                toast.dismiss(); // Close the confirm toast
                toast.success('Post deleted!');
            } else {
                toast.error('Failed to delete post');
            }
        } catch (err) {
            console.error("Delete post error:", err);
            toast.error('Error deleting post');
        } finally {
            setMenuOpen(false);
        }
    };


    const handleDelete = () => {
        toast.info(
            ({ closeToast }) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span>Are you sure you want to delete this post?</span>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                            onClick={() => {
                                confirmDeletePost();
                            }}
                            style={{ padding: '4px 8px', backgroundColor: '#d33', color: 'white', border: 'none', borderRadius: 4 }}
                        >
                            Delete
                        </button>
                        <button
                            onClick={closeToast}
                            style={{ padding: '4px 8px', backgroundColor: '#ccc', color: 'black', border: 'none', borderRadius: 4 }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ),
            {
                autoClose: false,
                closeOnClick: false,
                draggable: false,
            }
        );
    };


    const handleEditCaption = async () => {
        const newCaption = prompt("Enter new caption:", captionState);
        if (newCaption !== null) {
            try {
                const res = await fetch(buildPath("api/editCaption"), {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId, postId, caption: newCaption, jwtToken }),
                });
                const data = await res.json();
                if (handleJWTError(data, navigate)) return;

                if (res.ok && data.success) {
                    setCaptionState(newCaption);
                    toast.success("Caption updated!");
                } else {
                    toast.error("Failed to update caption");
                }
            } catch (err) {
                console.error("Edit caption error:", err);
                toast.error("Error updating caption");
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
            const data = await res.json();
            if (handleJWTError(data, navigate)) return;
            if (res.ok) {
                setIsFriendLocal(true);
                toast.success('Friend added!');

            }
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
            const data = await res.json();
            if (handleJWTError(data, navigate)) return;
            if (res.ok) {
                toast.warning('Friend Removed')
                setIsFriendLocal(false);
            }
            console.log(data);

        } catch (err) {
            console.error("Remove friend error:", err);
        }
    };

    return (
        <div className="post-card">
            <div className="post-header">
                {!isProfileView && (
                    <div className="post-header-left">
                        <div className="profile-clickable" onClick={() => setProfileMenuOpen(prev => !prev)}>
                            <img src={pfp} alt="pfp" className="post-pfp" loading="lazy" />
                            <p className="post-user">{user}</p>
                        </div>
                        {profileMenuOpen && (
                            <div className="profile-popup-menu">
                                <button onClick={isFriendLocal ? handleRemoveFriend : handleAddFriend}>
                                    {isFriendLocal ? (
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
                )}

                <div className="post-header-right">
                    <ExpandableText text={title} />
                </div>
            </div>


            <div className="post-image-wrapper">
                {imageUrl ? (
                    <>
                        {imageLoading && (
                            <div className="image-loader">
                                <div className="spinner" />
                            </div>
                        )}
                        <img
                            src={imageUrl}
                            alt="post"
                            className={`post-image ${imageLoading ? 'hidden' : ''}`}
                            loading="lazy"
                            onLoad={() => setImageLoading(false)}
                            onError={() => setImageLoading(false)}
                        />

                    </>
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
                {captionState && (
                    <div className="post-caption-inline">
                        <ExpandableText text={`${formatTime(new Date(timeStamp))}: ${captionState}`} />
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
                                    <button onClick={() => {
                                        onHide(postId);
                                        toast.info('Post hidden');
                                    }}>

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
