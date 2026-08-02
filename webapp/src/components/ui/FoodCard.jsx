import React from 'react';
import './FoodCard.css';

const FoodCard = ({ 
  title = "Ichiraku Ramen", 
  price = "15.00", 
  rating = "4.5",
  // In a real app, this would be a URL to a PNG with a transparent background
  imageUrl = "" 
}) => {
  return (
    <div className="food-card">
      <div className="food-card-heart">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
      </div>
      
      <div className="food-card-image-container">
        {imageUrl ? (
          <img src={imageUrl} alt={title} />
        ) : (
          // Placeholder for the food image
          <div style={{ width: '90px', height: '90px', backgroundColor: '#d1d5db', borderRadius: '50%' }}></div>
        )}
      </div>
      
      <h3 className="food-card-title">{title}</h3>
      
      <div className="food-card-footer">
        <div className="food-card-price">$ {price}</div>
        <div className="food-card-rating">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
          </svg>
          {rating}
        </div>
      </div>
    </div>
  );
};

export default FoodCard;
