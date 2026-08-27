import pytest
import asyncio
from router.semantic_router import query_router, QueryCategory
from providers.factory import provider_factory
from core.agent import agent

def test_semantic_router_fees():
    decision = query_router.route_query("What is the tuition fee for B.Tech CSE?")
    assert decision.category == QueryCategory.FEES
    assert decision.requires_database is True
    assert decision.confidence >= 0.75

def test_semantic_router_eligibility():
    decision = query_router.route_query("I scored 45% in 12th board, am I eligible for CSE?")
    assert decision.category == QueryCategory.ELIGIBILITY
    assert decision.requires_database is True

def test_semantic_router_general_question():
    decision = query_router.route_query("What is artificial intelligence and how do neural networks work?")
    assert decision.category == QueryCategory.GENERAL
    assert decision.requires_gemini is True

def test_semantic_router_mixed_question():
    decision = query_router.route_query("I have 72% in 12th. Can I get CSE and what career options will I have after graduation?")
    assert decision.category == QueryCategory.MIXED
    assert decision.is_mixed is True
    assert "university_query" in decision.sub_queries
    assert "general_query" in decision.sub_queries

def test_gemini_provider_availability():
    gemini = provider_factory.get_provider("gemini")
    assert gemini.provider_name == "gemini"
    assert asyncio.run(gemini.is_available()) is True

def test_openai_provider_fallback():
    openai_prov = provider_factory.get_provider("openai")
    assert openai_prov.provider_name == "openai"

def test_agent_eligibility_personalization():
    res = asyncio.run(agent.process_student_message(
        tracking_id="TEST-ADM-2026",
        message_text="i have 45% in my 12th board .. am i still elligible for the college ?"
    ))
    assert res is not None
    assert "reply" in res
    assert "45.0%" in res["reply"] or "45%" in res["reply"]
    assert "below the standard cutoff" in res["reply"].lower() or "not" in res["reply"].lower()

def test_agent_general_gemini_routing():
    res = asyncio.run(agent.process_student_message(
        tracking_id="TEST-ADM-2026",
        message_text="Explain what machine learning is in 2 bullet points"
    ))
    assert res is not None
    assert "reply" in res
    assert len(res["reply"]) > 20
