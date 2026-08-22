# ==========================================
# RECOVERAI - GUARDRAILS
# ==========================================


def apply_guardrails(amount, attempt_count, probability):

    if attempt_count >= 3:
        return "STOP", "Maximum retry attempts reached"

    if amount >= 5000:
        return (
            "HUMAN_REVIEW",
            "High-value payment requires human review"
        )

    if probability < 50:
        return "STOP", "Low recovery probability"

    return "PROCEED", "Recovery action allowed"