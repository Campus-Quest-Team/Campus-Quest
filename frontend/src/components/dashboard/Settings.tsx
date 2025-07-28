import { useEffect, useRef, useState } from "react";
import buildPath from "../Path";
import type { ProfileData, ProfileEditProps, ProfileResponse } from "../../types/dashboardTypes";
import { useNavigate } from "react-router-dom";
import { clearToken } from "../../loginStorage";
import { FiCamera, FiEdit3, FiBell } from "react-icons/fi";
import { toast } from "react-toastify";
import '../../styles/Settings.css';

export function Settings({ loginInfo, onClose }: ProfileEditProps) {
    const navigate = useNavigate();
    const [bio, setBio] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    const [isEditingName, setIsEditingName] = useState(false);
    const [isEditingBio, setIsEditingBio] = useState(false);
    const [pfpPreview, setPfpPreview] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [profile, setProfile] = useState<ProfileData | null>(null);

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPfpPreview(URL.createObjectURL(selectedFile));
        }
    }

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Save display name and bio
        try {
            const res = await fetch(buildPath('api/editProfile'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: loginInfo.userId,
                    displayName,
                    bio,
                    jwtToken: loginInfo.accessToken,
                }),
            });

            const data = await res.json();
            if (res.ok && data.success) {
                toast.success("Profile details updated successfully!");
            } else {
                toast.error("Failed to update profile details.");
            }
        } catch {
            toast.error("Server error while updating profile.");
        }

        // Save profile picture if selected
        if (file) {
            const formData = new FormData();
            formData.append('userId', loginInfo.userId);
            formData.append('file', file);
            formData.append('jwtToken', loginInfo.accessToken);

            try {
                const res = await fetch(buildPath('api/editPFP'), {
                    method: 'POST',
                    body: formData,
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    toast.success("Profile picture updated successfully!");
                } else {
                    toast.error("Failed to update profile picture.");
                }
            } catch {
                toast.error("Server error while uploading profile picture.");
            }
        }
    };

    const handleToggleNotifications = async () => {
        const payload = {
            userId: loginInfo.userId,
            jwtToken: loginInfo.accessToken,
        };

        try {
            const res = await fetch(buildPath('api/toggleNotifications'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (data.success) {
                setNotificationsEnabled(data.notifications);
                toast.success(`Notifications turned ${data.notifications ? 'on' : 'off'}.`);
            } else {
                toast.error("Failed to toggle notifications.");
            }
        } catch (err) {
            console.error("Toggle notification error:", err);
            toast.error("Server error while toggling notifications.");
        }
    };

    const handleLogout = () => {
        clearToken();
        navigate('/login');
        toast.info("Logged out.");
    };

    useEffect(() => {
        const payload = {
            userId: loginInfo.userId,
            jwtToken: loginInfo.accessToken,
        };

        fetch(buildPath('api/getProfile'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        })
            .then(async res => {
                const data: ProfileResponse = await res.json();
                if (!res.ok) throw new Error('Profile fetch failed');

                setProfile(data.profileData);
                setBio(data.profileData.bio || '');
                setDisplayName(data.profileData.displayName || '');
            })
            .catch(() => {
                navigate('/login');
                toast.error("Session expired. Please log in again.");
            });
    }, [loginInfo, navigate]);

    return (
        <div className="settings-popup-container">
            <div className="settings-sidebar-panel">
                <div className="settings-editable-avatar" onClick={() => fileInputRef.current?.click()}>
                    <img src={pfpPreview || profile?.pfp || 'default-profile.png'} alt="Profile" />
                    <div className="settings-avatar-overlay-icon"><FiCamera /></div>
                    <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                    />
                </div>

                <div className="settings-editable-field editable-hover">
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
                            {displayName || 'Your Name'} <span className="settings-edit-icon"><FiEdit3 /></span>
                        </span>
                    )}
                </div>

                <div className="settings-editable-field editable-hover">
                    {isEditingBio ? (
                        <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            onBlur={() => setIsEditingBio(false)}
                            autoFocus
                        />
                    ) : (
                        <p onClick={() => setIsEditingBio(true)}>
                            {bio || 'Your bio here...'} <span className="settings-edit-icon"><FiEdit3 /></span>
                        </p>
                    )}
                </div>

                <div className="settings-toggle-section">
                    <label className="settings-toggle-label">
                        <span className="settings-toggle-icon"><FiBell /></span>
                        Notifications
                    </label>
                    <div
                        className={`settings-toggle-switch ${notificationsEnabled ? 'on' : 'off'}`}
                        onClick={handleToggleNotifications}
                    >
                        <div className="settings-toggle-knob" />
                    </div>
                </div>

                <div className="settings-action-buttons">
                    <button onClick={onClose}>Cancel</button>
                    <button onClick={handleEditSubmit}>Save Changes</button>
                </div>
                <button className="settings-logout-btn" onClick={handleLogout}>
                    🚪 Logout
                </button>
            </div>
        </div>
    );
}
