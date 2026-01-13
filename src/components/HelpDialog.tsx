import { type Component, Show } from "solid-js";
import { X, ExternalLink, Github, Youtube, Bug } from "lucide-solid";
import "./HelpDialog.css";

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const HelpDialog: Component<Props> = (props) => {
    return (
        <Show when={props.isOpen}>
            <div class="help-modal-overlay" onClick={props.onClose}>
                <div class="help-modal-content" onClick={(e) => e.stopPropagation()}>
                    <div class="help-modal-header">
                        <h2>Help</h2>
                        <button class="help-close-btn" onClick={props.onClose}>
                            <X size={24} />
                        </button>
                    </div>

                    <div class="help-modal-body">
                        {/* Social / External Links */}
                        <div class="social-links">
                            <a href="#" class="social-btn">
                                <ExternalLink size={16} />
                                Documentation
                            </a>
                            <a href="https://github.com/rajeshpillai" target="_blank" rel="noopener noreferrer" class="social-btn">
                                <Github size={16} />
                                GitHub
                            </a>
                            <a href="#" class="social-btn">
                                <Bug size={16} />
                                Found an issue?
                            </a>
                            <a href="#" class="social-btn">
                                <Youtube size={16} />
                                YouTube
                            </a>
                        </div>

                        <div class="shortcuts-section">
                            <h3>Keyboard shortcuts</h3>

                            <div class="shortcuts-grid">
                                {/* Tools Shortcuts */}
                                <div class="shortcut-column">
                                    <h4>Tools</h4>
                                    <div class="shortcut-list">
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Hand (pan)</span>
                                            <div class="shortcut-keys"><span class="keycap">H</span></div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Selection</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">V</span>
                                                <span class="key-or">or</span>
                                                <span class="keycap">1</span>
                                            </div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Rectangle</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">R</span>
                                                <span class="key-or">or</span>
                                                <span class="keycap">2</span>
                                            </div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Ellipse</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">O</span>
                                                <span class="key-or">or</span>
                                                <span class="keycap">3</span>
                                            </div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Line</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">L</span>
                                                <span class="key-or">or</span>
                                                <span class="keycap">4</span>
                                            </div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Arrow</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">A</span>
                                                <span class="key-or">or</span>
                                                <span class="keycap">5</span>
                                            </div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Text</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">T</span>
                                                <span class="key-or">or</span>
                                                <span class="keycap">6</span>
                                            </div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Eraser</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">E</span>
                                                <span class="key-or">or</span>
                                                <span class="keycap">7</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Editor Shortcuts */}
                                <div class="shortcut-column">
                                    <h4>Editor</h4>
                                    <div class="shortcut-list">
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Undo</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">Ctrl</span>
                                                <span class="keycap">Z</span>
                                            </div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Redo</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">Ctrl</span>
                                                <span class="keycap">Y</span>
                                            </div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Delete</span>
                                            <div class="shortcut-keys"><span class="keycap">Del</span></div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Multi-select</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">Shift</span>
                                                <span class="text-sm" style={{ "margin-left": "4px" }}>+ click/drag</span>
                                            </div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Select All</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">Ctrl</span>
                                                <span class="keycap">A</span>
                                            </div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Copy</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">Ctrl</span>
                                                <span class="keycap">C</span>
                                            </div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Paste</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">Ctrl</span>
                                                <span class="keycap">V</span>
                                            </div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Cut</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">Ctrl</span>
                                                <span class="keycap">X</span>
                                            </div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Duplicate</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">Ctrl</span>
                                                <span class="keycap">D</span>
                                            </div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Bring to Front</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">Ctrl</span>
                                                <span class="keycap">]</span>
                                            </div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Send to Back</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">Ctrl</span>
                                                <span class="keycap">[</span>
                                            </div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Group selection</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">Ctrl</span>
                                                <span class="keycap">G</span>
                                            </div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Ungroup selection</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">Ctrl</span>
                                                <span class="keycap">Shift</span>
                                                <span class="keycap">G</span>
                                            </div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Move Canvas</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">Space</span>
                                                <span class="text-sm" style={{ "margin-left": "4px" }}>+ drag</span>
                                            </div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Zoom In/Out</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">Ctrl</span>
                                                <span class="text-sm" style={{ "margin-left": "4px" }}>+ wheel</span>
                                            </div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">New Layer</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">Shift</span>
                                                <span class="keycap">N</span>
                                            </div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Reorder Layer</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">Alt</span>
                                                <span class="keycap">[</span>
                                                <span class="key-or">/</span>
                                                <span class="keycap">]</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Show>
    );
};

export default HelpDialog;
