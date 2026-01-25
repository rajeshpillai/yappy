Currently pen tools have these properties:

strokeColor (all elements) ✅
strokeWidth (fineliner, inkbrush) ✅
opacity (all) ✅
pressureEnabled (fineliner, inkbrush) ✅
We could add more pen-specific properties like:

Smoothing - how much to smooth the stroke curve
Taper Amount - intensity of start/end tapering (for inkbrush)
Velocity Sensitivity - how much speed affects thickness
Would you like me to add these configurable properties for the pen tools?

AskUserQuestion
OUT
User has answered your questions: "Which pen properties would you like to add?"="All three (Recommended)". You can now continue with the user's answers in mind.
Update Todos

Add pen smoothing property to properties.ts

Add taper amount property for inkbrush

Add velocity sensitivity property for inkbrush

Update inkbrush renderer to use configurable properties