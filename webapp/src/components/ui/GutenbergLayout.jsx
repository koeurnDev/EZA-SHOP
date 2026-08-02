import React from 'react';
import './GutenbergLayout.css';

const GutenbergLayout = () => {
  return (
    <div className="g-layout-container">
      {/* Top section: Points 1 to 2 */}
      <header className="g-layout-header">
        <div className="g-layout-logo">Brand.io</div> {/* Point 1: Start here */}
        <button className="g-layout-nav-btn">Sign In</button> {/* Point 2: Eye moves here */}
      </header>

      {/* Main section: Points 3 to 4 */}
      <main className="g-layout-main">
        <div className="g-layout-image-placeholder">
          {/* Point 3: Eye moves down diagonally to here */}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
             <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
             <circle cx="8.5" cy="8.5" r="1.5"></circle>
             <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
        </div>
        <div className="g-layout-content">
          <h2>Gutenberg Principle Layout</h2>
          <p>
            Notice how your eyes naturally scan this card: starting top-left at the logo, 
            moving right to the Sign In button, diagonally down to the image, and finally 
            resting bottom-right at the primary action button below.
          </p>
          <div className="g-layout-cta-wrapper">
            <button className="g-layout-cta-btn">Get Started</button> {/* Point 4: Action! */}
          </div>
        </div>
      </main>
    </div>
  );
};

export default GutenbergLayout;
