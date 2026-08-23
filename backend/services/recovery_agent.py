# ==========================================
# RECOVERAI - RECOVERY AGENT
# ==========================================

from services.customer_profile import (
    get_customer_profile,
    calculate_reliability_score
)

from services.risk_engine import (
    get_priority,
    get_recovery_probability,
    calculate_expected_revenue,
    calculate_recovery_score,
    get_risk_level
)

from services.guardrails import apply_guardrails


def analyze_payment(
    payment_id,
    customer_id,
    amount,
    failure_reason,
    attempt_count,
    payment_status="failed"
):

    # ======================================
    # 1. CUSTOMER PROFILE
    # ======================================

    customer = get_customer_profile(customer_id)

    customer_reliability = calculate_reliability_score(
        customer
    )

    # ======================================
    # 2. RISK ANALYSIS
    # ======================================

    priority = get_priority(
        amount,
        attempt_count
    )

    recovery_probability = get_recovery_probability(
        failure_reason,
        attempt_count
    )

    expected_revenue = calculate_expected_revenue(
        amount,
        recovery_probability
    )

    # ======================================
    # 3. RECOVERY SCORE
    # ======================================

    recovery_score = calculate_recovery_score(
        recovery_probability,
        customer_reliability,
        attempt_count,
        amount
    )

    risk_level = get_risk_level(
        recovery_score
    )

    # ======================================
    # 4. AI RECOMMENDATION
    # ======================================

    if failure_reason == "insufficient_funds":

        recommendation = "retry_later"

        reasoning = (
            "The payment failed because the customer "
            "may have insufficient funds. A delayed retry "
            "is more appropriate than an immediate retry."
        )

    elif failure_reason == "card_expired":

        recommendation = "update_payment_method"

        reasoning = (
            "The customer's payment method appears to be "
            "expired. Updating the payment method is more "
            "appropriate than retrying the same method."
        )

    elif failure_reason == "network_error":

        recommendation = "retry_payment"

        reasoning = (
            "The payment may have failed because of a "
            "temporary network or technical problem. "
            "A retry is appropriate."
        )

    elif failure_reason == "bank_declined":

        recommendation = "alternate_payment_method"

        reasoning = (
            "The bank declined the payment. Using another "
            "payment method is more appropriate than "
            "repeatedly retrying the same payment."
        )

    else:

        recommendation = "human_review"

        reasoning = (
            "The failure reason is unknown. "
            "Human review is recommended."
        )

    # ======================================
    # 5. APPLY GUARDRAILS
    # ======================================

    guardrail_decision, guardrail_reason = apply_guardrails(

        amount=amount,

        attempt_count=attempt_count,

        probability=recovery_probability,

        recovery_score=recovery_score,

        recommendation=recommendation,

        payment_status=payment_status
    )

    # ======================================
    # 6. FINAL ACTION
    # ======================================

    if guardrail_decision == "PROCEED":

        final_action = recommendation

    elif guardrail_decision == "HUMAN_REVIEW":

        final_action = "human_review"

    else:

        final_action = "stop_recovery"

    # ======================================
    # 7. RETURN COMPLETE DECISION
    # ======================================

    return {

        "payment_id": payment_id,

        "customer_id": customer_id,

        "amount": amount,

        "failure_reason": failure_reason,

        "attempt_count": attempt_count,

        "priority": priority,

        "customer_reliability": customer_reliability,

        "recovery_probability": recovery_probability,

        "recovery_score": recovery_score,

        "risk_level": risk_level,

        "expected_revenue": round(
            expected_revenue,
            2
        ),

        "reasoning": reasoning,

        "recommendation": recommendation,

        "guardrail_decision": guardrail_decision,

        "guardrail_reason": guardrail_reason,

        "final_action": final_action
    }


# ==========================================
# TEST
# ==========================================

if __name__ == "__main__":

    result = analyze_payment(

        payment_id="PAY004",

        customer_id="CUST004",

        amount=3500,

        failure_reason="card_expired",

        attempt_count=1,

        payment_status="failed"
    )

    print("\n")
    print("=" * 60)
    print("RECOVERAI AGENT + GUARDRAIL TEST")
    print("=" * 60)

    for key, value in result.items():

        print(f"{key}: {value}")