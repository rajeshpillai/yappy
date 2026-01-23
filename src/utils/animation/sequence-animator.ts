import { animateElement, type ElementAnimationTarget, type ElementAnimationConfig } from './element-animator';
import { generateAnimationId } from './animation-engine';
import type { ElementAnimation, PropertyAnimation } from '../../types/motion-types';
import { store } from '../../store/app-store';
import type { DrawingElement } from '../../types';

/**
 * Manages the execution of animation sequences for elements
 */
export class SequenceAnimator {
    private activeSequences = new Map<string, string>(); // elementId -> currentStepId

    /**
     * Play the animation sequence for a specific element
     */
    playSequence(elementId: string, trigger: 'on-load' | 'programmatic' = 'programmatic'): void {
        const element = store.elements.find(el => el.id === elementId);
        if (!element || !element.animations || element.animations.length === 0) return;

        // Filter animations by trigger
        // Note: 'after-prev' and 'with-prev' are handled naturally by the sequence order
        const sequence = element.animations.filter((anim, index) => {
            if (index === 0) return anim.trigger === trigger || anim.trigger === 'after-prev'; // Allow first item to be after-prev (relative to start)
            return true; // Subsequent animations are processed by the runner
        });

        if (sequence.length === 0) return;

        this.runStep(elementId, sequence, 0);
    }

    /**
     * Recursive runner for the sequence
     */
    private runStep(elementId: string, sequence: ElementAnimation[], index: number): void {
        if (index >= sequence.length) return;

        const anim = sequence[index];
        const nextIndex = index + 1;

        const onComplete = () => {
            // Check if next item exists and should run "after-prev"
            if (nextIndex < sequence.length) {
                const nextAnim = sequence[nextIndex];
                if (nextAnim.trigger === 'after-prev' || nextAnim.trigger === 'programmatic') {
                    this.runStep(elementId, sequence, nextIndex);
                }
            }
        };

        // Handle "with-prev" - Look ahead for concurrent animations
        let lookAheadIndex = nextIndex;
        while (lookAheadIndex < sequence.length) {
            const nextAnim = sequence[lookAheadIndex];
            if (nextAnim.trigger === 'with-prev') {
                this.executeAnimation(elementId, nextAnim, () => { }); // Fire and forget
                lookAheadIndex++;
            } else {
                break;
            }
        }

        // Execute current animation
        this.executeAnimation(elementId, anim, onComplete);
    }

    private executeAnimation(elementId: string, anim: ElementAnimation, onComplete: () => void): void {
        const config: ElementAnimationConfig = {
            duration: anim.duration,
            delay: anim.delay,
            easing: anim.easing,
            onComplete
        };

        if (anim.type === 'preset') {
            // Map presets to existing animator functions
            // For now, we'll manually map common ones. A dynamic registry would be better later.
            import('./element-animator').then(mod => {
                const presetFn = (mod as any)[anim.name];
                if (typeof presetFn === 'function') {
                    presetFn(elementId, anim.duration, config);
                } else {
                    console.warn(`Unknown preset: ${anim.name}`);
                    onComplete();
                }
            });
        } else if (anim.type === 'property') {
            this.animateProperty(elementId, anim, config);
        } else if (anim.type === 'path') {
            // TODO: Implement path animation logic
            console.warn('Path animation not yet implemented');
            onComplete();
        }
    }

    private animateProperty(elementId: string, anim: PropertyAnimation, config: ElementAnimationConfig): void {
        // Construct target object
        const target: ElementAnimationTarget = {};

        // Handle numeric or string conversion if needed
        const val = anim.to;
        if (anim.property === 'opacity' || anim.property === 'x' || anim.property === 'y' ||
            anim.property === 'width' || anim.property === 'height' ||
            anim.property === 'angle' || anim.property === 'strokeWidth' ||
            anim.property === 'roughness') {
            (target as any)[anim.property] = Number(val);
        } else if (anim.property === 'strokeColor' || anim.property === 'backgroundColor') {
            (target as any)[anim.property] = String(val);
        }

        animateElement(elementId, target, config);
    }
}

export const sequenceAnimator = new SequenceAnimator();
