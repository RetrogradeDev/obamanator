// TypeScript-style implementation in JavaScript
class Particle {
	targetX: number;
	targetY: number;
	sourceX: number;
	sourceY: number;
	x: number;
	y: number;
	vx: number;
	vy: number;
	r: number;
	g: number;
	b: number;

	constructor(
		targetX: number,
		targetY: number,
		sourceX: number,
		sourceY: number,
		r: number,
		g: number,
		b: number,
	) {
		this.targetX = targetX;
		this.targetY = targetY;
		this.sourceX = sourceX;
		this.sourceY = sourceY;
		this.x = Math.random() * width;
		this.y = Math.random() * height;
		this.vx = 0;
		this.vy = 0;
		this.r = r;
		this.g = g;
		this.b = b;
	}

	update(grid: Particle[][], gridSize: number, gridW: number, gridH: number) {
		// Spring force towards target
		const dx = this.targetX - this.x;
		const dy = this.targetY - this.y;

		const springForce = 0.003;
		const fx = dx * springForce;
		const fy = dy * springForce;

		// Fluid viscosity - average with nearby particles
		let avgVx = this.vx;
		let avgVy = this.vy;
		let count = 1;

		// Sample nearby particles with optimized bounds
		const gridX = Math.floor(this.x / gridSize);
		const gridY = Math.floor(this.y / gridSize);

		// Pre-calculate grid bounds to avoid repeated Math.max/min calls
		const minGx = Math.max(0, gridX - 1);
		const maxGx = Math.min(gridW, gridX + 1);
		const minGy = Math.max(0, gridY - 1);
		const maxGy = Math.min(gridH, gridY + 1);

		// Use squared distance threshold for performance
		const distanceThreshold = gridSize * gridSize * 4;

		for (let i = minGx; i <= maxGx; i++) {
			for (let j = minGy; j <= maxGy; j++) {
				const idx = j * (gridW + 1) + i;
				const cell = grid[idx];
				if (cell && cell.length > 0) {
					for (let k = 0; k < cell.length; k++) {
						const p = cell[k];
						if (p !== this) {
							const pdx = p.x - this.x;
							const pdy = p.y - this.y;
							const pdist = pdx * pdx + pdy * pdy;
							if (pdist < distanceThreshold) {
								avgVx += p.vx;
								avgVy += p.vy;
								count++;
							}
						}
					}
				}
			}
		}

		avgVx /= count;
		avgVy /= count;

		// Blend velocity with neighbors
		const viscosity = 0.15;
		this.vx = this.vx * (1 - viscosity) + avgVx * viscosity;
		this.vy = this.vy * (1 - viscosity) + avgVy * viscosity;

		// Apply forces
		this.vx += fx;
		this.vy += fy;

		// Damping
		this.vx *= 0.94;
		this.vy *= 0.94;

		// Update position
		this.x += this.vx;
		this.y += this.vy;

		// Keep in bounds
		this.x = Math.max(0, Math.min(width - 1, this.x));
		this.y = Math.max(0, Math.min(height - 1, this.y));
	}
}

// Canvas setup
const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d", { alpha: false })!;
const width = canvas.width;
const height = canvas.height;

// UI elements
const toggleBtn = document.getElementById("toggleBtn")!;
const resetBtn = document.getElementById("resetBtn")!;
const playIcon = document.getElementById("playIcon")!;
const pauseIcon = document.getElementById("pauseIcon")!;
const toggleText = document.getElementById("toggleText")!;
const progressBar = document.getElementById("progressBar")!;
const progressText = document.getElementById("progressText")!;

// State
let isRunning = false;
let animationId: number | null = null;
let particles: Particle[] = [];
const step = 3;
const gridSize = 8;

// Performance optimizations
let persistentGrid: Particle[][] = [];
let gridW: number, gridH: number;
let frameCount = 0;

// Image transformation system
let secondImageData: ImageData | null = null;
let isTransformMode = false;

