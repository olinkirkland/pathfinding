export type Point = {
    x: number;
    y: number;
};

export function distance(p1: Point, p2: Point): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

export function comparePoints(p1: Point, p2: Point): boolean {
    return p1.x === p2.x && p1.y === p2.x;
}

export function angleBetween(p1: Point, p2: Point): number {
    const deltaY = p2.y - p1.y;
    const deltaX = p2.x - p1.x;
    const radians = Math.atan2(deltaY, deltaX);
    const degrees = (radians * 180) / Math.PI;
    return degrees;
}
