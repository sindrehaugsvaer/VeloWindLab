# VeloWindLab

A production-quality web application for analyzing cycling routes from GPX files. Built with Next.js 15, React 19, TypeScript, and Visx for data visualization.

## Features

- **GPX File Upload**: Drag-and-drop or file picker support with sample data option
- **Interactive Map**: Route visualization using MapLibre GL with OpenFreeMap tiles
- **Elevation Profile**: Interactive chart with hover synchronization and brush selection for segment analysis
- **Route Statistics**: Distance, elevation gain/loss, time, speed metrics
- **Climb Detection**: Strava-style climb categorization (HC, 1, 2, 3, 4)
- **Segment Analysis**: Select portions of the route with brush tool to analyze specific segments
- **Performance Optimized**: Web Worker processing, Douglas-Peucker simplification for rendering
- **Dark Mode Support**: Adapts to system preferences

## Tech Stack

- **Framework**: Next.js 15 (App Router) + React 19
- **Language**: TypeScript
- **Mapping**: MapLibre GL + react-map-gl + OpenFreeMap
- **Charts**: Visx (composable low-level visualization primitives)
- **GPX Parsing**: @we-gold/gpxjs
- **Geospatial**: @turf/distance for Haversine calculations
- **Simplification**: simplify-ts (Douglas-Peucker algorithm with 3D elevation)
- **Styling**: Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd velowindlab

# Install dependencies
npm install --legacy-peer-deps
```

Note: `--legacy-peer-deps` is required due to Visx packages not yet supporting React 19 peer dependencies.

### Development

```bash
# Start the development server
npm run dev

# Open http://localhost:3000 in your browser
```

### Build for Production

```bash
# Create optimized production build
npm run build

# Start production server
npm start
```

## Project Structure

```
velowindlab/
├── app/
│   ├── page.tsx              # Main application layout
│   ├── layout.tsx            # Root layout with fonts
│   └── globals.css           # Global styles
├── components/
│   ├── GPXUploader.tsx       # File upload component
│   ├── MapView.tsx           # MapLibre GL route visualization
│   ├── ElevationChart.tsx    # Visx elevation chart with brush
│   ├── StatsPanel.tsx        # Route statistics display
│   └── ClimbsList.tsx        # Detected climbs list
├── context/
│   └── GPXContext.tsx        # React Context for state management
├── lib/
│   ├── gpx/
│   │   ├── types.ts          # TypeScript type definitions
│   │   └── parser.ts         # GPX parsing wrapper
│   ├── calculations/
│   │   ├── distance.ts       # Distance, elevation, gradient calculations
│   │   ├── climbs.ts         # Strava-style climb detection
│   │   └── simplify.ts       # Douglas-Peucker simplification
│   └── workers/
│       └── gpx-processor.worker.ts  # Web Worker for processing
└── public/                   # Static assets
```

## How It Works

### Processing Pipeline

1. **File Upload**: User drops/selects GPX file
2. **Web Worker**: File text sent to worker for background processing
3. **Parsing**: `@we-gold/gpxjs` extracts track points with lat/lon/elevation/time
4. **Calculations**:
   - Haversine distance between points (cumulative distance)
   - Rolling gradient (10-point window)
   - Elevation gain/loss with vertical threshold filtering (6m default)
   - Time/speed statistics with stop detection
5. **Climb Detection**: Identify segments ≥3% grade, ≥300m distance
6. **Simplification**: Douglas-Peucker algorithm reduces points for map rendering
7. **Rendering**: Context updates, components re-render with new data

### Key Algorithms

**Elevation Gain/Loss Filtering**:
- Uses vertical threshold (default 6m) to filter GPS noise
- Only counts elevation changes exceeding threshold
- Prevents over-reporting from GPS accuracy issues

**Climb Detection**:
- Minimum 3% average grade
- Minimum 300m distance
- Categories: HC (>1200m gain), 1 (>600m), 2 (>400m), 3 (>200m), 4 (>100m)

**Douglas-Peucker Simplification**:
- 3D algorithm preserving elevation data
- Adaptive tolerance based on point count
- Reduces 50k+ points to <1k for smooth map rendering

**Hover Synchronization**:
- Bisector search to find nearest point
- Shared state via React Context
- Map marker + chart crosshair synchronized

## Configuration

### Smoothing Levels

Configured in `lib/gpx/types.ts`:

```typescript
export const SMOOTHING_CONFIG = {
  off: 0,      // No filtering
  low: 3,      // 3m vertical threshold
  medium: 6,   // 6m vertical threshold (default)
  high: 9,     // 9m vertical threshold
};
```

### Climb Detection

```typescript
export const CALCULATION_CONFIG = {
  CLIMB_MIN_GRADE: 3.0,        // percentage
  CLIMB_MIN_DISTANCE: 300,     // meters
  CLIMB_END_GRADE: 2.0,        // percentage
  GRADE_WINDOW_SIZE: 10,       // points
};
```

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deployment
vercel --prod
```

Or connect your GitHub repository to Vercel for automatic deployments.

### Other Platforms

Build the static export:

```bash
npm run build
```

Deploy the `.next` folder to any Node.js hosting provider, or use `output: 'export'` in `next.config.js` for static hosting.

## Attribution

- **Maps**: [OpenFreeMap](https://openfreemap.org/) (Liberty style)
- **Map Engine**: [MapLibre GL JS](https://maplibre.org/)
- **Visualization**: [Visx](https://airbnb.io/visx/)

## Known Limitations

- No server-side file processing (client-side only)
- Elevation accuracy depends on GPS data quality
- Large files (>50MB) may cause performance issues
- No route editing capabilities

## Future Enhancements

- Server-side processing for large files
- Multiple route comparison
- Export segment statistics to CSV
- Custom climb detection parameters
- Route editing and waypoint management
- Integration with Strava/Garmin APIs

## License

Apache 2.0

## Contributing

Contributions welcome! Please open an issue or pull request.
