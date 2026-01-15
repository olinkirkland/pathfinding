import { Diagram, Site, Voronoi } from 'voronoijs';
import { getPixelFromImage, RGBToShade } from './image-util';
import { distance, type Point } from './math-util';

export type WorldSite = Site & {
    attributes?: {
        elevation: number;
    };
};

// Poisson Disk Sampling
export class NavigationGraph {
    private sites: WorldSite[];
    private diagram: Diagram;
    private bounds: { width: number; height: number };

    constructor(bounds: { width: number; height: number }) {
        this.bounds = bounds;
        const voronoi = new Voronoi();
        const points: Point[] = samplePoints(
            { width: bounds.width, height: bounds.height },
            20,
            10,
        );

        this.sites = points.map((p, index) => {
            return { ...p, id: index };
        });

        this.diagram = voronoi.compute(this.sites, {
            xl: 0,
            yt: 0,
            xr: bounds.width,
            yb: bounds.height,
        });

        this.applyElevation();
    }

    applyElevation() {
        // Get the image

        this.diagram.cells.forEach(
            async (c) =>
                ((c.site as WorldSite).attributes = {
                    elevation: RGBToShade(
                        await getPixelFromImage('elevation.jpg', {
                            x: c.site.x / this.bounds.width,
                            y: c.site.y / this.bounds.height,
                        }),
                    ),
                }),
        );
    }

    get cells() {
        return this.diagram.cells;
    }
}

// Fill a bounding-box with points, no closer than a given distance
export function samplePoints(
    bounds: { width: number; height: number },
    size: number,
    tries: number,
): Point[] {
    const { width, height } = bounds;
    const points: Point[] = [];

    const firstPoint: Point = {
        x: width / 2,
        y: height / 2,
    };

    const queue: Point[] = [firstPoint];

    while (queue.length > 0) {
        const pointToSampleFrom = queue.shift()!;

        // Sample points around this point
        for (let i = 0; i < tries; i++) {
            const degrees = Math.random() * 360;
            const radians = degrees * (Math.PI / 180);
            const radius = size + Math.random() * (size * 2);
            const offsetX = radius * Math.cos(radians);
            const offsetY = radius * Math.sin(radians);
            const q = {
                x: pointToSampleFrom.x + offsetX,
                y: pointToSampleFrom.y + offsetY,
            };

            const inBounds = q.x > 0 && q.y > 0 && q.x < width && q.y < height;
            if (!inBounds) continue;
            if (points.some((p) => distance(p, q) < size)) continue;

            addPoint(q);
        }
    }

    return points;

    function addPoint(pointToAdd: Point) {
        const roundedPoint = {
            x: Math.round(pointToAdd.x),
            y: Math.round(pointToAdd.y),
        };
        queue.push(roundedPoint);
        points.push(roundedPoint);
    }
}
