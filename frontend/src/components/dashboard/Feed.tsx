import { useEffect, useState } from "react";
import buildPath from "../Path";
import type { FeedPost, FeedResponse } from "../../types/dashboardTypes";
import type { LoginInfo } from "../../types/APITypes";
import '../../styles/Feed.css';
import { PostCard } from "../posts/PostCard";

export function Feed(loginInfo: LoginInfo) {
    const [feed, setFeed] = useState<FeedPost[]>([]);
    useEffect(() => {
        // Fetch user feed
        fetch(buildPath('api/getFeed'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${loginInfo.accessToken}`,
            },
            body: JSON.stringify({ userId: loginInfo.userId, jwtToken: loginInfo.accessToken }),
        })
            .then(res => res.json())
            .then((data: FeedResponse) => {
                if (data.feed) {
                    setFeed(data.feed);
                } else {
                    console.error('Feed fetch failed or empty');
                }
            })
            .catch(console.error);

    }, [loginInfo]);
    return (
        <div className="feed">
            {feed.length === 0 ? (
                <h2>No Posts Today :(</h2>
            ) : (
                feed.map(post => (
                    <PostCard
                        key={post.postId}
                        user={post.creator.displayName}
                        title={post.questDescription}
                        imageUrl={post.mediaUrl}
                        timeStamp={post.timeStamp}
                        caption={post.caption}
                        likes={post.likes}
                        pfp={post.creator.pfpUrl}
                    />
                ))
            )}
        </div>
    );
}