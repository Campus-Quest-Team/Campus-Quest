import { useEffect, useState } from 'react';
import buildPath from '../Path';
import { useNavigate } from 'react-router-dom';
import fullLogo from '../../assets/full_logo.svg';
import { FaTrophy } from 'react-icons/fa';
import { MdGroup } from 'react-icons/md';
import { MdTrackChanges } from 'react-icons/md';
import { MdCheckCircle, MdCancel } from 'react-icons/md';
import { FaBinoculars } from 'react-icons/fa';
import '../../styles/Sidebar.css';
import { toast } from 'react-toastify';
import type { LoginInfo, FriendsResponse, LeaderboardResponse, ProfileResponse } from '../../types/APITypes';
import type {
    FriendData,
    LeaderboardEntry,
    ProfileData,
} from '../../types/dashboardTypes';
import { handleJWTError } from '../handleJWTError';

export function DashboardSidebar({ loginInfo, onProfileChange }: {
    loginInfo: LoginInfo;
    onProfileChange: () => void;
}) {
    const navigate = useNavigate();
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [friends, setFriends] = useState<FriendData[]>([]);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [hasCompletedToday, setHasCompletedToday] = useState<boolean | null>(null);

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

                const profileData: ProfileResponse = await profileRes.json();
                if (handleJWTError(profileData, navigate)) return;
                setProfile(profileData.profileData);

                // Friends
                const friendsRes = await fetch(buildPath('api/fetchFriends'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ userId: loginInfo.userId, jwtToken: loginInfo.accessToken }),
                });

                const friendsData: FriendsResponse = await friendsRes.json();
                if (handleJWTError(friendsData, navigate)) return;
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
                if (handleJWTError(lbData, navigate)) return;
                setLeaderboard(lbData.scoreboard);

                // Has completed today's quest
                const completionRes = await fetch(buildPath('api/hasCompletedCurrentQuest'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        userId: loginInfo.userId,
                        jwtToken: loginInfo.accessToken,
                    }),
                });

                const completionData = await completionRes.json();
                if (handleJWTError(completionData, navigate)) return;
                setHasCompletedToday(completionData.hasCompleted);

            } catch (err) {
                console.error(err);
                toast.error("Network error. Redirecting to login.");
                navigate('/login');
            }
        };

        fetchData();
    }, [loginInfo.accessToken, loginInfo.userId, navigate]);


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
                        onClick={() => profile && onProfileChange()}
                        style={{ cursor: profile ? 'pointer' : 'not-allowed' }}
                    >
                        <FaBinoculars size={18} />
                    </div>


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
                        {hasCompletedToday === null ? (
                            <span>⏳</span>
                        ) : hasCompletedToday ? (
                            <MdCheckCircle color="green" size={20} title="Complete" />
                        ) : (
                            <MdCancel color="crimson" size={20} title="Incomplete" />
                        )}
                        <div className="stat-label">Today's Quest</div>
                    </div>
                </div>
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
                            <div key={`${friend.displayName}-${index}`} className="friend-entry">
                                <img src={friend.pfp} alt={`${friend.displayName}'s profile`} className="friend-pfp" />
                                <span>
                                    {friend.questCompleted} <MdTrackChanges size={12} /> {friend.displayName}
                                </span>
                            </div>
                        ))

                )}
            </div>

            {/* Global Leaderboard */}
            <div className="leaderboard-section">
                <h2><span style={{ paddingTop: '2px', marginRight: '6px' }}><FaTrophy /></span>Leaderboard</h2>

                {leaderboard.length === 0 ? (
                    <p>Loading leaderboard...</p>
                ) : (
                    leaderboard
                        .sort((a, b) => b.questCompleted - a.questCompleted)
                        .slice(0, 5)
                        .map((entry, i) => (
                            <div key={entry.userId} className="leaderboard-entry">
                                <span className="leaderboard-rank">#{i + 1}</span> –{' '}
                                <span className="leaderboard-quests"><strong>{entry.questCompleted}</strong> <MdTrackChanges size={10} /></span>{' '}
                                <span className="leaderboard-name">{entry.displayName}</span>
                            </div>
                        ))
                )}
            </div>
        </div >
    );
}
