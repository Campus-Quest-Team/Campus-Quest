import { useEffect, useState } from 'react';
import isToday from '../todayChecker';
import buildPath from '../Path';
import { useNavigate } from 'react-router-dom';
import fullLogo from '../../assets/full_logo.svg';
import { FaTrophy } from 'react-icons/fa';
import { MdGroup } from 'react-icons/md';
import { MdTrackChanges } from 'react-icons/md';
import { MdCheckCircle, MdCancel } from 'react-icons/md';
import '../../styles/Sidebar.css';

// types
import type {
    FriendsResponse,
    LeaderboardResponse,
    CurrentQuestResponse,
    FriendData,
    LeaderboardEntry,
    ProfileData,
    ProfileResponse,
    SidebarProps
} from '../../types/dashboardTypes';

export function DashboardSidebar({ loginInfo, onProfileChange }: SidebarProps) {
    const navigate = useNavigate();
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [friends, setFriends] = useState<FriendData[]>([]);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [currentQuest, setCurrentQuest] = useState<CurrentQuestResponse | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Profile
                const profileRes = await fetch(buildPath('api/getProfile'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${loginInfo.accessToken}`,
                    },
                    body: JSON.stringify({ userId: loginInfo.userId, jwtToken: loginInfo.accessToken }),
                });

                if (!profileRes.ok) throw new Error('Failed to fetch profile');
                const profileData: ProfileResponse = await profileRes.json();
                setProfile(profileData.profileData);

                // Friends
                const friendsRes = await fetch(buildPath('api/fetchFriends'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${loginInfo.accessToken}`,
                    },
                    body: JSON.stringify({ userId: loginInfo.userId, jwtToken: loginInfo.accessToken }),
                });

                const friendsData: FriendsResponse = await friendsRes.json();
                setFriends(friendsData.friends);

                // Leaderboard
                const lbRes = await fetch(buildPath('api/fetchScoreboard'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${loginInfo.accessToken}`,
                    },
                    body: JSON.stringify({ jwtToken: loginInfo.accessToken }),
                });

                const lbData: LeaderboardResponse = await lbRes.json();
                setLeaderboard(lbData.scoreboard);

                // Current Quest
                const questRes = await fetch(buildPath('api/currentQuest'), {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                });

                const questData: CurrentQuestResponse = await questRes.json();
                if (questData.success) setCurrentQuest(questData);
                else console.error('Quest fetch failed');
            } catch (err) {
                console.error(err);
                navigate('/login');
            }
        };

        fetchData();
    }, []);

    const questsToday = (profile?.questPosts || []).filter(
        post => post?.timeStamp && isToday(post.timeStamp)
    ).length;

    return (
        <div className="sidebar">
            {/* Logo */}
            <div className="logo-wrapper">
                <img src={fullLogo} alt="Campus Quest Logo" className="campus-quest-logo" />
            </div>

            {/* Profile */}
            <div className="profile-section">
                <div className="profile-picture-wrapper">
                    <img
                        src={profile?.pfp || 'default-profile.png'}
                        alt="Profile"
                        className="profile-img"
                    />
                    <div
                        className="edit-icon"
                        onClick={() => profile && onProfileChange(profile)}
                        style={{ cursor: profile ? 'pointer' : 'not-allowed', opacity: profile ? 1 : 0.5 }}
                    >✏️</div>
                </div>

                <div className="stats">
                    <div className="stat-item">
                        <div className="stat-number">{friends.length}</div>
                        <div className="stat-label">Friends</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-number">{profile?.questCompleted ?? 0}</div>
                        <div className="stat-label">Quests Complete</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-number">
                            {questsToday === 0 ? (
                                <MdCancel color="crimson" size={20} title="Incomplete" />
                            ) : (
                                <MdCheckCircle color="green" size={20} title="Complete" />
                            )}
                        </div>
                        <div className="stat-label">Today's Quest</div>
                    </div>
                </div>
            </div>

            {/* Current Quest */}
            <div className="current-quest-section">
                <h2>
                    <span style={{ verticalAlign: 'middle', marginRight: '6px' }}>
                        <MdTrackChanges size={20} />
                    </span>
                    Quest
                </h2>

                {currentQuest ? (
                    <div className="current-quest">
                        <h3>{typeof currentQuest.currentQuest.questData.questDescription === 'string' ? currentQuest.currentQuest.questData.questDescription : ''}</h3>
                        <p>{new Date(currentQuest.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>

                    </div>
                ) : (
                    <p>Loading current quest...</p>
                )}
            </div>

            {/* Friend Leaderboard */}
            <div className="friends-section">
                <h2>
                    <span style={{ verticalAlign: 'middle', marginRight: '6px' }}>
                        <MdGroup />
                    </span>
                    Friends
                </h2>

                {friends.length === 0 ? (
                    <p>No friends added yet.</p>
                ) : (
                    [...friends]
                        .sort((a, b) => b.questCompleted - a.questCompleted)
                        .map((friend, index) => (
                            <div key={friend.userId} className="friend-entry">
                                <span>#{index + 1}</span> 👤 {friend.displayName} – {friend.questCompleted} quests
                            </div>
                        ))
                )}
            </div>

            {/* Global Leaderboard */}
            <div className="leaderboard-section">
                <h2><span style={{ marginRight: '6px', color: 'gold' }}><FaTrophy /></span>Leaderboard</h2>

                {leaderboard.length === 0 ? (
                    <p>Loading leaderboard...</p>
                ) : (
                    leaderboard
                        .sort((a, b) => b.questCompleted - a.questCompleted)
                        .slice(0, 5)
                        .map((entry, i) => (
                            <div key={entry.userId} className="leaderboard-entry">
                                <span className="leaderboard-rank">#{i + 1}</span> –{' '}
                                <span className="leaderboard-quests"><strong>{entry.questCompleted}</strong> quests</span>{' '}
                                <span className="leaderboard-name">{entry.displayName}</span>
                            </div>
                        ))
                )}
            </div>
        </div >
    );
}
