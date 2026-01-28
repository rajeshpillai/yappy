
import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'data/dev-arch.json');
const rawData = fs.readFileSync(filePath, 'utf-8');
const data = JSON.parse(rawData);

// Helper to add animation if not present
const addAnimation = (element: any, animation: any) => {
    if (!element.animations) {
        element.animations = [];
    }
    // Clear existing to avoid duplicates if run multiple times
    element.animations = [animation];
};

// Iterate elements and apply rules based on ID patterns
data.elements.forEach((el: any) => {
    const id = el.id;

    // Header / Title
    if (id.includes('-h') && !id.includes('-b-')) {
        addAnimation(el, {
            id: `anim-${id}`,
            type: 'preset',
            name: 'backInDown',
            trigger: 'on-load',
            duration: 1000,
            delay: 200,
            easing: 'easeOutBack'
        });
    }
    // Body Block (large text block)
    else if (id.includes('-b') && !id.includes('bullet') && !id.includes('item')) {
        addAnimation(el, {
            id: `anim-${id}`,
            type: 'preset',
            name: 'fadeInUp',
            trigger: 'after-prev',
            duration: 800,
            delay: 400,
            easing: 'easeOutQuad'
        });
    }
    // Bullet Points (Circles)
    else if (id.includes('bullet')) {
        // Extract index to stagger
        // id format: t-3-b-bullet-0
        const parts = id.split('-');
        const index = parseInt(parts[parts.length - 1]);

        addAnimation(el, {
            id: `anim-${id}`,
            type: 'preset',
            name: 'scaleIn',
            trigger: index === 0 ? 'after-prev' : 'after-prev', // First one after title/body, others sequential
            duration: 400,
            delay: 100, // Small delay between bullets
            easing: 'easeOutBack'
        });
    }
    // List Items (Text next to bullets)
    else if (id.includes('item')) {
        // id format: t-3-b-item-0
        // Should appear WITH the bullet
        addAnimation(el, {
            id: `anim-${id}`,
            type: 'preset',
            name: 'slideInRight',
            trigger: 'with-prev', // With the bullet
            duration: 500,
            delay: 50,
            easing: 'easeOutQuad'
        });
    }
});

// Update global animation setting
if (!data.globalSettings) data.globalSettings = {};
data.globalSettings.animationEnabled = true;

// Write back
fs.writeFileSync(filePath, JSON.stringify(data, null, 4));

console.log(`Applied animations to ${data.elements.length} elements.`);
