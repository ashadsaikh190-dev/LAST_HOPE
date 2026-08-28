import os
import sys
import asyncio

# Configure UTF-8 output for Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.agent import agent

TEST_QUERIES = [
    # 1. Critical Acceptance Tests
    ("What is the university name?", "UNIVERSITY_NAME"),
    ("What is the difference between CSE and ECE?", "GENERAL_REASONING"),
    
    # 2. General Conversational & Technical Questions
    ("What is machine learning?", "GENERAL_ML"),
    ("How should I prepare for engineering?", "GENERAL_PREP"),
    ("Hello! Who are you?", "GREETING"),
    ("Thank you for your help!", "GRATITUDE"),
    
    # 3. University Programs & Fees
    ("Which engineering courses do you have?", "PROGRAMS"),
    ("What is the CSE fee?", "FEE_QUERY"),
    
    # 4. Eligibility & Scholarships
    ("I got 72% in 12th. What can I apply for?", "ELIGIBILITY"),
    ("Can I get a scholarship with 92% in 12th?", "SCHOLARSHIP"),
    
    # 5. Documents & Guidance
    ("What documents do I need to submit?", "DOCUMENTS"),
    
    # 6. Counselor Escalation
    ("I have a complex issue and want to talk to a human counselor.", "ESCALATION"),
    
    # 7. Unscripted Open-Ended Question
    ("Can you write a short Python function to calculate factorial?", "UNSCRIPTED_CODING"),
]

async def run_suite():
    print("=" * 70)
    print("🚀 RUNNING COMPREHENSIVE GEMINI AUTONOMOUS AGENT TEST SUITE")
    print("=" * 70)
    
    passed = 0
    failed = 0
    
    for query, test_id in TEST_QUERIES:
        print(f"\n--- [TEST: {test_id}] Query: \"{query}\" ---")
        try:
            res = await agent.process_student_message(
                tracking_id="STU-2026-TEST",
                student_id="test-student-id",
                message_text=query,
            )
            
            reply = res.get("reply", "")
            tools_used = [tc.get("toolName") for tc in res.get("toolCalls", [])]
            model = res.get("model", "")
            escalated = res.get("escalated", False)
            
            print(f"Model Used: {model}")
            print(f"Tools Invoked: {tools_used}")
            print(f"Escalated: {escalated}")
            print(f"Reply Snippet:\n{reply[:250]}...\n")
            
            # Acceptance validations
            is_robotic_fallback = "I received your inquiry:" in reply or "Hello Student! I received your inquiry" in reply
            if is_robotic_fallback:
                print("❌ FAILED: Detected robotic fallback template!")
                failed += 1
            elif not reply.strip():
                print("❌ FAILED: Empty reply generated!")
                failed += 1
            else:
                print("✅ PASSED: Natural, intelligent response generated.")
                passed += 1
        except Exception as e:
            print(f"❌ ERROR in test {test_id}: {e}")
            failed += 1
            
    print("\n" + "=" * 70)
    print(f"🏁 TEST SUITE COMPLETED: {passed} PASSED, {failed} FAILED (Total: {len(TEST_QUERIES)})")
    print("=" * 70)

if __name__ == "__main__":
    asyncio.run(run_suite())
