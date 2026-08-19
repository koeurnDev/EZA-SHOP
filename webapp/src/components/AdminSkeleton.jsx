import React from 'react';

const AdminSkeleton = () => {
  return (
    <div className="admin-skeleton-container p-5">
      <div className="skeleton-tabs flex gap-2.5 mb-[30px]">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="shimmer-luxury w-[80px] h-[36px] rounded-[20px] opacity-10" />
        ))}
      </div>

      <div className="skeleton-overview flex flex-col gap-5">
        {/* Business Health Card */}
        <div className="shimmer-luxury w-full h-[260px] rounded-[32px] opacity-5 flex items-center justify-center">
           <div className="shimmer-luxury w-[120px] h-[120px] rounded-full border-8 border-white/5" />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="shimmer-luxury h-[160px] rounded-[28px] opacity-5" />
          <div className="shimmer-luxury h-[160px] rounded-[28px] opacity-5" />
        </div>

        {/* Recent Orders List */}
        <div className="shimmer-luxury w-full h-[40px] rounded-xl opacity-10 mb-2.5" />
        {[1, 2, 3].map(i => (
          <div key={i} className="shimmer-luxury w-full h-[80px] rounded-[20px] opacity-5 mb-2.5" />
        ))}
      </div>
      
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .shimmer-luxury {
          background: linear-gradient(90deg, 
            transparent 25%, 
            rgba(255, 255, 255, 0.05) 50%, 
            transparent 75%
          );
          background-size: 200% 100%;
          animation: shimmer 2s infinite linear;
        }
        [data-theme='light'] .shimmer-luxury {
          background: linear-gradient(90deg, 
            rgba(0,0,0,0.03) 25%, 
            rgba(0,0,0,0.06) 50%, 
            rgba(0,0,0,0.03) 75%
          );
        }
      `}</style>
    </div>
  );
};

export default AdminSkeleton;
