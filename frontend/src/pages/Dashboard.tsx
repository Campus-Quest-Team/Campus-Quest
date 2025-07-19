import { useEffect, useRef, useState } from 'react';
import '../styles/Dashboard.css';
import { clearToken, isTokenValid, retrieveToken } from '../tokenStorage';
import { useNavigate } from 'react-router';
import { jwtDecode } from 'jwt-decode';
import buildPath from '../components/Path';
import isToday from '../components/todayChecker';


interface UserPayload {
  userId: number;
  firstName: string;
  lastName: string;
  iat: number;
}

interface QuestPost {
  _id: string;
  questId: string;
  userId: string;
  caption: string;
  questDescription: string;
  likes: number;
  flagged: number;
  timeStamp: string;
  likedBy: string[];
  flaggedBy: string[];
  mediaUrl: string;
}

interface ProfileData {
  questCompleted: number;
  displayName: string;
  pfp: string;
  questPosts: QuestPost[];
}

interface ProfileResponse {
  profileData: ProfileData;
  jwtToken: string;
}

interface FriendData {
  userId: string;
  displayName: string;
  pfp: string;
  questCompleted: number;
}

interface FriendsResponse {
  friends: FriendData[];
  jwtToken: string;
}


interface LeaderboardEntry {
  userId: string;
  displayName: string;
  pfp: string;
  questCompleted: number;
}

interface LeaderboardResponse {
  scoreboard: LeaderboardEntry[];
  jwtToken: string;
}

interface CurrentQuestResponse {
  success: boolean;
  currentQuest: {
    questId: string;
    timestamp: string;
    questData: any; // refine this if you know its shape
  };
  questDescription: string;
  timestamp: string;
}

interface FeedPost {
  postId: string;
  caption: string;
  questDescription: string;
  likes: number;
  flagged: number;
  timeStamp: string;
  likedBy: string[];
  flaggedBy: string[];
  mediaUrl: string;
  creator: {
    userId: string;
    displayName: string;
    pfpUrl: string;
  };
}

interface FeedResponse {
  feed: FeedPost[];
  jwtToken: string;
}




function Dashboard() {
  const [user, setUser] = useState<UserPayload | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const navigate = useNavigate();
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentQuest, setCurrentQuest] = useState<CurrentQuestResponse | null>(null);
  const [feed, setFeed] = useState<FeedPost[]>([]);

  const [file] = useState<File | null>(null);
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [bio, setBio] = useState('');
  const [showEditPopup, setShowEditPopup] = useState(false);

  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [pfpPreview, setPfpPreview] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setPfpPreview(URL.createObjectURL(file));
      // Optionally upload the image here
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = retrieveToken();

    if (file) {
      const formData = new FormData();
      formData.append('userId', user?.userId.toString() || '');
      formData.append('file', file);
      formData.append('jwtToken', token.accessToken);

      await fetch(buildPath('api/editPFP'), {
        method: 'POST',
        body: formData,
      });
    }

    await fetch(buildPath('api/editProfile'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user?.userId,
        displayName,
        bio,
        jwtToken: token.accessToken,
      }),
    });

    // Optionally refresh profile info here
    setShowEditPopup(false);
  };


 

  const handleLogout = () => {
    clearToken();
    navigate('/login');
  };


  useEffect(() => {
  if (!isTokenValid()) {
    navigate('/login');
    return;
  }

  const token = retrieveToken();

  try {
    const decoded = jwtDecode<UserPayload>(token.accessToken);
    setUser(decoded);

    // Fetch profile data
    fetch(buildPath('api/getProfile'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.accessToken}`,
      },
      body: JSON.stringify({ userId: decoded.userId, jwtToken: token.accessToken }),
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch profile');
        return res.json();
      })
      .then((data: ProfileResponse) => {
        setProfile(data.profileData);
        setDisplayName(data.profileData.displayName); // ✅ update here
      })
      .catch(err => {
        console.error(err);
        navigate('/login');
      });

    
    fetch(buildPath('api/fetchFriends'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.accessToken}`,
      },
      body: JSON.stringify({ userId: decoded.userId, jwtToken: token.accessToken }),
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
        Authorization: `Bearer ${token.accessToken}`,
      },
      body: JSON.stringify({jwtToken: token.accessToken }),
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
    
    // Fetch user feed
    fetch(buildPath('api/getFeed'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.accessToken}`,
      },
      body: JSON.stringify({ userId: decoded.userId, jwtToken: token.accessToken }),
    })
      .then(res => res.json())
      .then((data: FeedResponse) => {
        if (data.feed) {
          setFeed(data.feed);
        } else {
          console.error('Feed fetch failed');
        }
      })
      .catch(console.error);



  } catch {
    console.error('Invalid token');
    navigate('/login');
  }
}, [navigate]);


  if (!user) return null;
  const questsToday = profile?.questPosts?.filter(post => isToday(post.timeStamp)).length ?? 0;

  return (
    <div className="dashboard-container">
        {/* Sidebar */}
        <div className="sidebar">
            <h2>Campus Quest</h2>
            <div className="profile-section">
              <div className="profile-picture-wrapper">
                <img
                  src={profile?.pfp || 'default-profile.png'}
                  alt="Profile"
                  className="profile-img"
                />
                <div className="edit-icon" onClick={() => setShowEditPopup(true)}>✏️</div>
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
                  <div className="stat-number">{`${questsToday == 0 ? 'Incomplete': 'Complete'}`}</div>
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


        <button className="logout-button" onClick={handleLogout}>
          🚪 Logout
        </button>

      </div>

      {/* Feed */}
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

      {showEditPopup && (
        <div className="popup-overlay">
          <div className="edit-profile-modal">
            {/* Profile Picture with Pencil Icon */}
            <div className="editable-profile-pic" onClick={() => fileInputRef.current?.click()}>
              <img src={pfpPreview || profile?.pfp || 'default-profile.png'} alt="Profile" />
              <div className="pencil-overlay">✏️</div>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>

            {/* Display Name */}
            <div className="editable-text">
              {isEditingName ? (
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onBlur={() => setIsEditingName(false)}
                  autoFocus
                />
              ) : (
                <span onClick={() => setIsEditingName(true)}>
                  {displayName || 'Your Name'} <span className="pencil-icon">✏️</span>
                </span>
              )}
            </div>

            {/* Bio */}
            <div className="editable-text">
              {isEditingBio ? (
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  onBlur={() => setIsEditingBio(false)}
                  autoFocus
                />
              ) : (
                <p onClick={() => setIsEditingBio(true)}>
                  {bio || 'Your bio here...'} <span className="pencil-icon">✏️</span>
                </p>
              )}
            </div>

            <button onClick={handleEditSubmit}>Save Changes</button>
            <button onClick={() => setShowEditPopup(false)}>Cancel</button>
          </div>
        </div>
      )}



      );
    </div>
  );
}
 
interface PostCardProps {
  user: string;
  title: string;
  imageUrl: string;
  caption: string;
  likes: number;
  pfp: string;
}

function PostCard({ user, title, imageUrl, caption, likes, pfp }: PostCardProps) {
  return (
    <div className="post-card">
      <div className="post-header">
        <img src={pfp || 'default-profile.png'} alt={user} className="post-pfp" />
        <div>
          <p className="post-user">👤 {user}</p>
          <p className="post-title">{title}</p>
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


export default Dashboard;
