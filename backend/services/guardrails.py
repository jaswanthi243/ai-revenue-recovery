# ==========================================
# RECOVERAI - ADVANCED GUARDRAILS
# ==========================================


def apply_guardrails(
    amount,
    attempt_count,
    probability,
    recovery_score,
    recommendation,
    payment_status="failed"
):

    # ======================================
    # 1. PAYMENT ALREADY SUCCESSFUL
    # ======================================

    if payment_status == "captured":

        return (
            "STOP",
            "Payment is already successful. No recovery action required."
        )


    # ======================================
    # 2. MAXIMUM RETRIES
    # ======================================

    if attempt_count >= 3:

        return (
            "STOP",
            "Maximum retry attempts reached."
        )


    # ======================================
    # 3. HIGH-VALUE PAYMENT
    # ======================================

    if amount >= 5000:

        return (
            "HUMAN_REVIEW",
            "High-value payment requires human review."
        )


    # ======================================
    # 4. LOW RECOVERY PROBABILITY
    # ======================================

    if probability < 50:

        return (
            "STOP",
            "Recovery probability is below the minimum threshold."
        )


    # ======================================
    # 5. LOW RECOVERY SCORE
    # ======================================

    if recovery_score < 50:

        return (
            "STOP",
            "Recovery score is too low for automated recovery."
        )


    # ======================================
    # 6. UNSAFE RETRY
    # ======================================

    if recommendation == "retry_payment" and attempt_count >= 2:

        return (
            "HUMAN_REVIEW",
            "Repeated retry detected. Human review required."
        )


    # ======================================
    # 7. UNKNOWN ACTION
    # ======================================

    allowed_actions = [
        "retry_payment",
        "retry_later",
        "update_payment_method",
        "alternate_payment_method"
    ]

    if recommendation not in allowed_actions:

        return (
            "HUMAN_REVIEW",
            "Unknown recovery action requires human review."
        )


    # ======================================
    # 8. ALL CHECKS PASSED
    # ======================================

    return (
        "PROCEED",
        "Recovery action passed all guardrails."
    )


# ==========================================
# TEST
# ==========================================

if __name__ == "__main__":

    decision, reason = apply_guardrails(

        amount=3500,

        attempt_count=1,

        probability=65,

        recovery_score=75,

        recommendation="update_payment_method",

        payment_status="failed"
    )

    print("Guardrail Decision:", decision)
    print("Guardrail Reason:", reason)