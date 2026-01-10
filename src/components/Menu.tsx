import { type Component, createSignal, onMount } from "solid-js";
import { storage } from "../storage/FileSystemStorage";
import { store, setStore } from "../store/appStore";

const Menu: Component = () => {
    const [drawingId, setDrawingId] = createSignal('default');

    const handleSave = async () => {
        try {
            await storage.saveDrawing(drawingId(), {
                elements: store.elements,
                viewState: store.viewState
            });
            alert('Drawing saved!');
        } catch (e) {
            console.error(e);
            alert('Failed to save');
        }
    };

    const handleLoad = async () => {
        try {
            const data = await storage.loadDrawing(drawingId());
            if (data) {
                setStore({ elements: data.elements, viewState: data.viewState });
            } else {
                alert('Drawing not found');
            }
        } catch (e) {
            console.error(e);
            alert('Failed to load');
        }
    };

    const handleNew = () => {
        if (confirm('Clear canvas?')) {
            setStore({ elements: [], viewState: { scale: 1, panX: 0, panY: 0 } });
        }
    };

    const handleShare = () => {
        const url = `${window.location.origin}${window.location.pathname}?id=${drawingId()}`;
        navigator.clipboard.writeText(url);
        alert(`Link copied: ${url}`);
    };

    onMount(() => {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        if (id) {
            setDrawingId(id);
            handleLoad();
        }
    });

    return (
        <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            display: 'flex',
            gap: '10px',
            padding: '10px',
            background: 'white',
            "border-radius": '8px',
            "box-shadow": '0 2px 10px rgba(0,0,0,0.1)'
        }}>
            <input
                type="text"
                value={drawingId()}
                onInput={(e) => setDrawingId(e.currentTarget.value)}
                style={{ padding: '8px', border: '1px solid #ccc', "border-radius": '4px' }}
            />
            <button onClick={handleSave} style={{ padding: '8px', cursor: 'pointer' }}>Save</button>
            <button onClick={handleLoad} style={{ padding: '8px', cursor: 'pointer' }}>Load</button>
            <button onClick={handleShare} style={{ padding: '8px', cursor: 'pointer' }}>Share</button>
            <button onClick={handleNew} style={{ padding: '8px', cursor: 'pointer' }}>New</button>
        </div>
    );
};

export default Menu;
