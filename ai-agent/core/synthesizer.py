import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("admissions_agent.synthesizer")

class ResponseSynthesizer:
    """
    Intelligently synthesizes multi-part answers (verified university data + Gemini reasoning)
    into a unified, beautifully structured markdown response for the student.
    """

    def synthesize_mixed_response(
        self,
        student_name: str,
        tracking_id: str,
        university_result: Dict[str, Any],
        gemini_result: str,
        university_query: str = "",
        general_query: str = "",
    ) -> str:
        uni_reply = university_result.get("reply", "").strip()
        gemini_clean = gemini_result.strip()

        # Build clean, cohesive combined response
        sections = []

        if uni_reply:
            sections.append(uni_reply)

        if gemini_clean:
            # Add section divider if not already structured
            if not any(h in gemini_clean for h in ["###", "##", "💼", "🚀", "💡"]):
                sections.append(f"### 🚀 Career & Industry Insights:\n{gemini_clean}")
            else:
                sections.append(gemini_clean)

        combined = "\n\n---\n\n".join(sections)
        return combined

synthesizer = ResponseSynthesizer()
