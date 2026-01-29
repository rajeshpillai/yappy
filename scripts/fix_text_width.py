import json

# Load the JSON
with open('/home/rajesh/work/yappy/data/dev-arch-2.json', 'r') as f:
    data = json.load(f)

# Fix text widths - reduce from 1200/1100 to more reasonable values
for element in data['elements']:
    if element['type'] == 'text':
        # Estimate width based on text length and font size
        text_len = len(element['text'])
        font_size = element['fontSize']
        
        # Rough estimate: each character is about 0.6 * fontSize wide
        estimated_width = int(text_len * font_size * 0.6)
        
        # Cap at reasonable max and min
        element['width'] = min(max(estimated_width, 200), 1400)
        
        # Adjust height based on number of lines
        line_count = element['text'].count('\n') + 1
        element['height'] = max(font_size * 1.5 * line_count, 60)

# Write back
with open('/home/rajesh/work/yappy/data/dev-arch-2.json', 'w') as f:
    json.dump(data, f, indent=4)

print("Fixed text widths and heights")
