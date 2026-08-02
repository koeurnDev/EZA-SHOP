import React, { useState, useEffect } from 'react';
import './BeautyProductDetail.css';

// ឧទាហរណ៍នៃមុខងារទាញយកទិន្នន័យ (Mock API Service)
const fetchProductFromAPI = async (id) => {
  return new Promise((resolve) => {
    // ក្លែងធ្វើការរង់ចាំ Network (Loading 1 វិនាទី)
    setTimeout(() => {
      resolve({
        id: id || "p101",
        brand: "COSRX",
        title: "Centella Water Alcohol-Free Toner",
        rating: 4.6,
        reviewsCount: 200,
        price: 215500,
        formattedPrice: "Rp215.500",
        sizes: [
          { id: "s1", label: "100 ml", inStock: true },
          { id: "s2", label: "220 ml", inStock: true },
          { id: "s3", label: "280 ml", inStock: true },
          { id: "s4", label: "400 ml", inStock: false },
        ],
        description: "Soothing & Hydrating! What sensitive skin owner needs.\n\nWatery, spray type toner provides relief to irritated and sensitive skin and calms redness. We kept the ingredient list short and simple and exclude all the unnecessary ingredients that might irritate the skin.",
        images: [
          "main_bottle_image", 
          "detail_image_1", 
          "detail_image_2"
        ]
      });
    }, 1000); 
  });
};

