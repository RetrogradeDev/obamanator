// TypeScript-style implementation in JavaScript
class Particle {
	targetX: number;
	targetY: number;
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
		r: number,
		g: number,
		b: number,
	) {
		this.targetX = targetX;
		this.targetY = targetY;
		this.x = Math.random() * width;
		this.y = Math.random() * height;
		this.vx = 0;
		this.vy = 0;
		this.r = r;
		this.g = g;
		this.b = b;
	}

	update(grid: Particle[][], gridSize: number) {
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

		// Sample nearby particles
		const gridX = Math.floor(this.x / gridSize);
		const gridY = Math.floor(this.y / gridSize);

		const gridW = Math.floor(width / gridSize) + 1;
		const gridH = Math.floor(height / gridSize) + 1;

		for (let i = Math.max(0, gridX - 1); i <= Math.min(gridW, gridX + 1); i++) {
			for (
				let j = Math.max(0, gridY - 1);
				j <= Math.min(gridH, gridY + 1);
				j++
			) {
				const idx = j * (gridW + 1) + i;
				const cell = grid[idx];
				if (cell) {
					for (let k = 0; k < cell.length; k++) {
						const p = cell[k];
						if (p !== this) {
							const pdx = p.x - this.x;
							const pdy = p.y - this.y;
							const pdist = pdx * pdx + pdy * pdy;
							if (pdist < gridSize * gridSize * 4) {
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

// Create source image
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

// Initialize particles
function initParticles() {
	particles = [];
	const sourceData = createSourceImage();

	for (let y = 0; y < height; y += step) {
		for (let x = 0; x < width; x += step) {
			const i = (y * width + x) * 4;
			particles.push(
				new Particle(
					x,
					y,
					sourceData.data[i],
					sourceData.data[i + 1],
					sourceData.data[i + 2],
				),
			);
		}
	}
}

// Build spatial grid for efficient neighbor lookup
function buildGrid() {
	const gridW = Math.floor(width / gridSize) + 1;
	const gridH = Math.floor(height / gridSize) + 1;
	const grid = new Array((gridW + 1) * (gridH + 1));

	for (let i = 0; i < particles.length; i++) {
		const p = particles[i];
		const gx = Math.floor(p.x / gridSize);
		const gy = Math.floor(p.y / gridSize);
		const idx = gy * (gridW + 1) + gx;

		if (!grid[idx]) grid[idx] = [];
		grid[idx].push(p);
	}

	return grid;
}

// Render particles
function render() {
	ctx.fillStyle = "#000";
	ctx.fillRect(0, 0, width, height);

	const imageData = ctx.createImageData(width, height);
	const data = imageData.data;

	// Render with soft splatting
	for (let i = 0; i < particles.length; i++) {
		const p = particles[i];
		const px = Math.floor(p.x);
		const py = Math.floor(p.y);

		for (let dy = -1; dy <= 1; dy++) {
			for (let dx = -1; dx <= 1; dx++) {
				const nx = px + dx;
				const ny = py + dy;

				if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
					const idx = (ny * width + nx) * 4;
					const dist = Math.sqrt(dx * dx + dy * dy);
					const weight = Math.max(0, 1 - dist / 2);

					data[idx] = Math.min(255, data[idx] + p.r * weight);
					data[idx + 1] = Math.min(255, data[idx + 1] + p.g * weight);
					data[idx + 2] = Math.min(255, data[idx + 2] + p.b * weight);
					data[idx + 3] = 255;
				}
			}
		}
	}

	ctx.putImageData(imageData, 0, 0);
}

// Animation loop
function animate() {
	const grid = buildGrid();

	// Update particles
	for (let i = 0; i < particles.length; i++) {
		particles[i].update(grid, gridSize);
	}

	render();

	// Update progress
	let totalDist = 0;
	for (let i = 0; i < particles.length; i++) {
		const p = particles[i];
		const dx = p.targetX - p.x;
		const dy = p.targetY - p.y;
		totalDist += Math.sqrt(dx * dx + dy * dy);
	}

	const avgDist = totalDist / particles.length;
	const maxDist = Math.sqrt(width * width + height * height);
	const progress = Math.max(0, Math.min(100, 100 - (avgDist / maxDist) * 200));

	progressBar.style.width = progress + "%";
	progressText.textContent = progress.toFixed(1) + "%";

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
		const p = particles[i];
		p.x = Math.random() * width;
		p.y = Math.random() * height;
		p.vx = 0;
		p.vy = 0;
	}

	progressBar.style.width = "0%";
	progressText.textContent = "0.0%";
	render();
});

// Initialize
initParticles();
render();
