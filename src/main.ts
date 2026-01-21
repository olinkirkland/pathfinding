import './styles.css';

import gsap from 'gsap';
import { Application, Assets, Container, Graphics, Sprite } from 'pixi.js';
import { colorBetweenColors } from './color-util';
import { angleBetween, comparePoints, type Point } from './math-util';
import { NavigationGraph, type WorldCell } from './navigation-graph';

const navigationGraph = new NavigationGraph({
    width: 800,
    height: 800,
});

let start: WorldCell | null = null;
let end: WorldCell | null = null;

const container = new Container();
const pathGraphics = new Graphics();
const flowArrows: Sprite[] = [];

const startMarker: Sprite = new Sprite();
const endMarker: Sprite = new Sprite();

(async () => {
    const app = new Application();
    await app.init({ backgroundAlpha: 0, resizeTo: window });
    document.body.appendChild(app.canvas);
    document.addEventListener('click', onClick);

    // Draw the image
    const texture = await Assets.load('image.png');
    const mapImage = Sprite.from(texture);
    mapImage.anchor.set(0);

    mapImage.x = 0;
    mapImage.y = 0;
    mapImage.width = app.screen.width;
    mapImage.height = app.screen.height;

    // app.stage.addChild(mapImage);

    // Render the map
    navigationGraph.cells.forEach((cell) => {
        const { halfedges } = cell;
        const cellPoints: Point[] = [];

        halfedges.forEach((h) => {
            const { va } = h.edge;
            const { vb } = h.edge;
            if (!cellPoints.find((p) => comparePoints(p, va)))
                cellPoints.push(va);
            if (!cellPoints.find((p) => comparePoints(p, vb)))
                cellPoints.push(vb);
        });

        // Sort the cellPoints by angle to site
        cellPoints.sort((p1: Point, p2: Point) => {
            const p1AngleToSite = angleBetween(p1, cell.site);
            const p2AngleToSite = angleBetween(p2, cell.site);
            return p1AngleToSite > p2AngleToSite ? 1 : -1;
        });

        const g = new Graphics();
        g.setStrokeStyle({
            width: 1,
            color: 0x000000,
        }).setFillStyle({
            color: getElevationColor(cell.attributes?.elevation || 0).color,
            alpha: getElevationColor(cell.attributes?.elevation || 0).opacity,
        });

        g.moveTo(cellPoints[0].x, cellPoints[0].y);
        cellPoints.forEach((p) => {
            g.lineTo(p.x, p.y);
        });

        g.closePath();
        g.fill();
        g.stroke();

        container.addChild(g);
    });

    // Site Markers
    const startMarkerTexture = await Assets.load('marker-start.png');
    const endMarkerTexture = await Assets.load('marker-end.png');

    startMarker.texture = startMarkerTexture;
    endMarker.texture = endMarkerTexture;

    [startMarker, endMarker].forEach((marker) => {
        marker.scale = 0.35;
        marker.anchor.set(0.5);
    });

    // Add flow arrows
    const flowContainer = new Container();
    const arrowTexture = await Assets.load('arrow.png');
    navigationGraph.cells.forEach((c) => {
        const arrowSprite = new Sprite();
        arrowSprite.texture = arrowTexture;
        flowContainer.addChild(arrowSprite);
        arrowSprite.position.set(c.site.x, c.site.y);
        arrowSprite.scale = 0.2;
        arrowSprite.anchor.set(0.5);
        flowArrows.push(arrowSprite);
    });

    container.addChild(startMarker);
    container.addChild(endMarker);
    container.addChild(pathGraphics);
    container.addChild(flowContainer);
    app.stage.addChild(container);

    chooseStart(navigationGraph.cells[20]);
    chooseEnd(navigationGraph.cells[25]);
    drawFlow();
    drawPath();
})();

function onClick(mouseEvent: MouseEvent) {
    pathGraphics.removeChildren();

    const { x, y } = mouseEvent;
    const closestCell = navigationGraph.getWorldCellByPoint({ x, y });

    if (!start || end) chooseStart(closestCell);
    else if (start) chooseEnd(closestCell);

    drawFlow();
    drawPath();
}

function chooseStart(cell: WorldCell) {
    end = null; // Clear the end cell
    start = cell;
    startMarker.visible = true;
    endMarker.visible = false;
    // gsap.to(startMarker, { x: start.site.x, y: start.site.y });
    startMarker.position.set(start.site.x, start.site.y);
}

function chooseEnd(cell: WorldCell) {
    end = cell;
    endMarker.visible = true;
    endMarker.position.set(end.site.x, end.site.y);
}

function drawFlow() {
    if (start && end) {
        navigationGraph.calculateCellCosts(start, basicTraversalCost);
    }

    // Orient arrows for each cell towards the from
    navigationGraph.cells.forEach((c) => {
        const arrowSprite = flowArrows[c.index];
        const f = c.utility.from;
        arrowSprite.visible = c.utility.cost! !== 0;
        arrowSprite.alpha = Math.max(0, 1 - (c.utility.cost || 0) / 50);
        if (f) gsap.to(arrowSprite, { angle: angleBetween(c.site, f.site) });
    });
}

function drawPath() {
    const g = pathGraphics;
    g.clear();

    if (!start || !end) return;
    let pathCells: WorldCell[] = [];
    pathCells = navigationGraph.calculatePath(start, end);
    const points = pathCells.map((c) => {
        return { x: c.site.x, y: c.site.y };
    });

    // Draw the path in the path container
    if (!points.length) return;
    g.setStrokeStyle({
        width: 3,
        color: 0x000000,
    });

    if (points.length < 3) return;

    g.moveTo(points[0].x, points[0].y);

    for (var i = 1; i < points.length - 2; i++) {
        var xc = (points[i].x + points[i + 1].x) / 2;
        var yc = (points[i].y + points[i + 1].y) / 2;
        g.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }

    g.quadraticCurveTo(
        points[i].x,
        points[i].y,
        points[i + 1].x,
        points[i + 1].y,
    );

    g.stroke();
}

function getElevationColor(elevation: number): {
    color: number;
    opacity: number;
} {
    if (elevation < 0.1) return { color: 0x000000, opacity: 0 };
    return {
        color: colorBetweenColors(0x00ffff, 0xff0000, elevation),
        opacity: 1,
    };
}

function basicTraversalCost(a: WorldCell, b: WorldCell) {
    return Math.max(
        1,
        1 + (b.attributes.elevation - a.attributes.elevation) * 50,
    );
}
