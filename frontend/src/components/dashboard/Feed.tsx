import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import buildPath from "../Path";
import type { FeedPost, FeedResponse } from "../../types/dashboardTypes";
import type { LoginInfo } from "../../types/APITypes";
import '../../styles/Feed.css';
import { PostCard } from "../posts/PostCard";

export function Feed(loginInfo: LoginInfo) {
    const [feed, setFeed] = useState<FeedPost[]>([]);
    const [hiddenPostIds, setHiddenPostIds] = useState<Set<string>>(new Set());
    const navigate = useNavigate(); // ✅ import and use navigator

    const handleHidePost = (postId: string) => {
        setHiddenPostIds(prev => new Set(prev).add(postId));
    };

    useEffect(() => {
        fetch(buildPath('api/getFeed'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${loginInfo.accessToken}`,
            },
            body: JSON.stringify({ userId: loginInfo.userId, jwtToken: loginInfo.accessToken }),
        })
            .then(res => res.json())
            .then((data: FeedResponse | { error: string }) => {
                if ('error' in data && data.error === "The JWT is no longer valid") {
                    console.warn("JWT expired — redirecting to login");
                    navigate('/login');
                } else if ('feed' in data && data.feed) {
                    setFeed(data.feed);
                } else {
                    console.error('Feed fetch failed or empty');
                }
            })
            .catch(err => {
                console.error("Feed fetch error:", err);
                navigate('/login'); // fallback for network or server errors
            });
    }, [loginInfo, navigate]);

    return (
        <div className="feed">
            {feed.length === 0 ? (
                <h2>No Posts Today :(</h2>
            ) : (
                feed
                    .filter(post => !hiddenPostIds.has(post.postId))
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
