import requests
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_URL = "http://localhost:8000"

def main():
    print("=" * 60)
    print(" 🤖 Autonomous Admissions AI Agent - Interactive Test Console")
    print("=" * 60)
    print(f"Connected to: {BASE_URL}")
    print("Type your questions below (or type 'exit' / 'quit' to stop).\n")

    tracking_id = "ADM-DEMO-2026"
    print(f"Default Student Tracking ID: [{tracking_id}]")
    print("-" * 60)

    while True:
        try:
            user_input = input("\nYou: ").strip()
            if not user_input:
                continue
            if user_input.lower() in ["exit", "quit", "q"]:
                print("\nExiting AI Agent Console. Goodbye!")
                break

            response = requests.post(
                f"{BASE_URL}/ai/chat",
                json={
                    "trackingId": tracking_id,
                    "message": user_input
                },
                timeout=30
            )

            if response.status_code == 200:
                data = response.json()
                print(f"\n[Detected Intent]: {data.get('intent')} (Confidence: {int(data.get('confidenceScore', 0) * 100)}%)")
                if data.get("escalated"):
                    print("[Status]: ⚠️ ESCALATED TO HUMAN COUNSELOR")
                
                print(f"\nAgent:\n{data.get('reply')}")

                tool_calls = data.get("toolCalls", [])
                if tool_calls:
                    print(f"\n⚙️  Tools Executed: {[t.get('toolName') for t in tool_calls]}")
            else:
                print(f"Error ({response.status_code}): {response.text}")

        except requests.exceptions.ConnectionError:
            print("\n❌ Error: Could not connect to AI Agent at http://localhost:8000.")
            print("Make sure the AI agent server is running with: python -m uvicorn main:app --port 8000")
            break
        except KeyboardInterrupt:
            print("\nExiting...")
            break

if __name__ == "__main__":
    main()
