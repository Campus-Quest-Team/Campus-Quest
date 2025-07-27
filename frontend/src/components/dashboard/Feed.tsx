import { useEffect, useState } from "react";
import buildPath from "../Path";
import type { FeedPost, FeedResponse, PostCardProps } from "../../types/dashboardTypes";
import type { LoginInfo } from "../../types/APITypes";
import '../../styles/Feed.css';

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
                        caption={post.caption}
                        likes={post.likes}
                        pfp={post.creator.pfpUrl}
                    />
                ))
            )}
        </div>
    );
}


function PostCard({ user, title, imageUrl, caption, likes, pfp }: PostCardProps) {
    const [expanded, setExpanded] = useState(false);

    const toggleExpand = () => {
        setExpanded(prev => !prev);
    };

    return (
        <div className="post-card">
            <div className="post-header">
                <div className="post-left">
                    <img src={pfp || 'default-profile.png'} alt={user} className="post-pfp" />
                    <p className="post-user">{user}</p>
                </div>
                <div className="post-title-wrapper" onClick={toggleExpand}>
                    <p className={`post-title ${expanded ? 'expanded' : ''}`}>
                        {title}
                    </p>
                </div>
            </div>

            {imageUrl && <img src={imageUrl} alt={title} className="post-image" />}
            <div className="post-footer">
                {likes > 0 && <p>❤️ {likes}</p>}
                <p>{caption}</p>
                <button className="flag-btn">🚩</button>
            </div>
        </div>
    );
}
