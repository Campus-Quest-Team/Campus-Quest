import { useEffect, useState } from "react";
import "../styles/Dashboard.css";
import { isLoginValid, retrieveLogin } from "../loginStorage";
import { useNavigate } from "react-router";

import { DashboardSidebar } from "../components/dashboard/Sidebar";
import { ProfileEdit } from "../components/dashboard/ProfileEdit";
import { Feed } from "../components/dashboard/Feed";

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
          onProfileChange={(_profile) => {
            setShowEditPopup(true);
          }}
        />
      )}
      {loginInfo && <Feed {...loginInfo} />}
      {showEditPopup && (
        <ProfileEdit
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
