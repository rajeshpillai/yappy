import { test, expect } from '@playwright/test';
import type { DrawingElement } from '../src/types';
import type { Slide } from '../src/types/slide-types';
import type { ElementAnimation, DisplayState } from '../src/types/motion-types';

test.describe('Motion Graphics Data Structure', () => {
    test('should support ElementAnimation array on DrawingElement', () => {
        const fadeIn: ElementAnimation = {
            id: 'anim1',
            trigger: 'on-load',
            type: 'preset',
            name: 'fadeIn',
            duration: 500,
            delay: 0,
            easing: 'easeInQuad'
        };

        const moveRight: ElementAnimation = {
            id: 'anim2',
            trigger: 'after-prev',
            type: 'property',
            property: 'x',
            to: 100,
            duration: 1000,
            delay: 0,
            easing: 'linear'
        };

        const element: Partial<DrawingElement> = {
            id: 'el1',
            type: 'rectangle',
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            animations: [fadeIn, moveRight],
            isMotionPath: false
        };

        expect(element.animations).toHaveLength(2);
        expect(element.animations?.[0].type).toBe('preset');
        expect(element.animations?.[1].type).toBe('property');
    });

    test('should support DisplayState on Slide', () => {
        const loadingState: DisplayState = {
            id: 'state-loading',
            name: 'Loading',
            overrides: {
                'el1': {
                    opacity: 0.5,
                    text: 'Loading...'
                }
            }
        };

        const slide: Partial<Slide> = {
            id: 'slide1',
            states: [loadingState],
            initialStateId: 'state-loading'
        };

        expect(slide.states).toHaveLength(1);
        expect(slide.states?.[0].overrides['el1'].opacity).toBe(0.5);
    });
});
