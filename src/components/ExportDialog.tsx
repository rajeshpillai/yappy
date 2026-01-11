import { type Component, createSignal, Show } from "solid-js";
import { X } from "lucide-solid";
import { exportToPng, exportToSvg } from "../utils/export";
import "./ExportDialog.css";

interface ExportDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

const ExportDialog: Component<ExportDialogProps> = (props) => {
    const [format, setFormat] = createSignal<'png' | 'svg'>('png');
    const [scale, setScale] = createSignal<number>(2);
    const [hasBackground, setHasBackground] = createSignal(true);

    const handleExport = () => {
        if (format() === 'png') {
            exportToPng(scale(), hasBackground());
        } else {
            exportToSvg();
        }
        props.onClose();
    };

    return (
        <Show when={props.isOpen}>
            <div class="export-modal-overlay" onClick={props.onClose}>
                <div class="export-modal" onClick={(e) => e.stopPropagation()}>
                    <div class="export-header">
                        <h3>Export Image</h3>
                        <button class="close-btn" onClick={props.onClose}>
                            <X size={20} />
                        </button>
                    </div>

                    <div class="export-options">
                        <div class="option-group">
                            <label>Format</label>
                            <div class="radio-group">
                                <label class="radio-label">
                                    <input type="radio" name="format" checked={format() === 'png'} onChange={() => setFormat('png')} />
                                    PNG
                                </label>
                                <label class="radio-label">
                                    <input type="radio" name="format" checked={format() === 'svg'} onChange={() => setFormat('svg')} />
                                    SVG
                                </label>
                            </div>
                        </div>

                        <Show when={format() === 'png'}>
                            <div class="option-group">
                                <label>Scale</label>
                                <div class="scale-group">
                                    <button class={`scale-btn ${scale() === 1 ? 'active' : ''}`} onClick={() => setScale(1)}>1x</button>
                                    <button class={`scale-btn ${scale() === 2 ? 'active' : ''}`} onClick={() => setScale(2)}>2x</button>
                                    <button class={`scale-btn ${scale() === 3 ? 'active' : ''}`} onClick={() => setScale(3)}>3x</button>
                                </div>
                            </div>

                            <div class="option-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" checked={hasBackground()} onChange={(e) => setHasBackground(e.currentTarget.checked)} />
                                    White Background
                                </label>
                            </div>
                        </Show>
                    </div>

                    <div class="export-actions">
                        <button class="cancel-btn" onClick={props.onClose}>Cancel</button>
                        <button class="export-confirm-btn" onClick={handleExport}>
                            Export
                        </button>
                    </div>
                </div>
            </div>
        </Show>
    );
};

export default ExportDialog;
