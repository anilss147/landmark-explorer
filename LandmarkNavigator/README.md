# Landmark Explorer

Landmark Explorer is a web application that displays Wikipedia landmarks on an interactive map based on the current viewable area. The application fetches landmark data from Wikipedia and provides details about each landmark when selected.

## Features

- Interactive map displaying landmarks from Wikipedia
- Real-time landmark loading based on map navigation
- Search functionality for finding locations
- Detailed view of landmarks including descriptions and images
- Filter and sort landmarks by name and distance
- Responsive design for desktop and mobile devices
- Geocoding support for location search
- In-memory caching for improved performance
- Graceful error handling for API requests

## Technical Architecture

### Frontend

- **Framework**: React with TypeScript
- **Map Visualization**: Leaflet and react-leaflet
- **UI Components**: shadcn/ui and Tailwind CSS
- **State Management**: React Query
- **Routing**: wouter
- **Build Tool**: Vite for fast development and hot module replacement

### Backend

- **Framework**: Node.js with Express
- **Caching**: In-memory caching system
- **API Integration**: Wikipedia API for landmarks
- **Geocoding**: OpenStreetMap Nominatim API
- **Database Schema**: Shared schema using `drizzle-orm`
- **Rate Limiting**: Protects API endpoints from abuse

## Project Structure

```
├── client/              # Frontend React application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── lib/         # Utility functions and configurations
│   │   ├── pages/       # Page components
│   │   └── types/       # TypeScript type definitions
├── server/              # Backend Express application
│   ├── api/             # API integration code
│   │   └── wikipedia.ts # Wikipedia API integration
│   ├── index.ts         # Server entry point
│   ├── routes.ts        # API routes
│   ├── storage.ts       # In-memory storage implementation
│   └── vite.ts          # Vite server configuration
└── shared/              # Shared code between frontend and backend
    └── schema.ts        # Database schema and types
```

## API Endpoints

### Landmarks API
- **`GET /api/landmarks`** - Get landmarks within map bounds
  - **Query Parameters**:
    - `north`: Northern latitude of the map bounds
    - `south`: Southern latitude of the map bounds
    - `east`: Eastern longitude of the map bounds
    - `west`: Western longitude of the map bounds
  - **Response**:
    - List of landmarks with details such as title, coordinates, description, and thumbnail.

### Geocoding API
- **`GET /api/geocode`** - Geocode a location by name
  - **Query Parameter**:
    - `q`: Location name to search
  - **Response**:
    - Latitude, longitude, and display name of the location.

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/LandmarkExplorer.git
   cd LandmarkExplorer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add the following environment variables:
   ```env
   PORT=5000
   DATABASE_URL=your_database_url
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to [http://localhost:5000](http://localhost:5000).

## Development

- **Frontend**: The frontend uses Vite for fast development and hot module replacement.
- **Backend**: The backend implements a caching mechanism to reduce API calls to Wikipedia.
- **Caching**: The application uses an in-memory storage system for caching purposes.
- **Error Handling**: Graceful error handling is implemented for API requests.
- **Rate Limiting**: Protects the API endpoints from abuse by limiting the number of requests per user.

### Scripts

- **`npm run dev`**: Start the development server
- **`npm run build`**: Build the frontend and backend for production
- **`npm run start`**: Start the production server
- **`npm run lint`**: Run ESLint to check for code quality issues
- **`npm run format`**: Format code using Prettier

## External APIs

- **Wikipedia API**: Fetch landmark data
- **OpenStreetMap Nominatim API**: Geocoding for location search

## Deployment

1. Build the project:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm run start
   ```

3. Deploy the application to your preferred hosting platform (e.g., AWS, Heroku, Vercel).

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bug fix:
   ```bash
   git checkout -b feature-name
   ```
3. Commit your changes:
   ```bash
   git commit -m "Add new feature"
   ```
4. Push to your branch:
   ```bash
   git push origin feature-name
   ```
5. Open a pull request.

## License

This project is open source and available under the MIT License.

## Acknowledgments

- [Wikipedia API](https://www.mediawiki.org/wiki/API:Main_page)
- [OpenStreetMap Nominatim API](https://nominatim.org/)
- [Leaflet](https://leafletjs.com/)
- [React Query](https://tanstack.com/query/latest)