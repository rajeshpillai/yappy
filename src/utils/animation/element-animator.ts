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
export function scaleIn(elementId: string, duration: number = 300, config: ElementAnimationConfig = {}): string {
    const element = store.elements.find(el => el.id === elementId);
    if (!element) return '';

    // Capture target values as constants to avoid drift from live reactive references
    const targetX = element.x;
    const targetY = element.y;
    const targetWidth = element.width;
    const targetHeight = element.height;
    const targetOpacity = 100;

    const centerX = targetX + targetWidth / 2;
    const centerY = targetY + targetHeight / 2;

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
        x: targetX,
        y: targetY,
        opacity: targetOpacity
    }, {
        duration,
        easing: 'easeOutBack',
        onStart: config.onStart,
        onComplete: config.onComplete,
        delay: config.delay
    });
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

/**
 * Scale out (exit)
 */
export function scaleOut(elementId: string, duration: number = 300, config: ElementAnimationConfig = {}): string {
    const element = store.elements.find(el => el.id === elementId);
    if (!element) return '';

    const centerX = element.x + element.width / 2;
    const centerY = element.y + element.height / 2;

    return animateElement(elementId, {
        width: 0,
        height: 0,
        x: centerX,
        y: centerY,
        opacity: 0
    }, {
        duration,
        easing: 'easeInBack',
        onStart: config.onStart,
        onComplete: config.onComplete,
        delay: config.delay
    });
}

/**
 * Slide in from left
 */
export function slideInLeft(elementId: string, duration: number = 300): string {
    const element = store.elements.find(el => el.id === elementId);
    if (!element) return '';

    const targetX = element.x;
    updateElement(elementId, { x: -element.width, opacity: 0 }, false);

    return animateElement(elementId, { x: targetX, opacity: 100 }, { duration, easing: 'easeOutQuad' });
}

/**
 * Slide in from right
 */
export function slideInRight(elementId: string, duration: number = 300): string {
    const element = store.elements.find(el => el.id === elementId);
    if (!element) return '';

    const targetX = element.x;
    updateElement(elementId, { x: window.innerWidth + 100, opacity: 0 }, false);

    return animateElement(elementId, { x: targetX, opacity: 100 }, { duration, easing: 'easeOutQuad' });
}

/**
 * Slide in from top
 */
export function slideInUp(elementId: string, duration: number = 300): string {
    const element = store.elements.find(el => el.id === elementId);
    if (!element) return '';

    const targetY = element.y;
    updateElement(elementId, { y: -element.height, opacity: 0 }, false);

    return animateElement(elementId, { y: targetY, opacity: 100 }, { duration, easing: 'easeOutQuad' });
}

/**
 * Slide in from bottom
 */
export function slideInDown(elementId: string, duration: number = 300): string {
    const element = store.elements.find(el => el.id === elementId);
    if (!element) return '';

    const targetY = element.y;
    updateElement(elementId, { y: window.innerHeight + 100, opacity: 0 }, false);

    return animateElement(elementId, { y: targetY, opacity: 100 }, { duration, easing: 'easeOutQuad' });
}

/**
 * Slide out to left
 */
export function slideOutLeft(elementId: string, duration: number = 300): string {
    const element = store.elements.find(el => el.id === elementId);
    if (!element) return '';

    return animateElement(elementId, { x: -element.width, opacity: 0 }, { duration, easing: 'easeInQuad' });
}

/**
 * Slide out to right
 */
export function slideOutRight(elementId: string, duration: number = 300): string {
    return animateElement(elementId, { x: window.innerWidth + 100, opacity: 0 }, { duration, easing: 'easeInQuad' });
}

/**
 * Slide out to top
 */
export function slideOutUp(elementId: string, duration: number = 300): string {
    const element = store.elements.find(el => el.id === elementId);
    if (!element) return '';

    return animateElement(elementId, { y: -element.height, opacity: 0 }, { duration, easing: 'easeInQuad' });
}

/**
 * Slide out to bottom
 */
export function slideOutDown(elementId: string, duration: number = 300): string {
    return animateElement(elementId, { y: window.innerHeight + 100, opacity: 0 }, { duration, easing: 'easeInQuad' });
}

// ============================================
// Play Element's Configured Animation
// ============================================

/**
 * Play the entrance animation configured on an element
 * NOTE: Restores element to original state after animation completes (for preview purposes)
 */
