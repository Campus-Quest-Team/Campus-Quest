import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import buildPath from '../Path';
import { PostCard } from '../posts/PostCard';
import { FiSettings } from 'react-icons/fi';
import { toast } from 'react-toastify';
import type {
    FeedPost,
    ProfileData,
    ProfileEditProps,
    ProfileResponse,
} from '../../types/dashboardTypes';
import '../../styles/ProfileView.css';
import { Settings } from './Settings';
import { handleJWTError } from '../handleJWTError';

export function ProfileView({ loginInfo, onClose }: ProfileEditProps) {
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const navigate = useNavigate();

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
                    creator: qp.creator ?? {
                        userId: '',
                        displayName: '',
                        pfpUrl: '',
                    },
                    caption: qp.caption,
                    questDescription: qp.questDescription,
                    mediaUrl: qp.mediaUrl,
                    timeStamp: qp.timeStamp,
                    likes: qp.likes,
                    likedBy: qp.likedBy,
                    flagged: qp.flagged,
                    flaggedBy: qp.flaggedBy,
                })));
                setIsLoading(false);
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

    return (
        <div className="profile-overlay-container" onClick={handleOverlayClick}>
            <div
                className={`profile-modal-wrapper ${showSettings ? 'with-settings' : ''}`}
            >
                {!showSettings || window.innerWidth > 700 ? (
                    <div className="profile-main-modal">
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

                        {isLoading ? (
                            <div className="loading">Loading...</div>
                        ) : (
                            <>
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

                                {posts.length === 0 ? (
                                    <div className="profile-no-posts-message">
                                        <p>📭 No Posts Yet!</p>
                                    </div>
                                ) : (
                                    <div className="profile-posts-container">
                                        {posts.map((post, index) => (
                                            <PostCard
                                                key={post.postId || index}
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
                                            />
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
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
