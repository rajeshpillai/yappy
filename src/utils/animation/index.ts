/**
 * Animation System - Public Exports
 */

// Types
export type {
    EasingFunction,
    EasingName,
    AnimationState,
    AnimationConfig,
    Keyframe,
    KeyframeAnimation,
    Animation
} from './animation-types';

// Easing functions
export { easings, getEasing, lerp, lerpColor } from './animation-types';

// Animation Engine
export { animationEngine, generateAnimationId } from './animation-engine';

// Element Animator
export {
    animateElement,
    animateElements,
    stopElementAnimation,
    pauseElementAnimation,
    resumeElementAnimation,
    // Presets
    fadeIn,
    fadeOut,
    scaleIn,
    bounce,
    pulse,
    shake
} from './element-animator';

export type {
    AnimatableProperty,
    AnimatableColorProperty,
    ElementAnimationTarget,
    ElementAnimationConfig
} from './element-animator';

// Timeline
export { Timeline, createTimeline } from './timeline';
