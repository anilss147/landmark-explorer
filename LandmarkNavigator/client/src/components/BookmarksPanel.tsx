import { useState } from 'react';
import { Landmark } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bookmark, Search, X, MapPin } from 'lucide-react';
import { formatDistance } from '@/lib/distance';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

type BookmarksPanelProps = {
  bookmarks: Landmark[];
  onSelectLandmark: (landmark: Landmark) => void;
  onRemoveBookmark: (landmarkId: number) => void;
};

const BookmarksPanel = ({ bookmarks, onSelectLandmark, onRemoveBookmark }: BookmarksPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBookmarks = bookmarks.filter(
    bookmark => bookmark.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRemoveBookmark = (e: React.MouseEvent, landmarkId: number) => {
    e.stopPropagation();
    onRemoveBookmark(landmarkId);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="fixed bottom-4 right-4 z-10 rounded-full w-12 h-12 shadow-lg bg-white"
        >
          <Bookmark className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="text-left flex items-center gap-2">
            <Bookmark className="h-5 w-5" />
            Saved Places ({filteredBookmarks.length})
          </SheetTitle>
          <div className="relative mt-2">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search your bookmarks..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1 h-7 w-7"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto p-2">
          {filteredBookmarks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4 text-muted-foreground">
              {bookmarks.length === 0 ? (
                <>
                  <Bookmark className="h-12 w-12 mb-2 opacity-20" />
                  <h3 className="font-medium mb-1">No saved places yet</h3>
                  <p className="text-sm">
                    Bookmark interesting landmarks to find them easily later.
                  </p>
                </>
              ) : (
                <>
                  <Search className="h-12 w-12 mb-2 opacity-20" />
                  <h3 className="font-medium mb-1">No matching bookmarks</h3>
                  <p className="text-sm">
                    Try a different search term.
                  </p>
                </>
              )}
            </div>
          ) : (
            <ul className="space-y-2">
              {filteredBookmarks.map((bookmark) => (
                <li 
                  key={bookmark.pageid}
                  className="rounded-md border p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => {
                    onSelectLandmark(bookmark);
                    setIsOpen(false);
                  }}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium text-sm line-clamp-1">{bookmark.title}</h3>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 -mr-1 -mt-1 text-gray-500 hover:text-red-500"
                      onClick={(e) => handleRemoveBookmark(e, bookmark.pageid)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {bookmark.distance !== undefined && (
                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                      <MapPin className="h-3 w-3 mr-1" />
                      {formatDistance(bookmark.distance)} away
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default BookmarksPanel;