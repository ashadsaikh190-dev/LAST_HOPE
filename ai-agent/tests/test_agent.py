import pytest
from engines.intent import intent_engine
from engines.escalation import escalation_engine
from engines.action import action_engine

def test_intent_detection():
    res = intent_engine.detect_intent("What is the fee for computer science B.Tech?")
    assert res["primaryIntent"] == "FEE_INQUIRY"
    assert res["confidence"] >= 0.85

def test_fee_waiver_intent():
    res = intent_engine.detect_intent("I cannot afford the tuition fee, can I get a fee waiver or scholarship?")
    assert res["primaryIntent"] == "FEE_WAIVER_REQUEST"

def test_escalation_decision():
    esc = escalation_engine.should_escalate("FEE_WAIVER_REQUEST", 0.95, {})
    assert esc["mustEscalate"] is True
    assert esc["category"] == "FEE_WAIVER"
    assert esc["priority"] == "HIGH"

def test_action_engine():
    action = action_engine.decide_next_action("REGISTERED", False, "PENDING", False)
    assert action["action"] == "DISCOVER_PROGRAMS"

    action2 = action_engine.decide_next_action("DOCUMENTS_PENDING", True, "PENDING", False)
    assert action2["action"] == "UPLOAD_DOCUMENTS"
