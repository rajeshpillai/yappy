import { store } from "../../store/app-store";
import { animateElement, fadeIn, fadeOut } from "./element-animator";
import type { DisplayState } from "../../types/motion-types";

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
        const allStates = store.states;

        // Element IDs from target state
        const targetIds = Object.keys(targetOverrides);

        // 1. Identify "Known" elements across all states
        const allKnownStateIds = new Set<string>();
        allStates.forEach(s => {
            Object.keys(s.overrides).forEach(id => allKnownStateIds.add(id));
        });

        // 2. Identify segments
        // Shared: In current and in target
        const sharedIds = currentElements.filter(el => targetIds.includes(el.id)).map(el => el.id);

        // Exiting: In current, NOT in target, BUT IS a "known" state element
        const exitingIds = currentElements.filter(el =>
            !targetIds.includes(el.id) && allKnownStateIds.has(el.id)
        ).map(el => el.id);

        // Entering: In target, but perhaps not in current (rare, but handle for safety)
        const enteringIds = targetIds.filter(id => !currentElements.some(el => el.id === id));

        // 3. Animate Shared Elements (The "Magic Move")
        sharedIds.forEach(id => {
            const targetProps = targetOverrides[id];
            if (!targetProps) return;

            animateElement(id, targetProps as any, {
                duration,
                easing: 'easeInOutQuad'
            });
        });

        // 4. Animate Exiting Elements (Only those that belong to OTHER states)
        exitingIds.forEach(id => {
            fadeOut(id, duration * 0.5);
        });

        // 5. Animate Entering Elements (Fade in)
        enteringIds.forEach(id => {
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
