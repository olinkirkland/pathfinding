import './styles.css';

import { Application, Container, Graphics } from 'pixi.js';
import { colorBetweenColors } from './color-util';
import { angleBetween, comparePoints, type Point } from './math-util';
import { NavigationGraph, type WorldSite } from './navigation-graph';

const navigationGraph = new NavigationGraph({
    width: window.innerWidth,
    height: window.innerHeight,
});

(async () => {
    const app = new Application();
    await app.init({ backgroundAlpha: 0, resizeTo: window });
    document.body.appendChild(app.canvas);

    // Render the map
    const container = new Container();
    navigationGraph.cells.forEach((cell) => {
        const site = cell.site as WorldSite;
        const g = new Graphics();
        g.setFillStyle({
            color: 0xff0000,
            alpha: site.attributes?.elevation,
        })
            .circle(site.x, site.y, 3)
            .fill();

        // halfedges.forEach((h) => {
        //     g.setStrokeStyle({
        //         width: 1,
        //         color: 0x000000,
        //     })
        //         .moveTo(h.edge.va.x, h.edge.va.y)
        //         .lineTo(h.edge.vb.x, h.edge.vb.y)
        //         .stroke();
        // });

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

        g.setStrokeStyle({
            width: 2,
            color: 0x000000,
        }).setFillStyle({
            color: colorBetweenColors(
                0xff0000,
                0x00ffff,
                site.attributes?.elevation,
            ),
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

    app.stage.addChild(container);
})();
