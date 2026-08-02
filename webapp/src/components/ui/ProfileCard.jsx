import React from 'react';
import './ProfileCard.css';

const ProfileCard = ({ 
  name = "Michael Scott", 
  role = "Manager", 
  imageUrl = "https://i.pravatar.cc/150?img=11" // Placeholder avatar
}) => {
  return (
    <div className="profile-card">
      <div className="profile-card-image-wrapper">
         <div className="profile-card-glow"></div>
         <img src={imageUrl} alt={name} className="profile-card-image" />
      </div>
      <div className="profile-card-content">
        <h3 className="profile-card-name">{name}</h3>
        <p className="profile-card-role">{role}</p>
      </div>
    </div>
  );
};

export default ProfileCard;
