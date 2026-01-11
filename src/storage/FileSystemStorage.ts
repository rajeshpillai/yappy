import type { StorageInterface, DrawingData } from "./StorageInterface";

export class FileSystemStorage implements StorageInterface {
    private baseUrl = '/api/drawings';

    async saveDrawing(id: string, data: DrawingData): Promise<void> {
        await fetch(`${this.baseUrl}/${id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
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
