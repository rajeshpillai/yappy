import { store, updateElement } from "../store/appStore";
import type { ElementType, DrawingElement } from "../types";

export const changeElementType = (elementId: string, newType: ElementType, pushHistory = true) => {
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
            updates.curveType = 'bezier'; // Force curve rendering

            // Need control points
            if (!element.controlPoints || element.controlPoints.length !== 2) {
                // ... (existing control point logic) ...
                const startX = element.x;
                const startY = element.y;
                const endX = element.x + element.width;
                const endY = element.y + element.height;

                // Simple S-curve: CP1 = Start + (dx/2, 0), CP2 = End - (dx/2, 0)
                const dx = endX - startX;
                const dy = endY - startY;

                const cp1 = { x: startX + dx * 0.25, y: startY + dy * 0.1 };
                const cp2 = { x: endX - dx * 0.25, y: endY - dy * 0.1 };

                updates.controlPoints = [cp1, cp2];
            }
        } else {
            // Straight line/arrow
            // We usually default to straight when converting FROM a curved type (Bezier/Organic) to a simple Line/Arrow
            // to avoid weird lingering curves unless the user explicitly set it.
            // However, if the user had an "Arrow with Elbow", and converts to "Line", they might expect "Line with Elbow".
            // But if they convert "Bezier" (Type) to "Line", they expect Straight Line?
            // Let's reset to straight if coming from Bezier/OrganicBranch types.
            if (element.type === 'bezier' || element.type === 'organicBranch') {
                updates.curveType = 'straight';
                updates.controlPoints = undefined;
            }
            // If they are just swapping Line <-> Arrow, we preserve curveType (Elbow/Straight/BezierStyle).
        }
    }

    updateElement(elementId, updates, pushHistory);
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

export const getShapeIcon = (type: ElementType): string => {
    const iconMap: Record<string, string> = {
        // Connectors
        'line': '─',
        'arrow': '→',
        'bezier': '⤴',
        'organicBranch': '🌿',

        // Curve types (for submenu)
        'straight': '─',
        'elbow': '└─',

        // Basic shapes
        'rectangle': '□',
        'circle': '○',
        'diamond': '◇',
        'triangle': '△',
        'hexagon': '⬡',
        'octagon': '⬢',
        'parallelogram': '▱',
        'star': '★',
        'cloud': '☁',
        'heart': '♥',
        'cross': '✕',
        'checkmark': '✓',

        // Flowchart
        'database': '🗄',
        'document': '📄',
        'predefinedProcess': '⊞',
        'internalStorage': '⊡',

        // Infrastructure
        'server': '🖥',
        'loadBalancer': '⚖',
        'firewall': '🛡',
        'user': '👤',
        'messageQueue': '📬',
        'lambda': 'λ',
        'router': '🔀',
        'browser': '🌐',

        // Mindmap
        'capsule': '⬭',
        'stickyNote': '📝',
        'callout': '💬',
        'speechBubble': '💭',
        'burst': '💥',

        // Geometric
        'trapezoid': '⏢',
        'rightTriangle': '◿',
        'pentagon': '⬠',
        'septagon': '⬡',

        // Wireframe
        'browserWindow': '🖼',
        'mobilePhone': '📱'
    };

    return iconMap[type] || '◻';
};

export const getShapeTooltip = (type: ElementType): string => {
    return type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1');
};

export const getCurveTypeOptions = (currentType: string): string[] => {
    return ['straight', 'bezier', 'elbow'].filter(t => t !== currentType);
};

export const getCurveTypeIcon = (curveType: string): string => {
    const iconMap: Record<string, string> = {
        'straight': '─',
        'bezier': '⤴',
        'elbow': '└─'
    };
    return iconMap[curveType] || '─';
};

export const getCurveTypeTooltip = (curveType: string): string => {
    return curveType.charAt(0).toUpperCase() + curveType.slice(1);
};
