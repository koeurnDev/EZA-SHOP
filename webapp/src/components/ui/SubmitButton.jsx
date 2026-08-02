import React from 'react';
import './SubmitButton.css';

const SubmitButton = ({ onClick, children = "Submit", type = "button" }) => {
  return (
    <button type={type} className="submit-button" onClick={onClick}>
      {children}
    </button>
  );
};

export default SubmitButton;
