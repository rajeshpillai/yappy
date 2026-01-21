import type { ElementType } from "../types";
import type { ShapeRenderer } from "./base/ShapeRenderer";

/**
 * ShapeRegistry - Central registry for all shape renderers
 * 
 * Uses the Factory pattern to map element types to their renderers.
 * This allows adding new shapes without modifying core rendering code.
 */
class ShapeRegistryClass {
    private renderers: Map<ElementType, ShapeRenderer> = new Map();

    /**
     * Register a renderer for a specific element type
     */
    register(type: ElementType, renderer: ShapeRenderer): void {
        this.renderers.set(type, renderer);
    }

    /**
     * Get the renderer for a specific element type
     * Returns undefined if no renderer is registered
     */
    getRenderer(type: ElementType): ShapeRenderer | undefined {
        return this.renderers.get(type);
    }

    /**
     * Check if a renderer exists for a type
     */
    hasRenderer(type: ElementType): boolean {
        return this.renderers.has(type);
    }

    /**
     * Get all registered element types
     */
    getRegisteredTypes(): ElementType[] {
        return Array.from(this.renderers.keys());
    }

    /**
     * Clear all registered renderers (useful for testing)
     */
    clear(): void {
        this.renderers.clear();
    }
}

// Export singleton instance
export const ShapeRegistry = new ShapeRegistryClass();
