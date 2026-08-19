import React, { useState, useEffect } from 'react';

const CountdownTimer = ({ endTime, style, className = '' }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!endTime) return;

    const calculateTimeLeft = () => {
      const difference = new Date(endTime) - new Date();
      if (difference <= 0) {
        return null;
      }

      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      // Pad with zero if needed
      const h = hours < 10 ? `0${hours}` : hours;
      const m = minutes < 10 ? `0${minutes}` : minutes;
      const s = seconds < 10 ? `0${seconds}` : seconds;

      return `${h}:${m}:${s}`;
    };

    const initialTime = calculateTimeLeft();
    if (initialTime === null) {
      setTimeLeft('');
      return;
    }
    
    setTimeLeft(initialTime);

    const timer = setInterval(() => {
      const newTime = calculateTimeLeft();
      if (newTime === null) {
        setTimeLeft('');
        clearInterval(timer);
      } else {
        setTimeLeft(newTime);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  if (!timeLeft) return null;

  return (
    <div className={`countdown-timer inline-flex items-center gap-1 bg-gradient-to-br from-red-500 to-red-600 text-white px-2 py-1 rounded-lg text-[11px] font-bold shadow-[0_2px_4px_rgba(220,38,38,0.3)] ${className}`} style={style}>
      <span className="text-[10px]">⏱️</span>
      <span>{timeLeft}</span>
    </div>
  );
};

export default CountdownTimer;