interface PixelMapping {
	sourceX: number;
	sourceY: number;
	targetX: number;
	targetY: number;
	r: number;
	g: number;
	b: number;
}

// Pre-calculated splat pattern for rendering
const splatPattern = [
	{ dx: -1, dy: -1, weight: 0.293 },
	{ dx: 0, dy: -1, weight: 0.5 },
	{ dx: 1, dy: -1, weight: 0.293 },
	{ dx: -1, dy: 0, weight: 0.5 },
	{ dx: 0, dy: 0, weight: 1.0 },
	{ dx: 1, dy: 0, weight: 0.5 },
	{ dx: -1, dy: 1, weight: 0.293 },
	{ dx: 0, dy: 1, weight: 0.5 },
	{ dx: 1, dy: 1, weight: 0.293 },
];

// Create source image (target image - image 1)
function createSourceImage() {
	const sourceCanvas = document.createElement("canvas");
	sourceCanvas.width = width;
	sourceCanvas.height = height;
	const sourceCtx = sourceCanvas.getContext("2d")!;

	sourceCtx.drawImage(
		document.getElementById("sourceImage") as HTMLImageElement,
		0,
		0,
		width,
		height,
	);

	return sourceCtx.getImageData(0, 0, width, height);
}

// Create second image (source image - image 2)
function createSecondImage(): ImageData | null {
	const secondImg = document.getElementById("secondImage") as HTMLImageElement;
	if (!secondImg || !secondImg.complete) return null;

	const sourceCanvas = document.createElement("canvas");
	sourceCanvas.width = width;
	sourceCanvas.height = height;
	const sourceCtx = sourceCanvas.getContext("2d")!;

	sourceCtx.drawImage(secondImg, 0, 0, width, height);
	return sourceCtx.getImageData(0, 0, width, height);
}

// Calculate color difference (squared distance in RGB space)
function colorDistance(
	r1: number,
	g1: number,
	b1: number,
	r2: number,
	g2: number,
	b2: number,
): number {
	const dr = r1 - r2;
	const dg = g1 - g2;
	const db = b1 - b2;
	return dr * dr + dg * dg + db * db;
}