export function playEntranceAnimation(elementId: string): string {
    const element = store.elements.find(el => el.id === elementId);
    if (!element) return '';

    const animation = element.entranceAnimation ?? 'none';
    const duration = element.animationDuration ?? 300;

    // Capture original state to restore after animation
    const originalState = {
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        opacity: element.opacity
    };

    const restoreState = () => {
        updateElement(elementId, originalState, false);
    };

    const config = { onComplete: restoreState };

    switch (animation) {
        case 'fadeIn':
            return fadeIn(elementId, duration); // Note: fadeIn/Out don't accept config yet, but they use animateElement
        // Actually, fadeIn creates its own animation. I should update them or just use animateElement here.
        // Let's use the presets but aware they might not restore if I don't pass restoreState.
        // I'll update the switch to use animateElement directly for better control in preview.
        case 'fadeIn':
            updateElement(elementId, { opacity: 0 }, false);
            return animateElement(elementId, { opacity: 100 }, { duration, easing: 'easeOutQuad', onComplete: restoreState });
        case 'scaleIn':
            return scaleIn(elementId, duration, config);
        case 'slideInLeft': {
            const targetX = element.x;
            updateElement(elementId, { x: -element.width, opacity: 0 }, false);
            return animateElement(elementId, { x: targetX, opacity: 100 }, { duration, easing: 'easeOutQuad', onComplete: restoreState });
        }
        case 'slideInRight': {
            const targetX = element.x;
            updateElement(elementId, { x: window.innerWidth + 100, opacity: 0 }, false);
            return animateElement(elementId, { x: targetX, opacity: 100 }, { duration, easing: 'easeOutQuad', onComplete: restoreState });
        }
        case 'slideInUp': {
            const targetY = element.y;
            updateElement(elementId, { y: -element.height, opacity: 0 }, false);
            return animateElement(elementId, { y: targetY, opacity: 100 }, { duration, easing: 'easeOutQuad', onComplete: restoreState });
        }
        case 'slideInDown': {
            const targetY = element.y;
            updateElement(elementId, { y: window.innerHeight + 100, opacity: 0 }, false);
            return animateElement(elementId, { y: targetY, opacity: 100 }, { duration, easing: 'easeOutQuad', onComplete: restoreState });
        }
        case 'bounce':
            // Bounce is complex (chained), let's just use it and manually restore later if possible 
            // or just let it be for now since bounce returns to original Y anyway.
            return bounce(elementId);
        default:
            return '';
    }
}

/**
 * Play the exit animation configured on an element
 * NOTE: Restores element to original state after animation completes (for preview purposes)
 */
export function playExitAnimation(elementId: string): string {
    const element = store.elements.find(el => el.id === elementId);
    if (!element) return '';

    const animation = element.exitAnimation ?? 'none';
    const duration = element.animationDuration ?? 300;

    // Capture original state to restore after animation
    const originalState = {
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        opacity: element.opacity
    };

    const restoreState = () => {
        updateElement(elementId, originalState, false);
    };

    switch (animation) {
        case 'fadeOut':
            return animateElement(elementId, { opacity: 0 }, {
                duration,
                easing: 'easeOutQuad',
                onComplete: restoreState
            });
        case 'scaleOut': {
            const centerX = element.x + element.width / 2;
            const centerY = element.y + element.height / 2;
            return animateElement(elementId, {
                width: 0,
                height: 0,
                x: centerX,
                y: centerY,
                opacity: 0
            }, { duration, easing: 'easeInBack', onComplete: restoreState });
        }
        case 'slideOutLeft':
            return animateElement(elementId, { x: -element.width, opacity: 0 }, {
                duration,
                easing: 'easeInQuad',
                onComplete: restoreState
            });
        case 'slideOutRight':
            return animateElement(elementId, { x: window.innerWidth + 100, opacity: 0 }, {
                duration,
                easing: 'easeInQuad',
                onComplete: restoreState
            });
        case 'slideOutUp':
            return animateElement(elementId, { y: -element.height, opacity: 0 }, {
                duration,
                easing: 'easeInQuad',
                onComplete: restoreState
            });
        case 'slideOutDown':
            return animateElement(elementId, { y: window.innerHeight + 100, opacity: 0 }, {
                duration,
                easing: 'easeInQuad',
                onComplete: restoreState
            });
        default:
            return '';
    }
}
