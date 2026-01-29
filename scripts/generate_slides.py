import json

# Slide content with bullet points
slides_data = [
    {"x": 200, "title": "From Todo to Systems", "subtitle": "Architecting Software in the LLM Era"},
    {"x": 2200, "title": "Code is no longer scarce.", "subtitle": "Correctness is.", "bullets": ["This talk is about building correct systems", "when AI can write unlimited code"]},
    {"x": 4200, "title": "Core Thesis", "bullets": ["Engineers must evolve from coders", "into Architects, Directors, and Validators"]},
    {"x": 6200, "title": "Every product is a Todo", "bullets": ["CRM, ERP, SaaS, Social Networks", "are Todos with metadata"]},
    {"x": 8200, "title": "Todo teaches:", "bullets": ["State transitions", "Ownership", "Predictable complexity growth"]},
    {"x": 10200, "title": "The Belt System", "bullets": ["CRUD → Performance → Auth → Relationships"]},
    {"x": 12200, "title": "Authentication changes everything", "bullets": ["Data now has ownership", "Authorization becomes contextual"]},
    {"x": 14200, "title": "Relationships are the backbone", "bullets": ["One-to-one", "One-to-many", "Many-to-many"]},
    {"x": 16200, "title": "Frontend mindset:", "bullets": ["UI is a projection of metadata"]},
    {"x": 18200, "title": "Backend mindset:", "bullets": ["Behavior is a projection of metadata"]},
    {"x": 20200, "title": "Backend building blocks:", "bullets": ["Domain • Database • Rules", "Messaging • Integrations • Instrumentation"]},
    {"x": 22200, "title": "Rule engines encode business intent", "bullets": ["They must be dynamic, versioned", "and explainable"]},
    {"x": 24200, "title": "Events enable scale", "bullets": ["Async workflows", "Retries", "Replays", "Dead-letter queues"]},
    {"x": 26200, "title": "Instrumentation is not logging", "bullets": ["It is how systems talk back", "to humans and AI"]},
    {"x": 28200, "title": "Code is not the product", "bullets": ["Code is an output of architecture"]},
    {"x": 30200, "title": "LLMs generate code", "bullets": ["Humans define intent", "constraints, and correctness"]},
    {"x": 32200, "title": "LLMs are bad at:", "bullets": ["Global invariants", "Long-term consistency", "Domain nuance"]},
    {"x": 34200, "title": "Engineer role shift:", "bullets": ["From writing code", "to reviewing and governing systems"]},
    {"x": 36200, "title": "Engineer as Director:", "bullets": ["Set intent", "Direct AI agents", "Review outcomes", "Approve meaning"]},
    {"x": 38200, "title": "Prompting is architecture", "bullets": ["Bad prompts are just", "undocumented systems"]},
    {"x": 40200, "title": "Feed LLMs:", "bullets": ["Domain models", "State machines", "Rules", "Events", "Invariants"]},
    {"x": 42200, "title": "Unified mental model:", "bullets": ["State + Decisions + Events = Systems"]},
    {"x": 44200, "title": "AI did not make engineering easier", "bullets": ["It made bad architecture", "impossible to hide"]}
]

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
        "width": 1200,
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
            "width": 1200,
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
            
            # Bullet text
            elements.append({
                "id": f"e{eid}",
                "type": "text",
                "layerId": "layer-main",
                "x": x + 60,
                "y": y - 3,
                "width": 1100,
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

# Load base JSON
with open('/home/rajesh/work/yappy/data/dev-arch-2.json', 'r') as f:
    data = json.load(f)

data['elements'] = elements

# Write back
with open('/home/rajesh/work/yappy/data/dev-arch-2.json', 'w') as f:
    json.dump(data, f, indent=4)

print(f"Generated {len(elements)} elements")
