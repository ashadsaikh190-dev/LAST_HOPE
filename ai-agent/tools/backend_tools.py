import httpx
from config import settings

class BackendToolClient:
    def __init__(self):
        self.base_url = settings.BACKEND_URL
        self.secret_key = settings.AI_SECRET_KEY

    async def execute_tool(self, tool_name: str, parameters: dict = None, student_id: str = None, tracking_id: str = None) -> dict:
        """
        Executes an authorized backend tool via the Node.js backend API
        """
        payload = {
            "toolName": tool_name,
            "parameters": parameters or {},
            "studentId": student_id,
            "trackingId": tracking_id,
        }

        headers = {
            "X-AI-Secret-Key": self.secret_key,
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{self.base_url}/api/ai/tool-execute",
                    json=payload,
                    headers=headers,
                )
                if response.status_code == 200:
                    data = response.json()
                    return data.get("data", {})
                else:
                    return {"error": f"Backend returned status {response.status_code}: {response.text}"}
        except Exception as e:
            return {"error": f"Failed to execute backend tool {tool_name}: {str(e)}"}

tool_client = BackendToolClient()
