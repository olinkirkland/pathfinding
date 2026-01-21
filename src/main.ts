import './styles.css';

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

// Load assets
const arrowTexture = await Assets.load('arrow.png');

const startSiteMarker: Sprite = new Sprite();
const endSiteMarker: Sprite = new Sprite();

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

    startSiteMarker.texture = startMarkerTexture;
    endSiteMarker.texture = endMarkerTexture;

    [startSiteMarker, endSiteMarker].forEach((marker) => {
        marker.scale = 0.35;
        marker.anchor.set(0.5);
    });

    container.addChild(startSiteMarker);
    container.addChild(endSiteMarker);
    container.addChild(pathGraphics);

    app.stage.addChild(container);
})();

function onClick(mouseEvent: MouseEvent) {
    pathGraphics.removeChildren();

    const { x, y } = mouseEvent;
    const closestSite = navigationGraph.getWorldCellByPoint({ x, y });

    console.log('startSite?', start, 'endSite?', end);

    // Reset
    if (!start || end) {
        start = closestSite;
        end = null;
    } else if (start) end = closestSite;

    startSiteMarker.visible = !!start;
    if (start) startSiteMarker.position.set(start.site.x, start.site.y);

    endSiteMarker.visible = !!end;
    if (end) endSiteMarker.position.set(end.site.x, end.site.y);

    let pathCells: WorldCell[] = [];
    if (start && end) {
        navigationGraph.calculateCellCosts(start, basicTraversalCost);
        // pathCells = navigationGraph.calculatePath(start, end);
    }

    // Draw arrows for each from
    navigationGraph.cells.forEach((c) => {
        const f = c.utility.from;
        const g = pathGraphics;
        const arrowSprite = new Sprite();
        arrowSprite.texture = arrowTexture;
        g.addChild(arrowSprite);
        arrowSprite.position.set(c.site.x, c.site.y);
        arrowSprite.scale = 0.2;
        arrowSprite.anchor.set(0.5);

        if (f?.site) arrowSprite.angle = angleBetween(c.site, f.site);
    });

    // Draw the path in the path container
    if (pathCells.length > 0) {
        const g = pathGraphics;
        g.setStrokeStyle({
            width: 3,
            color: 0x000000,
        });
        pathCells.forEach((c, index) => {
            if (index === 0) g.moveTo(c.site.x, c.site.y);
            else g.lineTo(c.site.x, c.site.y);
        });
        g.stroke();
    }
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
    return Math.max(1, 1 + b.attributes.elevation - a.attributes.elevation);
}
