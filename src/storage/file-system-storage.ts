import type { StorageInterface, DrawingData, DocumentData, SlideDocument } from "./storage-interface";
import { isSlideDocument } from "./storage-interface";
import { migrateToSlideFormat } from "../utils/migration";

export class FileSystemStorage implements StorageInterface {
    private baseUrl = '/api/drawings';

    async saveDrawing(id: string, data: DrawingData | SlideDocument): Promise<void> {
        let payload: SlideDocument;

        if (isSlideDocument(data)) {
            // Already v3 format - just update timestamp
            payload = {
                ...data,
                metadata: {
                    ...data.metadata,
                    updatedAt: new Date().toISOString()
                }
            };
        } else {
            // Legacy v2 format - convert to v3
            payload = migrateToSlideFormat(data);
        }

        // Auto-upgrade logic: Convert all legacy points to flat format on save
        payload.slides = payload.slides.map(slide => ({
            ...slide,
            elements: slide.elements.map(el => {
                if ((el.type === 'fineliner' || el.type === 'inkbrush' || el.type === 'marker') && el.points && typeof el.points[0] !== 'number') {
                    const flatPoints: number[] = [];
                    (el.points as any[]).forEach(p => {
                        flatPoints.push(p.x, p.y);
                    });
                    return { ...el, points: flatPoints, pointsEncoding: 'flat' as const };
                }
                return el;
            })
        }));

        await fetch(`${this.baseUrl}/${id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
    }

    async loadDrawing(id: string): Promise<DocumentData | null> {
        const response = await fetch(`${this.baseUrl}/${id}`);
        if (!response.ok) return null;
        return await response.json();
    }

    async listDrawings(): Promise<string[]> {
        const response = await fetch(this.baseUrl);
        if (!response.ok) return [];
        return await response.json();
    }

    async deleteDrawing(id: string): Promise<void> {
        await fetch(`${this.baseUrl}/${id}`, {
            method: 'DELETE',
        });
    }
}

export const storage = new FileSystemStorage();
