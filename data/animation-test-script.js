/**
 * LLM Chain-of-Thought Animation Script
 * Demonstrates Spring Physics with Yappy Animation Engine
 *
 * How to use:
 * 1. Open animation-test.json in Yappy
 * 2. Open browser console (F12)
 * 3. Paste this entire script and press Enter
 * 4. Watch the spring physics magic! ✨
 */

(function() {
    const { Yappy } = window;

    if (!Yappy) {
        console.error('Yappy API not found! Make sure you have the file open in Yappy.');
        return;
    }

    console.log('🎬 Starting LLM Chain-of-Thought Animation Demo...');
    console.log('🔧 Using Spring Physics Easing for natural, organic motion');

    // Create custom spring configurations for different effects
    const springBouncy = Yappy.createSpring(200, 20, 1, 0);     // Bouncy entrance
    const springGentle = Yappy.createSpring(170, 26, 1, 0);     // Gentle settle (default)
    const springSnappy = Yappy.createSpring(300, 30, 0.8, 0);   // Quick and snappy
    const springSlow = Yappy.createSpring(120, 28, 1.5, 0);     // Slow, heavy feel

    // Reset all elements to hidden state first
    console.log('🔄 Resetting all elements to hidden...');
    const allElementIds = [
        'title-text', 'subtitle-text', 'user-prompt',
        'step1-box', 'step2-box', 'step3-box',
        'knowledge-base', 'final-answer',
        'arrow-prompt-step1', 'arrow-step1-step2', 'arrow-step2-step3',
        'arrow-kb-step3', 'arrow-step2-answer',
        'thinking-badge1', 'thinking-badge2', 'thinking-badge3',
        'powered-by'
    ];

    allElementIds.forEach(id => {
        Yappy.updateElement(id, { opacity: 0 });
    });

    // Animation timeline with staggered spring animations

    // 1. Title and subtitle with gentle spring scale
    setTimeout(() => {
        console.log('📝 Animating title...');
        const title = Yappy.getElement('title-text');
        if (title) {
            Yappy.updateElement('title-text', { y: 50 });
            Yappy.animateElement('title-text', {
                opacity: 100,
                y: 30
            }, {
                duration: 1200,
                easing: springGentle
            });
        }
    }, 200);

    setTimeout(() => {
        Yappy.animateElement('subtitle-text', {
            opacity: 100
        }, {
            duration: 1000,
            easing: 'easeSpring'
        });
    }, 500);

    // 2. User prompt springs in from left with bounce
    setTimeout(() => {
        console.log('💬 User prompt bouncing in...');
        const prompt = Yappy.getElement('user-prompt');
        if (prompt) {
            Yappy.updateElement('user-prompt', { x: -300 });
            Yappy.animateElement('user-prompt', {
                x: 100,
                opacity: 100
            }, {
                duration: 1400,
                easing: springBouncy
            });
        }
    }, 900);

    // 3. Arrow from prompt to step 1
    setTimeout(() => {
        Yappy.animateElement('arrow-prompt-step1', {
            opacity: 100
        }, {
            duration: 600,
            easing: 'easeOutQuad'
        });
    }, 1800);

    // 4. Reasoning steps cascade in with spring physics (staggered)
    const steps = [
        { id: 'step1-box', badge: 'thinking-badge1', delay: 2200 },
        { id: 'step2-box', badge: 'thinking-badge2', delay: 2800 },
        { id: 'step3-box', badge: 'thinking-badge3', delay: 3400 }
    ];

    steps.forEach(({ id, badge, delay }, index) => {
        setTimeout(() => {
            console.log(`🧠 Step ${index + 1} thinking...`);

            // Thinking badge pulses in first
            const badgeEl = Yappy.getElement(badge);
            if (badgeEl) {
                Yappy.updateElement(badge, { y: badgeEl.y - 30 });
                Yappy.animateElement(badge, {
                    opacity: 100,
                    y: badgeEl.y + 30
                }, {
                    duration: 800,
                    easing: springSnappy
                });
            }

            // Then the reasoning box springs in from below
            const stepEl = Yappy.getElement(id);
            if (stepEl) {
                Yappy.updateElement(id, { y: stepEl.y + 100 });
                Yappy.animateElement(id, {
                    y: stepEl.y - 100,
                    opacity: 100
                }, {
                    duration: 1200,
                    easing: springBouncy
                });
            }
        }, delay);
    });

    // 5. Arrows between steps
    setTimeout(() => {
        Yappy.animateElement('arrow-step1-step2', {
            opacity: 100
        }, {
            duration: 500,
            easing: 'easeOutQuad'
        });
    }, 3400);

    setTimeout(() => {
        Yappy.animateElement('arrow-step2-step3', {
            opacity: 100
        }, {
            duration: 500,
            easing: 'easeOutQuad'
        });
    }, 4000);

    // 6. Knowledge base bounces in from top with heavy spring
    setTimeout(() => {
        console.log('📚 Knowledge base entering...');
        const kb = Yappy.getElement('knowledge-base');
        if (kb) {
            Yappy.updateElement('knowledge-base', { y: -200 });
            Yappy.animateElement('knowledge-base', {
                y: 160,
                opacity: 100
            }, {
                duration: 1600,
                easing: springSlow  // Heavy, satisfying drop
            });
        }
    }, 3800);

    // 7. Arrow from KB to step 3
    setTimeout(() => {
        Yappy.animateElement('arrow-kb-step3', {
            opacity: 100
        }, {
            duration: 800,
            easing: 'easeOutQuad'
        });
    }, 5000);

    // 8. Arrow to final answer
    setTimeout(() => {
        Yappy.animateElement('arrow-step2-answer', {
            opacity: 100
        }, {
            duration: 600,
            easing: 'easeOutQuad'
        });
    }, 5400);

    // 9. Final answer cloud expands in with dramatic spring bounce
    setTimeout(() => {
        console.log('✅ Final answer generating...');
        const answer = Yappy.getElement('final-answer');
        if (answer) {
            // Start small and spring to full size
            Yappy.updateElement('final-answer', {
                x: 510,
                y: 600,
                width: 260,
                height: 80
            });

            Yappy.animateElement('final-answer', {
                x: 380,
                y: 560,
                width: 520,
                height: 160,
                opacity: 100
            }, {
                duration: 1800,
                easing: springBouncy  // Satisfying pop-in effect
            });
        }
    }, 5800);

    // 10. Credits fade in
    setTimeout(() => {
        Yappy.animateElement('powered-by', {
            opacity: 100
        }, {
            duration: 1000,
            easing: 'easeOutQuad'
        });

        console.log('✨ Animation complete!');
        console.log('🎯 Spring Physics Features Demonstrated:');
        console.log('   • Natural bounce and overshoot');
        console.log('   • Staggered timing for cascade effects');
        console.log('   • Different spring parameters (bouncy, gentle, snappy, slow)');
        console.log('   • Combined with position, opacity, and scale animations');
        console.log('\n💡 Try running this again or modify the spring parameters!');
        console.log('   Example: Yappy.createSpring(stiffness, damping, mass, velocity)');
    }, 7500);

})();
