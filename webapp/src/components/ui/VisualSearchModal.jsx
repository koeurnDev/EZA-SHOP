import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import { useShopDispatch } from '../../context/ShopContext';
import { useUserState } from '../../context/UserContext';
import './VisualSearchModal.css';

const VisualSearchModal = ({ onClose }) => {
  const { lang } = useUserState();
  const { setSearchTerm } = useShopDispatch();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [stream, setStream] = useState(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [model, setModel] = useState(null);
  const [error, setError] = useState('');

  // 1. Initialize Camera
  useEffect(() => {
    let activeStream = null;
    const startCamera = async () => {
      try {
        activeStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = activeStream;
        }
        setStream(activeStream);
      } catch (err) {
        console.error('Camera error:', err);
        setError(lang === 'kh' ? 'មិនអាចបើកកាមេរ៉ាបានទេ។ សូមពិនិត្យសិទ្ធិអនុញ្ញាត។' : 'Unable to access camera. Please check permissions.');
      }
    };
    
    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [lang]);

  // 2. Load MobileNet Model
  useEffect(() => {
    const loadModel = async () => {
      try {
        // Ensure TF.js is ready
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
  }, [lang]);

  // 3. Capture & Analyze
  const handleCapture = useCallback(async () => {
    if (!model || !videoRef.current) return;
    
    setIsAnalyzing(true);
    
    try {
      // Draw video frame to canvas to analyze
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Classify the image
      const predictions = await model.classify(canvas);
      console.log('AI Predictions:', predictions);
      
      if (predictions && predictions.length > 0) {
        // Use the highest probability prediction
        const bestMatch = predictions[0];
        // The classNames can be comma separated like "lipstick, lip rouge"
        // We pick the first prominent word to search
        const searchTerm = bestMatch.className.split(',')[0].trim();
        
        // Stop camera
        if (stream) stream.getTracks().forEach(t => t.stop());
        
        // Set search term globally to filter products
        setSearchTerm(searchTerm);
        onClose();
      } else {
        setError(lang === 'kh' ? 'រកមិនឃើញទំនិញទេ សូមសាកល្បងថតម្តងទៀត។' : 'No items recognized. Try again.');
        setIsAnalyzing(false);
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError(lang === 'kh' ? 'មានបញ្ហាក្នុងការវិភាគរូបភាព។' : 'Error analyzing image.');
      setIsAnalyzing(false);
    }
  }, [model, stream, setSearchTerm, onClose, lang]);

  return (
    <div className="vs-overlay">
      <div className="vs-container">
        {/* Header */}
        <div className="vs-header">
          <button className="vs-close-btn" onClick={() => {
            if (videoRef.current && videoRef.current.srcObject) {
              videoRef.current.srcObject.getTracks().forEach(t => t.stop());
            }
            onClose();
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Viewfinder */}
        <div className="vs-viewfinder-container">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className={`vs-video ${isAnalyzing ? 'blur' : ''}`} 
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          
          {/* Scanner Overlay */}
          {!isAnalyzing && !error && (
            <div className="vs-scanner-box">
              <div className="vs-corner top-left"></div>
              <div className="vs-corner top-right"></div>
              <div className="vs-corner bottom-left"></div>
              <div className="vs-corner bottom-right"></div>
              <div className="vs-laser"></div>
            </div>
          )}

          {/* Messages Overlays */}
          {error && (
            <div className="vs-message error">
              {error}
            </div>
          )}
          


          {isAnalyzing && (
            <div className="vs-message analyzing">
              <div className="vs-pulse-ring"></div>
              {lang === 'kh' ? 'AI កំពុងវិភាគរូបភាព...' : 'Analyzing Image...'}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="vs-controls">
          <button 
            className="vs-capture-btn" 
            onClick={handleCapture}
            disabled={isModelLoading || isAnalyzing || error}
          >
            <div className="vs-capture-inner"></div>
          </button>
          <p className="vs-instruction">
            {lang === 'kh' ? 'ដាក់ទំនិញចំកណ្តាលប្រអប់ រួចចុចថត' : 'Center item in frame and tap to scan'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default VisualSearchModal;
