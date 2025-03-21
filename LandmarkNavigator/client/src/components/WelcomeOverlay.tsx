import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Map, Search, Compass, Award } from 'lucide-react';

const WelcomeOverlay = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  
  useEffect(() => {
    // Check if user has seen the welcome overlay before
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    
    if (!hasSeenWelcome) {
      setIsOpen(true);
    }
  }, []);
  
  const handleClose = () => {
    localStorage.setItem('hasSeenWelcome', 'true');
    setIsOpen(false);
  };
  
  const slides = [
    {
      title: "Welcome to Landmark Explorer",
      description: "Discover interesting landmarks and points of interest around the world with our interactive map.",
      icon: <Map className="h-16 w-16 text-blue-500 mb-4" />
    },
    {
      title: "Explore Your Surroundings",
      description: "Enable location tracking to see landmarks near you and get distances in real-time.",
      icon: <MapPin className="h-16 w-16 text-blue-500 mb-4" />
    },
    {
      title: "Search Anywhere",
      description: "Type a location name in the search box to instantly teleport to any place in the world.",
      icon: <Search className="h-16 w-16 text-blue-500 mb-4" />
    },
    {
      title: "Follow Me Mode",
      description: "Activate the location tracking toggle to keep the map centered on your position as you move.",
      icon: <Navigation className="h-16 w-16 text-blue-500 mb-4" />
    },
    {
      title: "Discover Hidden Gems",
      description: "Find fascinating places you never knew existed, right in your neighborhood or across the globe.",
      icon: <Award className="h-16 w-16 text-blue-500 mb-4" />
    }
  ];
  
  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      handleClose();
    }
  };
  
  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex flex-col items-center text-center">
            {slides[currentSlide].icon}
            <DialogTitle className="text-xl">{slides[currentSlide].title}</DialogTitle>
            <DialogDescription className="pt-2">
              {slides[currentSlide].description}
            </DialogDescription>
          </div>
        </DialogHeader>
        
        <div className="flex justify-center mt-4">
          {slides.map((_, index) => (
            <div 
              key={index}
              className={`h-2 w-2 mx-1 rounded-full ${index === currentSlide ? 'bg-blue-500' : 'bg-gray-300'}`}
              onClick={() => setCurrentSlide(index)}
            ></div>
          ))}
        </div>
        
        <DialogFooter className="flex sm:justify-between">
          {currentSlide > 0 ? (
            <Button variant="outline" onClick={prevSlide}>
              Back
            </Button>
          ) : (
            <div /> // Empty div to maintain layout
          )}
          
          <Button onClick={nextSlide}>
            {currentSlide < slides.length - 1 ? 'Next' : 'Get Started'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeOverlay;