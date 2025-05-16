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
  // Initialize with server-safe defaults
  const [screenSize, setScreenSize] = useState<ScreenSizeContextType>({
    width: 0,
    height: 0,
    isMobile: false,
    isBelow1000px: false,
  });

  useEffect(() => {
    // Update with actual values once in browser
    const updateScreenSize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight,
        isMobile: window.innerWidth < 768,
        isBelow1000px: window.innerWidth < 1000,
      });
    };

    // Initial calculation
    updateScreenSize();

    // Add event listener for resize
    window.addEventListener('resize', updateScreenSize);

    // Cleanup
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

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
