/**
 * Context Menu Builder
 * Pure function that builds context menu items based on current selection state.
 * Extracted from canvas.tsx getContextMenuItems().
 */

import type { DrawingElement } from '../types';
import type { MenuItem } from '../components/context-menu';
import {
    store, setStore, pushToHistory, updateElement,
    duplicateElement, groupSelected, ungroupSelected,
    bringToFront, sendToBack, moveElementZIndex,
    toggleGrid, toggleSnapToGrid, toggleZenMode,
    setViewState, setShowCanvasProperties, deleteElements,
    togglePropertyPanel, toggleCollapse, setParent, clearParent,
    addChildNode, addSiblingNode, reorderMindmap, applyMindmapStyling,
    zoomToFit, zoomToFitSlide
} from '../store/app-store';
import {
    copyToClipboard, cutToClipboard, pasteFromClipboard,
    copyStyle, pasteStyle, lockSelected, flipSelected
} from './object-context-actions';
import {
    getTransformOptions, getShapeIcon, getShapeTooltip,
    changeElementType, getCurveTypeOptions, getCurveTypeIcon, getCurveTypeTooltip
} from './element-transforms';
import { exportToPng, exportToSvg } from './export';

export function getContextMenuItems(redrawFn: () => void): MenuItem[] {
    const selectionCount = store.selection.length;
    const hasSelection = selectionCount > 0;
    const items: MenuItem[] = [];

    // In presentation mode, only show "Open Link" if element has one
    if (store.appMode === 'presentation') {
        if (selectionCount === 1) {
            const selectedEl = store.elements.find(e => e.id === store.selection[0]);
            if (selectedEl?.link) {
                items.push({
                    label: 'Open Link',
                    onClick: () => window.open(selectedEl.link!, '_blank', 'noopener')
                });
            }
        }
        return items;
    }

    if (hasSelection) {
        items.push(
            { label: 'Copy', shortcut: 'Ctrl+C', onClick: copyToClipboard },
            { label: 'Paste', shortcut: 'Ctrl+V', onClick: pasteFromClipboard },
            { label: 'Cut', shortcut: 'Ctrl+X', onClick: cutToClipboard },
            { label: 'Duplicate', shortcut: 'Ctrl+D', onClick: () => store.selection.forEach(id => duplicateElement(id)) },
            { separator: true }
        );

        // Hierarchy Submenu
        const firstId = store.selection[0];
        const firstEl = store.elements.find(e => e.id === firstId);
        if (firstEl) {
            const hierarchyItems: MenuItem[] = [];

            if (selectionCount === 1) {
                hierarchyItems.push({ label: 'Add Child', onClick: () => addChildNode(firstId) });
                if (firstEl.parentId) {
                    hierarchyItems.push({ label: 'Add Sibling', onClick: () => addSiblingNode(firstId) });
                }
                hierarchyItems.push({ separator: true });
            }

            if (firstEl.parentId) {
                hierarchyItems.push({ label: 'Clear Parent', onClick: () => clearParent(firstId) });
            }

            const hasChildren = store.elements.some(e => e.parentId === firstId);
            if (hasChildren) {
                hierarchyItems.push({
                    label: firstEl.isCollapsed ? 'Expand Subtree' : 'Collapse Subtree',
                    onClick: () => toggleCollapse(firstId)
                });
            }

            if (selectionCount === 2) {
                const childId = store.selection[0];
                const parentId = store.selection[1];
                hierarchyItems.push({
                    label: 'Set as Child of Selected',
                    onClick: () => setParent(childId, parentId)
                });
            }

            // Mindmap Auto Layout Submenu
            const autoLayoutItems: MenuItem[] = [
                { label: 'Horizontal (Right)', icon: '➡️', onClick: () => reorderMindmap(firstId, 'horizontal-right') },
                { label: 'Horizontal (Left)', icon: '⬅️', onClick: () => reorderMindmap(firstId, 'horizontal-left') },
                { label: 'Vertical (Down)', icon: '⬇️', onClick: () => reorderMindmap(firstId, 'vertical-down') },
                { label: 'Vertical (Up)', icon: '⬆️', onClick: () => reorderMindmap(firstId, 'vertical-up') },
                { label: 'Radial (Neuron)', icon: '🕸️', onClick: () => reorderMindmap(firstId, 'radial') },
            ];
            hierarchyItems.push({ separator: true });
            hierarchyItems.push({ label: 'Auto Layout', submenu: autoLayoutItems, icon: '🪄' });
            hierarchyItems.push({ label: 'Auto Style Branch', icon: '🎨', onClick: () => applyMindmapStyling(firstId) });

            if (hierarchyItems.length > 0) {
                items.push({ label: 'Hierarchy', submenu: hierarchyItems });
            }
        }

        // Batch Transform Logic (Split by Family)
        const allSelectedElements = store.selection.map(id => store.elements.find(e => e.id === id)).filter(Boolean) as DrawingElement[];

        // Filter selection into families
        const shapesInSelection = allSelectedElements.filter(el => {
            const type = el.type;
            return type !== 'line' && type !== 'arrow' && type !== 'bezier' && type !== 'organicBranch' && type !== 'text' && type !== 'image';
        });

        const connectorsInSelection = allSelectedElements.filter(el => {
            const type = el.type;
            return type === 'line' || type === 'arrow' || type === 'bezier' || type === 'organicBranch';
        });

        // 1. Transform Shapes
        if (shapesInSelection.length > 0) {
            let transformOptions = getTransformOptions(shapesInSelection[0].type);
            const distinctTypes = new Set(shapesInSelection.map(e => e.type));

            // If mixed types, allow converting to any of the present types as well (e.g. Rect+Circle -> convert all to Rect)
            if (distinctTypes.size > 1) {
                transformOptions.push(shapesInSelection[0].type);
            }

            if (transformOptions.length > 0) {
                items.push({
                    label: shapesInSelection.length > 1 ? `Transform ${shapesInSelection.length} Shapes` : 'Transform Shape',
                    submenu: transformOptions.map(t => ({
                        icon: getShapeIcon(t),
                        tooltip: getShapeTooltip(t),
                        onClick: () => {
                            pushToHistory();
                            shapesInSelection.forEach(el => changeElementType(el.id, t, false));
                            requestAnimationFrame(redrawFn);
                        }
                    })),
                    gridColumns: 3
                });
            }
        }

        // 2. Transform Connectors
        if (connectorsInSelection.length > 0) {
            let transformOptions = getTransformOptions(connectorsInSelection[0].type);
            const distinctTypes = new Set(connectorsInSelection.map(e => e.type));

            if (distinctTypes.size > 1) {
                transformOptions.push(connectorsInSelection[0].type);
            }

            if (transformOptions.length > 0) {
                items.push({
                    label: connectorsInSelection.length > 1 ? `Transform ${connectorsInSelection.length} Connectors` : 'Transform Connector',
                    submenu: transformOptions.map(t => ({
                        icon: getShapeIcon(t),
                        tooltip: getShapeTooltip(t),
                        onClick: () => {
                            pushToHistory();
                            connectorsInSelection.forEach(el => changeElementType(el.id, t, false));
                            requestAnimationFrame(redrawFn);
                        }
                    })),
                    gridColumns: 3
                });
            }
        }

        // 3. Change Curve Style (Connectors only)
        if (connectorsInSelection.length > 0) {
            const firstEl = connectorsInSelection[0];
            const currentCurveType = firstEl.curveType || 'straight';
            const curveOptions = getCurveTypeOptions(currentCurveType);

            const distinctCurveTypes = new Set(connectorsInSelection.map(e => e.curveType || 'straight'));
            if (distinctCurveTypes.size > 1) {
                curveOptions.push(currentCurveType);
            }

            if (curveOptions.length > 0) {
                items.push({
                    label: connectorsInSelection.length > 1 ? 'Change All Curve Styles' : 'Change Curve Style',
                    submenu: curveOptions.map(ct => ({
                        icon: getCurveTypeIcon(ct),
                        tooltip: getCurveTypeTooltip(ct),
                        onClick: () => {
                            pushToHistory();
                            connectorsInSelection.forEach(el => updateElement(el.id, { curveType: ct as any }, false));
                            requestAnimationFrame(redrawFn);
                        }
                    })),
                    gridColumns: 3
                });
            }
        }

        items.push({ separator: true });

        // Grouping
        if (selectionCount > 1) {
            items.push({ label: 'Group', shortcut: 'Ctrl+G', onClick: groupSelected });
        }

        const isAnyGrouped = store.selection.some(id => {
            const el = store.elements.find(e => e.id === id);
            return el?.groupIds && el.groupIds.length > 0;
        });

        if (isAnyGrouped) {
            items.push({ label: 'Ungroup', shortcut: 'Ctrl+Shift+G', onClick: ungroupSelected });
        }

        items.push({ separator: true });

        // Export Selection
        items.push(
            {
                label: 'Export as PNG',
                onClick: () => exportToPng(2, true, true) // 2x scale, white bg, selection only
            },
            {
                label: 'Export as SVG',
                onClick: () => exportToSvg(true) // selection only
            }
        );

        items.push({ separator: true });

        // Layering
        items.push(
            {
                label: 'Bring to Front', shortcut: 'Ctrl+]',
                onClick: () => bringToFront(store.selection)
            },
            {
                label: 'Send to Back', shortcut: 'Ctrl+[',
                onClick: () => sendToBack(store.selection)
            },
            {
                label: 'Bring Forward',
                onClick: () => store.selection.forEach(id => moveElementZIndex(id, 'forward'))
            },
            {
                label: 'Send Backward',
                onClick: () => store.selection.forEach(id => moveElementZIndex(id, 'backward'))
            },
            { separator: true }
        );

        // Styling
        if (selectionCount === 1) {
            items.push(
                { label: 'Copy Styles', shortcut: 'Ctrl+Alt+C', onClick: copyStyle },
                { label: 'Paste Styles', shortcut: 'Ctrl+Alt+V', onClick: pasteStyle },
            );
            const selectedEl = store.elements.find(e => e.id === store.selection[0]);
            if (selectedEl?.link) {
                items.push({
                    label: 'Open Link',
                    onClick: () => window.open(selectedEl.link!, '_blank', 'noopener')
                });
            }
            items.push({ separator: true });
        }

        // Lock / Flip / Delete
        const isLocked = store.selection.some(id => store.elements.find(e => e.id === id)?.locked);
        items.push(
            {
                label: isLocked ? 'Unlock' : 'Lock',
                shortcut: 'Ctrl+Shift+L',
                onClick: () => lockSelected(!isLocked)
            },
            {
                label: 'Flip Horizontal', shortcut: 'Shift+H',
                onClick: () => flipSelected('horizontal')
            },
            {
                label: 'Flip Vertical', shortcut: 'Shift+V',
                onClick: () => flipSelected('vertical')
            },
            { separator: true },
            {
                label: 'Delete', shortcut: 'Delete',
                onClick: () => deleteElements(store.selection)
            },
            { separator: true },
            {
                label: 'Show Properties',
                onClick: () => togglePropertyPanel(true)
            }
        );
    } else {
        // Default Canvas Menu
        items.push(
            { label: 'Paste', shortcut: 'Ctrl+V', onClick: pasteFromClipboard },
            { separator: true },
            { label: 'Select all', shortcut: 'Ctrl+A', onClick: () => setStore('selection', store.elements.map(e => e.id)) },
            { label: 'Zoom to Fit', shortcut: 'Shift+1', onClick: store.docType === 'slides' ? zoomToFitSlide : zoomToFit },
            { separator: true },
            { label: 'Show Grid', checked: store.gridSettings.enabled, onClick: toggleGrid },
            { label: 'Snap to Grid', checked: store.gridSettings.snapToGrid, onClick: toggleSnapToGrid },
            { label: 'Smart Snapping', checked: store.gridSettings.objectSnapping, onClick: () => setStore('gridSettings', 'objectSnapping', !store.gridSettings.objectSnapping) },
            { separator: true },
            { label: 'Zen Mode', shortcut: 'Alt+Z', checked: store.zenMode, onClick: toggleZenMode },
            { label: 'Reset View', onClick: () => setViewState({ scale: 1, panX: 0, panY: 0 }) },
            { separator: true },
            { label: 'Canvas Settings', onClick: () => setShowCanvasProperties(true) }
        );
    }
    return items;
}
