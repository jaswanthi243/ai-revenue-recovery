import json
import os

from dotenv import load_dotenv
from google import genai


# ==========================================
# LOAD ENVIRONMENT VARIABLES
# ==========================================

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError(
        "GEMINI_API_KEY was not found. "
        "Check your .env file."
    )


# ==========================================
# GEMINI CLIENT
# ==========================================

client = genai.Client(api_key=api_key)


# ==========================================
# RECOVERAI LLM CLIENT
# ==========================================

def get_ai_recommendation(
    payment_id,
    amount,
    failure_reason,
    attempt_count,
    priority,
    probability
):

    prompt = f"""
You are RecoverAI, an AI assistant for failed-payment recovery.

Analyze this failed payment and recommend the safest recovery strategy.

Payment ID: {payment_id}
Amount: INR {amount}
Failure reason: {failure_reason}
Previous attempts: {attempt_count}
Priority: {priority}
Recovery probability: {probability}%

Choose exactly ONE recommendation:

retry_payment
retry_later
update_payment_method
alternate_payment_method
human_review

Return ONLY valid JSON:

{{
    "reasoning": "brief explanation",
    "recommendation": "one allowed recommendation",
    "confidence": 0.0
}}

Confidence must be between 0 and 1.
Do not return markdown or any additional text.
"""

    response = client.models.generate_content(
    model="gemini-3.6-flash",
    contents=prompt
)
    

    response_text = response.text.strip()

    # Remove markdown fences if Gemini returns them
    if response_text.startswith("```"):
        response_text = response_text.replace(
            "```json", ""
        ).replace(
            "```", ""
        ).strip()

    try:
        result = json.loads(response_text)

    except json.JSONDecodeError:
        raise ValueError(
            "Gemini response was not valid JSON:\n"
            + response_text
        )

    return result


# ==========================================
# TEST GEMINI
# ==========================================

if __name__ == "__main__":

    result = get_ai_recommendation(
        payment_id="PAY004",
        amount=3500,
        failure_reason="card_expired",
        attempt_count=1,
        priority="MEDIUM",
        probability=65
    )

    print("\nRecoverAI Gemini Response:")
    print(json.dumps(result, indent=4))