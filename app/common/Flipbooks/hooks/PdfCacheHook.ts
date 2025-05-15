// hooks/usePdfCache.ts
import {useRef, useEffect, useCallback} from 'react';
import { PDFDocumentProxy } from 'pdfjs-dist';

type PdfCache = Map<string, {
  pdf: PDFDocumentProxy;
  lastAccessed: number;
  loading: Promise<PDFDocumentProxy> | null;
}>;

export function usePdfCache(maxCacheSize = 5, expirationTime = 10 * 60 * 1000) {
  // Create a ref to hold our cache
  const cacheRef = useRef<PdfCache>(new Map());
  
  // Function to load a PDF with caching
  const loadPdf = useCallback(async (pdfUrl: string): Promise<PDFDocumentProxy> => {
    const cache = cacheRef.current;
    const now = Date.now();

    // Check if we have this PDF in cache and it's not expired
    if (cache.has(pdfUrl)) {
      const entry = cache.get(pdfUrl)!;

      // If there's an active loading promise, wait for it
      if (entry.loading) {
        return entry.loading;
      }

      // Update last accessed time
      entry.lastAccessed = now;
      return entry.pdf;
    }

    // Import pdfjs dynamically
    // @ts-expect-error: TypeScript cannot verify dynamic import
    const pdfJS = await import('pdfjs-dist/build/pdf');

    // Set worker source
    pdfJS.GlobalWorkerOptions.workerSrc =
        window.location.origin + '/pdf.worker.min.mjs';

    // Create loading promise
    const loadingPromise = pdfJS.getDocument({
      url: pdfUrl,
      cMapUrl: '/cmaps/',
      cMapPacked: true
    }).promise;

    // Add loading entry to cache
    cache.set(pdfUrl, {
      pdf: null as never,
      lastAccessed: now,
      loading: loadingPromise
    });

    try {
      // Wait for PDF to load
      const pdf = await loadingPromise;

      // Update cache with loaded PDF
      if (cache.has(pdfUrl)) {
        cache.set(pdfUrl, {
          pdf,
          lastAccessed: now,
          loading: null
        });
      }

      // Manage cache size
      if (cache.size > maxCacheSize) {
        // Find least recently used entry
        let oldestUrl: string | null = null;
        let oldestTime = Infinity;

        cache.forEach((entry, url) => {
          if (entry.lastAccessed < oldestTime) {
            oldestTime = entry.lastAccessed;
            oldestUrl = url;
          }
        });

        // Remove and destroy oldest PDF
        if (oldestUrl) {
          const oldEntry = cache.get(oldestUrl);
          if (oldEntry && oldEntry.pdf) {
            await oldEntry.pdf.destroy();
          }
          cache.delete(oldestUrl);
        }
      }

      return pdf;
    } catch (error) {
      // Remove failed loading entry from cache
      cache.delete(pdfUrl);
      throw error;
    }
  },[maxCacheSize])
  
  // Function to prefetch a PDF
  const prefetchPdf = useCallback((pdfUrl: string) => {
    if (!cacheRef.current.has(pdfUrl)) {
      loadPdf(pdfUrl).catch(console.error);
    }
  },[loadPdf])
  
  // Function to clear cache
  const clearCache = useCallback(async () => {
    const cache = cacheRef.current;

    // Destroy all PDFs
    for (const entry of cache.values()) {
      if (entry.pdf) {
        await entry.pdf.destroy();
      }
    }

    cache.clear();
  },[])
  
  // Clean up expired cache entries and destroy PDFs on unmount
  useEffect(() => {
    const interval = setInterval(() => {
      const cache = cacheRef.current;
      const now = Date.now();
      
      for (const [url, entry] of cache.entries()) {
        if (now - entry.lastAccessed > expirationTime) {
          if (entry.pdf) {
            entry.pdf.destroy().catch(console.error);
          }
          cache.delete(url);
        }
      }
    }, 60000); // Check every minute
    
    return () => {
      clearInterval(interval);
      clearCache();
    };
  }, [clearCache, expirationTime]);
  
  return { loadPdf, prefetchPdf, clearCache };
}