// Ultra-advanced algorithm: Feature-aware mapping that prioritizes important regions
function createFeatureAwarePixelMapping(
	targetData: ImageData,
	sourceData: ImageData,
): PixelMapping[] {
	const mappings: PixelMapping[] = [];
	console.log(
		"Creating feature-aware pixel mapping with importance weighting...",
	);

	// Collect all pixels with feature importance
	const targetPixels: Array<{
		x: number;
		y: number;
		r: number;
		g: number;
		b: number;
		importance: number;
		lum: number;
	}> = [];
	const sourcePixels: Array<{
		x: number;
		y: number;
		r: number;
		g: number;
		b: number;
		lum: number;
	}> = [];

	// Calculate edge map and importance for target image
	for (let y = 0; y < height; y += step) {
		for (let x = 0; x < width; x += step) {
			const i = (y * width + x) * 4;
			const targetLum =
				0.299 * targetData.data[i] +
				0.587 * targetData.data[i + 1] +
				0.114 * targetData.data[i + 2];
			const sourceLum =
				0.299 * sourceData.data[i] +
				0.587 * sourceData.data[i + 1] +
				0.114 * sourceData.data[i + 2];

			// Calculate importance based on:
			// 1. Edge strength (features like eyes, nose, mouth)
			// 2. Central region bias (face area more important than background)
			// 3. Luminance contrast

			let importance = 0;

			// Edge detection (simplified Sobel)
			if (x > 0 && x < width - step && y > 0 && y < height - step) {
				const getPixelLum = (px: number, py: number) => {
					const idx = (py * width + px) * 4;
					return (
						0.299 * targetData.data[idx] +
						0.587 * targetData.data[idx + 1] +
						0.114 * targetData.data[idx + 2]
					);
				};

				const gx =
					-getPixelLum(x - step, y - step) -
					2 * getPixelLum(x - step, y) -
					getPixelLum(x - step, y + step) +
					getPixelLum(x + step, y - step) +
					2 * getPixelLum(x + step, y) +
					getPixelLum(x + step, y + step);

				const gy =
					-getPixelLum(x - step, y - step) -
					2 * getPixelLum(x, y - step) -
					getPixelLum(x + step, y - step) +
					getPixelLum(x - step, y + step) +
					2 * getPixelLum(x, y + step) +
					getPixelLum(x + step, y + step);

				const edgeStrength = Math.sqrt(gx * gx + gy * gy) / 255;
				importance += edgeStrength * 3; // High weight for edges
			}

			// Central region bias (face is usually in center)
			const centerX = width / 2;
			const centerY = height / 2;
			const distFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
			const maxDist = Math.sqrt(centerX ** 2 + centerY ** 2);
			const centralBias = 1 - distFromCenter / maxDist;
			importance += centralBias * 1.5;

			// Luminance contrast importance (darker pixels in face are often more important)
			const contrastImportance = Math.abs(targetLum - 128) / 128;
			importance += contrastImportance * 0.5;

			targetPixels.push({
				x,
				y,
				r: targetData.data[i],
				g: targetData.data[i + 1],
				b: targetData.data[i + 2],
				lum: targetLum,
				importance: importance,
			});

			sourcePixels.push({
				x,
				y,
				r: sourceData.data[i],
				g: sourceData.data[i + 1],
				b: sourceData.data[i + 2],
				lum: sourceLum,
			});
		}
	}

	console.log(
		`Processing ${targetPixels.length} pixels with feature-aware algorithm...`,
	);

	// Sort target pixels by importance (most important first)
	targetPixels.sort((a, b) => b.importance - a.importance);

	// Create assignment array
	const assignment = new Array(targetPixels.length).fill(-1);
	const used = new Set<number>();

	// Phase 1: Smart color-region aware assignment
	// First, categorize pixels by color regions
	const skinPixels: number[] = [];
	const darkPixels: number[] = [];
	const backgroundPixels: number[] = [];

	for (let t = 0; t < targetPixels.length; t++) {
		const target = targetPixels[t];
		const lum = target.lum;

		// Classify target pixels by expected color regions
		if (lum > 100 && lum < 200) {
			// Likely skin tones (medium brightness)
			const centerX = width / 2;
			const centerY = height / 2;
			const distFromCenter = Math.sqrt(
				(target.x - centerX) ** 2 + (target.y - centerY) ** 2,
			);
			const maxDist = Math.sqrt(centerX ** 2 + centerY ** 2);
			const centralness = 1 - distFromCenter / maxDist;

			if (centralness > 0.3) {
				skinPixels.push(t);
			} else {
				backgroundPixels.push(t);
			}
		} else if (lum < 80) {
			// Dark features (eyes, eyebrows, shadows)
			darkPixels.push(t);
		} else {
			// Other background pixels
			backgroundPixels.push(t);
		}
	}

	// Categorize source pixels by color
	const skinSources: number[] = [];
	const darkSources: number[] = [];
	const blueSources: number[] = [];
	const otherSources: number[] = [];

	for (let s = 0; s < sourcePixels.length; s++) {
		const source = sourcePixels[s];
		const { r, g, b } = source;

		// Classify source pixels by color characteristics
		if (b > r + 20 && b > g + 20) {
			// Strong blue component
			blueSources.push(s);
		} else if (r > 80 && g > 60 && b > 40 && r >= g && g >= b && r - b < 60) {
			// Skin-like colors (warm tones)
			skinSources.push(s);
		} else if (r < 60 && g < 60 && b < 60) {
			// Dark colors
			darkSources.push(s);
		} else {
			otherSources.push(s);
		}
	}

	console.log(
		`Color classification: ${skinPixels.length} skin, ${darkPixels.length} dark, ${backgroundPixels.length} background targets`,
	);
	console.log(
		`Source colors: ${skinSources.length} skin, ${darkSources.length} dark, ${blueSources.length} blue, ${otherSources.length} other`,
	);

	// Phase 1a: Assign dark features to dark sources (highest priority)
	const assignBestColorMatch = (
		targetIndices: number[],
		sourceIndices: number[],
	) => {
		for (const t of targetIndices) {
			if (assignment[t] !== -1) continue;

			const target = targetPixels[t];
			let bestSource = -1;
			let bestColorDist = Infinity;

			for (const s of sourceIndices) {
				if (used.has(s)) continue;

				const source = sourcePixels[s];
				const colorDist = colorDistance(
					target.r,
					target.g,
					target.b,
					source.r,
					source.g,
					source.b,
				);

				if (colorDist < bestColorDist) {
					bestColorDist = colorDist;
					bestSource = s;
				}
			}

			if (bestSource !== -1) {
				assignment[t] = bestSource;
				used.add(bestSource);
			}
		}
	};

	// Assign in priority order to prevent color mismatches
	assignBestColorMatch(darkPixels, darkSources); // Dark features get dark pixels first
	assignBestColorMatch(skinPixels, skinSources); // Skin areas get skin-colored pixels

	// Phase 1b: Assign remaining high-importance pixels
	for (let t = 0; t < targetPixels.length; t++) {
		if (assignment[t] !== -1) continue; // Already assigned

		const target = targetPixels[t];

		// Skip if not high importance
		if (target.importance <= 2.0) continue;

		let bestSource = -1;
		let bestColorDist = Infinity;

		// For remaining important pixels, find best color match from available sources
		for (let s = 0; s < sourcePixels.length; s++) {
			if (used.has(s)) continue;

			const source = sourcePixels[s];
			const colorDist = colorDistance(
				target.r,
				target.g,
				target.b,
				source.r,
				source.g,
				source.b,
			);

			if (colorDist < bestColorDist) {
				bestColorDist = colorDist;
				bestSource = s;
			}
		}

		if (bestSource !== -1) {
			assignment[t] = bestSource;
			used.add(bestSource);
		}
	}

	// Phase 1c: Assign remaining pixels with balanced approach
	for (let t = 0; t < targetPixels.length; t++) {
		if (assignment[t] !== -1) continue; // Already assigned

		const target = targetPixels[t];
		let bestSource = -1;
		let bestCost = Infinity;

		for (let s = 0; s < sourcePixels.length; s++) {
			if (used.has(s)) continue;

			const source = sourcePixels[s];
			const colorDist = colorDistance(
				target.r,
				target.g,
				target.b,
				source.r,
				source.g,
				source.b,
			);
			const spatialDist = Math.sqrt(
				(target.x - source.x) ** 2 + (target.y - source.y) ** 2,
			);

			const normalizedColorDist = Math.sqrt(colorDist) / 441.67;
			const normalizedSpatialDist =
				spatialDist / Math.sqrt(width * width + height * height);

			const combinedCost =
				normalizedColorDist * 0.7 + normalizedSpatialDist * 0.3;

			if (combinedCost < bestCost) {
				bestCost = combinedCost;
				bestSource = s;
			}
		}

		if (bestSource !== -1) {
			assignment[t] = bestSource;
			used.add(bestSource);
		}
	}

	// Phase 2: Assign any remaining unassigned pixels
	for (let t = 0; t < targetPixels.length; t++) {
		if (assignment[t] === -1) {
			for (let s = 0; s < sourcePixels.length; s++) {
				if (!used.has(s)) {
					assignment[t] = s;
					used.add(s);
					break;
				}
			}
		}
	}

	// Create final mappings
	for (let t = 0; t < targetPixels.length; t++) {
		const target = targetPixels[t];
		const source = sourcePixels[assignment[t]];

		mappings.push({
			sourceX: source.x,
			sourceY: source.y,
			targetX: target.x,
			targetY: target.y,
			r: source.r,
			g: source.g,
			b: source.b,
		});
	}

	console.log(`Created ${mappings.length} feature-aware pixel mappings.`);
	return mappings;
}

