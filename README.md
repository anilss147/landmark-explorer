
### [Landmark Explorer](https://github.com/anilss147/landmark-explorer/tree/main/LandmarkNavigator)

Developed a web application that displays Wikipedia landmarks on an interactive map based on the current viewable area. The application fetches landmark data from Wikipedia and provides details about each landmark when selected.

- **Features:**
  - Interactive map displaying landmarks from Wikipedia
  - Real-time landmark loading based on map navigation
  - Search functionality for finding locations
  - Detailed view of landmarks including descriptions and images
  - Filter and sort landmarks by name and distance
  - Responsive design for desktop and mobile devices
  - Geocoding support for location search
  - In-memory caching for improved performance
  - Graceful error handling for API requests

- **Technical Architecture:**
  - **Frontend:**
    - Framework: React with TypeScript
    - Map Visualization: Leaflet and react-leaflet
    - UI Components: shadcn/ui and Tailwind CSS
    - State Management: React Query
    - Routing: wouter
    - Build Tool: Vite for fast development and hot module replacement

  - **Backend:**
    - Framework: Node.js with Express
    - Caching: In-memory caching system
    - API Integration: Wikipedia API for landmarks
    - Geocoding: OpenStreetMap Nominatim API
