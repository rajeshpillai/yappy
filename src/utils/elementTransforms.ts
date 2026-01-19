import { store, updateElement } from "../store/appStore";
import type { ElementType, DrawingElement } from "../types";

export const changeElementType = (elementId: string, newType: ElementType) => {
    const element = store.elements.find(e => e.id === elementId);
    if (!element) return;

    if (element.type === newType) return;

    // Define families
    const isConnector = (type: string) => ['line', 'arrow', 'bezier', 'organicBranch'].includes(type);

    const oldIsConnector = isConnector(element.type);
    const newIsConnector = isConnector(newType);

    // Only allow like-for-like (Connector <-> Connector, Shape <-> Shape)
    if (oldIsConnector !== newIsConnector) {
        console.warn(`Cannot transform ${element.type} to ${newType}: Incompatible families.`);
        return;
    }

    const updates: Partial<DrawingElement> = { type: newType };

    // Connector-specific logic
    if (newIsConnector) {
        if (newType === 'bezier' || newType === 'organicBranch') {
            // Need control points
            if (!element.controlPoints || element.controlPoints.length !== 2) {
                // Initialize default S-curve control points based on start/end
                // For non-connectors this is hard, but we ruled that out.
                // Existing connector has x,y,width,height. Start=TL, End=BR (roughly).
                // Or use actual points?
                // Let's use x,y and width,height for S-curve default.

                // We need relative points for the S-curve logic we used in creation
                // But x/y/w/h are already normalized?
                // Assume start is at (0,0) relative and end is at (w,h) relative or vice versa?
                // Actually, existing lines might have negative width/height?
                // No, appStore/Canvas normalizes them usually?
                // Let's rely on absolute positions.

                const startX = element.x;
                const startY = element.y;
                const endX = element.x + element.width;
                const endY = element.y + element.height;

                // Simple S-curve: CP1 = Start + (dx/2, 0), CP2 = End - (dx/2, 0)
                const dx = endX - startX;
                const dy = endY - startY;

                // Vertical vs Horizontal logic?
                // Let's stick to the horizontal S-curve default for now or simple midpoint logic.
                // Or better: 1/3 and 2/3 along the path?
                // Standard default:
                const cp1 = { x: startX + dx * 0.25, y: startY + dy * 0.1 };
                const cp2 = { x: endX - dx * 0.25, y: endY - dy * 0.1 };

                updates.controlPoints = [cp1, cp2];
            }
        } else {
            // Straight line/arrow
            // Remove control points so it renders straight
            updates.controlPoints = undefined;
        }
    }

    updateElement(elementId, updates, true);
};

export const getTransformOptions = (currentType: ElementType): ElementType[] => {
    const connectors: ElementType[] = ['line', 'arrow', 'bezier', 'organicBranch'];
    const shapes: ElementType[] = [
        'rectangle', 'circle', 'diamond', 'triangle', 'hexagon', 'octagon',
        'parallelogram', 'star', 'cloud', 'heart', 'cross', 'checkmark',
        'capsule', 'stickyNote', 'callout', 'speechBubble', 'burst',
        'database', 'document', 'predefinedProcess', 'internalStorage',
        'server', 'loadBalancer', 'firewall', 'user', 'messageQueue', 'lambda', 'router', 'browser',
        'trapezoid', 'rightTriangle', 'pentagon', 'septagon', 'mobilePhone', 'browserWindow'
    ];

    if (connectors.includes(currentType)) {
        return connectors.filter(t => t !== currentType);
    }

    if (shapes.includes(currentType)) {
        return shapes.filter(t => t !== currentType);
    }

    return [];
};
