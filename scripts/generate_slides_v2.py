#!/usr/bin/env python3
"""
Generate presentation slides with improved structure based on feedback.
Incorporates: Intent Preservation, Review Skills, Feedback Loops, and clearer AI positioning.
"""
import json

# Updated slide content with better structure
slides_data = [
    # Intro
    {"x": 200, "title": "From Todo to Systems", "subtitle": "Architecting Software in the LLM Era"},
    
    # Core Goal (NEW - Making it explicit)
    {"x": 2200, "title": "The Goal", "bullets": [
        "Build correct systems when",
        "code is cheap and mistakes are expensive"
    ]},
    
    # Why This Talk
    {"x": 4200, "title": "Why this talk?", "bullets": [
        "LLMs generate code",
        "Engineers read & validate code",
        "Architecture becomes the main skill"
    ]},
    
    # Core Thesis
    {"x": 6200, "title": "Core Thesis", "bullets": [
        "Engineers are no longer typists",
        "They are Architects, Directors, Validators"
    ]},
    
    # Todo Foundation
    {"x": 8200, "title": "Everything Begins With Todo", "bullets": [
        "Todo is not a beginner exercise",
        "It's the minimal unit of all business software"
    ]},
    
    {"x": 10200, "title": "Todo teaches:", "bullets": [
        "State transitions",
        "Ownership",
        "Predictable complexity growth"
    ]},
    
    # The Belt System
    {"x": 12200, "title": "The Belt System", "bullets": [
        "CRUD → Performance",
        "Auth → Relationships",
        "Rules → Events → Instrumentation"
    ]},
    
    # Auth
    {"x": 14200, "title": "Auth Changes Everything", "bullets": [
        "Data now has ownership",
        "Authorization becomes contextual"
    ]},
    
    # Relationships
    {"x": 16200, "title": "Relationships Are the Core", "bullets": [
        "One-to-one",
        "One-to-many",
        "Many-to-many"
    ]},
    
    # Meta Models
    {"x": 18200, "title": "Frontend Meta Mindset", "bullets": [
        "UI is a projection of metadata"
    ]},
    
    {"x": 20200, "title": "Backend Meta Model", "bullets": [
        "Behavior is a projection of metadata"
    ]},
    
    # Backend Building Blocks
    {"x": 22200, "title": "Backend Building Blocks", "bullets": [
        "Domain • Database • Rules",
        "Messaging • Integrations",
        "Instrumentation"
    ]},
    
    # Rules
    {"x": 24200, "title": "Rule Engine", "bullets": [
        "Encodes business intent",
        "Must be dynamic, versioned",
        "and explainable"
    ]},
    
    # Events
    {"x": 26200, "title": "Messaging & Events", "bullets": [
        "Enable scale",
        "Async workflows",
        "Retries, Replays, Dead-letter queues"
    ]},
    
    # Instrumentation & Feedback Loops (ENHANCED)
    {"x": 28200, "title": "Instrumentation & Feedback Loops", "bullets": [
        "Not just logging",
        "How systems talk back to humans and AI",
        "Events become audit trails & explanations"
    ]},
    
    # NEW: Code Is an Output
    {"x": 30200, "title": "Code Is an Output", "bullets": [
        "Code is a rendering",
        "Architecture is the source",
        "Metadata is the truth"
    ]},
    
    # NEW: Intent Preservation
    {"x": 32200, "title": "Intent Preservation", "bullets": [
        "Biggest risk: not wrong code, but lost intent",
        "Why does this rule exist?",
        "What invariant must never break?",
        "What business promise does this API make?"
    ]},
    
    # Enter AI & LLMs
    {"x": 34200, "title": "Enter AI & LLMs", "bullets": [
        "LLMs generate code",
        "Humans define intent, constraints",
        "and correctness"
    ]},
    
    # NEW: What LLMs Are Bad At
    {"x": 36200, "title": "What LLMs Are Bad At", "bullets": [
        "Long-term consistency",
        "Cross-module invariants",
        "Domain nuance",
        "Hidden business rules",
        "LLMs optimize locally. Architects optimize globally."
    ]},
    
    # NEW: The AI Development Stack
    {"x": 38200, "title": "The AI Development Stack", "bullets": [
        "Human: Defines intent, sets constraints, approves",
        "LLM: Expands patterns, writes boilerplate",
        "System: Enforces rules, emits events, records truth"
    ]},
    
    # Engineer Role Shift
    {"x": 40200, "title": "Engineer Role Shift", "bullets": [
        "From writing code",
        "to reviewing and governing systems"
    ]},
    
    # NEW: Review as First-Class Skill
    {"x": 42200, "title": "Review as a First-Class Skill", "bullets": [
        "Reading unfamiliar code",
        "Spotting architectural violations",
        "Detecting silent bugs",
        "Identifying over-engineering"
    ]},
    
    # Engineer as Director (EXPANDED)
    {"x": 44200, "title": "Engineer as Director", "bullets": [
        "Casting: which model/tool for which task",
        "Script: prompts, constraints, context",
        "Editing: review, prune, refactor",
        "Release: testing, instrumentation, rollback"
    ]},
    
    # NEW: Prompting Is Architecture
    {"x": 46200, "title": "Prompting Is Architecture", "bullets": [
        "Feed LLMs:",
        "Domain vocabulary, State diagrams",
        "Invariants, Event schemas",
        "Anti-patterns to avoid",
        "Bad prompts are undocumented architecture"
    ]},
    
    # NEW: The New Software Equation
    {"x": 48200, "title": "The New Software Equation", "bullets": [
        "Intent + Constraints + Metadata + Feedback",
        "= Correct Systems"
    ]},
    
    # Final Thought (SHARPENED)
    {"x": 50200, "title": "Final Thought", "bullets": [
        "AI didn't make engineering easier",
        "It made bad architecture",
        "impossible to hide"
    ]}
]

