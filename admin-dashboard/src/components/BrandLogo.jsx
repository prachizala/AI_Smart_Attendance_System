import React from 'react';
import { ScanFace } from 'lucide-react';

export default function BrandLogo({ 
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl'
  className = '',
  iconClassName = '',
}) {
  const sizeMap = {
    sm: { box: 'p-1.5 rounded-lg', icon: 'w-4 h-4' },
    md: { box: 'p-2 rounded-xl', icon: 'w-5 h-5' },
    lg: { box: 'p-2.5 rounded-xl', icon: 'w-6 h-6' },
    xl: { box: 'p-4 rounded-2xl', icon: 'w-9 h-9' },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div 
      className={`inline-flex items-center justify-center bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-600 text-white shadow-sm shadow-indigo-600/30 flex-shrink-0 transition-transform duration-200 hover:scale-105 ${currentSize.box} ${className}`}
    >
      <ScanFace className={`${currentSize.icon} ${iconClassName}`} />
    </div>
  );
}