// Initialize particles (supports both single image and transformation modes)
function initParticles() {
	particles = [];

	if (isTransformMode && secondImageData) {
		// Transformation mode: use pixel mapping from image 2 to image 1
		const targetData = createSourceImage();

		// Choose mapping algorithm based on quality preference
		let mappings: PixelMapping[] = createFeatureAwarePixelMapping(
			targetData,
			secondImageData,
		);

		for (let i = 0; i < mappings.length; i++) {
			const mapping = mappings[i];
			const particle = new Particle(
				mapping.targetX, // Target position (image 1)
				mapping.targetY,
				mapping.sourceX, // Source position (image 2)
				mapping.sourceY,
				mapping.r, // Source colors (image 2)
				mapping.g,
				mapping.b,
			);
			// Start particles at source positions (image 2)
			particle.x = mapping.sourceX;
			particle.y = mapping.sourceY;
			particles.push(particle);
		}
	} else {
		// Standard mode: reconstruct single image
		const sourceData = createSourceImage();

		for (let y = 0; y < height; y += step) {
			for (let x = 0; x < width; x += step) {
				const i = (y * width + x) * 4;
				particles.push(
					new Particle(
						x,
						y,
						0,
						0,
						sourceData.data[i],
						sourceData.data[i + 1],
						sourceData.data[i + 2],
					),
				);
			}
		}
	}
}

