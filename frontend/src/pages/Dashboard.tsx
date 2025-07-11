import React from 'react';
import '../styles/Dashboard.css'; // Optional CSS for layout/styling

function Dashboard() {
  const quests = ['Quest 1', 'Quest 2', 'Quest 3'];
  const friends = [
    { name: 'User 1', quests: '0/3' },
    { name: 'User 2', quests: '1/3' },
    { name: 'User 3', quests: '2/3' },
  ];

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

function PostCard({ user, title, imageUrl, caption, likes }) {
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
