import random from 'random';
import { Cell, Diagram, Site, Voronoi } from 'voronoijs';
import { getPixelFromImage, RGBToShade } from './image-util';
import { distance, type Point } from './math-util';

export type WorldCell = Cell & {
    index: number;
    neighbors: WorldCell[];
    attributes: {
        elevation: number;
    };

    // Utility
    utility: {
        used?: boolean;
        cost?: number;
        from?: WorldCell;
    };
};

// Poisson Disk Sampling
export class NavigationGraph {
    private sites: Site[];
    private diagram: Diagram;
    private bounds: { width: number; height: number };
    cells: WorldCell[];

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

        this.cells = this.diagram.cells.map((c) => {
            const w = c as WorldCell;
            w.index = w.site.id;
            w.attributes = { elevation: 0 };
            return w;
        });

        this.cells.forEach((c) => {
            const w = c as WorldCell;
            w.neighbors = c
                .getNeighborIds()
                .map((id) => this.cells[id] as WorldCell);
        });

        this.resetCellsUtility();
        this.applyElevation();
    }

    getWorldCellByPoint(p: Point): WorldCell {
        const cellsByClosest = [...this.cells].sort((a, b) => {
            return distance(p, a.site) - distance(p, b.site);
        });
        const closestCell = cellsByClosest[0];
        return closestCell;
    }

    async applyElevation() {
        const localStorageElevationJSON = localStorage.getItem('map.elevation');
        if (localStorageElevationJSON) {
            try {
                const localStorageElevation = JSON.parse(
                    localStorageElevationJSON,
                );
                this.cells.forEach(
                    (c) =>
                        (c.attributes.elevation =
                            localStorageElevation[c.index]),
                );
            } catch (error) {
                localStorage.removeItem('map.elevation');
                this.applyElevation();
            }
        } else {
            const elevationToStore: any = {};
            const tasks = this.cells.map(async (c) => {
                const elevation = RGBToShade(
                    await getPixelFromImage('elevation.jpg', {
                        x: c.site.x / this.bounds.width,
                        y: c.site.y / this.bounds.height,
                    }),
                );
                c.attributes = { elevation };
                elevationToStore[c.index] = elevation;
            });

            await Promise.all(tasks); // Waits for all cells to be processed

            // Store in localStorage
            localStorage.setItem(
                'map.elevation',
                JSON.stringify(elevationToStore),
            );
        }
    }

    // Calculate the cheapest cost of getting to each tile
    calculateCellCosts(startCell: WorldCell, calculateCost: Function) {
        this.resetCellsUtility();

        startCell.utility.cost = 0;
        const queue = [startCell];

        while (queue.length > 0) {
            const currentCell: WorldCell = queue.shift() as WorldCell;

            for (const neighborCell of currentCell.neighbors) {
                const costToReachNeighbor = calculateCost(
                    currentCell,
                    neighborCell,
                );
                const potentialSumCost =
                    currentCell.utility.cost + costToReachNeighbor;
                if (
                    neighborCell.utility.cost === undefined ||
                    potentialSumCost < neighborCell.utility.cost
                ) {
                    neighborCell.utility.cost = potentialSumCost;
                    neighborCell.utility.from = currentCell;
                    queue.push(neighborCell);
                }
            }
        }
    }

    calculatePath(startCell: WorldCell, endCell: WorldCell): WorldCell[] {
        // Start at the endCell and go backwards until you reach the startCell
        const path: WorldCell[] = [];
        let currentCell = endCell;
        while (currentCell !== startCell) {
            path.push(currentCell);
            if (!currentCell.utility.from) break;
            currentCell = currentCell.utility.from;
        }

        return path.reverse();
    }

    resetCellsUtility() {
        this.cells.forEach((c) => (c.utility = {}));
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
