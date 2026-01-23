import type { EasingName } from '../utils/animation/animation-types';

export type AnimationTrigger =
    | 'on-load'         // Auto-start when slide loads
    | 'on-click'        // Triggered by user click
    | 'on-hover'        // Triggered by hover (micro-interaction)
    | 'after-prev'      // Sequenced after previous animation
    | 'with-prev'       // Parallel with previous animation
    | 'programmatic';   // Triggered by code/events

export type AnimationAction =
    | 'preset'          // Use a predefined effect (fade, bounce)
    | 'property'        // Animate specific property (frame-based)
    | 'rotate'          // Specialized rotation (angle)
    | 'path'            // Move along a path
    | 'transition'      // Morph to a new state
    | 'orbit'           // Persistent orbit
    | 'spin';          // Persistent spin

// Base animation interface
export interface BaseAnimation {
    id: string;
    trigger: AnimationTrigger;
    duration: number; // ms
    delay: number;    // ms
    easing: EasingName;
    repeat?: number;  // 0 = no repeat, -1 = infinite
    yoyo?: boolean;   // Reverse on alternate
    restoreAfter?: boolean; // Restore element state after animation finishes
}

// 1. Preset Animation (Extensions of current entrance/exit)
export interface PresetAnimation extends BaseAnimation {
    type: 'preset';
    name: string; // 'fadeIn', 'bounceIn', 'shake', etc.
}

// 2. Property Animation (Tweening)
export interface PropertyAnimation extends BaseAnimation {
    type: 'property';
    property: string; // 'x', 'y', 'opacity', 'rotation', 'scale'
    from?: number | string;
    to: number | string;
    targetId?: string; // Optional: target another element
}

// 3. Path Animation (Motion Path)
export interface PathAnimation extends BaseAnimation {
    type: 'path';
    pathId?: string;    // ID of a path element to follow
    pathData?: string;  // SVG path data if custom
    orientToPath?: boolean;
}

// 4. Rotate Animation (Discrete Rotation)
export interface RotateAnimation extends BaseAnimation {
    type: 'rotate';
    fromAngle?: number;
    toAngle: number;
    relative?: boolean; // If true, treat toAngle as delta
}

export type ElementAnimation = PresetAnimation | PropertyAnimation | PathAnimation | RotateAnimation;

// Defines what properties can be overridden in a state
export interface DrawingElementState {
    x: number;
    y: number;
    width: number;
    height: number;
    opacity: number;
    angle: number;
    backgroundColor: string;
    strokeColor: string;
    text: string;
}

// 4. Diagram State (for "Magic Move" style transitions)
export interface DisplayState {
    id: string;
    name: string; // "Loading", "Success", "Error"
    overrides: Record<string, Partial<DrawingElementState>>; // map elementId -> properties
}
