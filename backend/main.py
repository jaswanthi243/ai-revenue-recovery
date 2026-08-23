import pandas as pd

from services.recovery_agent import analyze_payment
from services.recovery_queue import (
    build_recovery_queue,
    display_queue
)


# ==========================================
# 1. LOAD PAYMENT DATA
# ==========================================

payments = pd.read_csv("data/payments.csv")

print("\nAll Payments:")
print(payments)


# ==========================================
# 2. FIND FAILED PAYMENTS
# ==========================================

failed_payments = payments[
    payments["status"] == "failed"
]

print("\nFailed Payments:")
print(failed_payments)


# ==========================================
# 3. CALCULATE REVENUE AT RISK
# ==========================================

revenue_at_risk = failed_payments["amount"].sum()

print("\nRevenue at Risk:")
print("INR", revenue_at_risk)


# ==========================================
# 4. ANALYZE FAILED PAYMENTS
# ==========================================

print("\n")
print("=" * 100)
print("RECOVERAI AGENT DECISIONS")
print("=" * 100)


total_expected_revenue = 0

audit_logs = []


for index, payment in failed_payments.iterrows():

    # --------------------------------------
    # PAYMENT INFORMATION
    # --------------------------------------

    payment_id = payment["payment_id"]

    customer_id = payment["customer_id"]

    amount = payment["amount"]

    failure_reason = payment["failure_reason"]

    attempt_count = payment["attempt_count"]

    payment_status = payment["status"]


    # ======================================
    # RECOVERAI AGENT
    # ======================================

    result = analyze_payment(

        payment_id=payment_id,

        customer_id=customer_id,

        amount=amount,

        failure_reason=failure_reason,

        attempt_count=attempt_count,

        payment_status=payment_status
    )


    # ======================================
    # GET AGENT RESULTS
    # ======================================

    priority = result["priority"]

    customer_reliability = result[
        "customer_reliability"
    ]

    recovery_probability = result[
        "recovery_probability"
    ]

    recovery_score = result[
        "recovery_score"
    ]

    risk_level = result[
        "risk_level"
    ]

    expected_revenue = result[
        "expected_revenue"
    ]

    reasoning = result[
        "reasoning"
    ]

    recommendation = result[
        "recommendation"
    ]

    guardrail_decision = result[
        "guardrail_decision"
    ]

    guardrail_reason = result[
        "guardrail_reason"
    ]

    final_action = result[
        "final_action"
    ]


    # ======================================
    # EXPECTED REVENUE
    # ======================================

    total_expected_revenue += expected_revenue


    # ======================================
    # DISPLAY AGENT DECISION
    # ======================================

    print("\n")
    print("-" * 100)

    print("Payment ID:", payment_id)

    print("Customer ID:", customer_id)

    print("Amount: INR", amount)

    print("Failure:", failure_reason)

    print("Attempt Count:", attempt_count)

    print()

    print("Priority:", priority)

    print(
        "Customer Reliability:",
        customer_reliability,
        "/100"
    )

    print(
        "Recovery Probability:",
        recovery_probability,
        "%"
    )

    print(
        "Recovery Score:",
        recovery_score,
        "/100"
    )

    print(
        "Risk Level:",
        risk_level
    )

    print(
        "Expected Recovery: INR",
        round(expected_revenue, 2)
    )

    print()

    print(
        "AI Recommendation:",
        recommendation
    )

    print(
        "AI Reasoning:",
        reasoning
    )

    print()

    print(
        "Guardrail Decision:",
        guardrail_decision
    )

    print(
        "Guardrail Reason:",
        guardrail_reason
    )

    print(
        "FINAL ACTION:",
        final_action
    )


    # ======================================
    # AUDIT LOG
    # ======================================

    audit_logs.append({

        "payment_id": payment_id,

        "customer_id": customer_id,

        "amount": amount,

        "failure_reason": failure_reason,

        "attempt_count": attempt_count,

        "priority": priority,

        "customer_reliability":
            customer_reliability,

        "recovery_probability":
            recovery_probability,

        "recovery_score":
            recovery_score,

        "risk_level":
            risk_level,

        "expected_recovery":
            round(expected_revenue, 2),

        "ai_recommendation":
            recommendation,

        "ai_reasoning":
            reasoning,

        "guardrail_decision":
            guardrail_decision,

        "guardrail_reason":
            guardrail_reason,

        "final_action":
            final_action
    })


# ==========================================
# 5. FINAL RECOVERY SUMMARY
# ==========================================

print("\n")
print("=" * 100)
print("RECOVERAI RECOVERY SUMMARY")
print("=" * 100)


print(
    "TOTAL REVENUE AT RISK:"
)

print(
    "INR",
    revenue_at_risk
)


print(
    "\nEXPECTED RECOVERABLE REVENUE:"
)

print(
    "INR",
    round(total_expected_revenue, 2)
)


# ==========================================
# 6. HUMAN REVIEW COUNT
# ==========================================

human_review_count = sum(

    1

    for log in audit_logs

    if log["guardrail_decision"]
    == "HUMAN_REVIEW"
)


print(
    "\nPAYMENTS REQUIRING HUMAN REVIEW:"
)

print(
    human_review_count
)


# ==========================================
# 7. BLOCKED / STOPPED RECOVERIES
# ==========================================

stopped_count = sum(

    1

    for log in audit_logs

    if log["guardrail_decision"]
    == "STOP"
)


print(
    "\nPAYMENTS BLOCKED BY GUARDRAILS:"
)

print(
    stopped_count
)


# ==========================================
# 8. BUILD SMART RECOVERY QUEUE
# ==========================================

recovery_queue = build_recovery_queue(
    audit_logs
)


# ==========================================
# 9. DISPLAY SMART RECOVERY QUEUE
# ==========================================

display_queue(
    recovery_queue
)


# ==========================================
# 10. SAVE AUDIT TRAIL
# ==========================================

audit_df = pd.DataFrame(
    audit_logs
)

audit_df.to_csv(
    "audit_log.csv",
    index=False
)


print(
    "\nAudit trail saved to:"
)

print(
    "audit_log.csv"
)


# ==========================================
# 11. SAVE SMART RECOVERY QUEUE
# ==========================================

queue_df = pd.DataFrame(
    recovery_queue
)

queue_df.to_csv(
    "recovery_queue.csv",
    index=False
)


print(
    "\nSmart recovery queue saved to:"
)

print(
    "recovery_queue.csv"
)


# ==========================================
# 12. FINAL SYSTEM STATUS
# ==========================================

print("\n")
print("=" * 100)
print("RECOVERAI AGENT EXECUTION COMPLETED")
print("=" * 100)