/**
 * Element Animator
 * Animates DrawingElement properties using the animation engine
 */

import { animationEngine, generateAnimationId } from './animation-engine';
import type { AnimationConfig } from './animation-types';
import { lerp, lerpColor } from './animation-types';
import { store, updateElement } from '../../store/app-store';
import type { DrawingElement } from '../../types';

// Properties that can be animated
export type AnimatableProperty =
    | 'x'
    | 'y'
    | 'width'
    | 'height'
    | 'opacity'
    | 'angle'
    | 'strokeWidth'
    | 'roughness';

// Color properties that can be animated
export type AnimatableColorProperty =
    | 'strokeColor'
    | 'backgroundColor';

export interface ElementAnimationTarget {
    // Numeric properties
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    opacity?: number;
    angle?: number;
    strokeWidth?: number;
    roughness?: number;
    // Color properties
    strokeColor?: string;
    backgroundColor?: string;
}

export interface ElementAnimationConfig extends Omit<AnimationConfig, 'onUpdate'> {
    /** Optional callback with current animated values */
    onUpdate?: (values: Partial<ElementAnimationTarget>) => void;
}

/**
 * Get the current value of an animatable property from an element
 */
function getElementProperty(element: DrawingElement, prop: keyof ElementAnimationTarget): number | string | undefined {
    return element[prop as keyof DrawingElement] as number | string | undefined;
}

/**
 * Animate a single element's properties
 * 
 * @param elementId - The ID of the element to animate
 * @param target - Target property values to animate to
 * @param config - Animation configuration
 * @returns Animation ID for control
 * 
 * @example
 * // Move element to x:500 with bounce easing
 * animateElement('rect-1', { x: 500 }, { duration: 500, easing: 'easeOutBounce' });
 * 
 * @example
 * // Fade and scale simultaneously
 * animateElement('circle-1', { opacity: 0, width: 200, height: 200 }, { 
 *   duration: 300, 
 *   easing: 'easeOutQuad' 
 * });
 */
export function animateElement(
    elementId: string,
    target: ElementAnimationTarget,
    config: ElementAnimationConfig
): string {
    const element = store.elements.find(el => el.id === elementId);
    if (!element) {
        console.warn(`animateElement: Element ${elementId} not found`);
        return '';
    }

    const animId = generateAnimationId('el');

    // Capture starting values
    const startValues: Record<string, number | string> = {};
    const numericProps: AnimatableProperty[] = [];
    const colorProps: AnimatableColorProperty[] = [];

    for (const key of Object.keys(target) as (keyof ElementAnimationTarget)[]) {
        const startVal = getElementProperty(element, key);
        if (startVal !== undefined) {
            startValues[key] = startVal;
            if (typeof startVal === 'number') {
                numericProps.push(key as AnimatableProperty);
            } else if (typeof startVal === 'string') {
                colorProps.push(key as AnimatableColorProperty);
            }
        }
    }

    // Create the animation
    animationEngine.create(
        animId,
        (progress: number) => {
            const updates: Partial<DrawingElement> = {};
            const callbackValues: Partial<ElementAnimationTarget> = {};

            // Interpolate numeric properties
            for (const prop of numericProps) {
                const start = startValues[prop] as number;
                const end = target[prop] as number;
                const value = lerp(start, end, progress);
                (updates as any)[prop] = value;
                (callbackValues as any)[prop] = value;
            }

            // Interpolate color properties
            for (const prop of colorProps) {
                const start = startValues[prop] as string;
                const end = target[prop] as string;
                if (start && end && start.startsWith('#') && end.startsWith('#')) {
                    const value = lerpColor(start, end, progress);
                    (updates as any)[prop] = value;
                    (callbackValues as any)[prop] = value;
                }
            }

            // Update the element in store (skip history during animation)
            updateElement(elementId, updates, false);

            // Call user callback if provided
            config.onUpdate?.(callbackValues);
        },
        {
            duration: config.duration,
            easing: config.easing,
            delay: config.delay,
            onStart: config.onStart,
            onComplete: config.onComplete,
            loop: config.loop,
            loopCount: config.loopCount,
            alternate: config.alternate
        }
    );

    // Start immediately
    animationEngine.start(animId);

    return animId;
}

