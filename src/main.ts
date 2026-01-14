import './styles.css';

import { Application, Container, Graphics } from 'pixi.js';
import { Site, Voronoi } from 'voronoijs';

const stageWidth = window.innerWidth;
const stageHeight = window.innerHeight;

var voronoi = new Voronoi();
var bbox = { xl: 0, xr: stageWidth, yt: 0, yb: stageHeight }; // xl is x-left, xr is x-right, yt is y-top, and yb is y-bottom
var sites: Site[] = [];
for (let id = 0; id < 1000; id++) {
    sites.push({
        id,
        x: Math.random() * stageWidth,
        y: Math.random() * stageHeight,
    });
}

var diagram = voronoi.compute(sites, bbox);
console.log(diagram);

(async () => {
    const app = new Application();
    await app.init({ backgroundAlpha: 0, resizeTo: window });
    document.body.appendChild(app.canvas);

    const container = new Container();
    diagram.cells.forEach((cell) => {
        const { site } = cell;
        const g = new Graphics();
        g.setFillStyle({ color: 0xff0000 }).circle(site.x, site.y, 2).fill();

        const { halfedges } = cell;
        halfedges.forEach((h) => {
            g.setStrokeStyle({ width: 2, color: 0x000000 })
                .moveTo(h.edge.va.x, h.edge.va.y)
                .lineTo(h.edge.vb.x, h.edge.vb.y)
                .stroke();
        });

        container.addChild(g);
    });

    app.stage.addChild(container);
})();
