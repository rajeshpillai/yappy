import { createSignal, Show } from "solid-js";
import { Check, AlertCircle, Info, X } from "lucide-solid";
import "./toast.css";

export type ToastType = 'success' | 'error' | 'info';

const [toast, setToast] = createSignal<{ message: string; type: ToastType; visible: boolean }>({
    message: "",
    type: "info",
    visible: false
});

let timeoutId: number;

export const showToast = (message: string, type: ToastType = 'info', duration = 3000) => {
    setToast({ message, type, visible: true });

    if (timeoutId) clearTimeout(timeoutId);

    timeoutId = window.setTimeout(() => {
        setToast(prev => ({ ...prev, visible: false }));
    }, duration);
};

export const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
    if (timeoutId) clearTimeout(timeoutId);
};

const Toast = () => {
    return (
        <Show when={toast().visible}>
            <div class={`toast toast-${toast().type}`}>
                <div class="toast-icon">
                    <Show when={toast().type === 'success'}><Check size={18} /></Show>
                    <Show when={toast().type === 'error'}><AlertCircle size={18} /></Show>
                    <Show when={toast().type === 'info'}><Info size={18} /></Show>
                </div>
                <div class="toast-message">{toast().message}</div>
                <button class="toast-close" onClick={hideToast}>
                    <X size={14} />
                </button>
            </div>
        </Show>
    );
};

export default Toast;
