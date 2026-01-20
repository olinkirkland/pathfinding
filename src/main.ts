import './styles.css';

import { Application, Assets, Container, Graphics, Sprite } from 'pixi.js';
import { colorBetweenColors } from './color-util';
import { angleBetween, comparePoints, type Point } from './math-util';
import { NavigationGraph, type WorldSite } from './navigation-graph';

const navigationGraph = new NavigationGraph({
    width: 800,
    height: 800,
});

let startSite: WorldSite | null = null;
let endSite: WorldSite | null = null;

const container = new Container();

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
        const site = cell.site as WorldSite;

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
            const p1AngleToSite = angleBetween(p1, site);
            const p2AngleToSite = angleBetween(p2, site);
            return p1AngleToSite > p2AngleToSite ? 1 : -1;
        });

        const g = new Graphics();
        g.setStrokeStyle({
            width: 1,
            color: 0x000000,
        }).setFillStyle({
            color: getElevationColor(site.attributes?.elevation || 0).color,
            alpha: getElevationColor(site.attributes?.elevation || 0).opacity,
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
    const blueMarkerTexture = await Assets.load('marker-blue.png');
    const redMarkerTexture = await Assets.load('marker-red.png');

    startSiteMarker.texture = redMarkerTexture;
    endSiteMarker.texture = blueMarkerTexture;

    [startSiteMarker, endSiteMarker].forEach((marker) => {
        marker.scale = 0.5;
        marker.anchor.set(0.5);
    });

    container.addChild(startSiteMarker);
    container.addChild(endSiteMarker);

    app.stage.addChild(container);
})();

function onClick(mouseEvent: MouseEvent) {
    const { x, y } = mouseEvent;
    const closestSite = navigationGraph.getSiteByPoint({ x, y });
    // Reset
    if (!startSite || endSite) {
        startSite = closestSite;
        endSite = null;
    }

    // Set destination
    if (startSite) endSite = closestSite;

    startSiteMarker.visible = !!startSite;
    if (startSite) startSiteMarker.position.set(startSite.x, startSite.y);

    endSiteMarker.visible = !!endSite;
    if (endSite) endSiteMarker.position.set(endSite.x, endSite.y);
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
