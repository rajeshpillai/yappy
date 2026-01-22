import type { DrawingElement } from "../types";

export interface MindmapNode {
    id: string;
    element: DrawingElement;
    children: MindmapNode[];
    width: number;
    height: number;
    x: number;
    y: number;
    totalHeight?: number; // Used for vertical layout
    totalWidth?: number;  // Used for horizontal layout
}

export type LayoutDirection = 'horizontal-right' | 'horizontal-left' | 'vertical-down' | 'vertical-up';

export class MindmapLayoutEngine {
    private hSpacing = 100;
    private vSpacing = 40;

    /**
     * Builds a tree structure starting from the root element.
     */
    buildTree(rootId: string, elements: readonly DrawingElement[]): MindmapNode | null {
        const rootElement = elements.find(e => e.id === rootId);
        if (!rootElement) return null;

        const node: MindmapNode = {
            id: rootElement.id,
            element: rootElement,
            children: [],
            width: rootElement.width,
            height: rootElement.height,
            x: rootElement.x,
            y: rootElement.y
        };

        const childrenElements = elements.filter(e => e.parentId === rootId);
        for (const childEl of childrenElements) {
            const childNode = this.buildTree(childEl.id, elements);
            if (childNode) {
                node.children.push(childNode);
            }
        }

        return node;
    }

    /**
     * Calculates positions for a horizontal layout.
     */
    layoutHorizontal(root: MindmapNode, direction: 'right' | 'left' = 'right') {
        this.calculateSubtreeHeights(root);
        this.assignHorizontalPositions(root, root.x, root.y, direction);
    }

    /**
     * Calculates positions for a vertical layout.
     */
    layoutVertical(root: MindmapNode, direction: 'down' | 'up' = 'down') {
        this.calculateSubtreeWidths(root);
        this.assignVerticalPositions(root, root.x, root.y, direction);
    }

    private calculateSubtreeHeights(node: MindmapNode): number {
        if (node.children.length === 0) {
            node.totalHeight = node.height;
            return node.totalHeight;
        }

        const childrenHeight = node.children.reduce((acc, child) => acc + this.calculateSubtreeHeights(child), 0);
        const totalSpacing = (node.children.length - 1) * this.vSpacing;
        node.totalHeight = Math.max(node.height, childrenHeight + totalSpacing);
        return node.totalHeight;
    }

    private assignHorizontalPositions(node: MindmapNode, x: number, y: number, direction: 'right' | 'left') {
        node.x = x;
        node.y = y;

        if (node.children.length === 0) return;

        const startX = direction === 'right' ? x + node.width + this.hSpacing : x - this.hSpacing; // simplified for left
        // For left we need to adjust by child width, handled below

        let currentY = y - (node.totalHeight! / 2) + (node.children[0].totalHeight! / 2);

        // Center the middle child with parent if possible, or just stack
        const totalChildrenHeight = node.children.reduce((acc, c) => acc + c.totalHeight!, 0) + (node.children.length - 1) * this.vSpacing;
        currentY = y + (node.height / 2) - (totalChildrenHeight / 2);

        for (const child of node.children) {
            const childX = direction === 'right' ? startX : startX - child.width;
            const childY = currentY + (child.totalHeight! / 2) - (child.height / 2);
            this.assignHorizontalPositions(child, childX, childY, direction);
            currentY += child.totalHeight! + this.vSpacing;
        }
    }

    private calculateSubtreeWidths(node: MindmapNode): number {
        if (node.children.length === 0) {
            node.totalWidth = node.width;
            return node.totalWidth;
        }

        const childrenWidth = node.children.reduce((acc, child) => acc + this.calculateSubtreeWidths(child), 0);
        const totalSpacing = (node.children.length - 1) * this.hSpacing;
        node.totalWidth = Math.max(node.width, childrenWidth + totalSpacing);
        return node.totalWidth;
    }

    private assignVerticalPositions(node: MindmapNode, x: number, y: number, direction: 'down' | 'up') {
        node.x = x;
        node.y = y;

        if (node.children.length === 0) return;

        const startY = direction === 'down' ? y + node.height + this.vSpacing : y - this.vSpacing;

        const totalChildrenWidth = node.children.reduce((acc, c) => acc + c.totalWidth!, 0) + (node.children.length - 1) * this.hSpacing;
        let currentX = x + (node.width / 2) - (totalChildrenWidth / 2);

        for (const child of node.children) {
            const childY = direction === 'down' ? startY : startY - child.height;
            const childX = currentX + (child.totalWidth! / 2) - (child.width / 2);
            this.assignVerticalPositions(child, childX, childY, direction);
            currentX += child.totalWidth! + this.hSpacing;
        }
    }

    /**
     * Collects all updated positions into a flat map.
     */
    getUpdates(node: MindmapNode, updates: Map<string, { x: number, y: number }> = new Map()) {
        updates.set(node.id, { x: node.x, y: node.y });
        for (const child of node.children) {
            this.getUpdates(child, updates);
        }
        return updates;
    }
}
