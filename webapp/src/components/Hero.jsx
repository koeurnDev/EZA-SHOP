import React from 'react';
import ShopHeader from './ui/ShopHeader';

const Hero = ({ searchTerm, setSearchTerm, view, setView, user, lang, theme, toggleLang, toggleTheme }) => {
   return (
      <div className="hero-section !px-0 !pt-0">
         <ShopHeader 
            searchTerm={searchTerm} 
            setSearchTerm={setSearchTerm} 
            view={view} 
            setView={setView} 
            user={user}
            lang={lang}
            theme={theme}
            toggleLang={toggleLang}
            toggleTheme={toggleTheme}
         />
      </div>
   );
};

export default React.memo(Hero);