/**
 * Animate multiple elements with the same animation
 * 
 * @param elementIds - Array of element IDs
 * @param target - Target property values
 * @param config - Animation configuration
 * @param stagger - Delay between each element's start (ms)
 * @returns Array of animation IDs
 */
export function animateElements(
    elementIds: string[],
    target: ElementAnimationTarget,
    config: ElementAnimationConfig,
    stagger: number = 0
): string[] {
    return elementIds.map((id, index) => {
        return animateElement(id, target, {
            ...config,
            delay: (config.delay ?? 0) + (stagger * index)
        });
    });
}

/**
 * Stop an element animation
 */
export function stopElementAnimation(animationId: string): void {
    animationEngine.stop(animationId);
}

/**
 * Pause an element animation
 */
export function pauseElementAnimation(animationId: string): void {
    animationEngine.pause(animationId);
}

/**
 * Resume a paused element animation
 */
export function resumeElementAnimation(animationId: string): void {
    animationEngine.start(animationId);
}

// ============================================
// Preset Animations
// ============================================

/**
 * Fade in an element
 */
export function fadeIn(elementId: string, duration: number = 300): string {
    // Set initial opacity to 0
    updateElement(elementId, { opacity: 0 }, false);
    return animateElement(elementId, { opacity: 100 }, { duration, easing: 'easeOutQuad' });
}

/**
 * Fade out an element
 */
export function fadeOut(elementId: string, duration: number = 300): string {
    return animateElement(elementId, { opacity: 0 }, { duration, easing: 'easeOutQuad' });
}

/**
 * Scale up from center (entrance)
 */
export function scaleIn(elementId: string, duration: number = 300): string {
    const element = store.elements.find(el => el.id === elementId);
    if (!element) return '';

    const targetWidth = element.width;
    const targetHeight = element.height;
    const centerX = element.x + targetWidth / 2;
    const centerY = element.y + targetHeight / 2;

    // Start small from center
    updateElement(elementId, {
        width: 0,
        height: 0,
        x: centerX,
        y: centerY,
        opacity: 0
    }, false);

    return animateElement(elementId, {
        width: targetWidth,
        height: targetHeight,
        x: element.x,
        y: element.y,
        opacity: 100
    }, { duration, easing: 'easeOutBack' });
}

/**
 * Bounce effect (emphasis)
 */
export function bounce(elementId: string, intensity: number = 20): string {
    const element = store.elements.find(el => el.id === elementId);
    if (!element) return '';

    const originalY = element.y;

    return animateElement(elementId, {
        y: originalY - intensity
    }, {
        duration: 150,
        easing: 'easeOutQuad',
        onComplete: () => {
            animateElement(elementId, { y: originalY }, {
                duration: 300,
                easing: 'easeOutBounce'
            });
        }
    });
}

/**
 * Pulse effect (emphasis)
 */
export function pulse(elementId: string, scale: number = 1.1, duration: number = 300): string {
    const element = store.elements.find(el => el.id === elementId);
    if (!element) return '';

    const originalWidth = element.width;
    const originalHeight = element.height;
    const originalX = element.x;
    const originalY = element.y;

    const targetWidth = originalWidth * scale;
    const targetHeight = originalHeight * scale;
    const offsetX = (targetWidth - originalWidth) / 2;
    const offsetY = (targetHeight - originalHeight) / 2;

    return animateElement(elementId, {
        width: targetWidth,
        height: targetHeight,
        x: originalX - offsetX,
        y: originalY - offsetY
    }, {
        duration: duration / 2,
        easing: 'easeOutQuad',
        onComplete: () => {
            animateElement(elementId, {
                width: originalWidth,
                height: originalHeight,
                x: originalX,
                y: originalY
            }, {
                duration: duration / 2,
                easing: 'easeOutQuad'
            });
        }
    });
}

/**
 * Shake effect (emphasis/error)
 */
export function shake(elementId: string, intensity: number = 10, duration: number = 400): string {
    const element = store.elements.find(el => el.id === elementId);
    if (!element) return '';

    const originalX = element.x;

    return animateElement(elementId, {
        x: originalX + intensity
    }, {
        duration: duration,
        easing: 'linear',
        loop: true,
        loopCount: 4,
        alternate: true,
        onComplete: () => {
            updateElement(elementId, { x: originalX }, false);
        }
    });
}
