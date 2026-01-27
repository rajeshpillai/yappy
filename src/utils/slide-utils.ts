import type { DrawingElement } from '../types';
import type { Slide } from '../types/slide-types';

/**
 * Utility to find elements belonging to a specific slide based on spatial center-point logic.
 */
export const getElementsOnSlide = (
    slideIndex: number,
    elements: DrawingElement[],
    slides: Slide[]
): DrawingElement[] => {
    const slide = slides[slideIndex];
    if (!slide) return [];

    const { x: sX, y: sY } = slide.spatialPosition;
    const { width: sW, height: sH } = slide.dimensions;

    return elements.filter(el => {
        const cx = el.x + (el.width || 0) / 2;
        const cy = el.y + (el.height || 0) / 2;
        return cx >= sX && cx <= sX + sW && cy >= sY && cy <= sY + sH;
    });
};
