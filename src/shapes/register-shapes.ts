import { ShapeRegistry } from "./shape-registry";
import { PolygonRenderer } from "./renderers/polygon-renderer";
import { RectangleRenderer } from "./renderers/rectangle-renderer";
import { CircleRenderer } from "./renderers/circle-renderer";
import { DiamondRenderer } from "./renderers/diamond-renderer";
import { TriangleRenderer } from "./renderers/triangle-renderer";
import { SimplePolygonRenderer } from "./renderers/simple-polygon-renderer";
import { StarRenderer } from "./renderers/star-renderer";
import { PathShapeRenderer } from "./renderers/path-shape-renderer";
import { LineShapeRenderer } from "./renderers/line-shape-renderer";
import { DirectionalArrowRenderer } from "./renderers/directional-arrow-renderer";
import { BoxWithLinesRenderer } from "./renderers/box-with-lines-renderer";
import { StickyNoteRenderer } from "./renderers/sticky-note-renderer";
import { BurstRenderer } from "./renderers/burst-renderer";
import { RibbonRenderer } from "./renderers/ribbon-renderer";
import { InfrastructureRenderer } from "./renderers/infrastructure-renderer";
import { SketchnoteRenderer } from "./renderers/sketchnote-renderer";
import { WireframeRenderer } from "./renderers/wireframe-renderer";
import { LinearElementRenderer } from "./renderers/linear-element-renderer";

/**
 * Register all shape renderers
 * This is called once at application startup
 */
export function registerShapeRenderers(): void {
    // Core shapes
    ShapeRegistry.register('rectangle', new RectangleRenderer());
    ShapeRegistry.register('circle', new CircleRenderer());
    ShapeRegistry.register('diamond', new DiamondRenderer());
    ShapeRegistry.register('triangle', new TriangleRenderer());
    ShapeRegistry.register('line', new LinearElementRenderer());
    ShapeRegistry.register('arrow', new LinearElementRenderer());
    ShapeRegistry.register('bezier', new LinearElementRenderer());
    ShapeRegistry.register('fineliner', new LinearElementRenderer());
    ShapeRegistry.register('inkbrush', new LinearElementRenderer());
    ShapeRegistry.register('marker', new LinearElementRenderer());

    // Simple polygons (fixed point patterns)
    ShapeRegistry.register('parallelogram', SimplePolygonRenderer.parallelogram());
    ShapeRegistry.register('trapezoid', SimplePolygonRenderer.trapezoid());
    ShapeRegistry.register('rightTriangle', SimplePolygonRenderer.rightTriangle());

    // Regular polygons (parametric)
    ShapeRegistry.register('pentagon', new PolygonRenderer(5));
    ShapeRegistry.register('hexagon', new PolygonRenderer(6));
    ShapeRegistry.register('septagon', new PolygonRenderer(7));
    ShapeRegistry.register('octagon', new PolygonRenderer(8));
    ShapeRegistry.register('polygon', new PolygonRenderer(6));

    // Decorative shapes
    ShapeRegistry.register('star', new StarRenderer());
    ShapeRegistry.register('cloud', PathShapeRenderer.cloud());
    ShapeRegistry.register('heart', PathShapeRenderer.heart());
    ShapeRegistry.register('cross', LineShapeRenderer.cross());
    ShapeRegistry.register('checkmark', LineShapeRenderer.checkmark());
    ShapeRegistry.register('burst', new BurstRenderer());
    ShapeRegistry.register('ribbon', new RibbonRenderer());
    ShapeRegistry.register('bracketLeft', PathShapeRenderer.bracketLeft());
    ShapeRegistry.register('bracketRight', PathShapeRenderer.bracketRight());

    // Directional arrows
    ShapeRegistry.register('arrowRight', DirectionalArrowRenderer.arrowRight());
    ShapeRegistry.register('arrowLeft', DirectionalArrowRenderer.arrowLeft());
    ShapeRegistry.register('arrowUp', DirectionalArrowRenderer.arrowUp());
    ShapeRegistry.register('arrowDown', DirectionalArrowRenderer.arrowDown());

    // Flowchart shapes
    ShapeRegistry.register('capsule', PathShapeRenderer.capsule());
    ShapeRegistry.register('database', PathShapeRenderer.database());
    ShapeRegistry.register('document', PathShapeRenderer.document());
    ShapeRegistry.register('predefinedProcess', BoxWithLinesRenderer.predefinedProcess());
    ShapeRegistry.register('internalStorage', BoxWithLinesRenderer.internalStorage());

    // UI/Communication shapes
    ShapeRegistry.register('stickyNote', new StickyNoteRenderer());
    ShapeRegistry.register('callout', PathShapeRenderer.callout());
    ShapeRegistry.register('speechBubble', PathShapeRenderer.speechBubble());

    // Infrastructure shapes
    ShapeRegistry.register('server', InfrastructureRenderer.server());
    ShapeRegistry.register('loadBalancer', InfrastructureRenderer.loadBalancer());
    ShapeRegistry.register('firewall', InfrastructureRenderer.firewall());
    ShapeRegistry.register('user', InfrastructureRenderer.user());
    ShapeRegistry.register('messageQueue', InfrastructureRenderer.messageQueue());
    ShapeRegistry.register('lambda', InfrastructureRenderer.lambda());
    ShapeRegistry.register('router', InfrastructureRenderer.router());
    ShapeRegistry.register('browser', InfrastructureRenderer.browser());

    // Sketchnote shapes
    ShapeRegistry.register('starPerson', SketchnoteRenderer.starPerson());
    ShapeRegistry.register('scroll', SketchnoteRenderer.scroll());
    ShapeRegistry.register('wavyDivider', SketchnoteRenderer.wavyDivider());
    ShapeRegistry.register('doubleBanner', SketchnoteRenderer.doubleBanner());
    ShapeRegistry.register('lightbulb', SketchnoteRenderer.lightbulb());
    ShapeRegistry.register('signpost', SketchnoteRenderer.signpost());
    ShapeRegistry.register('burstBlob', SketchnoteRenderer.burstBlob());

    // Wireframe shapes
    ShapeRegistry.register('browserWindow', WireframeRenderer.browserWindow());
    ShapeRegistry.register('mobilePhone', WireframeRenderer.mobilePhone());
    ShapeRegistry.register('ghostButton', WireframeRenderer.ghostButton());
    ShapeRegistry.register('inputField', WireframeRenderer.inputField());
    ShapeRegistry.register('organicBranch', WireframeRenderer.organicBranch());
}
