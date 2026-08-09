import React, { useState, useEffect, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import { useShopDispatch } from '../../context/ShopContext';
import { useUserState } from '../../context/UserContext';
import './VisualSearchModal.css';

const VisualSearchModal = ({ onClose }) => {
  const { lang } = useUserState();
  const { setSearchTerm } = useShopDispatch();
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [model, setModel] = useState(null);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);

  // Load MobileNet Model
  useEffect(() => {
    const loadModel = async () => {
      try {
        await tf.ready();
        const loadedModel = await mobilenet.load({ version: 2, alpha: 1.0 });
        setModel(loadedModel);
        setIsModelLoading(false);
      } catch (err) {
        console.error('Model load error:', err);
        setError(lang === 'kh' ? 'មានបញ្ហាក្នុងការផ្ទុក AI។ សូមសាកល្បងម្តងទៀត។' : 'Failed to load AI model. Please try again.');
        setIsModelLoading(false);
      }
    };
    loadModel();
  }, []);

  // Handle Image Selection
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError('');
    setIsAnalyzing(true);

    const imageUrl = URL.createObjectURL(file);
    setPreviewUrl(imageUrl);

    const img = new Image();
    img.onload = async () => {
      try {
        const canvas = canvasRef.current;
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, img.width, img.height);

        if (!model) throw new Error("Model not loaded");

        // Classify the image
        const predictions = await model.classify(canvas);
        console.log('AI Predictions:', predictions);

        if (predictions && predictions.length > 0) {
          const bestMatch = predictions[0];
          const searchTerm = bestMatch.className.split(',')[0].trim();
          
          setSearchTerm(searchTerm);
          onClose();
        } else {
          setError(lang === 'kh' ? 'រកមិនឃើញទំនិញទេ សូមសាកល្បងរូបភាពផ្សេង។' : 'No items recognized. Try a different image.');
          setIsAnalyzing(false);
        }
      } catch (err) {
        console.error('Analysis error:', err);
        setError(lang === 'kh' ? 'មានបញ្ហាក្នុងការវិភាគរូបភាព។' : 'Error analyzing image.');
        setIsAnalyzing(false);
      }
    };
    img.src = imageUrl;
  };

  return (
    <div className="vs-overlay">
      <div className="vs-container">
        {/* Header */}
        <div className="vs-header">
          <h2>{lang === 'kh' ? 'ស្វែងរកតាមរូបភាព' : 'Visual Search'}</h2>
          <button className="vs-close-btn" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Content Area */}
        <div className="vs-content-area">
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          
          {previewUrl ? (
            <div className="vs-preview-container">
              <img src={previewUrl} alt="Preview" className={`vs-preview-img ${isAnalyzing ? 'blur' : ''}`} />
              {isAnalyzing && (
                <div className="vs-message analyzing">
                  <div className="vs-pulse-ring"></div>
                  {lang === 'kh' ? 'AI កំពុងវិភាគរូបភាព...' : 'Analyzing Image...'}
                </div>
              )}
            </div>
          ) : (
            <div className="vs-upload-prompt">
              <div className="vs-icon-wrapper">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#a3e635" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
              </div>
              <h3>{lang === 'kh' ? 'ជ្រើសរើសរូបភាព' : 'Select an Image'}</h3>
              <p>{lang === 'kh' ? 'ថតរូបភាពថ្មី ឬជ្រើសរើសរូបភាពពីទូរស័ព្ទរបស់អ្នក ដើម្បីស្វែងរកទំនិញស្រដៀងគ្នា។' : 'Take a new photo or choose one from your gallery to find similar products.'}</p>
              
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef}
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
              
              <button 
                className="vs-action-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={isModelLoading}
              >
                {isModelLoading 
                  ? (lang === 'kh' ? 'កំពុងរៀបចំ AI...' : 'Loading AI...') 
                  : (lang === 'kh' ? 'បើកកាមេរ៉ា / វិចិត្រសាល' : 'Open Camera / Gallery')}
              </button>
            </div>
          )}

          {error && (
            <div className="vs-message error">
              {error}
              <button className="vs-retry-btn" onClick={() => fileInputRef.current?.click()}>
                {lang === 'kh' ? 'សាកល្បងម្តងទៀត' : 'Try Again'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisualSearchModal;