// Initialize persistent grid for efficient neighbor lookup
function initGrid() {
	gridW = Math.floor(width / gridSize) + 1;
	gridH = Math.floor(height / gridSize) + 1;
	persistentGrid = new Array((gridW + 1) * (gridH + 1));
	for (let i = 0; i < persistentGrid.length; i++) {
		persistentGrid[i] = [];
	}
}

// Update spatial grid (reuses existing arrays)
function updateGrid() {
	// Clear existing assignments (fast array clear)
	for (let i = 0; i < persistentGrid.length; i++) {
		persistentGrid[i].length = 0;
	}

	// Reassign particles to grid cells
	for (let i = 0; i < particles.length; i++) {
		const p = particles[i];
		const gx = Math.floor(p.x / gridSize);
		const gy = Math.floor(p.y / gridSize);
		const idx = gy * (gridW + 1) + gx;
		persistentGrid[idx].push(p);
	}
}

// Render particles with optimized splatting
function render() {
	ctx.fillStyle = "#000";
	ctx.fillRect(0, 0, width, height);

	const imageData = ctx.createImageData(width, height);
	const data = imageData.data;

	// Render with pre-calculated splat pattern
	for (let i = 0; i < particles.length; i++) {
		const p = particles[i];
		const px = Math.floor(p.x);
		const py = Math.floor(p.y);

		// Use pre-calculated splat pattern instead of calculating distances
		for (let j = 0; j < splatPattern.length; j++) {
			const splat = splatPattern[j];
			const nx = px + splat.dx;
			const ny = py + splat.dy;

			if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
				const idx = (ny * width + nx) * 4;
				const weight = splat.weight;

				data[idx] = Math.min(255, data[idx] + p.r * weight);
				data[idx + 1] = Math.min(255, data[idx + 1] + p.g * weight);
				data[idx + 2] = Math.min(255, data[idx + 2] + p.b * weight);
				data[idx + 3] = 255;
			}
		}
	}

	ctx.putImageData(imageData, 0, 0);
}

// Optimized progress update (called less frequently)
function updateProgress() {
	let totalDistSq = 0;
	for (let i = 0; i < particles.length; i++) {
		const p = particles[i];
		const dx = p.targetX - p.x;
		const dy = p.targetY - p.y;
		totalDistSq += dx * dx + dy * dy; // Use squared distance
	}

	const avgDistSq = totalDistSq / particles.length;
	const maxDistSq = width * width + height * height;
	const progress = Math.max(
		0,
		Math.min(100, 100 - (Math.sqrt(avgDistSq) / Math.sqrt(maxDistSq)) * 200),
	);

	progressBar.style.width = progress + "%";
	progressText.textContent = progress.toFixed(1) + "%";
}

