import { type Component } from "solid-js";
import { store, duplicateLayer, deleteLayer, mergeLayerDown, flattenLayers, isolateLayer, showAllLayers, updateLayer } from "../store/appStore";
import ContextMenu, { type MenuItem } from "./ContextMenu";

interface Props {
    x: number;
    y: number;
    layerId: string;
    onClose: () => void;
    onRename: (id: string) => void;
}

const LayerContextMenu: Component<Props> = (props) => {
    const layer = () => store.layers.find(l => l.id === props.layerId);

    if (!layer()) return null;

    const items: MenuItem[] = [
        {
            label: "Rename",
            onClick: () => props.onRename(props.layerId),
            shortcut: "Enter"
        },
        {
            label: "Duplicate",
            onClick: () => duplicateLayer(props.layerId)
        },
        { separator: true },
        {
            label: layer()!.visible ? "Hide Layer" : "Show Layer",
            onClick: () => updateLayer(props.layerId, { visible: !layer()!.visible }),
            checked: layer()!.visible
        },
        {
            label: layer()!.locked ? "Unlock Layer" : "Lock Layer",
            onClick: () => updateLayer(props.layerId, { locked: !layer()!.locked }),
            checked: layer()!.locked
        },
        {
            label: "Isolate Layer",
            onClick: () => isolateLayer(props.layerId)
        },
        {
            label: "Show All Layers",
            onClick: () => showAllLayers()
        },
        { separator: true },
        {
            label: "Merge Down",
            onClick: () => mergeLayerDown(props.layerId),
            disabled: store.layers.findIndex(l => l.id === props.layerId) === 0 // 0 is bottom
        },
        {
            label: "Flatten Layers",
            onClick: () => flattenLayers(),
            disabled: store.layers.length <= 1
        },
        {
            label: "Delete",
            onClick: () => deleteLayer(props.layerId),
            disabled: store.layers.length <= 1,
            separator: false // Just being explicit
        }
    ];

    return (
        <ContextMenu
            x={props.x}
            y={props.y}
            items={items}
            onClose={props.onClose}
        />
    );
};

export default LayerContextMenu;
