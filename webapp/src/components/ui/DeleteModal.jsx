import React from 'react';
import './DeleteModal.css';

const DeleteModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  itemName = 'Account',
  title = 'Delete Account',
  description = "You're going to delete your",
  cancelText = "No, keep it.",
  confirmText = "Yes, Delete!"
}) => {
  if (!isOpen) return null;

  return (
    <div className="delete-modal-overlay" onClick={onClose}>
      <div className="delete-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="delete-modal-icon">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="delete-modal-title">{title}</h3>
        <p className="delete-modal-description">
          {description} "{itemName}"
        </p>
        <div className="delete-modal-actions">
          <button className="delete-modal-btn delete-modal-btn-cancel" onClick={onClose}>
            {cancelText}
          </button>
          <button className="delete-modal-btn delete-modal-btn-confirm" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteModal;
