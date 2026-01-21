import type { StorageInterface, DrawingData } from "./storage-interface";

export class FileSystemStorage implements StorageInterface {
    private baseUrl = '/api/drawings';

    async saveDrawing(id: string, data: DrawingData): Promise<void> {
        // Auto-upgrade logic: Convert all legacy points to flat format on save
        const upgradedElements = data.elements.map(el => {
            if ((el.type === 'fineliner' || el.type === 'inkbrush' || el.type === 'marker') && el.points && typeof el.points[0] !== 'number') {
                const flatPoints: number[] = [];
                (el.points as any[]).forEach(p => {
                    flatPoints.push(p.x, p.y);
                });
                return { ...el, points: flatPoints, pointsEncoding: 'flat' as const };
            }
            return el;
        });

        const payload: DrawingData = {
            ...data,
            version: 2,
            elements: upgradedElements
        };

        await fetch(`${this.baseUrl}/${id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
    }

    async loadDrawing(id: string): Promise<DrawingData | null> {
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
