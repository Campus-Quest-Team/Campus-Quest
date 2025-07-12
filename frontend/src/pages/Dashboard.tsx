import React, { useEffect, useState } from 'react';
import '../styles/Dashboard.css'; // Optional CSS for layout/styling
import { clearToken, isTokenValid, retrieveToken } from '../tokenStorage';
import { useNavigate } from 'react-router';
import { jwtDecode } from 'jwt-decode';


interface UserPayload {
  userId: number;
  firstName: string;
  lastName: string;
  iat: number;
}

function Dashboard() {
  const quests = ['Quest 1', 'Quest 2', 'Quest 3'];
  const friends = [
    { name: 'User 1', quests: '0/3' },
    { name: 'User 2', quests: '1/3' },
    { name: 'User 3', quests: '2/3' },
  ];
  const [user, setUser] = useState<UserPayload | null>(null);
  const navigate = useNavigate();

  const handleLogout = () => {
    clearToken();
    navigate('/login');
  };



  useEffect(() => {

    if (!isTokenValid()) {
      navigate('/login'); // Redirect if token is missing
      return;
    }

    const token = retrieveToken();

    // Ensure token is a string before decoding

    try {
      const decoded = jwtDecode<UserPayload>(token.accessToken);
      setUser(decoded);
    } catch {
      console.error('Invalid token');
      navigate('/login'); // Redirect if token is invalid
    }
  }, [navigate]);

  if (!user) return null; // Or a loading spinner

  return (
    <div className="dashboard-container">
        {/* Sidebar */}
        <div className="sidebar">
            <h2>Campus Quest</h2>
            <div className="profile-section">
            <div className="profile-icon">👤</div>
                <div className="stats">
                    <div className="stat-item">
                        <div className="stat-number">10</div>
                        <div className="stat-label">Friends</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-number">5</div>
                        <div className="stat-label">Quests Complete</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-number">0/3</div>
                        <div className="stat-label">Quests Today</div>
                    </div>
                </div>


            </div>

        <div className="quests-section">
          <h2>Your Quests</h2>
          <ol>
            {quests.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ol>
        </div>

        <div className="friends-section">
          <h2>Friends</h2>
          {friends.map((f, i) => (
            <p key={i}>👤 {f.name} {f.quests} Today</p>
          ))}
        </div>

        <div className="leaderboard-link">
          <p>🏆 Leaderboard</p>
        </div>

        <button className="logout-button" onClick={handleLogout}>
  🚪 Logout
</button>

      </div>

      {/* Feed */}
      <div className="feed">
        <PostCard
          user="User 1234"
          title="FIND THE HORSEMAN"
          imageUrl="https://yourdomain.com/horseman.jpg"
          caption="Caption words and stuff"
          likes={327}
        />
        <PostCard
          user="User 1234"
          title="WHERE IS KNIGHTRO?"
          imageUrl="https://yourdomain.com/knightro.jpg"
          caption=""
          likes={0}
        />
      </div>
    </div>
  );
}

interface PostCardProps {
  user: string;
  title: string;
  imageUrl: string;
  caption: string;
  likes: number;
}

function PostCard({ user, title, imageUrl, caption, likes }: PostCardProps) {
  return (
    <div className="post-card">
      <div className="post-header">
        <p>👤 {user}</p>
        <p className="post-title">{title}</p>
      </div>
      <img src={imageUrl} alt={title} className="post-image" />
      <div className="post-footer">
        {likes > 0 && <p>❤️ {likes}</p>}
        <p>{caption}</p>
        <button className="flag-btn">🚩</button>
      </div>
    </div>
  );
}

export default Dashboard;
