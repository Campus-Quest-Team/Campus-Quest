import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import buildPath from '../Path';
import { PostCard } from '../posts/PostCard';
import { FiSettings } from 'react-icons/fi';
import { toast } from 'react-toastify';
import type {
    FeedPost,
    PopupProps,
    ProfileData,
} from '../../types/dashboardTypes';
import '../../styles/ProfileView.css';
import { Settings } from './Settings';
import { handleJWTError } from '../handleJWTError';
import type { ProfileResponse } from '../../types/APITypes';

const POSTS_PER_BATCH = 4;

export function ProfileView({ loginInfo, onClose }: PopupProps) {
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [visibleCount, setVisibleCount] = useState(POSTS_PER_BATCH);
    const [showSettings, setShowSettings] = useState(false);
    const navigate = useNavigate();
    const observerRef = useRef<HTMLDivElement | null>(null);

    const loadMore = useCallback(() => {
        setVisibleCount(prev => Math.min(prev + POSTS_PER_BATCH, posts.length));
    }, [posts.length]);

    const scrollRef = useRef<HTMLDivElement>(null);
    const markerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const scrollEl = scrollRef.current;
        const marker = markerRef.current;

        if (!scrollEl || !marker) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                console.log("Marker visibility:", entry.isIntersecting);
                if (entry.isIntersecting) {
                    scrollEl.classList.remove('snap-enabled'); // Header visible
                } else {
                    scrollEl.classList.add('snap-enabled'); // Header out of view
                }
            },
            {
                root: scrollEl,
                threshold: 0.1, // triggers earlier
            }
        );

        observer.observe(marker);

        return () => observer.disconnect();
    }, []);



    useEffect(() => {
        const el = observerRef.current;
        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) {
                loadMore();
            }
        });

        if (el) observer.observe(el);

        return () => {
            if (el) observer.unobserve(el);
        };
    }, [loadMore]);

    useEffect(() => {
        fetch(buildPath('api/getProfile'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${loginInfo.accessToken}`,
            },
            body: JSON.stringify({
                userId: loginInfo.userId,
                jwtToken: loginInfo.accessToken,
            }),
        })
            .then(res => res.json())
            .then((data: ProfileResponse | { error: string }) => {
                if (handleJWTError(data, navigate)) return;

                const profileData = (data as ProfileResponse).profileData;
                setProfile(profileData);
                setPosts((profileData.questPosts || []).map(qp => ({
                    postId: qp.postId,
                    creator: qp.creator ?? { userId: '', displayName: '', pfpUrl: '' },
                    caption: qp.caption,
                    questDescription: qp.questDescription,
                    mediaUrl: qp.mediaUrl,
                    timeStamp: qp.timeStamp,
                    likes: qp.likes,
                    likedBy: qp.likedBy,
                    flagged: qp.flagged,
                    flaggedBy: qp.flaggedBy,
                })));
            })
            .catch(err => {
                console.error('Profile fetch error:', err);
                toast.error("Server error while loading profile.");
            });
    }, [loginInfo, navigate]);

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const visiblePosts = posts.slice(0, visibleCount);

    return (
        <div className="profile-overlay-container" onClick={handleOverlayClick}>
            <div className={`profile-modal-wrapper ${showSettings ? 'with-settings' : ''}`}>
                {!showSettings || window.innerWidth > 700 ? (
                    <div className="profile-main-modal">
                        <div className="profile-scroll-area" ref={scrollRef}>
                            <div className="profile-header-bar">
                                <h2 style={{ margin: 0 }}>Your Profile</h2>
                                <button
                                    onClick={() => setShowSettings(prev => !prev)}
                                    className="profile-settings-toggle-btn"
                                    title="Settings"
                                >
                                    <FiSettings size={24} />
                                </button>
                            </div>

                            <div className="profile-user-info">
                                <img
                                    className="profile-avatar-img"
                                    src={profile?.pfp || 'default-profile.png'}
                                    alt="PFP"
                                />
                                <div>
                                    <h3 style={{ margin: 0 }}>{profile?.displayName || 'You'}</h3>
                                    <p style={{ margin: 0, color: '#666' }}>
                                        {profile?.bio || 'No bio yet.'}
                                    </p>
                                </div>
                            </div>

                            <div ref={markerRef} style={{ height: 1 }} />

                            {posts.length === 0 ? (
                                <div className="profile-no-posts-message">
                                    <p>📭 No Posts Yet!</p>
                                </div>
                            ) : (
                                <div className="profile-posts-container">
                                    {visiblePosts.map((post, index) => (
                                        <PostCard
                                            key={`${post.postId}-${index}`}
                                            postId={post.postId}
                                            caption={post.caption}
                                            title={post.questDescription}
                                            imageUrl={post.mediaUrl}
                                            timeStamp={post.timeStamp}
                                            likes={post.likes}
                                            liked={post.likedBy?.includes(loginInfo.userId)}
                                            user={profile?.displayName || ''}
                                            pfp={profile?.pfp || ''}
                                            userId={loginInfo.userId}
                                            jwtToken={loginInfo.accessToken}
                                            onHide={() =>
                                                setPosts(prev =>
                                                    prev.filter(p => p.postId !== post.postId)
                                                )
                                            }
                                            isProfileView={true}
                                        />
                                    ))}
                                    <div ref={observerRef} style={{ height: '1px' }} />
                                </div>
                            )}
                        </div>
                    </div>
                ) : null}

                {showSettings && (
                    <div className="settings-wrapper">
                        <Settings loginInfo={loginInfo} onClose={() => setShowSettings(false)} />
                    </div>
                )}
            </div>
        </div>
    );
}