// Toggle between single image and transformation modes
function toggleTransformMode() {
	secondImageData = createSecondImage();

	if (secondImageData) {
		isTransformMode = !isTransformMode;

		// Stop current animation
		isRunning = false;
		if (animationId) {
			cancelAnimationFrame(animationId);
		}

		// Reinitialize particles with new mode
		initParticles();
		initGrid();
		frameCount = 0;

		// Update UI
		const toggleTransformBtn = document.getElementById("toggleTransformBtn");
		const qualityToggleBtn = document.getElementById("qualityToggleBtn");

		if (toggleTransformBtn) {
			const span = toggleTransformBtn.querySelector("span");
			if (span) {
				span.textContent = isTransformMode
					? "Single Image Mode"
					: "Transform Mode";
			}
		}

		// Show/hide quality toggle based on transform mode
		if (qualityToggleBtn) {
			qualityToggleBtn.style.display = isTransformMode ? "flex" : "none";
		}

		// Reset UI state
		const playIcon = document.getElementById("playIcon")!;
		const pauseIcon = document.getElementById("pauseIcon")!;
		const toggleText = document.getElementById("toggleText")!;

		playIcon.style.display = "block";
		pauseIcon.style.display = "none";
		toggleText.textContent = "Start";

		progressBar.style.width = "0%";
		progressText.textContent = "0.0%";
		render();
	} else {
		alert(
			"Please add a second image with id 'secondImage' to enable transformation mode!",
		);
	}
}

// Optimized animation loop
function animate() {
	// Use optimized grid update instead of rebuilding
	updateGrid();

	// Update particles with optimized parameters
	for (let i = 0; i < particles.length; i++) {
		particles[i].update(persistentGrid, gridSize, gridW, gridH);
	}

	render();

	// Update progress only every 10 frames for better performance
	if (frameCount % 10 === 0) {
		updateProgress();
	}
	frameCount++;

	if (isRunning) {
		animationId = requestAnimationFrame(animate);
	}
}

// Event handlers
toggleBtn.addEventListener("click", () => {
	isRunning = !isRunning;

	if (isRunning) {
		playIcon.style.display = "none";
		pauseIcon.style.display = "block";
		toggleText.textContent = "Pause";
		animate();
	} else {
		playIcon.style.display = "block";
		pauseIcon.style.display = "none";
		toggleText.textContent = "Start";
		if (animationId) {
			cancelAnimationFrame(animationId);
		}
	}
});

resetBtn.addEventListener("click", () => {
	isRunning = false;
	playIcon.style.display = "block";
	pauseIcon.style.display = "none";
	toggleText.textContent = "Start";

	if (animationId) {
		cancelAnimationFrame(animationId);
	}

	// Reset particles
	for (let i = 0; i < particles.length; i++) {
		if (isTransformMode) {
			const p = particles[i];
			// Reset to source positions (image 2)
			p.x = p.sourceX;
			p.y = p.sourceY;

			p.vx = 0;
			p.vy = 0;
		} else {
			const p = particles[i];
			p.x = Math.random() * width;
			p.y = Math.random() * height;
			p.vx = 0;
			p.vy = 0;
		}
	}

	// Reset frame counter
	frameCount = 0;

	progressBar.style.width = "0%";
	progressText.textContent = "0.0%";
	render();
});

// Transform mode toggle handler
const toggleTransformBtn = document.getElementById("toggleTransformBtn");
if (toggleTransformBtn) {
	toggleTransformBtn.addEventListener("click", toggleTransformMode);
}

// Initialize
initParticles();
initGrid(); // Initialize the persistent grid system
render();
