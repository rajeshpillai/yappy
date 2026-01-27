import { type Component, For, Show, createSignal, createMemo } from 'solid-js';
import { store, updateElement, updateAnimation, reorderAnimation } from '../store/app-store';
import { sequenceAnimator } from '../utils/animation/sequence-animator';
import { Play, Square, Plus, Trash2, ChevronDown, ChevronRight, ChevronUp } from 'lucide-solid';
import type { ElementAnimation, PresetAnimation, RotateAnimation } from '../types/motion-types';

const PRESETS = [
    'drawIn', 'drawOut',
    'fadeIn', 'fadeOut',
    'slideInLeft', 'slideInRight', 'slideInUp', 'slideInDown',
    'zoomIn', 'zoomOut',
    'bounce', 'pulse', 'shakeX', 'shakeY', 'revolve'
];

const EASINGS = [
    'linear', 'easeInQuad', 'easeOutQuad', 'easeInOutQuad',
    'easeInCubic', 'easeOutCubic', 'easeInOutCubic',
    'easeInElastic', 'easeOutElastic', 'easeInOutElastic',
    'easeInBounce', 'easeOutBounce', 'easeInOutBounce'
];

export const AnimationPanel: Component = () => {
    const selectedId = createMemo(() => store.selection.length === 1 ? store.selection[0] : null);
    const element = createMemo(() => {
        const id = selectedId();
        return id ? store.elements.find(el => el.id === id) : null;
    });

    const [isAdding, setIsAdding] = createSignal(false);
    const [expandedIds, setExpandedIds] = createSignal<Set<string>>(new Set());

    const toggleExpanded = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const addPreset = (name: string) => {
        const el = element();
        if (!el) return;

        const newAnim: any = {
            id: crypto.randomUUID(),
            type: 'preset',
            name: name,
            duration: 1000,
            delay: 0,
            easing: 'easeOutQuad',
            trigger: el.animations?.length ? 'after-prev' : 'on-load',
            params: name === 'revolve' ? { radius: 50 } : undefined
        };

        const currentAnims = el.animations || [];
        updateElement(el.id, { animations: [...currentAnims, newAnim] }, true);
        setIsAdding(false);
    };

    const addRotateAnimation = () => {
        const el = element();
        if (!el) return;

        const newAnim: RotateAnimation = {
            id: crypto.randomUUID(),
            type: 'rotate',
            toAngle: 90,
            relative: true,
            duration: 1000,
            delay: 0,
            easing: 'easeOutQuad',
            trigger: el.animations?.length ? 'after-prev' : 'on-load'
        };

        const currentAnims = el.animations || [];
        updateElement(el.id, { animations: [...currentAnims, newAnim] }, true);
        setIsAdding(false);
    };

    const removeAnimation = (animId: string) => {
        const el = element();
        if (!el || !el.animations) return;
        updateElement(el.id, {
            animations: el.animations.filter(a => a.id !== animId)
        }, true);
    };

    const updateAnimProperty = (animId: string, updates: Partial<ElementAnimation>) => {
        const el = element();
        if (!el) return;

        updateAnimation(el.id, animId, updates, true);
    };

    const handleReorder = (animId: string, direction: 'up' | 'down') => {
        const id = selectedId();
        if (id) {
            reorderAnimation(id, animId, direction);
        }
    };

    const handlePlay = () => {
        const id = selectedId();
        if (id) {
            sequenceAnimator.playSequence(id, 'programmatic');
        }
    };

    const handleStop = () => {
        const id = selectedId();
        if (id) {
            sequenceAnimator.stopSequence(id);
        }
    };

    return (
        <div class="animation-panel">
            <div class="panel-header" style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '10px' }}>
                <h3 style={{ margin: 0, 'font-size': '14px', 'font-weight': 600 }}>Animations</h3>
                <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                        onClick={handleStop}
                        title="Stop Animation"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', 'border-radius': '4px', color: '#ef4444' }}
                        class="icon-btn"
                    >
                        <Square size={16} fill="currentColor" />
                    </button>
                    <button
                        onClick={handlePlay}
                        title="Preview Animation"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', 'border-radius': '4px', color: '#10b981' }}
                        class="icon-btn"
                    >
                        <Play size={16} fill="currentColor" />
                    </button>
                </div>
            </div>

            {/* Continuous / Physics Animations */}
            <Show when={element()}>
                <div style={{ 'margin-bottom': '12px', 'padding-bottom': '12px', 'border-bottom': '1px solid var(--border-color)' }}>
                    <div style={{ 'font-size': '12px', 'font-weight': 600, 'margin-bottom': '8px', 'opacity': 0.8 }}>Continuous Motion</div>

                    {/* Spin Control */}
                    <div style={{ 'margin-bottom': '8px' }}>
                        <div style={{ 'display': 'flex', 'align-items': 'center', 'justify-content': 'space-between', 'margin-bottom': '4px' }}>
                            <div style={{ 'display': 'flex', 'align-items': 'center', 'gap': '6px' }}>
                                <input
                                    type="checkbox"
                                    id="spin-toggle"
                                    checked={element()?.spinEnabled || false}
                                    onChange={(e) => updateElement(element()!.id, { spinEnabled: e.currentTarget.checked }, true)}
                                />
                                <label for="spin-toggle" style={{ 'font-size': '12px' }}>Auto-Spin</label>
                            </div>
                        </div>
                        <Show when={element()?.spinEnabled}>
                            <div style={{ 'display': 'flex', 'align-items': 'center', 'justify-content': 'space-between', 'padding-left': '20px' }}>
                                <label style={{ 'font-size': '11px', 'opacity': 0.7 }}>Speed</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={element()?.spinSpeed ?? 1}
                                    onInput={(e) => updateElement(element()!.id, { spinSpeed: Number(e.currentTarget.value) }, true)}
                                    style={{ 'width': '60px', 'font-size': '11px', 'padding': '2px 4px' }}
                                />
                            </div>
                        </Show>
                    </div>

                    {/* Orbit Control */}
                    <div>
                        <div style={{ 'display': 'flex', 'align-items': 'center', 'justify-content': 'space-between', 'margin-bottom': '4px' }}>
                            <div style={{ 'display': 'flex', 'align-items': 'center', 'gap': '6px' }}>
                                <input
                                    type="checkbox"
                                    id="orbit-toggle"
                                    checked={element()?.orbitEnabled || false}
                                    onChange={(e) => updateElement(element()!.id, { orbitEnabled: e.currentTarget.checked }, true)}
                                />
                                <label for="orbit-toggle" style={{ 'font-size': '12px' }}>Orbital</label>
                            </div>
                        </div>
                        <Show when={element()?.orbitEnabled}>
                            <div style={{ 'display': 'flex', 'flex-direction': 'column', 'gap': '4px', 'padding-left': '20px' }}>
                                <div style={{ 'display': 'flex', 'align-items': 'center', 'justify-content': 'space-between' }}>
                                    <label style={{ 'font-size': '11px', 'opacity': 0.7 }}>Center ID</label>
                                    <input
                                        type="text"
                                        value={element()?.orbitCenterId ?? ''}
                                        onInput={(e) => updateElement(element()!.id, { orbitCenterId: e.currentTarget.value }, true)}
                                        placeholder="Target ID"
                                        style={{ 'width': '80px', 'font-size': '10px', 'padding': '2px 4px' }}
                                    />
                                </div>
                                <div style={{ 'display': 'flex', 'align-items': 'center', 'justify-content': 'space-between' }}>
                                    <label style={{ 'font-size': '11px', 'opacity': 0.7 }}>Radius</label>
                                    <input
                                        type="number"
                                        value={element()?.orbitRadius ?? 100}
                                        onInput={(e) => updateElement(element()!.id, { orbitRadius: Number(e.currentTarget.value) }, true)}
                                        style={{ 'width': '60px', 'font-size': '11px', 'padding': '2px 4px' }}
                                    />
                                </div>
                                <div style={{ 'display': 'flex', 'align-items': 'center', 'justify-content': 'space-between' }}>
                                    <label style={{ 'font-size': '11px', 'opacity': 0.7 }}>Speed</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={element()?.orbitSpeed ?? 1}
                                        onInput={(e) => updateElement(element()!.id, { orbitSpeed: Number(e.currentTarget.value) }, true)}
                                        style={{ 'width': '60px', 'font-size': '11px', 'padding': '2px 4px' }}
                                    />
                                </div>
                            </div>
                        </Show>
                    </div>
                </div>
            </Show>

            <div class="animation-list" style={{ display: 'flex', 'flex-direction': 'column', gap: '8px' }}>
                <For each={element()?.animations || []}>
                    {(anim, index) => (
                        <AnimationItem
                            animation={anim}
                            index={index()}
                            total={element()?.animations?.length || 0}
                            expanded={expandedIds().has(anim.id)}
                            onToggle={() => toggleExpanded(anim.id)}
                            onUpdate={(u) => updateAnimProperty(anim.id, u)}
                            onRemove={() => removeAnimation(anim.id)}
                            onReorder={(d) => handleReorder(anim.id, d)}
                        />
                    )}
                </For>
            </div>

            <Show when={!isAdding()}>
                <button
                    onClick={() => setIsAdding(true)}
                    style={{
                        'width': '100%',
                        'margin-top': '10px',
                        'padding': '8px',
                        'display': 'flex',
                        'justify-content': 'center',
                        'align-items': 'center',
                        'gap': '6px',
                        'background': 'var(--bg-secondary)',
                        'border': '1px dashed var(--border-color)',
                        'border-radius': '6px',
                        'cursor': 'pointer',
                        'font-size': '12px'
                    }}
                >
                    <Plus size={14} /> Add Animation
                </button>
            </Show>

            <Show when={isAdding()}>
                <div class="add-menu" style={{
                    'margin-top': '10px',
                    'background': 'var(--bg-secondary)',
                    'padding': '8px',
                    'border-radius': '6px',
                    'border': '1px solid var(--border-color)'
                }}>
                    <div style={{ 'font-size': '12px', 'margin-bottom': '6px', 'font-weight': 500 }}>Select Preset</div>
                    <div style={{ 'display': 'grid', 'grid-template-columns': '1fr 1fr', 'gap': '4px' }}>
                        <For each={PRESETS}>
                            {preset => (
                                <button
                                    onClick={() => addPreset(preset)}
                                    style={{
                                        'text-align': 'left',
                                        'padding': '4px 8px',
                                        'border': 'none',
                                        'background': 'var(--bg-panel)',
                                        'border-radius': '4px',
                                        'cursor': 'pointer',
                                        'font-size': '11px'
                                    }}
                                >
                                    {preset}
                                </button>
                            )}
                        </For>
                    </div>

                    <div style={{ 'margin-top': '8px', 'padding-top': '8px', 'border-top': '1px solid var(--border-color)', 'display': 'flex', 'gap': '4px' }}>
                        <button
                            onClick={addRotateAnimation}
                            style={{
                                'flex': 1,
                                'padding': '6px',
                                'border': 'none',
                                'background': '#3b82f6',
                                'color': 'white',
                                'border-radius': '4px',
                                'cursor': 'pointer',
                                'font-size': '11px',
                                'font-weight': 600
                            }}
                        >
                            + Add Rotate
                        </button>
                    </div>

                    <button
                        onClick={() => setIsAdding(false)}
                        style={{ 'width': '100%', 'margin-top': '8px', 'padding': '4px', 'font-size': '11px', 'cursor': 'pointer' }}
                    >
                        Cancel
                    </button>
                </div>
            </Show>
        </div>
    );
};

