import re

# Read the file
with open(r'c:\Users\valen\Downloads\chronos_-infinite-adventure-engine\App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Perform replacements in order
# 1. First replace gameState.inventory -> ChronosCausalityField.artifactRetentionMatrix
content = re.sub(r'gameState\.inventory\b', 'ChronosCausalityField.artifactRetentionMatrix', content)

# 2. Replace all other gameState -> ChronosCausalityField
content = re.sub(r'\bgameState\b', 'ChronosCausalityField', content)

# 3. Replace setGameState -> setChronosCausalityField  
content = re.sub(r'\bsetGameState\b', 'setChronosCausalityField', content)

# 4. Replace generateStoryTurn -> SynthesizeNarrativeVector
content = re.sub(r'\bgenerateStoryTurn\b', 'SynthesizeNarrativeVector', content)

# Write back
with open(r'c:\Users\valen\Downloads\chronos_-infinite-adventure-engine\App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Replacement complete!")
