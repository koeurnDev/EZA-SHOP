import React from 'react';

const SkeletonCard = () => {
  return (
    <div className="skeleton-card">
      <div className="skeleton-img skeleton"></div>
      <div className="skeleton-title skeleton w-[70%] mt-2.5"></div>
      <div className="skeleton-price skeleton mt-auto"></div>
    </div>
  );
};

const ProductSkeleton = () => {
  return (
    <div className="skeleton-card">
      <div className="skeleton skeleton-img"></div>
      <div className="skeleton-title skeleton w-[85%] mb-2"></div>
      <div className="skeleton-title skeleton w-[60%]"></div>
      <div className="flex justify-between items-center mt-auto">
        <div className="skeleton-price skeleton"></div>
        <div className="skeleton w-9 h-9 rounded-xl"></div>
      </div>
    </div>
  );
};

export default ProductSkeleton;