const BeautyProductDetail = ({ productId = "p101" }) => {
  // --- គ្រប់គ្រង State (Data & UI) ---
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [quantity, setQuantity] = useState(1);
  const [selectedSizeId, setSelectedSizeId] = useState("");
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // --- ដំណើរការពេល Component បង្ហាញដំបូង (Fetch Data) ---
  useEffect(() => {
    const loadProductData = async () => {
      setIsLoading(true);
      try {
        // នៅពេលប្រើ API ពិត អ្នកនឹងសរសេរកូដ Fetch បែបនេះ៖
        // const response = await fetch(`https://api.yourdomain.com/products/${productId}`);
        // const data = await response.json();
        
        const data = await fetchProductFromAPI(productId);
        setProduct(data);
        
        // កំណត់ Size ដំបូងដោយស្វ័យប្រវត្តិ (យកមួយណាដែលមានស្តុក)
        const firstAvailableSize = data.sizes.find(s => s.inStock);
        if (firstAvailableSize) {
          setSelectedSizeId(firstAvailableSize.id);
        }
      } catch (error) {
        console.error("បរាជ័យក្នុងការទាញយកទិន្នន័យ:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProductData();
  }, [productId]);

  // --- មុខងារផ្សេងៗ (Handlers) ---
  const handleIncreaseQty = () => setQuantity(prev => prev + 1);
  const handleDecreaseQty = () => setQuantity(prev => (prev > 1 ? prev - 1 : 1));

  const handleAddToCart = () => {
    const cartPayload = {
      productId: product.id,
      sizeId: selectedSizeId,
      qty: quantity,
      price: product.price
    };
    console.log("ទិន្នន័យដែលនឹងត្រូវបញ្ជូនទៅ API (Add to Cart):", cartPayload);
    alert(`បានបន្ថែម ${quantity} ចូលកន្ត្រក!`);
  };

  // --- បង្ហាញ UI ពេលកំពុង Loading ---
  if (isLoading) {
    return (
      <div className="beauty-pdp-container" style={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
        <h3>🔄 កំពុងផ្ទុកទិន្នន័យពី API...</h3>
      </div>
    );
  }

  // --- បង្ហាញ UI បើគ្មានទិន្នន័យ ---
  if (!product) return <div className="beauty-pdp-container">រកមិនឃើញផលិតផលនេះទេ!</div>;

  // --- UI ចម្បង (ពេលមានទិន្នន័យ) ---
  return (
    <div className="beauty-pdp-container">
      {/* Header & Image Wrapper */}
      <div className="beauty-header-image-wrapper">
        <div className="beauty-top-nav">
          <button className="beauty-nav-btn" aria-label="Go back">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <button className="beauty-nav-btn" aria-label="More options">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="5" cy="12" r="1.5"></circle>
              <circle cx="12" cy="12" r="1.5"></circle>
              <circle cx="19" cy="12" r="1.5"></circle>
            </svg>
          </button>
        </div>
        
        {/* Main Product Image Placeholder */}
        <div style={{
          width: '100px', 
          height: '280px', 
          background: 'linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 50%, #d1d5db 100%)',
          borderRadius: '24px 24px 8px 8px', 
          position: 'relative',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center'
        }}>
          <div style={{position: 'absolute', top: '-30px', width: '36px', height: '30px', backgroundColor: '#111827', borderRadius: '4px 4px 0 0'}}></div>
          <div style={{position: 'absolute', top: '-46px', width: '12px', height: '16px', backgroundColor: '#374151', borderRadius: '2px 2px 0 0'}}></div>
          <div style={{width: '70px', height: '100px', backgroundColor: '#e4e4d5', border: '1px solid #111827'}}></div>
        </div>

        {/* Dynamic Side Thumbnails */}
        <div className="beauty-thumbnails">
          {product.images.map((img, index) => (
            <div 
              key={index} 
              className={`beauty-thumb ${activeImageIndex === index ? 'active' : ''}`}
              onClick={() => setActiveImageIndex(index)}
            >
              <div style={{width: '14px', height: '30px', backgroundColor: '#d1d5db', borderRadius: '2px'}}></div>
            </div>
          ))}
        </div>
      </div>

      {/* Product Info */}
      <div className="beauty-info-section">
        
        {/* Dynamic Title */}
        <div className="beauty-title-row">
          <h1 className="beauty-title">{product.title}</h1>
          <button className="beauty-favorite-btn" aria-label="Add to wishlist">
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </button>
        </div>

        {/* Dynamic Rating */}
        <div className="beauty-rating-row">
          <svg className="beauty-star" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
             <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <span className="beauty-rating-score">{product.rating}</span>
          <span className="beauty-reviews">({product.reviewsCount} Reviews)</span>
        </div>

        {/* Dynamic Price and Qty */}
        <div className="beauty-price-row">
          <div className="beauty-price">{product.formattedPrice}</div>
          <div className="beauty-qty-control">
             <button className="beauty-qty-btn minus" onClick={handleDecreaseQty}>
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
             </button>
             <span className="beauty-qty-value">{quantity}</span>
             <button className="beauty-qty-btn plus" onClick={handleIncreaseQty}>
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
             </button>
          </div>
        </div>

        {/* Dynamic Size Selector */}
        <h3 className="beauty-section-title">Product Size</h3>
        <div className="beauty-size-options">
          {product.sizes.map((size) => (
             <button 
                key={size.id}
                onClick={() => size.inStock && setSelectedSizeId(size.id)}
                className={`beauty-size-btn 
                  ${selectedSizeId === size.id ? 'active' : ''} 
                  ${!size.inStock ? 'disabled' : ''}`
                }
                disabled={!size.inStock}
             >
                {size.label}
             </button>
          ))}
        </div>

        {/* Dynamic Description */}
        <h3 className="beauty-section-title">Description Product</h3>
        <p className="beauty-description" style={{whiteSpace: 'pre-line'}}>
          {product.description}
        </p>

      </div>

      {/* Bottom Action Bar */}
      <div className="beauty-action-bar">
        <button className="beauty-action-btn beauty-btn-outline" onClick={handleAddToCart}>
           <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
           </svg>
           Add Cart
        </button>
        <button className="beauty-action-btn beauty-btn-solid">
           <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
              <line x1="7" y1="7" x2="7.01" y2="7"></line>
           </svg>
           Buy Now
        </button>
      </div>

    </div>
  );
};

export default BeautyProductDetail;
