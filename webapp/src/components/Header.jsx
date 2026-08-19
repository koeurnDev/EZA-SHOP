import React from 'react';

const Header = ({ setView, cartCount }) => {
  return (
    <header className="glass-panel sticky top-2.5 mx-2.5 mb-5 z-[100] px-5 py-2.5 flex items-center justify-between shadow-[0_10px_30px_rgba(255,114,160,0.15)] rounded-[25px]">
      <div 
        onClick={() => setView('home')} 
        className="cursor-pointer flex items-center gap-2.5"
      >
        <img 
          src="https://img.icons8.com/emoji/96/sparkles-emoji.png" 
          width="24" 
          alt="sparkles" 
          className="animate-float"
        />
        {/* Placeholder for the user's logo if they decide to host it, otherwise text-bubbly */}
        <h1 className="m-0 text-[26px] font-black text-[#ff72a0] [text-shadow:2px_2px_0_#fff,4px_4px_0_rgba(255,114,160,0.2)] font-['Bubblegum_Sans',cursive]">
          Vibe Lifestyle
        </h1>
      </div>

      <div className="flex gap-[15px] items-center">
        <button 
          onClick={() => setView('user')}
          className="bg-transparent border-none text-[24px] cursor-pointer p-0"
        >
          👤
        </button>
        <div 
          onClick={() => setView('cart')}
          className="relative cursor-pointer text-[24px]"
        >
          🛒
          {cartCount > 0 && (
            <span className="badge-pop absolute -top-[5px] -right-[8px]">
              {cartCount}
            </span>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
