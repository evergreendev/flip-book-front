"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';

interface ScreenSizeContextType {
  width: number;
  height: number;
  isMobile: boolean;
  isBelow1000px: boolean;
}

const ScreenSizeContext = createContext<ScreenSizeContextType | undefined>(undefined);

export const ScreenSizeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize with server-safe defaults that better approximate likely dimensions
  // This reduces layout shifts during hydration
  const [screenSize, setScreenSize] = useState<ScreenSizeContextType>({
    width: 1024,  // Reasonable default width
    height: 768,  // Reasonable default height
    isMobile: false,
    isBelow1000px: false,
  });

  useEffect(() => {
    // Create debounced resize handler to prevent rapid updates
    let resizeTimer: ReturnType<typeof setTimeout>;
    
    // Update with actual values once in browser
    const updateScreenSize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        setScreenSize({
          width: window.innerWidth,
          height: window.innerHeight,
          isMobile: window.innerWidth < 768,
          isBelow1000px: window.innerWidth < 1000,
        });
      }, 500); // 100ms debounce
    };

    // Initial calculation
    updateScreenSize();

    // Add event listener for resize
    window.addEventListener('resize', updateScreenSize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', updateScreenSize);
      clearTimeout(resizeTimer);
    };
  }, []);

  // Only render children after setting dimensions from client
  // This prevents initial layout shifts in production
  return (
    <ScreenSizeContext.Provider value={screenSize}>
      {children}
    </ScreenSizeContext.Provider>
  );
};

export const useScreenSize = (): ScreenSizeContextType => {
  const context = useContext(ScreenSizeContext);
  if (context === undefined) {
    throw new Error('useScreenSize must be used within a ScreenSizeProvider');
  }
  return context;
};
