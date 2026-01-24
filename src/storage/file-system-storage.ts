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
        if (payload.version === 4 && payload.elements) {
            payload.elements = payload.elements.map(el => {
                if ((el.type === 'fineliner' || el.type === 'inkbrush' || el.type === 'marker') && el.points && typeof el.points[0] !== 'number') {
                    const flatPoints: number[] = [];
                    (el.points as any[]).forEach(p => {
                        flatPoints.push(p.x, p.y);
                    });
                    return { ...el, points: flatPoints, pointsEncoding: 'flat' as const };
                }
                return el;
            });
        }

        if (payload.slides) {
            payload.slides = payload.slides.map(slide => {
                const updatedSlide = { ...slide };
                // Version 3 format had elements PER slide
                if ((updatedSlide as any).elements) {
                    (updatedSlide as any).elements = (updatedSlide as any).elements.map((el: any) => {
                        if ((el.type === 'fineliner' || el.type === 'inkbrush' || el.type === 'marker') && el.points && typeof el.points[0] !== 'number') {
                            const flatPoints: number[] = [];
                            (el.points as any[]).forEach((p: any) => {
                                flatPoints.push(p.x, p.y);
                            });
                            return { ...el, points: flatPoints, pointsEncoding: 'flat' as const };
                        }
                        return el;
                    });
                }
                return updatedSlide;
            });
        }

        const response = await fetch(`${this.baseUrl}/${id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Unknown server error' }));
            throw new Error(error.error || `Failed to save: ${response.statusText}`);
        }
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
        const response = await fetch(`${this.baseUrl}/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Unknown server error' }));
            throw new Error(error.error || `Failed to delete: ${response.statusText}`);
        }
    }
}

export const storage = new FileSystemStorage();
