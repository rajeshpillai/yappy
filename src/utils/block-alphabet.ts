
import type { DrawingElement } from "../types";

export type Stroke =
    | { type: 'line'; x1: number; y1: number; x2: number; y2: number }
    | { type: 'bezier'; x1: number; y1: number; x2: number; y2: number; c1x: number; c1y: number; c2x: number; c2y: number };

// 100x100 Grid System
// Origin (0,0) is Top-Left. (100,100) is Bottom-Right.
export const ALPHABET_RECIPES: Record<string, Stroke[]> = {
    // Straight Letters
    'A': [
        { type: 'line', x1: 50, y1: 0, x2: 0, y2: 100 },   // Left leg
        { type: 'line', x1: 50, y1: 0, x2: 100, y2: 100 }, // Right leg
        { type: 'line', x1: 25, y1: 50, x2: 75, y2: 50 }   // Crossbar
    ],
    'E': [
        { type: 'line', x1: 0, y1: 0, x2: 0, y2: 100 },    // Spine
        { type: 'line', x1: 0, y1: 0, x2: 80, y2: 0 },     // Top
        { type: 'line', x1: 0, y1: 50, x2: 60, y2: 50 },   // Middle
        { type: 'line', x1: 0, y1: 100, x2: 80, y2: 100 }  // Bottom
    ],
    'F': [
        { type: 'line', x1: 0, y1: 0, x2: 0, y2: 100 },    // Spine
        { type: 'line', x1: 0, y1: 0, x2: 80, y2: 0 },     // Top
        { type: 'line', x1: 0, y1: 50, x2: 60, y2: 50 }    // Middle
    ],
    'H': [
        { type: 'line', x1: 0, y1: 0, x2: 0, y2: 100 },    // Left
        { type: 'line', x1: 100, y1: 0, x2: 100, y2: 100 },// Right
        { type: 'line', x1: 0, y1: 50, x2: 100, y2: 50 }   // Crossbar
    ],
    'I': [
        { type: 'line', x1: 50, y1: 0, x2: 50, y2: 100 },  // Spine
        { type: 'line', x1: 20, y1: 0, x2: 80, y2: 0 },    // Top Serif (optional, but looks better)
        { type: 'line', x1: 20, y1: 100, x2: 80, y2: 100 } // Bottom Serif
    ],
    'K': [
        { type: 'line', x1: 0, y1: 0, x2: 0, y2: 100 },    // Spine
        { type: 'line', x1: 0, y1: 60, x2: 80, y2: 0 },    // Top leg
        { type: 'line', x1: 20, y1: 45, x2: 80, y2: 100 }  // Bottom leg
    ],
    'L': [
        { type: 'line', x1: 0, y1: 0, x2: 0, y2: 100 },    // Spine
        { type: 'line', x1: 0, y1: 100, x2: 80, y2: 100 }  // Bottom
    ],
    'M': [
        { type: 'line', x1: 0, y1: 100, x2: 0, y2: 0 },    // Left
        { type: 'line', x1: 0, y1: 0, x2: 50, y2: 60 },    // V-Left
        { type: 'line', x1: 50, y1: 60, x2: 100, y2: 0 },  // V-Right
        { type: 'line', x1: 100, y1: 0, x2: 100, y2: 100 } // Right
    ],
    'N': [
        { type: 'line', x1: 0, y1: 100, x2: 0, y2: 0 },    // Left
        { type: 'line', x1: 0, y1: 0, x2: 100, y2: 100 },  // Diagonal
        { type: 'line', x1: 100, y1: 100, x2: 100, y2: 0 } // Right
    ],
    'T': [
        { type: 'line', x1: 50, y1: 0, x2: 50, y2: 100 },  // Spine
        { type: 'line', x1: 0, y1: 0, x2: 100, y2: 0 }     // Top
    ],
    'V': [
        { type: 'line', x1: 0, y1: 0, x2: 50, y2: 100 },   // Left
        { type: 'line', x1: 50, y1: 100, x2: 100, y2: 0 }  // Right
    ],
    'W': [
        { type: 'line', x1: 0, y1: 0, x2: 25, y2: 100 },
        { type: 'line', x1: 25, y1: 100, x2: 50, y2: 40 },
        { type: 'line', x1: 50, y1: 40, x2: 75, y2: 100 },
        { type: 'line', x1: 75, y1: 100, x2: 100, y2: 0 }
    ],
    'X': [
        { type: 'line', x1: 0, y1: 0, x2: 100, y2: 100 },
        { type: 'line', x1: 100, y1: 0, x2: 0, y2: 100 }
    ],
    'Y': [
        { type: 'line', x1: 0, y1: 0, x2: 50, y2: 50 },
        { type: 'line', x1: 100, y1: 0, x2: 50, y2: 50 },
        { type: 'line', x1: 50, y1: 50, x2: 50, y2: 100 }
    ],
    'Z': [
        { type: 'line', x1: 0, y1: 0, x2: 100, y2: 0 },
        { type: 'line', x1: 100, y1: 0, x2: 0, y2: 100 },
        { type: 'line', x1: 0, y1: 100, x2: 100, y2: 100 }
    ],

    // Curved Letters
    'B': [
        { type: 'line', x1: 0, y1: 0, x2: 0, y2: 100 },    // Spine
        // Top loop
        { type: 'bezier', x1: 0, y1: 0, x2: 0, y2: 50, c1x: 70, c1y: 0, c2x: 70, c2y: 50 },
        // Bottom loop
        { type: 'bezier', x1: 0, y1: 50, x2: 0, y2: 100, c1x: 80, c1y: 50, c2x: 80, c2y: 100 }
    ],
    'C': [
        { type: 'bezier', x1: 80, y1: 20, x2: 80, y2: 80, c1x: -10, c1y: 0, c2x: -10, c2y: 100 }
    ],
    'D': [
        { type: 'line', x1: 0, y1: 0, x2: 0, y2: 100 },    // Spine
        { type: 'bezier', x1: 0, y1: 0, x2: 0, y2: 100, c1x: 100, c1y: 0, c2x: 100, c2y: 100 }
    ],
    'G': [
        { type: 'bezier', x1: 80, y1: 20, x2: 80, y2: 80, c1x: -10, c1y: 0, c2x: -10, c2y: 100 }, // C part
        { type: 'line', x1: 80, y1: 80, x2: 80, y2: 50 },   // Up
        { type: 'line', x1: 80, y1: 50, x2: 50, y2: 50 }    // In
    ],
    'J': [
        { type: 'bezier', x1: 60, y1: 0, x2: 40, y2: 80, c1x: 60, c1y: 100, c2x: 0, c2y: 100 } // Hook
    ],
    'O': [
        // Two halves for a circle
        { type: 'bezier', x1: 50, y1: 0, x2: 50, y2: 100, c1x: -10, c1y: 0, c2x: -10, c2y: 100 }, // Left
        { type: 'bezier', x1: 50, y1: 0, x2: 50, y2: 100, c1x: 110, c1y: 0, c2x: 110, c2y: 100 }  // Right
    ],
    'P': [
        { type: 'line', x1: 0, y1: 0, x2: 0, y2: 100 },    // Spine
        { type: 'bezier', x1: 0, y1: 0, x2: 0, y2: 50, c1x: 80, c1y: 0, c2x: 80, c2y: 50 } // Loop
    ],
    'Q': [
        // O part
        { type: 'bezier', x1: 50, y1: 0, x2: 50, y2: 90, c1x: -10, c1y: 0, c2x: -10, c2y: 90 },
        { type: 'bezier', x1: 50, y1: 0, x2: 50, y2: 90, c1x: 110, c1y: 0, c2x: 110, c2y: 90 },
        // Tail
        { type: 'line', x1: 60, y1: 70, x2: 90, y2: 100 }
    ],
    'R': [
        { type: 'line', x1: 0, y1: 0, x2: 0, y2: 100 },    // Spine
        { type: 'bezier', x1: 0, y1: 0, x2: 0, y2: 50, c1x: 80, c1y: 0, c2x: 80, c2y: 50 }, // Loop
        { type: 'line', x1: 20, y1: 50, x2: 80, y2: 100 }  // Leg
    ],
    'S': [
        // Top half
        { type: 'bezier', x1: 80, y1: 20, x2: 50, y2: 50, c1x: 10, c1y: 10, c2x: 20, c2y: 50 },
        // Bottom half
        { type: 'bezier', x1: 50, y1: 50, x2: 20, y2: 80, c1x: 80, c1y: 50, c2x: 90, c2y: 90 }
    ],
    'U': [
        { type: 'bezier', x1: 0, y1: 0, x2: 100, y2: 0, c1x: 0, c1y: 120, c2x: 100, c2y: 120 }
    ]
};

