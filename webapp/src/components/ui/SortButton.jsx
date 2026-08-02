import React from 'react';
import './SortButton.css';

const SortButton = ({ onClick, label = "Sort by" }) => {
  return (
    <button className="sort-button" onClick={onClick}>
      <span className="sort-button-text">{label}</span>
      <div className="sort-button-icon">
        <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 6H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M6 10H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M8 14H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>
    </button>
  );
};

export default SortButton;
