import { store } from "../../store/app-store";
import { animateElement, fadeIn, fadeOut } from "./element-animator";
import type { DisplayState, DrawingElementState } from "../../types/motion-types";

/**
 * MorphAnimator
 * Calculates differences between current canvas and a target DisplayState
 * and triggers smooth animations to transition between them.
 */
export class MorphAnimator {
    /**
     * Morph the current canvas to match the target DisplayState
     */
    static morphTo(target: DisplayState, duration: number = 800) {
        const currentElements = store.elements;
        const targetOverrides = target.overrides;

        // Element IDs from target state
        const targetIds = Object.keys(targetOverrides);

        // 1. Identify Shared, New, and Removed elements
        const sharedIds = currentElements.filter(el => targetIds.includes(el.id)).map(el => el.id);
        const exitingIds = currentElements.filter(el => !targetIds.includes(el.id)).map(el => el.id);
        const enteringIds = targetIds.filter(id => !currentElements.some(el => el.id === id));

        // 2. Animate Shared Elements (The "Magic Move")
        sharedIds.forEach(id => {
            const targetProps = targetOverrides[id];
            if (!targetProps) return;

            animateElement(id, targetProps as any, {
                duration,
                easing: 'easeInOutQuad'
            });
        });

        // 3. Animate Exiting Elements (Fade out and maybe remove?)
        exitingIds.forEach(id => {
            fadeOut(id, duration * 0.5, {
                onComplete: () => {
                    // Optional: we might not want to actually DELETE them from store 
                    // unless they are missing from the logical slide, 
                    // but for DisplayState overrides, we just keep them at 0 opacity.
                }
            });
        });

        // 4. Animate Entering Elements (Fade in)
        enteringIds.forEach(id => {
            // Note: If they are not in store.elements, we have a problem.
            // In the current DisplayState model, we assume all elements involved 
            // are already in the store, just perhaps hidden or at different positions.
            const targetProps = targetOverrides[id];
            if (!targetProps) return;

            // Ensure opacity starts at 0 if it's "entering"
            fadeIn(id, duration);
            animateElement(id, targetProps as any, {
                duration,
                easing: 'easeInOutQuad'
            });
        });
    }
}
