import { type Component, Show } from "solid-js";
import { X, ExternalLink, Github, Youtube, Bug } from "lucide-solid";
import "./help-dialog.css";

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
                                            <span class="shortcut-label">Circle</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">O</span>
                                                <span class="key-or">or</span>
                                                <span class="keycap">3</span>
                                            </div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Diamond</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">D</span>
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
                                            <span class="shortcut-label">Pencil</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">P</span>
                                                <span class="key-or">or</span>
                                                <span class="keycap">8</span>
                                            </div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Insert Image</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">I</span>
                                                <span class="key-or">or</span>
                                                <span class="keycap">9</span>
                                            </div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Bezier Curve</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">B</span>
                                                <span class="key-or">or</span>
                                                <span class="keycap">0</span>
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
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Laser Pointer</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">Alt</span>
                                                <span class="keycap">P</span>
                                            </div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Ink Overlay</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">Alt</span>
                                                <span class="keycap">I</span>
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
                                        {/* Mindmap Shortcuts */}
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Add Child Node</span>
                                            <div class="shortcut-keys"><span class="keycap">Tab</span></div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Add Sibling Node</span>
                                            <div class="shortcut-keys"><span class="keycap">Enter</span></div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Toggle Collapse</span>
                                            <div class="shortcut-keys"><span class="keycap">Space</span></div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Toggle Selection</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">Ctrl</span>
                                                <span class="keycap">Click</span>
                                            </div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Open File</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">Ctrl</span>
                                                <span class="keycap">O</span>
                                            </div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Save File</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">Ctrl</span>
                                                <span class="keycap">S</span>
                                            </div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Export Image/Video</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">Ctrl</span>
                                                <span class="keycap">Shift</span>
                                                <span class="keycap">E</span>
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
                                            <span class="shortcut-label">New Sketch</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">Alt</span>
                                                <span class="keycap">N</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Design & Layers Shortcuts */}
                                <div class="shortcut-column">
                                    <h4>Design & Layers</h4>
                                    <div class="shortcut-list">
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Switch Layer</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">Alt</span>
                                                <span class="keycap">1-9</span>
                                            </div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Cycle Stroke Style</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">S</span>
                                            </div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Cycle Fill Style</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">F</span>
                                            </div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Toggle Properties</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">Alt</span>
                                                <span class="keycap">Enter</span>
                                            </div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Toggle Layers</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">Alt</span>
                                                <span class="keycap">L</span>
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
                                            <span class="shortcut-label">Zen Mode</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">Alt</span>
                                                <span class="keycap">Z</span>
                                            </div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Toggle Grid</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">Shift</span>
                                                <span class="keycap">'</span>
                                            </div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Snap to Grid</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">Shift</span>
                                                <span class="keycap">;</span>
                                            </div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Toggle Minimap</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">Alt</span>
                                                <span class="keycap">M</span>
                                            </div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Toggle Panels</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">Alt</span>
                                                <span class="keycap">\</span>
                                            </div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Display State Panel</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">Alt</span>
                                                <span class="keycap">S</span>
                                            </div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Next / Prev State</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">Alt</span>
                                                <span class="keycap">→</span>
                                                <span class="keycap">Alt</span>
                                                <span class="keycap">←</span>
                                            </div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Reset to 1st State</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">Home</span>
                                            </div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Help Dialog</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">Shift</span>
                                                <span class="keycap">?</span>
                                            </div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Preview Mode</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">F5</span>
                                            </div>
                                        </div>
                                        <div class="shortcut-item">
                                            <span class="shortcut-label">Exit Preview</span>
                                            <div class="shortcut-keys">
                                                <span class="keycap">Esc</span>
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