export const generateBlockText = (
    text: string,
    startX: number,
    startY: number,
    fontSize: number = 60, // Sizing scale
    color: string = "#000000"
): DrawingElement[] => {
    const elements: DrawingElement[] = [];
    const groupId = crypto.randomUUID();
    const LETTER_GAP = fontSize * 0.4;
    let currentX = startX;

    const normalizedToWorld = (val: number) => (val / 100) * fontSize;

    for (let i = 0; i < text.length; i++) {
        const char = text[i].toUpperCase();

        if (char === ' ') {
            currentX += fontSize * 0.5; // Space width
            continue;
        }

        const strokes = ALPHABET_RECIPES[char];
        if (!strokes) {
            // Placeholder for unknown chars
            const boxSize = fontSize;
            const id = crypto.randomUUID();
            const missingEl: any = {
                id,
                type: 'rectangle',
                x: currentX,
                y: startY,
                width: boxSize,
                height: boxSize,
                strokeColor: color,
                backgroundColor: 'transparent',
                fillStyle: 'solid',
                strokeWidth: 2,
                strokeStyle: 'solid',
                roughness: 1,
                opacity: 100,
                angle: 0,
                renderStyle: 'sketch',
                seed: Math.random() * 100000,
                roundness: null,
                locked: false,
                link: null,
                layerId: 'default-layer',
                groupIds: [groupId],
                fontSize: 16,
                textAlign: 'center',
                verticalAlign: 'middle',
                containerText: '?'
            };
            elements.push(missingEl as DrawingElement);
            currentX += boxSize + LETTER_GAP;
            continue;
        }

        strokes.forEach(stroke => {
            const id = crypto.randomUUID();
            const el: any = {
                id,
                strokeColor: color,
                backgroundColor: 'transparent',
                fillStyle: 'solid',
                strokeWidth: 3,
                strokeStyle: 'solid',
                roughness: 1,
                opacity: 100,
                angle: 0,
                renderStyle: 'sketch',
                seed: Math.random() * 100000,
                roundness: null,
                locked: false,
                link: null,
                layerId: 'default-layer',
                groupIds: [groupId]
            };

            if (stroke.type === 'line') {
                el.type = 'line';
                el.x = currentX + normalizedToWorld(stroke.x1);
                el.y = startY + normalizedToWorld(stroke.y1);
                el.width = normalizedToWorld(stroke.x2 - stroke.x1);
                el.height = normalizedToWorld(stroke.y2 - stroke.y1);
                // Line defaults
                el.startArrowhead = null;
                el.endArrowhead = null;
            } else if (stroke.type === 'bezier') {
                el.type = 'line';
                el.curveType = 'bezier';
                el.startArrowhead = null;
                el.endArrowhead = null;
                el.x = currentX + normalizedToWorld(stroke.x1);
                el.y = startY + normalizedToWorld(stroke.y1);

                // For a bezier line, width/height acts as bounding box mainly
                el.width = normalizedToWorld(stroke.x2 - stroke.x1);
                el.height = normalizedToWorld(stroke.y2 - stroke.y1);

                const cp1x = currentX + normalizedToWorld(stroke.c1x);
                const cp1y = startY + normalizedToWorld(stroke.c1y);
                const cp2x = currentX + normalizedToWorld(stroke.c2x);
                const cp2y = startY + normalizedToWorld(stroke.c2y);

                el.controlPoints = [{ x: cp1x, y: cp1y }, { x: cp2x, y: cp2y }];
            }

            elements.push(el as DrawingElement);
        });

        currentX += fontSize + LETTER_GAP;
    }

    return elements;
};
