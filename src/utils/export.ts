import { store } from "../store/appStore";
import { renderElement } from "./renderElement";
import rough from 'roughjs/bin/rough';


export const exportToPng = async (scale: number, background: boolean) => {
    const elements = store.elements;
    if (elements.length === 0) return;

    // Calculate Bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    elements.forEach(el => {
        minX = Math.min(minX, el.x);
        minY = Math.min(minY, el.y);
        maxX = Math.max(maxX, el.x + el.width);
        maxY = Math.max(maxY, el.y + el.height);
    });

    // Padding
    const padding = 20;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;

    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    if (background) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.scale(scale, scale);
    ctx.translate(-minX + padding, -minY + padding);

    // Render
    const rc = rough.canvas(canvas);
    elements.forEach(el => {
        renderElement(rc, ctx, el);
    });

    // Download
    const link = document.createElement('a');
    link.download = 'yappy_drawing.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
};

export const exportToSvg = () => {
    const elements = store.elements;
    if (elements.length === 0) return;

    // Calculate Bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    elements.forEach(el => {
        minX = Math.min(minX, el.x);
        minY = Math.min(minY, el.y);
        maxX = Math.max(maxX, el.x + el.width);
        maxY = Math.max(maxY, el.y + el.height);
    });

    const padding = 20;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', `${width}`);
    svg.setAttribute('height', `${height}`);
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.style.backgroundColor = '#ffffff'; // Optional: white bg

    const rc = rough.svg(svg);

    // Group for Translation
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${-minX + padding}, ${-minY + padding})`);
    svg.appendChild(g);

    elements.forEach(el => {
        // Rotation Group
        let node: SVGElement | null = null;

        // Options
        const options: any = {
            seed: el.seed,
            roughness: el.roughness,
            stroke: el.strokeColor,
            strokeWidth: el.strokeWidth,
            fill: el.backgroundColor === 'transparent' ? undefined : el.backgroundColor,
            fillStyle: el.fillStyle,
            strokeLineDash: el.strokeStyle === 'dashed' ? [10, 10] : (el.strokeStyle === 'dotted' ? [5, 10] : undefined),
        };

        if (el.type === 'rectangle') {
            node = rc.rectangle(el.x, el.y, el.width, el.height, options);
        } else if (el.type === 'circle') {
            node = rc.ellipse(el.x + el.width / 2, el.y + el.height / 2, Math.abs(el.width), Math.abs(el.height), options);
        } else if (el.type === 'line' || el.type === 'arrow') {
            const endX = el.x + el.width;
            const endY = el.y + el.height;

            if (el.type === 'arrow') {
                // Composite for arrow
                // Since rough.svg returns ONE node, we use generator? 
                // Or we append multiple.
                // rc.line returns <path>.
                // We need a group for arrow.
                const arrowG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                arrowG.appendChild(rc.line(el.x, el.y, endX, endY, options));

                const angle = Math.atan2(el.height, el.width);
                const headLen = 15;
                const p1 = { x: endX - headLen * Math.cos(angle - Math.PI / 6), y: endY - headLen * Math.sin(angle - Math.PI / 6) };
                const p2 = { x: endX - headLen * Math.cos(angle + Math.PI / 6), y: endY - headLen * Math.sin(angle + Math.PI / 6) };

                arrowG.appendChild(rc.line(endX, endY, p1.x, p1.y, options));
                arrowG.appendChild(rc.line(endX, endY, p2.x, p2.y, options));
                node = arrowG;
            } else {
                node = rc.line(el.x, el.y, endX, endY, options);
            }
        } else if (el.type === 'text' && el.text) {
            const textText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            textText.textContent = el.text;
            textText.setAttribute('x', `${el.x}`);
            textText.setAttribute('y', `${el.y + (el.fontSize || 20)}`); // Baseline
            textText.setAttribute('fill', el.strokeColor);
            textText.setAttribute('font-family', 'sans-serif');
            textText.setAttribute('font-size', `${el.fontSize || 20}px`);
            node = textText;
        } else if (el.type === 'image' && el.dataURL) {
            const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
            image.setAttribute('href', el.dataURL);
            image.setAttribute('x', `${el.x}`);
            image.setAttribute('y', `${el.y}`);
            image.setAttribute('width', `${el.width}`);
            image.setAttribute('height', `${el.height}`);
            node = image;
        }

        if (node) {
            node.setAttribute('opacity', `${(el.opacity ?? 100) / 100}`);
            if (el.angle) {
                const cx = el.x + el.width / 2;
                const cy = el.y + el.height / 2;
                node.setAttribute('transform', `rotate(${el.angle * (180 / Math.PI)}, ${cx}, ${cy})`);
            }
            g.appendChild(node);
        }
    });

    const s = new XMLSerializer();
    const str = s.serializeToString(svg);
    const blob = new Blob([str], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'yappy_drawing.svg';
    link.href = url;
    link.click();
};
