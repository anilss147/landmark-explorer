import { X, Calendar, Ruler, User, ExternalLink, Navigation, Bookmark, BookmarkCheck, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Landmark } from '@/types';

type DetailViewProps = {
  landmark: Landmark;
  onClose: () => void;
  onToggleBookmark?: (landmark: Landmark) => void;
  isBookmarked?: boolean;
};

const DetailView = ({ landmark, onClose, onToggleBookmark, isBookmarked = false }: DetailViewProps) => {
  const handleBookmarkClick = () => {
    if (onToggleBookmark) {
      onToggleBookmark(landmark);
    }
  };
  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="p-0 max-w-md w-full rounded-lg overflow-hidden max-h-[90vh] flex flex-col">
        {/* Detail Header */}
        <div className="relative h-48">
          <img 
            src={landmark.thumbnail || "https://via.placeholder.com/800x400?text=No+Image+Available"}
            alt={landmark.title} 
            className="w-full h-full object-cover"
          />
          <Button 
            variant="secondary" 
            size="icon" 
            className="absolute top-2 right-2 bg-white bg-opacity-80 rounded-full p-1 shadow hover:bg-opacity-100"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent text-white">
            <h2 className="text-xl font-bold">{landmark.title}</h2>
          </div>
        </div>
        
        {/* Detail Content */}
        <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
          {landmark.address && (
            <div className="flex items-center text-gray-600 text-sm mb-3">
              <span className="material-icons text-sm mr-1">place</span>
              <span>{landmark.address}</span>
            </div>
          )}

          <h3 className="font-medium text-gray-900 mb-2">Description</h3>
          <p className="text-gray-700 text-sm mb-4">
            {landmark.description || "No detailed description available for this landmark."}
          </p>
          
          {landmark.facts && landmark.facts.length > 0 && (
            <div className="mb-4">
              <h3 className="font-medium text-gray-900 mb-2">Quick Facts</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                {landmark.facts.map((fact, index) => (
                  <li key={index} className="flex items-start">
                    {fact.type === 'date' && <Calendar className="text-blue-500 mr-2 h-4 w-4" />}
                    {fact.type === 'measurement' && <Ruler className="text-blue-500 mr-2 h-4 w-4" />}
                    {fact.type === 'person' && <User className="text-blue-500 mr-2 h-4 w-4" />}
                    <span><span className="font-medium">{fact.label}: </span>{fact.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Learn More</h3>
            <a 
              href={`https://en.wikipedia.org/wiki/${encodeURIComponent(landmark.title)}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm flex items-center"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              View on Wikipedia
            </a>
          </div>
        </div>
        
        {/* Detail Actions */}
        <div className="p-3 border-t border-gray-200 flex justify-between">
          <Button variant="outline" size="sm" className="flex items-center">
            <Navigation className="h-4 w-4 mr-1" />
            Directions
          </Button>
          <Button 
            variant={isBookmarked ? "default" : "outline"} 
            size="sm" 
            className={`flex items-center ${isBookmarked ? "bg-blue-500 text-white hover:bg-blue-600" : ""}`}
            onClick={handleBookmarkClick}
          >
            {isBookmarked ? 
              <BookmarkCheck className="h-4 w-4 mr-1" /> : 
              <Bookmark className="h-4 w-4 mr-1" />
            }
            {isBookmarked ? "Saved" : "Save"}
          </Button>
          <Button variant="outline" size="sm" className="flex items-center">
            <Share className="h-4 w-4 mr-1" />
            Share
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DetailView;
