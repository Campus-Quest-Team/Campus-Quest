import { useEffect, useRef, useState } from "react";
import buildPath from "../Path";
import type { ProfileData, ProfileEditProps, ProfileResponse } from "../../types/dashboardTypes";
import { useNavigate } from "react-router-dom";
import { clearToken } from "../../loginStorage";

export function ProfileEdit({ loginInfo, onClose }: ProfileEditProps) {
    const navigate = useNavigate();
    const [bio, setBio] = useState('');
    const [displayName, setDisplayName] = useState('');

    const [isEditingName, setIsEditingName] = useState(false);
    const [isEditingBio, setIsEditingBio] = useState(false);
    const [pfpPreview, setPfpPreview] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [file] = useState<File | null>(null);
    const [profile, setProfile] = useState<ProfileData | null>(null);


    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            setPfpPreview(URL.createObjectURL(file));
            // Optionally upload the image here
        }
    }

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (file) {
            const formData = new FormData();
            formData.append('userId', loginInfo.userId);
            formData.append('file', file);
            formData.append('jwtToken', loginInfo.accessToken);

            await fetch(buildPath('api/editPFP'), {
                method: 'POST',
                body: formData,
            });
        }
        // You can add more logic here if needed
    };

    const handleLogout = () => {
        clearToken();
        navigate('/login');
    };

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
    }, [loginInfo]);

    return (

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
                <button onClick={onClose}>Cancel</button>

            </div>
            <button className="logout-button" onClick={handleLogout}>
                🚪 Logout
            </button>
        </div>
    );
}