import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import { isLoginValid, retrieveLogin } from "../loginStorage";

import { DashboardSidebar } from "../components/dashboard/Sidebar";
import { Feed } from "../components/dashboard/Feed";
import { ProfileView } from "../components/dashboard/ProfileView";

import "../styles/Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();
  const loginInfo = retrieveLogin();

  const [showEditPopup, setShowEditPopup] = useState(false);

  useEffect(() => {
    if (!isLoginValid()) {
      navigate("/login");
      return;
    }
  }, [navigate]);

  return (
    <div className="dashboard-container">
      {loginInfo && (
        <DashboardSidebar
          loginInfo={loginInfo}
          onProfileChange={() => {
            setShowEditPopup(true);
          }}
        />
      )}
      {loginInfo && <Feed {...loginInfo} />}
      {showEditPopup && (
        <ProfileView
          loginInfo={loginInfo}
          onClose={() => {
            setShowEditPopup(false);
          }}
        />
      )}
    </div>
  );
}

export default Dashboard;