def generate_elements():
    elements = []
    eid = 1
    
    for slide in slides_data:
        x = slide["x"]
        
        # Title
        elements.append({
            "id": f"e{eid}",
            "type": "text",
            "layerId": "layer-main",
            "x": x,
            "y": 150,
            "width": 800,
            "height": 80,
            "text": slide["title"],
            "fontSize": 48,
            "fontFamily": "hand-drawn",
            "strokeColor": "#000000",
            "backgroundColor": "transparent",
            "fillStyle": "solid",
            "strokeWidth": 1,
            "strokeStyle": "solid",
            "roughness": 1,
            "opacity": 100,
            "angle": 0,
            "renderStyle": "sketch",
            "seed": eid
        })
        eid += 1
        
        # Subtitle if exists
        if "subtitle" in slide:
            elements.append({
                "id": f"e{eid}",
                "type": "text",
                "layerId": "layer-main",
                "x": x,
                "y": 280,
                "width": 900,
                "height": 80,
                "text": slide["subtitle"],
                "fontSize": 42,
                "fontFamily": "hand-drawn",
                "strokeColor": "#d946ef",
                "backgroundColor": "transparent",
                "fillStyle": "solid",
                "strokeWidth": 1,
                "strokeStyle": "solid",
                "roughness": 1,
                "opacity": 100,
                "angle": 0,
                "renderStyle": "sketch",
                "seed": eid
            })
            eid += 1
        
        # Bullets
        if "bullets" in slide:
            y_start = 400 if "subtitle" in slide else 300
            for i, bullet_text in enumerate(slide["bullets"]):
                y = y_start + (i * 80)
                
                # Bullet circle
                elements.append({
                    "id": f"e{eid}",
                    "type": "circle",
                    "layerId": "layer-main",
                    "x": x,
                    "y": y,
                    "width": 30,
                    "height": 30,
                    "strokeColor": "#000000",
                    "backgroundColor": "transparent",
                    "fillStyle": "solid",
                    "strokeWidth": 2,
                    "strokeStyle": "dashed",
                    "roughness": 1,
                    "opacity": 100,
                    "angle": 0,
                    "renderStyle": "sketch",
                    "seed": eid
                })
                eid += 1
                
                # Bullet text - calculate width based on text length
                text_width = min(len(bullet_text) * 22, 1200)
                
                elements.append({
                    "id": f"e{eid}",
                    "type": "text",
                    "layerId": "layer-main",
                    "x": x + 60,
                    "y": y - 3,
                    "width": text_width,
                    "height": 60,
                    "text": bullet_text,
                    "fontSize": 36,
                    "fontFamily": "hand-drawn",
                    "strokeColor": "#333333",
                    "backgroundColor": "transparent",
                    "fillStyle": "solid",
                    "strokeWidth": 1,
                    "strokeStyle": "solid",
                    "roughness": 1,
                    "opacity": 100,
                    "angle": 0,
                    "renderStyle": "sketch",
                    "seed": eid
                })
                eid += 1
    
    return elements

def create_slides_structure():
    """Create slide definitions"""
    slides = []
    slide_names = [
        "Title", "The Goal", "Why This Talk", "Core Thesis",
        "Everything Begins With Todo", "What Todo Teaches", "The Belt System",
        "Auth Changes Everything", "Relationships", "Frontend Meta",
        "Backend Meta", "Backend Building Blocks", "Rule Engine",
        "Messaging & Events", "Instrumentation & Feedback", "Code Is an Output",
        "Intent Preservation", "Enter AI & LLMs", "What LLMs Are Bad At",
        "AI Development Stack", "Engineer Role Shift", "Review as First-Class Skill",
        "Engineer as Director", "Prompting Is Architecture",
        "The New Software Equation", "Final Thought"
    ]
    
    for i, name in enumerate(slide_names):
        slides.append({
            "id": f"s{i+1}",
            "name": name,
            "order": i,
            "spatialPosition": {"x": i * 2000, "y": 0},
            "dimensions": {"width": 1920, "height": 1080}
        })
    
    return slides

if __name__ == "__main__":
    # Create base structure
    data = {
        "version": 4,
        "metadata": {
            "name": "From Todo to Systems – Architecting Software in the LLM Era",
            "createdAt": "2026-01-29T12:00:00.000Z",
            "updatedAt": "2026-01-29T12:00:00.000Z",
            "docType": "slides"
        },
        "globalSettings": {
            "theme": "light",
            "renderStyle": "sketch",
            "animationEnabled": True
        },
        "gridSettings": {
            "enabled": True,
            "gridSize": 20,
            "snapToGrid": True
        },
        "layers": [{
            "id": "layer-main",
            "name": "Main Content",
            "visible": True,
            "locked": False,
            "order": 1
        }],
        "slides": create_slides_structure(),
        "elements": generate_elements(),
        "states": []
    }
    
    # Write to file
    output_file = '/home/rajesh/work/yappy/data/dev-arch-3.json'
    with open(output_file, 'w') as f:
        json.dump(data, f, indent=4)
    
    print(f"Generated {len(data['elements'])} elements across {len(data['slides'])} slides")
    print(f"Output: {output_file}")
