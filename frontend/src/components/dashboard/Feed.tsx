import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import buildPath from "../Path";
import type { FeedPost, FeedResponse } from "../../types/dashboardTypes";
import type { LoginInfo } from "../../types/APITypes";
import '../../styles/Feed.css';
import { PostCard } from "../posts/PostCard";
import { toast } from "react-toastify";
import { handleJWTError } from "../handleJWTError";

interface Friend {
    userId: string;
    displayName: string;
    pfp: string;
    questCompleted: number;
}

const POSTS_PER_BATCH = 5;

export function Feed(loginInfo: LoginInfo) {
    const [feed, setFeed] = useState<FeedPost[]>([]);
    const [visibleCount, setVisibleCount] = useState(POSTS_PER_BATCH);
    const [hiddenPostIds, setHiddenPostIds] = useState<Set<string>>(new Set());
    const [friends, setFriends] = useState<Friend[]>([]);
    const navigate = useNavigate();
    const observerRef = useRef<HTMLDivElement | null>(null);

    const handleHidePost = (postId: string) => {
        setHiddenPostIds(prev => new Set(prev).add(postId));
    };

    const loadMore = useCallback(() => {
        setVisibleCount(prev => Math.min(prev + POSTS_PER_BATCH, feed.length));
    }, [feed.length]);

    useEffect(() => {
        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) {
                loadMore();
            }
        });

        if (observerRef.current) {
            observer.observe(observerRef.current);
        }

        return () => {
            if (observerRef.current) observer.unobserve(observerRef.current);
        };
    }, [loadMore]);

    useEffect(() => {
        fetch(buildPath('api/getFeed'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: loginInfo.userId, jwtToken: loginInfo.accessToken }),
        })
            .then(res => res.json())
            .then((data: FeedResponse | { error: string }) => {
                if (handleJWTError(data, navigate)) return;
                if ('feed' in data && data.feed) {
                    setFeed(data.feed);
                } else {
                    toast.warning("No posts available right now.");
                }
            })
            .catch(() => {
                toast.error("Failed to load feed.");
                navigate('/login');
            });

        fetch(buildPath('api/fetchFriends'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: loginInfo.userId, jwtToken: loginInfo.accessToken }),
        })
            .then(res => res.json())
            .then((data: { friends: Friend[] } | { error: string }) => {
                if (handleJWTError(data, navigate)) return;
                if ('friends' in data && data.friends) {
                    setFriends(data.friends);
                } else {
                    toast.warning("No friends found.");
                }
            })
            .catch(() => {
                toast.error("Failed to load friends.");
                navigate('/login');
            });
    }, [loginInfo, navigate]);

    const filteredFeed = feed.filter(post => !hiddenPostIds.has(post.postId)).slice(0, visibleCount);

    return (
        <div className="feed">
            <div className="scrollable-post-list">
                {filteredFeed.length === 0 ? (
                    <h2>No Posts Today :(</h2>
                ) : (
                    filteredFeed.map((post, index) => {
                        const isFriend = friends.some(f => f.userId === post.creator.userId);
                        return (
                            <PostCard
                                key={index}
                                postId={post.postId}
                                user={post.creator.displayName}
                                title={post.questDescription}
                                imageUrl={post.mediaUrl}
                                timeStamp={post.timeStamp}
                                caption={post.caption}
                                likes={post.likes}
                                liked={post.likedBy.includes(loginInfo.userId)}
                                pfp={post.creator.pfpUrl}
                                userId={loginInfo.userId}
                                jwtToken={loginInfo.accessToken}
                                onHide={handleHidePost}
                                isProfileView={false}
                                isFriend={isFriend}
                                friendId={post.creator.userId}
                            />
                        );
                    })
                )}
                <div ref={observerRef} style={{ height: "1px" }} />
            </div>
        </div>
    );
}
