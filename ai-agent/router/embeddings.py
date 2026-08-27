import logging
import numpy as np
from typing import List, Dict, Tuple, Optional
from config import settings
from .categories import QueryCategory, CATEGORY_ANCHORS

logger = logging.getLogger("admissions_agent.embeddings")

class SemanticEmbeddingEngine:
    def __init__(self, model_name: Optional[str] = None):
        self.model_name = model_name or settings.EMBEDDING_MODEL or "all-MiniLM-L6-v2"
        self._model = None
        self._category_embeddings: Dict[QueryCategory, np.ndarray] = {}
        self._is_initialized = False

    def _get_model(self):
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
                logger.info(f"Loading SentenceTransformer model: {self.model_name}")
                self._model = SentenceTransformer(self.model_name)
            except Exception as e:
                logger.warning(f"Could not load SentenceTransformer ({e}). Falling back to algorithmic embedding.")
                self._model = None
        return self._model

    def initialize_anchors(self):
        if self._is_initialized:
            return

        model = self._get_model()
        if model is not None:
            try:
                for cat, anchor_texts in CATEGORY_ANCHORS.items():
                    vectors = model.encode(anchor_texts, convert_to_numpy=True, normalize_embeddings=True)
                    # Compute mean normalized centroid vector for each category
                    centroid = np.mean(vectors, axis=0)
                    centroid = centroid / (np.linalg.norm(centroid) + 1e-9)
                    self._category_embeddings[cat] = centroid
                self._is_initialized = True
                logger.info("Semantic embedding centroids successfully initialized.")
                return
            except Exception as e:
                logger.warning(f"Failed to precompute anchor embeddings: {e}")

        # Algorithmic fallback initialization
        self._is_initialized = True

    def compute_similarity(self, query: str) -> List[Tuple[QueryCategory, float]]:
        """
        Computes cosine similarity of query against all category anchor centroids.
        Returns a sorted list of (QueryCategory, similarity_score) descending.
        """
        if not self._is_initialized:
            self.initialize_anchors()

        model = self._get_model()
        results: List[Tuple[QueryCategory, float]] = []

        if model is not None and self._category_embeddings:
            try:
                q_vec = model.encode([query], convert_to_numpy=True, normalize_embeddings=True)[0]
                for cat, centroid in self._category_embeddings.items():
                    sim = float(np.dot(q_vec, centroid))
                    # Normalizing to [0.0, 1.0] range
                    sim_norm = max(0.0, min(1.0, (sim + 1.0) / 2.0))
                    results.append((cat, sim_norm))
                results.sort(key=lambda x: x[1], reverse=True)
                return results
            except Exception as e:
                logger.warning(f"Embedding computation error: {e}")

        # Algorithmic fallback: word overlap & jaccard similarity against anchors
        q_tokens = set(query.lower().replace("?", " ").replace("!", " ").replace(".", " ").split())
        for cat, anchors in CATEGORY_ANCHORS.items():
            best_sim = 0.0
            for a in anchors:
                a_tokens = set(a.lower().replace("?", " ").replace("!", " ").replace(".", " ").split())
                intersection = len(q_tokens & a_tokens)
                union = len(q_tokens | a_tokens) or 1
                jaccard = intersection / union
                if jaccard > best_sim:
                    best_sim = jaccard
            results.append((cat, min(1.0, best_sim * 2.0)))

        results.sort(key=lambda x: x[1], reverse=True)
        return results

embedding_engine = SemanticEmbeddingEngine()
