import { animateElement, type ElementAnimationTarget, type ElementAnimationConfig } from './element-animator';
import * as animator from './element-animator';
import type { ElementAnimation, PropertyAnimation } from '../../types/motion-types';
import { store, updateElement, setIsPreviewing } from '../../store/app-store';

/**
 * Manages the execution of animation sequences for elements
 */
export class SequenceAnimator {
    private activeSequences = new Set<string>();

    /**
     * Play the animation sequence for a specific element
     */
    playSequence(elementId: string, trigger: 'on-load' | 'programmatic' = 'programmatic'): void {
        const element = store.elements.find(el => el.id === elementId);
        if (!element || !element.animations || element.animations.length === 0) return;

        // For programmatic previews, capture state to restore it after
        let originalState: any = null;
        if (trigger === 'programmatic') {
            this.activeSequences.add(elementId);
            setIsPreviewing(true);
            originalState = {
                x: element.x,
                y: element.y,
                width: element.width,
                height: element.height,
                opacity: element.opacity,
                angle: element.angle,
                strokeColor: element.strokeColor,
                backgroundColor: element.backgroundColor
            };
        }

        // Filter animations by trigger
        // Note: 'after-prev' and 'with-prev' are handled naturally by the sequence order
        const sequence = element.animations.filter((_anim, index) => {
            if (trigger === 'programmatic') return true; // Preview all animations
            if (index === 0) return _anim.trigger === trigger || _anim.trigger === 'after-prev';
            return true;
        });

        if (sequence.length === 0) return;

        const onAllComplete = () => {
            if (trigger === 'programmatic') {
                this.activeSequences.delete(elementId);
                if (this.activeSequences.size === 0) {
                    setIsPreviewing(false);
                }
            }
            if (originalState) {
                // Restore state after a small delay so the user sees the final frame
                setTimeout(() => {
                    updateElement(elementId, originalState, false);
                }, 500);
            }
        };

        this.runStep(elementId, sequence, 0, onAllComplete);
    }

    /**
     * Stop all animations for a specific element
     */
    stopSequence(elementId: string): void {
        animator.stopAllElementAnimations(elementId);
    }

    /**
     * Play all animations for all elements in the store, or a specific subset
     */
    playAll(trigger: 'on-load' | 'programmatic' = 'programmatic', elementIds?: string[]): void {
        const elementsToAnimate = elementIds
            ? store.elements.filter(el => elementIds.includes(el.id))
            : store.elements;

        elementsToAnimate.forEach(element => {
            this.playSequence(element.id, trigger);
        });
    }

    /**
     * Stop all animations for all elements in the store
     */
    stopAll(): void {
        this.activeSequences.clear();
        setIsPreviewing(false);
        store.elements.forEach(element => {
            this.stopSequence(element.id);
        });
    }

    /**
     * Recursive runner for the sequence
     */
    private runStep(elementId: string, sequence: ElementAnimation[], index: number, onAllComplete?: () => void): void {
        if (index >= sequence.length) {
            onAllComplete?.();
            return;
        }

        const anim = sequence[index];
        const nextIndex = index + 1;

        const onComplete = () => {
            // Restore state if requested for this SPECIFIC animation
            if (anim.restoreAfter) {
                const elementNow = store.elements.find(el => el.id === elementId);
                if (elementNow && stepOriginalState) {
                    updateElement(elementId, stepOriginalState, false);
                }
            }

            // Find NEXT valid start point (skip animations marked as 'with-prev' 
            // since they were already triggered in the loop below)
            let nextValidIndex = nextIndex;
            while (nextValidIndex < sequence.length && sequence[nextValidIndex].trigger === 'with-prev') {
                nextValidIndex++;
            }

            if (nextValidIndex < sequence.length) {
                this.runStep(elementId, sequence, nextValidIndex, onAllComplete);
            } else {
                onAllComplete?.();
            }
        };

        // Capture state for per-animation restoration if needed
        // (We already have sequence-level originalState for previews, 
        // but per-animation restoreAfter might be used in live mode)
        let stepOriginalState: any = null;
        if (anim.restoreAfter) {
            const el = store.elements.find(e => e.id === elementId);
            if (el) {
                stepOriginalState = { ...el };
            }
        }

        // Handle "with-prev" - Look ahead for concurrent animations
        let lookAheadIndex = nextIndex;
        while (lookAheadIndex < sequence.length) {
            const nextAnim = sequence[lookAheadIndex];
            if (nextAnim.trigger === 'with-prev') {
                this.executeAnimation(elementId, nextAnim, () => {
                    // Even 'with-prev' animations can have restoreAfter
                    if (nextAnim.restoreAfter && stepOriginalState) {
                        // We'd need to capture individual starts for parallel - complex.
                        // For now, simplify or just let main sequence handle it.
                    }
                });
                lookAheadIndex++;
            } else {
                break;
            }
        }

        // Execute current animation
        this.executeAnimation(elementId, anim, onComplete);
    }

    /**
     * Execute a specific animation on an element.
     */
    playAnimation(elementId: string, anim: ElementAnimation, onComplete: () => void): void {
        this.executeAnimation(elementId, anim, onComplete);
    }

    private executeAnimation(elementId: string, anim: ElementAnimation, onComplete: () => void): void {
        const config: ElementAnimationConfig = {
            duration: anim.duration,
            delay: anim.delay,
            easing: anim.easing,
            onComplete,
            params: (anim as any).params,
            loop: anim.repeat === -1,
            loopCount: anim.repeat !== -1 && (anim.repeat || 0) > 0 ? anim.repeat : undefined,
            alternate: anim.yoyo
        };

        if (anim.type === 'preset') {
            // Map presets to existing animator functions
            const presetFn = (animator as any)[anim.name];
            if (typeof presetFn === 'function') {
                presetFn(elementId, anim.duration, config);
            } else {
                console.warn(`Unknown preset: ${anim.name}`);
                onComplete();
            }
        } else if (anim.type === 'property') {
            this.animateProperty(elementId, anim, config);
        } else if (anim.type === 'rotate') {
            this.animateRotate(elementId, anim as any, config);
        } else if (anim.type === 'path') {
            // TODO: Implement path animation logic
            console.warn('Path animation not yet implemented');
            onComplete();
        }
    }

    private animateRotate(elementId: string, anim: any, config: ElementAnimationConfig): void {
        const el = store.elements.find(e => e.id === elementId);
        if (!el) {
            config.onComplete?.();
            return;
        }

        const toAngle = anim.relative ? (el.angle || 0) + (anim.toAngle * Math.PI / 180) : (anim.toAngle * Math.PI / 180);
        animateElement(elementId, { angle: toAngle }, config);
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