const AnimationItem: Component<{
    animation: ElementAnimation;
    index: number;
    total: number;
    expanded: boolean;
    onToggle: () => void;
    onUpdate: (updates: Partial<ElementAnimation>) => void;
    onRemove: () => void;
    onReorder: (direction: 'up' | 'down') => void;
}> = (props) => {

    return (
        <div style={{
            'background': 'var(--bg-secondary)',
            'border-radius': '6px',
            'border': '1px solid var(--border-color)',
            'overflow': 'hidden'
        }}>
            <div
                style={{
                    'display': 'flex',
                    'align-items': 'center',
                    'padding': '8px',
                    'cursor': 'pointer',
                    'background': props.expanded ? 'rgba(0,0,0,0.03)' : 'transparent'
                }}
                onClick={() => props.onToggle()}
            >
                <div style={{ 'margin-right': '6px', 'display': 'flex' }}>
                    {props.expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </div>
                <div style={{ 'flex': 1, 'font-size': '12px', 'font-weight': 500 }}>
                    {props.animation.type === 'preset' ? (props.animation as PresetAnimation).name :
                        props.animation.type === 'rotate' ? 'Rotate' : 'Property'}
                    <span style={{ 'margin-left': '6px', 'opacity': 0.5, 'font-size': '10px' }}>
                        {props.animation.duration}ms
                    </span>
                </div>
                <div style={{ 'display': 'flex', 'gap': '4px', 'margin-right': '4px' }}>
                    <Show when={props.index > 0}>
                        <button
                            onClick={(e) => { e.stopPropagation(); props.onReorder('up'); }}
                            style={{ 'border': 'none', 'background': 'none', 'cursor': 'pointer', 'opacity': 0.6, 'padding': '2px' }}
                            title="Move Up"
                        >
                            <ChevronUp size={14} />
                        </button>
                    </Show>
                    <Show when={props.index < props.total - 1}>
                        <button
                            onClick={(e) => { e.stopPropagation(); props.onReorder('down'); }}
                            style={{ 'border': 'none', 'background': 'none', 'cursor': 'pointer', 'opacity': 0.6, 'padding': '2px' }}
                            title="Move Down"
                        >
                            <ChevronDown size={14} />
                        </button>
                    </Show>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); props.onRemove(); }}
                    style={{ 'border': 'none', 'background': 'none', 'cursor': 'pointer', 'opacity': 0.6, 'padding': '2px' }}
                >
                    <Trash2 size={14} />
                </button>
            </div>

            <Show when={props.expanded}>
                <div style={{ 'padding': '8px', 'border-top': '1px solid var(--border-color)', 'display': 'flex', 'flex-direction': 'column', 'gap': '8px' }}>

                    {/* Trigger */}
                    <div style={{ 'display': 'flex', 'align-items': 'center', 'justify-content': 'space-between' }}>
                        <label style={{ 'font-size': '11px', 'opacity': 0.7 }}>Trigger</label>
                        <select
                            value={props.animation.trigger}
                            onChange={(e) => props.onUpdate({ trigger: e.currentTarget.value as any })}
                            style={{ 'font-size': '11px', 'padding': '2px 4px', 'width': '80px' }}
                        >
                            <option value="on-load">On Load</option>
                            <option value="on-click">On Click</option>
                            <option value="after-prev">After Previous</option>
                            <option value="with-prev">With Previous</option>
                        </select>
                    </div>

                    {/* Duration */}
                    <div style={{ 'display': 'flex', 'align-items': 'center', 'justify-content': 'space-between' }}>
                        <label style={{ 'font-size': '11px', 'opacity': 0.7 }}>Duration (ms)</label>
                        <input
                            type="number"
                            step="100"
                            min="0"
                            value={props.animation.duration}
                            onInput={(e) => props.onUpdate({ duration: Number(e.currentTarget.value) })}
                            style={{ 'width': '60px', 'font-size': '11px', 'padding': '2px 4px' }}
                        />
                    </div>

                    {/* Delay */}
                    <div style={{ 'display': 'flex', 'align-items': 'center', 'justify-content': 'space-between' }}>
                        <label style={{ 'font-size': '11px', 'opacity': 0.7 }}>Delay (ms)</label>
                        <input
                            type="number"
                            step="100"
                            min="0"
                            value={props.animation.delay}
                            onInput={(e) => props.onUpdate({ delay: Number(e.currentTarget.value) })}
                            style={{ 'width': '60px', 'font-size': '11px', 'padding': '2px 4px' }}
                        />
                    </div>

                    {/* Easing */}
                    <div style={{ 'display': 'flex', 'align-items': 'center', 'justify-content': 'space-between' }}>
                        <label style={{ 'font-size': '11px', 'opacity': 0.7 }}>Easing</label>
                        <select
                            value={props.animation.easing}
                            onChange={(e) => props.onUpdate({ easing: e.currentTarget.value as any })}
                            style={{ 'font-size': '11px', 'padding': '2px 4px', 'width': '100px' }}
                        >
                            <For each={EASINGS}>{easing => <option value={easing}>{easing}</option>}</For>
                        </select>
                    </div>

                    {/* Loop Settings */}
                    <div style={{ 'display': 'flex', 'align-items': 'center', 'gap': '8px', 'margin-top': '4px' }}>
                        <input
                            type="checkbox"
                            id={`loop-${props.animation.id}`}
                            checked={props.animation.repeat === -1}
                            onChange={(e) => props.onUpdate({ repeat: e.currentTarget.checked ? -1 : 0 })}
                        />
                        <label for={`loop-${props.animation.id}`} style={{ 'font-size': '11px', 'opacity': 0.7, 'cursor': 'pointer' }}>
                            Loop Infinitely
                        </label>
                    </div>

                    <Show when={props.animation.repeat === -1}>
                        <div style={{ 'display': 'flex', 'align-items': 'center', 'gap': '8px' }}>
                            <input
                                type="checkbox"
                                id={`yoyo-${props.animation.id}`}
                                checked={props.animation.yoyo || false}
                                onChange={(e) => props.onUpdate({ yoyo: e.currentTarget.checked })}
                            />
                            <label for={`yoyo-${props.animation.id}`} style={{ 'font-size': '11px', 'opacity': 0.7, 'cursor': 'pointer' }}>
                                Ping-Pong (Yoyo)
                            </label>
                        </div>
                    </Show>

                    {/* Specialized Rotate Settings */}
                    <Show when={props.animation.type === 'rotate'}>
                        <div style={{ 'display': 'flex', 'align-items': 'center', 'justify-content': 'space-between' }}>
                            <label style={{ 'font-size': '11px', 'opacity': 0.7 }}>To Angle (deg)</label>
                            <input
                                type="number"
                                step="15"
                                value={(props.animation as any).toAngle}
                                onInput={(e) => props.onUpdate({ toAngle: Number(e.currentTarget.value) } as any)}
                                style={{ 'width': '60px', 'font-size': '11px', 'padding': '2px 4px' }}
                            />
                        </div>
                        <div style={{ 'display': 'flex', 'align-items': 'center', 'gap': '8px' }}>
                            <input
                                type="checkbox"
                                id={`rel-${props.animation.id}`}
                                checked={(props.animation as any).relative || false}
                                onChange={(e) => props.onUpdate({ relative: e.currentTarget.checked } as any)}
                            />
                            <label for={`rel-${props.animation.id}`} style={{ 'font-size': '11px', 'opacity': 0.7, 'cursor': 'pointer' }}>
                                Relative to current
                            </label>
                        </div>
                    </Show>

                    {/* Specialized Preset Settings (e.g. Revolve Radius) */}
                    <Show when={props.animation.type === 'preset' && (props.animation as PresetAnimation).name === 'revolve'}>
                        <div style={{ 'display': 'flex', 'align-items': 'center', 'justify-content': 'space-between' }}>
                            <label style={{ 'font-size': '11px', 'opacity': 0.7 }}>Radius (px)</label>
                            <input
                                type="number"
                                step="10"
                                value={(props.animation as any).params?.radius ?? 50}
                                onInput={(e) => {
                                    const params = { ...(props.animation as any).params, radius: Number(e.currentTarget.value) };
                                    props.onUpdate({ params });
                                }}
                                style={{ 'width': '60px', 'font-size': '11px', 'padding': '2px 4px' }}
                            />
                        </div>
                    </Show>

                    {/* Restore State */}
                    <div style={{ 'display': 'flex', 'align-items': 'center', 'gap': '8px', 'margin-top': '4px' }}>
                        <input
                            type="checkbox"
                            id={`restore-${props.animation.id}`}
                            checked={props.animation.restoreAfter || false}
                            onChange={(e) => props.onUpdate({ restoreAfter: e.currentTarget.checked })}
                        />
                        <label for={`restore-${props.animation.id}`} style={{ 'font-size': '11px', 'opacity': 0.7, 'cursor': 'pointer' }}>
                            Restore state after finish
                        </label>
                    </div>

                </div>
            </Show>
        </div>
    );
};
