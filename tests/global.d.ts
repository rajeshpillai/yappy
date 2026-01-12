
interface Window {
    Yappy: {
        state: any;
        clear: () => void;
        createRectangle: (x: number, y: number, w: number, h: number) => void;
        createCircle: (x: number, y: number, w: number, h: number) => void;
        createDiamond: (x: number, y: number, w: number, h: number) => void;
        createText: (x: number, y: number, text: string) => void;
        connect: (start: { x: number, y: number }, end: { x: number, y: number }, curveType: string) => void;
        setSelected: (ids: string[]) => void;
        updateGridSettings: (settings: any) => void;
    };
}
