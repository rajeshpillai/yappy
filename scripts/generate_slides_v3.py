#!/usr/bin/env python3
"""
Generate comprehensive presentation covering AI-driven engineering across all domains.
Structure: Requirements → Data → UI → Backend → Deployment → AI Integration → Synthesis
Each section emphasizes mental models as the foundation.
"""
import json

# Comprehensive slide content organized by domain
slides_data = [
    # ========== PART 1: FOUNDATION ==========
    {"x": 0, "title": "From Todo to Systems", "subtitle": "Architecting Software in the LLM Era"},
    
    {"x": 2000, "title": "The Goal", "bullets": [
        "Build correct systems when",
        "code is cheap and mistakes are expensive"
    ]},
    
    {"x": 4000, "title": "Why this talk?", "bullets": [
        "LLMs generate code",
        "Engineers architect systems",
        "Mental models are the universal language"
    ]},
    
    {"x": 6000, "title": "Core Thesis", "bullets": [
        "Engineers are Architects, Directors, Validators",
        "Mental models bridge human intent and AI execution"
    ]},
    
    {"x": 8000, "title": "Todo: The Universal Pattern", "bullets": [
        "Not a beginner exercise",
        "The minimal unit of all business software",
        "Teaches state, ownership, relationships"
    ]},
    
    # ========== PART 2: REQUIREMENTS & ANALYSIS ==========
    {"x": 10000, "title": "Requirements & Analysis", "subtitle": "Mental Model: State Machines & Event Storming"},
    
    {"x": 12000, "title": "From User Stories to Domain Events", "bullets": [
        "User stories capture intent",
        "Domain events capture state changes",
        "Event storming reveals system boundaries"
    ]},
    
    {"x": 14000, "title": "Intent Preservation in Requirements", "bullets": [
        "Why does this feature exist?",
        "What business promise does it make?",
        "What invariants must hold?",
        "LLMs generate features, not intent"
    ]},
    
    {"x": 16000, "title": "What LLMs Miss in Requirements", "bullets": [
        "Unstated assumptions",
        "Domain expertise",
        "Political/organizational context",
        "Long-term vision"
    ]},
    
    # ========== PART 3: DATA MODELING & DATA FLOW ==========
    {"x": 18000, "title": "Data Modeling & Data Flow", "subtitle": "Mental Model: Entities, Relationships, Invariants"},
    
    {"x": 20000, "title": "Entities & Relationships", "bullets": [
        "One-to-one, One-to-many, Many-to-many",
        "Aggregates define consistency boundaries",
        "Relationships encode business rules"
    ]},
    
    {"x": 22000, "title": "Auth & Ownership", "bullets": [
        "Data has owners",
        "Authorization is contextual",
        "Row-level security",
        "Audit trails"
    ]},
    
    {"x": 24000, "title": "State Transitions", "bullets": [
        "Valid state changes",
        "Transition guards",
        "Side effects",
        "Idempotency"
    ]},
    
    {"x": 26000, "title": "Event-Driven Architecture", "bullets": [
        "Events as first-class citizens",
        "Event sourcing",
        "CQRS patterns",
        "Eventual consistency"
    ]},
    
    {"x": 28000, "title": "Data Flow Patterns", "bullets": [
        "Request/Response",
        "Pub/Sub",
        "Streaming",
        "Batch processing"
    ]},
    
    # ========== PART 4: UI ENGINEERING ==========
    {"x": 30000, "title": "UI Engineering", "subtitle": "Mental Model: UI as Metadata Projection"},
    
    {"x": 32000, "title": "Design Tokens", "bullets": [
        "Colors, Typography, Spacing",
        "Semantic naming",
        "Platform-agnostic",
        "Single source of truth"
    ]},
    
    {"x": 34000, "title": "Design Systems", "bullets": [
        "Component libraries",
        "Composition patterns",
        "Accessibility built-in",
        "Documentation as code"
    ]},
    
    {"x": 36000, "title": "Component Architecture", "bullets": [
        "Atomic design",
        "Props as contracts",
        "Controlled vs. Uncontrolled",
        "Render props & Composition"
    ]},
    
    {"x": 38000, "title": "State Management", "bullets": [
        "Local vs. Global state",
        "Server state vs. UI state",
        "Optimistic updates",
        "Cache invalidation"
    ]},
    
    {"x": 40000, "title": "Responsive & Accessible", "bullets": [
        "Mobile-first design",
        "ARIA labels",
        "Keyboard navigation",
        "Screen reader support"
    ]},
    
    # ========== PART 5: BACKEND ENGINEERING ==========
    {"x": 42000, "title": "Backend Engineering", "subtitle": "Mental Model: Behavior as Metadata Projection"},
    
    {"x": 44000, "title": "Domain Layer", "bullets": [
        "Business logic isolation",
        "Domain models",
        "Value objects",
        "Domain services"
    ]},
    
    {"x": 46000, "title": "API Design", "bullets": [
        "REST vs. GraphQL vs. gRPC",
        "Versioning strategy",
        "Rate limiting",
        "Error handling"
    ]},
    
    {"x": 48000, "title": "Rule Engines", "bullets": [
        "Encode business intent",
        "Dynamic, versioned, explainable",
        "Separate rules from code",
        "Audit trail"
    ]},
    
    {"x": 50000, "title": "Messaging & Events", "bullets": [
        "Async workflows",
        "Message queues",
        "Dead-letter queues",
        "Retries & idempotency"
    ]},
    
    {"x": 52000, "title": "Database Patterns", "bullets": [
        "Connection pooling",
        "Transactions & isolation",
        "Migrations",
        "Read replicas"
    ]},
    
    {"x": 54000, "title": "Instrumentation", "bullets": [
        "Structured logging",
        "Metrics & traces",
        "Distributed tracing",
        "Correlation IDs"
    ]},
    
    # ========== PART 6: DEPLOYMENT & OPERATIONS ==========
    {"x": 56000, "title": "Deployment & Operations", "subtitle": "Mental Model: Infrastructure as Code"},
    
    {"x": 58000, "title": "Docker & Containerization", "bullets": [
        "Immutable artifacts",
        "Multi-stage builds",
        "Layer caching",
        "Security scanning"
    ]},
    
    {"x": 60000, "title": "Kubernetes Orchestration", "bullets": [
        "Pods, Services, Deployments",
        "ConfigMaps & Secrets",
        "Rolling updates",
        "Health checks"
    ]},
    
    {"x": 62000, "title": "Cloud Platforms", "bullets": [
        "GCP: Cloud Run, GKE, Cloud SQL",
        "AWS: ECS, EKS, RDS",
        "Managed services vs. Self-hosted",
        "Multi-cloud strategy"
    ]},
    
    {"x": 64000, "title": "CI/CD Pipelines", "bullets": [
        "Build → Test → Deploy",
        "Feature flags",
        "Blue-green deployments",
        "Canary releases"
    ]},
    
    {"x": 66000, "title": "Observability", "bullets": [
        "Logs, Metrics, Traces",
        "Alerting & on-call",
        "SLIs, SLOs, SLAs",
        "Incident response"
    ]},
    
    # ========== PART 7: AI-DRIVEN ENGINEERING ==========
    {"x": 68000, "title": "AI-Driven Engineering", "subtitle": "Mental Models Enable AI Leverage"},
    
    {"x": 70000, "title": "Code Is an Output", "bullets": [
        "Code is a rendering",
        "Architecture is the source",
        "Metadata is the truth",
        "If architecture is wrong, AI makes it wrong faster"
    ]},
    
    {"x": 72000, "title": "The AI Development Stack", "bullets": [
        "Human: Defines intent, sets constraints, approves",
        "LLM: Expands patterns, writes boilerplate",
        "System: Enforces rules, emits events, records truth"
    ]},
    
    {"x": 74000, "title": "What LLMs Are Bad At", "bullets": [
        "Long-term consistency",
        "Cross-module invariants",
        "Domain nuance",
        "Hidden business rules",
        "LLMs optimize locally. Architects optimize globally."
    ]},
    
    {"x": 76000, "title": "Engineer as Director", "bullets": [
        "Casting: which model/tool for which task",
        "Script: prompts, constraints, context",
        "Editing: review, prune, refactor",
        "Release: testing, instrumentation, rollback"
    ]},
    
    {"x": 78000, "title": "Prompting Is Architecture", "bullets": [
        "Feed LLMs:",
        "Domain vocabulary, State diagrams",
        "Invariants, Event schemas",
        "Anti-patterns to avoid",
        "Bad prompts are undocumented architecture"
    ]},
    
    {"x": 80000, "title": "Review as First-Class Skill", "bullets": [
        "Reading unfamiliar code",
        "Spotting architectural violations",
        "Detecting silent bugs",
        "Identifying over-engineering",
        "LLMs amplify bad reviewers"
    ]},
    
    {"x": 82000, "title": "Where AI Helps Most", "bullets": [
        "Requirements: Boilerplate, test cases",
        "Data: Schema generation, migrations",
        "UI: Component scaffolding, styling",
        "Backend: CRUD, API endpoints",
        "Deployment: Config generation, scripts"
    ]},
    
    # ========== PART 8: SYNTHESIS ==========
    {"x": 84000, "title": "The New Software Equation", "bullets": [
        "Mental Models",
        "+ Intent + Constraints",
        "+ Metadata + Feedback",
        "= Correct Systems"
    ]},
    
    {"x": 86000, "title": "Final Thought", "bullets": [
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
        title_text = slide["title"]
        title_width = min(len(title_text) * 30, 1200)
        
        elements.append({
            "id": f"e{eid}",
            "type": "text",
            "layerId": "layer-main",
            "x": x,
            "y": 150,
            "width": title_width,
            "height": 80,
            "text": title_text,
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
            subtitle_text = slide["subtitle"]
            subtitle_width = min(len(subtitle_text) * 26, 1100)
            
            elements.append({
                "id": f"e{eid}",
                "type": "text",
                "layerId": "layer-main",
                "x": x,
                "y": 280,
                "width": subtitle_width,
                "height": 80,
                "text": subtitle_text,
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
    """Create slide definitions with proper section grouping"""
    slide_names = [
        # Foundation
        "Title", "The Goal", "Why This Talk", "Core Thesis", "Todo Pattern",
        # Requirements
        "Requirements & Analysis", "User Stories to Events", "Intent Preservation", "LLM Limits in Requirements",
        # Data
        "Data Modeling", "Entities & Relationships", "Auth & Ownership", "State Transitions", "Event-Driven", "Data Flow",
        # UI
        "UI Engineering", "Design Tokens", "Design Systems", "Component Architecture", "State Management", "Responsive & Accessible",
        # Backend
        "Backend Engineering", "Domain Layer", "API Design", "Rule Engines", "Messaging & Events", "Database Patterns", "Instrumentation",
        # Deployment
        "Deployment & Ops", "Docker", "Kubernetes", "Cloud Platforms", "CI/CD", "Observability",
        # AI
        "AI-Driven Engineering", "Code Is Output", "AI Stack", "LLM Limitations", "Engineer as Director", "Prompting", "Review Skills", "Where AI Helps",
        # Synthesis
        "Software Equation", "Final Thought"
    ]
    
    slides = []
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
    data = {
        "version": 4,
        "metadata": {
            "name": "From Todo to Systems – AI-Driven Engineering Across All Domains",
            "createdAt": "2026-01-29T13:00:00.000Z",
            "updatedAt": "2026-01-29T13:00:00.000Z",
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
    
    output_file = '/home/rajesh/work/yappy/data/dev-arch-4.json'
    with open(output_file, 'w') as f:
        json.dump(data, f, indent=4)
    
    print(f"✅ Generated {len(data['elements'])} elements across {len(data['slides'])} slides")
    print(f"📊 Sections: Foundation(5) → Requirements(4) → Data(6) → UI(6) → Backend(7) → Deployment(6) → AI(8) → Synthesis(2)")
    print(f"📁 Output: {output_file}")
