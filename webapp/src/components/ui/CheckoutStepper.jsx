import React from 'react';
import './CheckoutStepper.css';

const CheckoutStepper = ({ 
  currentStep = 2, 
  totalSteps = 4, 
  currentTitle = "Shipping Information", 
  nextTitle = "Billing Address" 
}) => {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (currentStep / totalSteps) * circumference;

  return (
    <div className="checkout-stepper">
      <div className="stepper-progress-circle">
        <svg width="60" height="60" viewBox="0 0 60 60">
          <circle
            className="stepper-circle-bg"
            stroke="#e5e7eb"
            strokeWidth="4"
            fill="transparent"
            r={radius}
            cx="30"
            cy="30"
          />
          <circle
            className="stepper-circle-progress"
            stroke="#22c55e" /* Green progress color */
            strokeWidth="4"
            fill="transparent"
            r={radius}
            cx="30"
            cy="30"
            transform="rotate(-90 30 30)" /* ✅ Fix: start arc from 12 o'clock, not 3 o'clock */
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: strokeDashoffset,
            }}
          />
        </svg>
        <div className="stepper-progress-text">
          {currentStep} of {totalSteps}
        </div>
      </div>
      
      <div className="stepper-info">
        <h2 className="stepper-title">{currentTitle}</h2>
        {nextTitle && (
          <p className="stepper-next-title">Next: {nextTitle}</p>
        )}
      </div>
    </div>
  );
};

export default CheckoutStepper;
