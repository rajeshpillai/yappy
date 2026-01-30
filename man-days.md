# Project Effort Estimation (Man-Days)

> **Assumed Expertise Level**: Senior Frontend Engineer (5+ years experience)
> **Stack Proficiency**: High proficiency in React/SolidJS, Canvas/WebGL, and TypeScript.
> **Context**: Estimates assume "ideal coding days" (8 hours/day) without external blockers, meetings, or significant scope creep.
> **Current Scale**: ~40,958 lines of code (excluding node_modules/dist).

This document records the estimated engineering effort (in man-days) required for each completed feature/phase of the Yappy project.

| Phase | Feature / Component | Complexity | Estimated Man-Days | Status |
|-------|---------------------|------------|--------------------|--------|
| **Phase 1** | **Core Foundation** | High | **15.0** | ✅ Done |
| | Infinite Canvas Implementation | High | 7.0 | |
| |  Basic Drawing Tools (Rect, Circle, Line, Text) | Medium | 4.0 | |
| |  Storage Abstraction & File System | Medium | 3.0 | |
| |  Project Scaffolding & Setup | Low | 1.0 | |
| **Phase 2** | **UI Overhaul & Interactions** | Medium | **8.0** | ✅ Done |
| |  Excalidraw-style UI Styling | Medium | 4.0 | |
| |  Property Panel & Selection Logic | Medium | 4.0 | |
| **Phase 3** | **File Management** | Low | **1.0** | ✅ Done |
| |  File Open Modal & Logic | Low | 1.0 | |
| **Phase 4** | **Undo/Redo System** | High | **7.0** | ✅ Done |
| |  History Stack & State Management | High | 6.0 | |
| |  Keyboard Shortcuts & UI | Low | 1.0 | |
| **Phase 5** | **Eraser & Delete** | Medium | **4.0** | ✅ Done |
| |  Eraser Tool Interaction | Medium | 3.0 | |
| |  Delete Logic & Pan Tool | Low | 1.0 | |
| **Phase 6** | **Viewport & Optimization** | Medium | **4.5** | ✅ Done |
| |  Auto-Scroll & Scroll Stability | Medium | 3.5 | |
| |  "Back to Content" & Viewport Logic | Low | 1.0 | |
| **Phase 7** | **Text & Resize Enhancements** | Medium | **7.0** | ✅ Done |
| |  Text Resizing & Bounding Box Fixes | Medium | 3.5 | |
| |  Side Handles & Property Updates | Medium | 3.5 | |
| **Phase 8** | **RoughJS Integration** | High | **10.0** | ✅ Done |
| |  Sketch/Architectural Render Styles | High | 6.5 | |
| |  Dual Rendering Engine Integration | Medium | 3.5 | |
| **Phase 9** | **Initial Enhancements** | Medium | **7.0** | ✅ Done |
| |  Dark Mode Support | Medium | 3.5 | |
| |  Group Selection & Image Support | Medium | 3.5 | |
| **Phase 10** | **Mobile & Pen Support** | High | **12.0** | ✅ Done |
| |  Pointer Events Migration | High | 6.0 | |
| |  Pen Pressure & High-Frequency Rendering | High | 6.0 | |
| **Phase 11** | **UI Refinements** | Low | **1.5** | ✅ Done |
| |  Save/Load Refactoring | Low | 1.0 | |
| |  Welcome Screen | Low | 0.5 | |
| **Phase 12** | **Layer System** | Very High | **18.0** | ✅ Done |
| |  Core Layer Infrastructure & Store | High | 7.0 | |
| |  Layer Panel UI & Drag-Drop | High | 7.0 | |
| |  Layer locking, visibility, opacity | Medium | 4.0 | |
| **Phase 13** | **Layer Grouping** | High | **10.0** | ✅ Done |
| |  Nested Hierarchy Logic | High | 6.5 | |
| |  Group Expand/Collapse UI | Medium | 3.5 | |
| **Phase 14** | **Snap to Grid & Guides** | High | **12.0** | ✅ Done |
| |  Grid System & Rendering | Medium | 3.5 | |
| |  Object Snapping & Alignment Logic | High | 6.5 | |
| **Phase 15** | **New Shapes (Diamond etc.)** | Low | **1.0** | ✅ Done |
| **Phase 16** | **Alignment Tools** | Low | **1.0** | ✅ Done |
| **Phase 19** | **Text Inside Shapes** | Medium | **4.0** | ✅ Done |
| **Phase 20** | **Grouping Elements** | Medium | **3.5** | ✅ Done |
| **Phase 21** | **Connection Anchors** | Medium | **4.0** | ✅ Done |
| **Phase 30** | **Performance Optimization** | Very High | **15.0** | ✅ Done |
| |  Viewport Culling | High | 6.0 | |
| |  Render Loop Optimization | High | 6.0 | |
| |  Debounced Snapping | Medium | 3.0 | |
| **Phase 31** | **New Predefined Tools** | Medium | **7.0** | ✅ Done |
| |  16+ New Shapes & Rendering | High | 6.0 | |
| |  Shape Tool Group UI | Low | 1.0 | |
| **Phase 32** | **Specialized Shape Libraries** | Medium | **4.0** | ✅ Done |
| **Phase 38-41**| **Mindmap Features** | High | **12.0** | ✅ Done |
| |  Hierarchy Logic & Movement | High | 8.0 | |
| |  Organic Branches & Styling | Medium | 4.0 | |
| |  Keyboard Navigation | Low | 1.0 | |
| **Phase 56** | **Multi-Slide Presentation** | Very High | **22.0** | ✅ Done/In Progress |
| |  Slide Data Structure & State | High | 7.0 | |
| |  Slide Navigator UI | Medium | 4.0 | |
| |  Transitions & Animation Engine | High | 7.0 | |
| |  Drag-Drop Reordering & Context Menu | Medium | 4.0 | |
| **Phase 60** | **Advanced Animation** | High | **11.0** | ✅ Done |
| |  State Morphing (Magic Move) | High | 7.0 | |
| |  Keyframe Animation System | Medium | 4.0 | |
| **Phase 71** | **Canvas Performance 2.0** | High | **7.0** | ✅ Done |
| |  Map-based Lookups & Text Caching | High | 7.0 | |
| **Phase 72** | **File Compression** | Low | **1.0** | ✅ Done |
| **Phase 73** | **Slide Enhancements** | Medium | **5.0** | ✅ Done |
| |  Progress Toasts | Low | 0.5 | |
| |  Slide Backgrounds & Gradients | Medium | 4.5 | |
| **Phase 74** | **Offline Slide Player** | High | **3.0** | ✅ Done |
| | Standalone Player Scaffolding & Build | Medium | 0.5 | |
| | Asset Embedding & Template Injection | Medium | 0.5 | |
| | Standalone Renderer & Sync Logic | High | 1.0 | |

---

### **Total Estimated Effort: ~200.5 Man-Days**
*Note: This is a rough estimation of effective coding days for a single developer, excluding initial research, detailed design phases, and extensive QA cycles.*
