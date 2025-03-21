import { useState, useEffect } from 'react';
import { Landmark } from '@/types';

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Landmark[]>([]);
  
  // Load bookmarks from localStorage on component mount
  useEffect(() => {
    try {
      const savedBookmarks = localStorage.getItem('landmarkBookmarks');
      if (savedBookmarks) {
        setBookmarks(JSON.parse(savedBookmarks));
      }
    } catch (error) {
      console.error('Failed to load bookmarks from localStorage:', error);
    }
  }, []);
  
  // Save bookmarks to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('landmarkBookmarks', JSON.stringify(bookmarks));
    } catch (error) {
      console.error('Failed to save bookmarks to localStorage:', error);
    }
  }, [bookmarks]);
  
  const isBookmarked = (landmarkId: number): boolean => {
    return bookmarks.some((bookmark) => bookmark.pageid === landmarkId);
  };
  
  const addBookmark = (landmark: Landmark) => {
    if (!isBookmarked(landmark.pageid)) {
      setBookmarks((prev) => [...prev, { ...landmark, isBookmarked: true }]);
    }
  };
  
  const removeBookmark = (landmarkId: number) => {
    setBookmarks((prev) => prev.filter((bookmark) => bookmark.pageid !== landmarkId));
  };
  
  const toggleBookmark = (landmark: Landmark) => {
    if (isBookmarked(landmark.pageid)) {
      removeBookmark(landmark.pageid);
    } else {
      addBookmark(landmark);
    }
  };
  
  return {
    bookmarks,
    isBookmarked,
    addBookmark,
    removeBookmark,
    toggleBookmark
  };
}