import re
from typing import Any, Dict

class ComplaintIntelligence:
    CATEGORY_KEYWORDS = {
        "Plumbing": ["leak", "pipe", "tap", "water", "drain", "sewage", "sink", "flush", "bathroom", "toilet", "geyser", "tank"],
        "Electrical": ["power", "light", "fuse", "spark", "switch", "wire", "voltage", "blackout", "circuit", "fan", "mcb", "shock"],
        "Lift & Elevator": ["lift", "elevator", "stuck", "door", "buttons", "display", "floor 3", "ground floor", "alarm"],
        "Security & Gate": ["guard", "stranger", "visitor", "gate", "camera", "cctv", "intercom", "parking slot", "barrier", "theft"],
        "Cleanliness & Hygiene": ["garbage", "trash", "clean", "sweep", "dustbin", "foul smell", "staircase", "corridor", "stain"],
        "Noise & Nuisance": ["loud", "music", "dog", "bark", "party", "drilling", "construction", "quarrel", "shouting"],
        "Civil & Structural": ["crack", "wall", "plaster", "seepage", "roof", "tile", "balcony", "window", "paint"]
    }

    CRITICAL_KEYWORDS = ["fire", "spark", "smoke", "gas leak", "burst", "stuck in lift", "electric shock", "danger", "flood", "emergency", "collapsed"]
    HIGH_KEYWORDS = ["no water", "complete blackout", "sewage overflow", "lift not working", "theft", "broken lock", "major leak"]

    @classmethod
    def categorize_and_prioritize(cls, description: str) -> Dict[str, Any]:
        text = description.lower()
        
        # 1. Categorization
        best_category = "General"
        max_matches = 0
        for category, keywords in cls.CATEGORY_KEYWORDS.items():
            matches = sum(1 for kw in keywords if re.search(r'\b' + re.escape(kw) + r'\b', text))
            if matches > max_matches:
                max_matches = matches
                best_category = category

        # 2. Priority scoring
        priority = "Low"
        resolution_hours = 48
        
        if any(kw in text for kw in cls.CRITICAL_KEYWORDS):
            priority = "Critical"
            resolution_hours = 2
        elif any(kw in text for kw in cls.HIGH_KEYWORDS):
            priority = "High"
            resolution_hours = 8
        elif max_matches > 0 or len(text.split()) > 5:
            priority = "Medium"
            resolution_hours = 24

        return {
            "predicted_category": best_category,
            "predicted_priority": priority,
            "estimated_resolution_hours": resolution_hours,
            "confidence_score": round(min(0.6 + (max_matches * 0.15), 0.98), 2)
        }
