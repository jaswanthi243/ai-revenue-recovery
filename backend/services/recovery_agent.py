from services.llm_client import get_ai_recommendation


# ==========================================
# RECOVERAI - LOCAL FALLBACK AGENT
# ==========================================

def local_recommendation(failure_reason):

    if failure_reason == "insufficient_funds":

        reasoning = (
            "The payment failed because the customer may not "
            "have sufficient balance. A delayed retry is appropriate."
        )

        recommendation = "retry_later"

    elif failure_reason == "card_expired":

        reasoning = (
            "The customer's payment method may be expired. "
            "Retrying the same payment method is unlikely to succeed "
            "until the payment method is updated."
        )

        recommendation = "update_payment_method"

    elif failure_reason == "network_error":

        reasoning = (
            "The payment may have failed because of a temporary "
            "network or technical issue. A retry can be attempted."
        )

        recommendation = "retry_payment"

    elif failure_reason == "bank_declined":

        reasoning = (
            "The bank declined the payment. Using another payment "
            "method or human review may be more appropriate."
        )

        recommendation = "alternate_payment_method"

    else:

        reasoning = (
            "The failure reason is unknown. "
            "Human review is recommended."
        )

        recommendation = "human_review"

    return {
        "reasoning": reasoning,
        "recommendation": recommendation,
        "confidence": None
    }


# ==========================================
# RECOVERAI AGENT
# ==========================================

def analyze_payment(
    payment_id,
    amount,
    failure_reason,
    attempt_count,
    priority,
    probability
):

    # --------------------------------------
    # TRY REAL AI
    # --------------------------------------

    try:

        ai_result = get_ai_recommendation(
            payment_id,
            amount,
            failure_reason,
            attempt_count,
            priority,
            probability
        )

        return {
            "payment_id": payment_id,
            "amount": amount,
            "priority": priority,
            "recovery_probability": probability,

            "reasoning": ai_result["reasoning"],
            "recommendation": ai_result["recommendation"],
            "confidence": ai_result.get("confidence"),

            "agent_mode": "LLM"
        }

    # --------------------------------------
    # FALLBACK IF AI API FAILS
    # --------------------------------------

    except Exception as error:

        print(
            "\n[RecoverAI] LLM unavailable."
            " Switching to local fallback."
        )

        print(
            "[RecoverAI] Reason:",
            type(error).__name__
        )

        fallback = local_recommendation(
            failure_reason
        )

        return {
            "payment_id": payment_id,
            "amount": amount,
            "priority": priority,
            "recovery_probability": probability,

            "reasoning": fallback["reasoning"],
            "recommendation": fallback["recommendation"],
            "confidence": fallback["confidence"],

            "agent_mode": "LOCAL_FALLBACK"
        }