import random from 'random';
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
            15,
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

    getSiteByPoint(p: Point): WorldSite {
        const sitesByClosest = [...this.sites].sort((a, b) => {
            return distance(p, a) - distance(p, b);
        });
        const closestSite = sitesByClosest[0];
        return closestSite;
    }

    async applyElevation() {
        const localStorageElevationJSON = localStorage.getItem('map.elevation');
        if (localStorageElevationJSON) {
            try {
                const localStorageElevation = JSON.parse(
                    localStorageElevationJSON,
                );
                this.diagram.cells.forEach(
                    (c) =>
                        ((c.site as WorldSite).attributes = {
                            elevation: localStorageElevation[c.site.id],
                        }),
                );
            } catch (error) {
                localStorage.removeItem('map.elevation');
                this.applyElevation();
            }
        } else {
            const elevationToStore: any = {};
            const tasks = this.diagram.cells.map(async (c) => {
                const elevation = RGBToShade(
                    await getPixelFromImage('elevation.jpg', {
                        x: c.site.x / this.bounds.width,
                        y: c.site.y / this.bounds.height,
                    }),
                );
                (c.site as WorldSite).attributes = { elevation };
                elevationToStore[c.site.id] = elevation;
            });

            await Promise.all(tasks); // Waits for all cells to be processed

            // Store in localStorage
            localStorage.setItem(
                'map.elevation',
                JSON.stringify(elevationToStore),
            );
        }
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
    seed: string = 'random',
): Point[] {
    const { width, height } = bounds;
    const points: Point[] = [];
    const rng = random.clone(seed);

    const firstPoint: Point = {
        x: width / 2,
        y: height / 2,
    };

    const queue: Point[] = [firstPoint];

    while (queue.length > 0) {
        const pointToSampleFrom = queue.shift()!;

        // Sample points around this point
        for (let i = 0; i < tries; i++) {
            const degrees = rng.int(0, 360);
            const radians = degrees * (Math.PI / 180);
            const radius = rng.int(size, size * 2);
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
