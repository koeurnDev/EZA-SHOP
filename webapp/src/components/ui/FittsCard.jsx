import React from 'react';
import './FittsCard.css';

const FittsCard = () => {
  return (
    <div className="fitts-card">
      <div className="fitts-avatar"></div>
      <div className="fitts-info">
        <h3>Alex Johnson</h3>
        <p>UX Designer</p>
      </div>
      
      {/* 
        Applying Fitts's Law: 
        These buttons use flex: 1 to span the full width of the card.
        The large target area (size) reduces the time it takes the user 
        to acquire (click) the target, drastically improving UX,
        especially on mobile devices where precision is harder.
      */}
      <div className="fitts-actions">
        <button className="fitts-btn fitts-btn-secondary">Message</button>
        <button className="fitts-btn fitts-btn-primary">Follow</button>
      </div>
    </div>
  );
};

export default FittsCard;
