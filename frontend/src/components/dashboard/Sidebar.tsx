
import { useEffect, useState } from 'react';
import isToday from '../todayChecker';
//types
import type { FriendsResponse, LeaderboardResponse, CurrentQuestResponse, FriendData, LeaderboardEntry, ProfileData, ProfileResponse, SidebarProps } from '../../types/dashboardTypes';
import buildPath from '../Path';
import { useNavigate } from 'react-router-dom';
import fullLogo from '../../assets/full_logo.svg';
import '../../styles/Sidebar.css';


export function DashboardSidebar({ loginInfo, onProfileChange }: SidebarProps) {
    const navigate = useNavigate();
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [friends, setFriends] = useState<FriendData[]>([]);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [currentQuest, setCurrentQuest] = useState<CurrentQuestResponse | null>(null);


    useEffect(() => {
        // Fetch profile data
        fetch(buildPath('api/getProfile'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${loginInfo.accessToken}`,
            },
            body: JSON.stringify({ userId: loginInfo.userId, jwtToken: loginInfo.accessToken }),
        })
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch profile');
                return res.json();
            })
            .then((data: ProfileResponse) => {
                setProfile(data.profileData);
            })
            .catch(err => {
                console.error(err);
                navigate('/login');
            });

        fetch(buildPath('api/fetchFriends'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${loginInfo.accessToken}`,
            },
            body: JSON.stringify({ userId: loginInfo.userId, jwtToken: loginInfo.accessToken }),
        })
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch friends');
                return res.json();
            })
            .then((data: FriendsResponse) => {
                setFriends(data.friends);
            })
            .catch(err => console.error('Friend fetch error:', err));

        fetch(buildPath('api/fetchScoreboard'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${loginInfo.accessToken}`,
            },
            body: JSON.stringify({ jwtToken: loginInfo.accessToken }),
        })
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch leaderboard');
                return res.json();
            })
            .then((data: LeaderboardResponse) => {
                setLeaderboard(data.scoreboard);
            })
            .catch(err => console.error('Leaderboard fetch error:', err));

        // Fetch current quest
        fetch(buildPath('api/currentQuest'), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        })
            .then(res => res.json())
            .then((data: CurrentQuestResponse) => {
                if (data.success) {
                    setCurrentQuest(data);
                } else {
                    console.error('Quest fetch failed');
                }
            })
            .catch(console.error);
    }, []);
    const questsToday = (profile?.questPosts || []).filter(
        post => post?.timeStamp && isToday(post.timeStamp)
    ).length;

    return (
        < div className="sidebar" >
            <div className="logo-wrapper">
                <img src={fullLogo} alt="Campus Quest Logo" className="campus-quest-logo" />
            </div>
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
                        <div className="stat-number">{`${questsToday == 0 ? 'Incomplete' : 'Complete'}`}</div>
                        <div className="stat-label">Today's Quest</div>
                    </div>
                </div>
            </div>

            <div className="current-quest-section">
                <h2>🎯 Current Quest</h2>
                {currentQuest ? (
                    <div className="current-quest">
                        <p><strong>Quest ID:</strong> {currentQuest.currentQuest.questId}</p>
                        <p><strong>Description:</strong> {currentQuest.questDescription}</p>
                        <p><strong>Issued:</strong> {new Date(currentQuest.timestamp).toLocaleString()}</p>
                    </div>
                ) : (
                    <p>Loading current quest...</p>
                )}
            </div>

            <div className="friends-section">
                <h2>Friend Leaderboard</h2>
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


            <div className="leaderboard-section">
                <h2>🏆 Leaderboard</h2>
                {leaderboard.length === 0 ? (
                    <p>Loading leaderboard...</p>
                ) : (
                    leaderboard
                        .sort((a, b) => b.questCompleted - a.questCompleted)
                        .slice(0, 5)
                        .map((entry, i) => (
                            <div key={entry.userId} className="leaderboard-entry">
                                <span className="leaderboard-rank">#{i + 1}</span> –
                                <span className="leaderboard-quests"><strong>{entry.questCompleted}</strong> quests</span>
                                <span className="leaderboard-name">{entry.displayName}</span>
                            </div>
                        ))
                )}
            </div>

        </div >
    );
}