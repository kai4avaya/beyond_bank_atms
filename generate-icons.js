const fs = require('fs');
const { createCanvas } = require('canvas');

const sizes = [16, 32, 72, 96, 128, 144, 152, 167, 180, 192, 384, 512];

// Create icons directory if it doesn't exist
if (!fs.existsSync('./icons')) {
    fs.mkdirSync('./icons');
}

// Function to generate icon
function generateIcon(size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#06217F';
    ctx.fillRect(0, 0, size, size);

    // Logo-like design
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(size * 0.2, size * 0.2);
    ctx.lineTo(size * 0.8, size * 0.2);
    ctx.lineTo(size * 0.9, size * 0.35);
    ctx.lineTo(size * 0.3, size * 0.35);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(size * 0.2, size * 0.8);
    ctx.lineTo(size * 0.8, size * 0.8);
    ctx.lineTo(size * 0.9, size * 0.65);
    ctx.lineTo(size * 0.3, size * 0.65);
    ctx.closePath();
    ctx.fill();

    // Save the icon
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(`./icons/icon-${size}x${size}.png`, buffer);
}

// Generate all icon sizes
sizes.forEach(size => {
    generateIcon(size);
    console.log(`Generated icon-${size}x${size}.png`);
});
