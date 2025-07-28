import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import buildPath from "../Path";
import type { FeedPost, FeedResponse } from "../../types/dashboardTypes";
import type { LoginInfo } from "../../types/APITypes";
import '../../styles/Feed.css';
import { PostCard } from "../posts/PostCard";
import { toast } from "react-toastify";
import { handleJWTError } from "../handleJWTError";

export function Feed(loginInfo: LoginInfo) {
    const [feed, setFeed] = useState<FeedPost[]>([]);
    const [hiddenPostIds, setHiddenPostIds] = useState<Set<string>>(new Set());
    const navigate = useNavigate();

    const handleHidePost = (postId: string) => {
        setHiddenPostIds(prev => new Set(prev).add(postId));
    };

    useEffect(() => {
        fetch(buildPath('api/getFeed'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId: loginInfo.userId, jwtToken: loginInfo.accessToken }),
        })
            .then(res => res.json())
            .then((data: FeedResponse | { error: string }) => {
                if (handleJWTError(data, navigate)) return;
                if ('feed' in data && data.feed) {
                    setFeed(data.feed);
                } else {
                    console.error('Feed fetch failed or empty');
                    toast.warning("No posts available right now.");
                }
            })
            .catch(err => {
                console.error("Feed fetch error:", err);
                toast.error("Failed to load feed. Please try again later.");
                navigate('/login');
            });
    }, [loginInfo, navigate]);

    return (
        <div className="feed">
            {feed.length === 0 ? (
                <h2>No Posts Today :(</h2>
            ) : (
                feed
                    .filter(post => {
                        if (hiddenPostIds.has(post.postId)) return false;
                        return !hiddenPostIds.has(post.postId);
                    })
                    .map(post => (
                        <PostCard
                            key={post.postId}
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
                        />
                    ))
            )}
        </div>
    );
}
