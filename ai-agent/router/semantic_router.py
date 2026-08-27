import re
import logging
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

from config import settings
from .categories import QueryCategory, DATABASE_GROUNDED_CATEGORIES
from .embeddings import embedding_engine

logger = logging.getLogger("admissions_agent.router")

class RoutingDecision(BaseModel):
    category: QueryCategory
    confidence: float
    requires_database: bool
    requires_existing_agent: bool
    requires_gemini: bool
    is_mixed: bool = False
    sub_queries: Dict[str, str] = Field(default_factory=dict)
    matched_scores: Dict[str, float] = Field(default_factory=dict)
    reasoning: str = ""

class AIQueryRouter:
    def __init__(self, confidence_threshold: Optional[float] = None):
        self.confidence_threshold = confidence_threshold or settings.ROUTER_CONFIDENCE_THRESHOLD or 0.75

    def _detect_mixed_intent(self, text: str) -> Optional[Dict[str, str]]:
        """
        Detects if a question has both a verified university component and a general/open-ended career/tech component.
        Example: 'I have 72% in 12th. Can I get CSE and what career options will I have after graduation?'
        """
        text_lower = text.lower()
        
        has_university = any(w in text_lower for w in [
            "fee", "tuition", "cost", "cutoff", "cut-off", "eligible", "elligible",
            "12th", "10th", "board", "marks", "admission", "scholarship", "waiver",
            "document", "verify", "enrollment", "hostel", "placement package", "nirf"
        ])
        
        has_general = any(w in text_lower for w in [
            "career", "future", "scope", "job role", "salary in industry", "coding",
            "learn", "programming language", "what is", "difference between", "prepare",
            "study tips", "market demand", "ai vs", "which is better"
        ])

        # If both intents are clearly present and text has split connectors or multi-sentence structure
        if has_university and has_general and len(text.split()) >= 6:
            # Separate sub-queries intelligently
            parts = re.split(r"\b(?:and\s+also|and\s+what|and\s+how|and\s+is|also\s+tell|plus|\?)\b", text, flags=re.IGNORECASE)
            parts = [p.strip() for p in parts if p.strip()]
            
            uni_part = ""
            gen_part = ""
            
            for p in parts:
                p_low = p.lower()
                is_u = any(w in p_low for w in ["fee", "cutoff", "eligible", "elligible", "12th", "10th", "board", "marks", "admission", "scholarship", "document", "enrollment"])
                if is_u and not uni_part:
                    uni_part = p
                else:
                    gen_part = (gen_part + " " + p).strip()

            if uni_part and gen_part:
                return {
                    "university_query": uni_part,
                    "general_query": gen_part
                }

        return None

    def route_query(self, text: str) -> RoutingDecision:
        """
        Routes user query using semantic similarity and intentional guardrails.
        """
        clean_text = text.strip()
        if not clean_text:
            return RoutingDecision(
                category=QueryCategory.UNKNOWN,
                confidence=0.5,
                requires_database=False,
                requires_existing_agent=True,
                requires_gemini=False,
                reasoning="Empty input query."
            )

        # Step 1: Check for Mixed Queries
        mixed_parts = self._detect_mixed_intent(clean_text)
        if mixed_parts:
            logger.info(f"Detected MIXED query: {mixed_parts}")
            return RoutingDecision(
                category=QueryCategory.MIXED,
                confidence=0.92,
                requires_database=True,
                requires_existing_agent=True,
                requires_gemini=True,
                is_mixed=True,
                sub_queries=mixed_parts,
                reasoning="Query contains both a verified university requirement and a general reasoning/career question."
            )

        # Step 2: Semantic embedding classification
        sim_scores = embedding_engine.compute_similarity(clean_text)
        top_cat, top_score = sim_scores[0] if sim_scores else (QueryCategory.GENERAL, 0.70)
        score_map = {cat.value: round(score, 3) for cat, score in sim_scores[:4]}

        # Step 3: Strong Pattern Overrides for Safety & Zero-Hallucination
        lower = clean_text.lower()
        if any(w in lower for w in ["waiver", "concession", "financial aid", "scholarship request", "cannot afford"]):
            top_cat = QueryCategory.SCHOLARSHIP
            top_score = max(top_score, 0.96)
        elif any(w in lower for w in ["fee", "cost", "tuition", "hostel fee", "mess fee"]):
            top_cat = QueryCategory.FEES
            top_score = max(top_score, 0.95)
        elif any(w in lower for w in ["cutoff", "eligible", "elligible", "marks in 12th", "12th board", "percentage required", "can i get admission"]):
            top_cat = QueryCategory.ELIGIBILITY
            top_score = max(top_score, 0.95)
        elif any(w in lower for w in ["document", "marksheet", "aadhaar", "verified", "ocr", "upload"]):
            top_cat = QueryCategory.DOCUMENT
            top_score = max(top_score, 0.94)
        elif any(w in lower for w in ["enrollment", "roll number", "offer letter", "admission status"]):
            top_cat = QueryCategory.STUDENT_STATUS
            top_score = max(top_score, 0.93)
        elif any(w in lower for w in ["nirf", "naac", "placement", "highest package", "recruiters", "campus size"]):
            top_cat = QueryCategory.UNIVERSITY_KNOWLEDGE
            top_score = max(top_score, 0.92)

        # Step 4: Determine Model & Database routing
        requires_db = top_cat in DATABASE_GROUNDED_CATEGORIES
        requires_existing_agent = requires_db or top_score < self.confidence_threshold
        requires_gemini = (top_cat == QueryCategory.GENERAL) and (top_score >= self.confidence_threshold)

        logger.info(
            f"Query routed: category={top_cat.value}, confidence={top_score:.2f}, "
            f"requires_db={requires_db}, requires_agent={requires_existing_agent}, requires_gemini={requires_gemini}"
        )

        return RoutingDecision(
            category=top_cat,
            confidence=round(top_score, 2),
            requires_database=requires_db,
            requires_existing_agent=requires_existing_agent,
            requires_gemini=requires_gemini,
            is_mixed=False,
            matched_scores=score_map,
            reasoning=f"Classified as {top_cat.value} via semantic matching (confidence: {top_score:.2f})."
        )

query_router = AIQueryRouter()
