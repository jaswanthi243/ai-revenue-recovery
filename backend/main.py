import pandas as pd

from services.recovery_agent import analyze_payment
from services.risk_engine import (
    get_priority,
    get_recovery_probability,
    calculate_expected_revenue
)
from services.guardrails import apply_guardrails


# ==========================================
# 1. LOAD PAYMENT DATA
# ==========================================

payments = pd.read_csv("data/payments.csv")

print("All Payments:")
print(payments)


# ==========================================
# 2. FIND FAILED PAYMENTS
# ==========================================

failed_payments = payments[payments["status"] == "failed"]

print("\nFailed Payments:")
print(failed_payments)


# ==========================================
# 3. CALCULATE REVENUE AT RISK
# ==========================================

revenue_at_risk = failed_payments["amount"].sum()

print("\nRevenue at Risk:")
print("INR", revenue_at_risk)


# ==========================================
# 4. RECOVERY ACTION
# ==========================================

def get_recovery_action(failure_reason):

    if failure_reason == "insufficient_funds":
        return "Retry payment later"

    elif failure_reason == "card_expired":
        return "Ask customer to update payment method"

    elif failure_reason == "network_error":
        return "Retry payment"

    elif failure_reason == "bank_declined":
        return "Ask customer to use another payment method"

    else:
        return "Escalate to human"


# ==========================================
# 5. SIMULATE RECOVERY
# ==========================================

def simulate_recovery(decision, probability):

    if decision != "PROCEED":
        return False

    if probability >= 70:
        return True

    return False


# ==========================================
# 6. ANALYZE PAYMENTS
# ==========================================

print("\nRecovery Agent Decisions:")
print("=" * 80)

total_expected_revenue = 0
actual_recovered_revenue = 0

audit_logs = []


for index, payment in failed_payments.iterrows():

    payment_id = payment["payment_id"]
    amount = payment["amount"]
    failure_reason = payment["failure_reason"]
    attempt_count = payment["attempt_count"]

    # --------------------------------------
    # Recovery action
    # --------------------------------------

    action = get_recovery_action(failure_reason)

    # --------------------------------------
    # Risk engine
    # --------------------------------------

    priority = get_priority(
        amount,
        attempt_count
    )

    probability = get_recovery_probability(
        failure_reason,
        attempt_count
    )

    expected_revenue = calculate_expected_revenue(
        amount,
        probability
    )

    total_expected_revenue += expected_revenue

    # ======================================
    # RECOVERAI AGENT
    # ======================================

    agent_result = analyze_payment(
        payment_id,
        amount,
        failure_reason,
        attempt_count,
        priority,
        probability
    )

    ai_reasoning = agent_result["reasoning"]
    ai_recommendation = agent_result["recommendation"]
    ai_confidence = agent_result["confidence"]
    agent_mode = agent_result["agent_mode"]

    # ======================================
    # GUARDRAILS
    # ======================================

    decision, guardrail_reason = apply_guardrails(
        amount,
        attempt_count,
        probability
    )

    # --------------------------------------
    # Final action
    # --------------------------------------

    if decision == "PROCEED":
        final_action = action

    elif decision == "HUMAN_REVIEW":
        final_action = "Escalate to human"

    else:
        final_action = "Stop recovery"

    # --------------------------------------
    # Simulate recovery
    # --------------------------------------

    recovered = simulate_recovery(
        decision,
        probability
    )

    if recovered:

        actual_recovered_revenue += amount
        recovery_status = "RECOVERED"

    else:

        recovery_status = "NOT RECOVERED"

    # ======================================
    # DISPLAY
    # ======================================

    print("\nPayment ID:", payment_id)
    print("Amount: INR", amount)
    print("Failure:", failure_reason)
    print("Attempt Count:", attempt_count)

    print("Priority:", priority)
    print("Recovery Probability:", probability, "%")

    print("Agent Mode:", agent_mode)
    print("AI Recommendation:", ai_recommendation)
    print("AI Confidence:", ai_confidence)
    print("AI Reasoning:", ai_reasoning)  
    

    print(
        "Expected Recovery: INR",
        round(expected_revenue, 2)
    )

    print("Guardrail Decision:", decision)
    print("Guardrail Reason:", guardrail_reason)

    print("Final Action:", final_action)
    print("Recovery Result:", recovery_status)

    # ======================================
    # AUDIT LOG
    # ======================================

    audit_logs.append({

        "payment_id": payment_id,
        "amount": amount,
        "failure_reason": failure_reason,
        "attempt_count": attempt_count,

        "priority": priority,
        "probability": probability,

        "ai_recommendation": ai_recommendation,
        "ai_reasoning": ai_reasoning,

        "agent_mode": agent_mode,
        "ai_recommendation": ai_recommendation,
        "ai_confidence": ai_confidence,
        "ai_reasoning": ai_reasoning,

        "expected_recovery": round(
            expected_revenue,
            2
        ),

        "guardrail_decision": decision,
        "guardrail_reason": guardrail_reason,

        "final_action": final_action,
        "recovery_status": recovery_status
    })


# ==========================================
# 7. FINAL SUMMARY
# ==========================================

print("\n")
print("=" * 80)
print("RECOVERY SUMMARY")
print("=" * 80)

print("Total Revenue at Risk:")
print("INR", revenue_at_risk)

print("\nExpected Recoverable Revenue:")
print(
    "INR",
    round(total_expected_revenue, 2)
)

print("\nActual Revenue Recovered:")
print("INR", actual_recovered_revenue)


if revenue_at_risk > 0:

    recovery_rate = (
        actual_recovered_revenue
        / revenue_at_risk
    ) * 100

else:

    recovery_rate = 0


print("\nActual Recovery Rate:")
print(
    round(recovery_rate, 2),
    "%"
)


# ==========================================
# 8. SAVE AUDIT TRAIL
# ==========================================

audit_df = pd.DataFrame(audit_logs)

audit_df.to_csv(
    "audit_log.csv",
    index=False
)

print("\nAudit trail saved to:")
print("audit_log.csv")

print("\nAgent execution completed.")