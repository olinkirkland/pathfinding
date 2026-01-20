import type { Point } from './math-util';

const imageDataStorage: {
    [key: string]: ImageData;
} = {};

async function loadImage(path: string) {
    const img = new Image();
    img.src = path;

    await new Promise((resolve) => {
        img.onload = resolve;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);

    // Get pixel data for the whole image
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    imageDataStorage[path] = imageData;
}

export async function getPixelFromImage(path: string, p: Point) {
    if (!imageDataStorage[path]) {
        // Await the loading of the image data if it's not present
        await loadImage(path);
    }

    // Get the specific ImageData object for the given path
    const imageData: ImageData = imageDataStorage[path];

    // The pixel data is stored in the .data property, which is an Uint8ClampedArray
    const pixelDataArray: Uint8ClampedArray = imageData.data;

    p.x = Math.floor(p.x * imageData.width);
    p.y = Math.floor(p.y * imageData.height);

    // Calculate the starting index for the point (p.x, p.y)
    // Each pixel occupies 4 array elements (R, G, B, A)
    const index = (p.y * imageData.width + p.x) * 4;

    // Check if the calculated index is within the bounds of the array
    if (index < 0 || index + 3 >= pixelDataArray.length) {
        // throw new Error('Point is outside image boundaries');    
    }

    // Extract RGBA values from the Uint8ClampedArray
    const r = pixelDataArray[index];
    const g = pixelDataArray[index + 1];
    const b = pixelDataArray[index + 2];
    const a = pixelDataArray[index + 3];

    return { r, g, b, a };
}

export function RGBToShade(rgb: { r: number; g: number; b: number }) {
    const { r, g, b } = rgb;

    // Standard luminance weights for human perception
    const R_WEIGHT = 0.2989;
    const G_WEIGHT = 0.587;
    const B_WEIGHT = 0.114;

    // Calculate luminance (weighted sum of R, G, B)
    const luminance = r * R_WEIGHT + g * G_WEIGHT + b * B_WEIGHT;

    // Normalize to a 0-1 range (since input is 0-255 and luminance will be too)
    return luminance / 255;
}
