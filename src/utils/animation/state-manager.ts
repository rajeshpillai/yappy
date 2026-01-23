import { store, setStore, updateElement } from '../../store/app-store';
import type { DrawingElement } from '../../types';
import type { Slide } from '../../types/slide-types';
import { animateElement } from './element-animator';
import { playExitAnimation } from './element-animator';

type ElementState = Partial<DrawingElement>;
type SlideState = Map<string, ElementState>;

export interface TransitionConfig {
    duration: number;
    easing?: string;
    stagger?: number;
}

// Promise wrapper for animateElement
const animateElementP = (id: string, target: any, config: any): Promise<void> => {
    return new Promise((resolve) => {
        animateElement(id, target, {
            ...config,
            onComplete: () => resolve()
        });
    });
};

// Promise wrapper for playExitAnimation
const playExitP = (id: string): Promise<void> => {
    return new Promise((resolve) => {
        playExitAnimation(id, {
            isPreview: false,
            onComplete: () => resolve()
        });
    });
};

export class AnimationStateManager {

    /**
     * Capture the current state of all elements on the canvas
     */
    captureCurrentState(): SlideState {
        const state = new Map<string, ElementState>();
        store.elements.forEach(el => {
            state.set(el.id, { ...el });
        });
        return state;
    }

    /**
     * Transition to a target slide with Magic Move effect
     */
    async transitionToSlide(targetSlide: Slide, config: TransitionConfig = { duration: 500, easing: 'easeInOutQuad' }): Promise<void> {
        const currentState = this.captureCurrentState();
        const targetElements: DrawingElement[] = JSON.parse(JSON.stringify(targetSlide.elements)); // Deep copy to avoid mutating slide def

        // Identify element sets
        const currentIds = new Set<string>(currentState.keys());
        const targetIds = new Set<string>(targetElements.map((e: DrawingElement) => e.id));

        const commonIds = Array.from(targetIds).filter(id => currentIds.has(id));
        const enteringIds = Array.from(targetIds).filter(id => !currentIds.has(id));
        const exitingIds = Array.from(currentIds).filter(id => !targetIds.has(id));

        // Create a temporary merged list for the transition
        // Start with target elements
        const transitionElements: DrawingElement[] = [...targetElements];

        // Add exiting elements (so they persist during animation)
        exitingIds.forEach((id: string) => {
            const el = store.elements.find(e => e.id === id);
            if (el) {
                transitionElements.push({ ...el });
            }
        });

        // Update Store to have ALL elements (Transition State)
        setStore('elements', transitionElements);

        const promises: Promise<void>[] = [];

        // 1. Prepare Common Elements (Snap to Start Position)
        commonIds.forEach((id: string) => {
            const start = currentState.get(id)!;
            updateElement(id, start, false);
        });

        // 2. Prepare Entering Elements (Invisible)
        enteringIds.forEach((id: string) => {
            updateElement(id, { opacity: 0 }, false);
        });

        // 3. Animate Exiting Elements
        exitingIds.forEach((id: string) => {
            const el = currentState.get(id);
            if (el && (el as any).exitAnimation && (el as any).exitAnimation !== 'none') {
                promises.push(playExitP(id));
            } else {
                promises.push(animateElementP(id, { opacity: 0 }, { duration: config.duration / 2 }));
            }
        });

        // 4. Animate Common Elements (to Target)
        commonIds.forEach((id: string) => {
            const end = targetElements.find((e: DrawingElement) => e.id === id)!;
            const start = currentState.get(id)!;

            const changes: any = {};
            let hasChanges = false;

            // Properties to tween
            const propsToTween = ['x', 'y', 'width', 'height', 'angle', 'opacity', 'strokeWidth', 'roughness'];
            propsToTween.forEach(prop => {
                const sVal = (start as any)[prop];
                const eVal = (end as any)[prop];
                if (sVal !== eVal && typeof sVal === 'number' && typeof eVal === 'number') {
                    changes[prop] = eVal;
                    hasChanges = true;
                }
            });

            // Colors
            if (start.strokeColor !== end.strokeColor) {
                changes.strokeColor = end.strokeColor;
                hasChanges = true;
            }
            if (start.backgroundColor !== end.backgroundColor) {
                changes.backgroundColor = end.backgroundColor;
                hasChanges = true;
            }

            if (hasChanges) {
                promises.push(animateElementP(id, changes, {
                    duration: config.duration,
                    easing: config.easing
                }));
            }
        });

        // 5. Animate Entering Elements
        enteringIds.forEach((id: string) => {
            const target = targetElements.find((e: DrawingElement) => e.id === id)!;
            // Use generic animateElementP for entrance logic for now (opacity fade)
            promises.push(animateElementP(id, { opacity: target.opacity ?? 100 }, { duration: config.duration }));
        });

        // Wait for all animations
        await Promise.all(promises);

        // Cleanup: Remove exiting elements (Set store to pure targetElements)
        setStore('elements', targetElements);
    }
}

export const stateManager = new AnimationStateManager();
