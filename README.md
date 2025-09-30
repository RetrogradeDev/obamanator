# Obamanator

[https://retrogradedev.github.io/obamanator/](https://retrogradedev.github.io/obamanator/)

Transform any image into Obama using fluid particle dynamics! Watch thousands of particles flow and morph one image into another with realistic fluid simulation physics.

![Obamanator Demo](demo.gif)

## Features

- **Fluid Particle Physics**: Realistic viscosity and spring forces
- **Advanced Pixel Mapping**: Feature-aware algorithm that preserves important details
- **Multiple Input Methods**: Upload your own images or choose from examples
- **Performance Optimized**: Spatial grids, caching, and optimized rendering
- **Responsive Design**: Works on desktop and mobile
- **Real-time Progress**: See computation and simulation progress

## Quick Start

### Prerequisites
- Node.js (v16+) or Bun
- Modern web browser with Canvas support

### Installation

```bash
# Clone the repository
git clone https://github.com/retrogradedev/obamanator.git
cd obamanator

# Install dependencies
bun install
# or
npm install

# Start development server
bun run dev
# or
npm run dev
```

### Building for Production

```bash
# Build the project
bun run build
# or
npm run build

# Preview the build
bun run preview
# or
npm run preview
```

## How to Use

1. **Choose Target Image**: Select or upload the image you want particles to form (Obama portrait included as example)
2. **Choose Source Image**: Select or upload the image that provides the pixels/colors for transformation
3. **Start Simulation**: Click "Start Simulation" to begin the particle transformation
4. **Watch the Magic**: Observe thousands of particles flow from source to target image
5. **Controls**: Use Play/Pause/Reset buttons to control the simulation

## Technical Details

### Particle Physics Engine
- **Spring Forces**: Particles are attracted to their target positions
- **Fluid Viscosity**: Particles influence nearby particles for smooth flow
- **Spatial Optimization**: Grid-based neighbor lookup for performance
- **Adaptive Rendering**: Pre-calculated splat patterns for efficient drawing

### Advanced Pixel Mapping Algorithm
- **Feature Detection**: Edge detection and importance weighting
- **Color Classification**: Smart categorization of skin tones, dark features, etc.
- **Priority Assignment**: Important features (eyes, face) get matched first
- **Spatial Awareness**: Balances color similarity with spatial proximity
- **Caching System**: Hash-based caching for instant repeated transformations

### Performance Optimizations
- **Persistent Grids**: Reused spatial data structures
- **Reduced Calculations**: Viscosity computed every 3rd frame
- **Memory Efficient**: Direct array manipulation instead of Set operations
- **Progressive Rendering**: Chunked computation with progress feedback

## Customization

### Adding New Example Images
1. Add images to the `public/` folder
2. Update the example galleries in `index.html`:
```html
<div class="example-image" data-src="your-image.jpg">
    <img src="your-image.jpg" alt="Description">
    <span>Image Name</span>
</div>
```

### Tweaking Physics Parameters
Modify these values in `main.ts`:
```typescript
const springForce = 0.003;      // How strongly particles are pulled to targets
const viscosity = 0.15;         // Fluid viscosity (higher = more fluid-like)
const damping = 0.9;            // Velocity damping (higher = less damping)
const gridSize = 8;             // Spatial grid resolution
const step = 3;                 // Particle sampling density
```

### Performance Tuning
```typescript
const viscosityCounter = 3;     // Calculate viscosity every N frames
const gridSize = 8;             // Larger = faster but less accurate
const splatPattern;             // Modify rendering pattern size
```

## Algorithm Deep Dive

### Feature-Aware Pixel Mapping
1. **Feature Detection**: Sobel edge detection identifies important regions
2. **Importance Weighting**: Central regions and high-contrast areas prioritized
3. **Color Classification**: Pixels categorized by color characteristics
4. **Priority Assignment**: Dark features → skin tones → background
5. **Optimization**: Spatial indexing and progressive assignment

### Fluid Dynamics Simulation
1. **Spring Forces**: Each particle attracted to target position
2. **Neighbor Detection**: Spatial grid for efficient proximity queries
3. **Viscosity Calculation**: Average velocity of nearby particles
4. **Force Integration**: Verlet integration for stable physics
5. **Boundary Conditions**: Canvas edge collision handling

## Performance Benchmarks

Typical performance on modern hardware:
- **Mapping Generation**: 3-5 seconds (cached: ~0ms)
- **Particle Count**: 20,000-40,000 particles
- **Frame Rate**: 60 FPS (optimized rendering)
- **Memory Usage**: ~50-100MB (depending on image size)

## Technologies Used

- **TypeScript**: Type-safe JavaScript development
- **HTML5 Canvas**: High-performance 2D rendering
- **Vite**: Fast build tool and development server
- **Fluid Dynamics**: Custom physics engine
- **Computer Vision**: Edge detection and feature analysis

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

## Future Ideas

- [ ] **3D Particle System**: WebGL-based 3D transformations
- [ ] **Video Input**: Transform video streams in real-time
- [ ] **Multiple Targets**: Morph between multiple images
- [ ] **Physics Presets**: Different fluid behaviors (water, honey, etc.)
- [ ] **Export Options**: Save transformation as GIF/video
- [ ] **Audio Reactive**: Particles respond to music
- [ ] **Machine Learning**: AI-powered feature detection

---

**Made with ❤️ and lots of particles!**

*Transform any image into Obama... because why not?*