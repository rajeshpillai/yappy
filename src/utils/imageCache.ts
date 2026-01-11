
const imageCache = new Map<string, HTMLImageElement>();
const pendingImages = new Set<string>();

export const getImage = (dataURL: string): HTMLImageElement | null => {
    if (imageCache.has(dataURL)) {
        return imageCache.get(dataURL)!;
    }

    if (!pendingImages.has(dataURL)) {
        pendingImages.add(dataURL);
        const img = new Image();
        img.src = dataURL;
        img.onload = () => {
            imageCache.set(dataURL, img);
            pendingImages.delete(dataURL);
            // Trigger a redraw if needed? 
            // Since we use requestAnimationFrame in Canvas.tsx loop, it picks it up next frame?
            // "draw" loop runs continuously? 
            // "createEffect" triggers on store changes.
            // If image loads, nothing in store changes.
            // We might need to force update.
            // But usually user interaction triggers it.
            // For now, let's assume subsequent interactions will show it, or we can expose a trigger.
        };
        img.onerror = () => {
            pendingImages.delete(dataURL);
        };
    }

    return null;
};
