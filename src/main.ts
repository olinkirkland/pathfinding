import './styles.css';

import { Application, Container, Graphics } from 'pixi.js';
import { NavigationGraph } from './navigation-graph';

const navigationGraph = new NavigationGraph({
    width: window.innerWidth,
    height: window.innerHeight,
});

(async () => {
    const app = new Application();
    await app.init({ backgroundAlpha: 0, resizeTo: window });
    document.body.appendChild(app.canvas);

    const container = new Container();
    navigationGraph.cells.forEach((cell) => {
        const { site } = cell;
        const g = new Graphics();
        g.setFillStyle({
            color: 0xff0000,
        })
            .circle(site.x, site.y, 3)
            .fill();

        const { halfedges } = cell;
        halfedges.forEach((h) => {
            g.setStrokeStyle({
                width: 2,
                color: 0x000000,
            })
                .moveTo(h.edge.va.x, h.edge.va.y)
                .lineTo(h.edge.vb.x, h.edge.vb.y)
                .stroke();
        });

        container.addChild(g);
    });

    app.stage.addChild(container);
})();
