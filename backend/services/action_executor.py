# ==========================================
# RECOVERAI - ACTION EXECUTOR
# ==========================================

from datetime import datetime


def execute_recovery_action(
    payment_id,
    amount,
    final_action,
    guardrail_decision
):

    timestamp = datetime.now().isoformat(
        timespec="seconds"
    )


    # ======================================
    # HUMAN REVIEW
    # ======================================

    if (
        guardrail_decision
        == "HUMAN_REVIEW"
    ):

        return {

            "payment_id":
                payment_id,

            "amount":
                amount,

            "action":
                final_action,

            "execution_status":
                "AWAITING_APPROVAL",

            "message":
                (
                    "Recovery action requires "
                    "human approval before execution."
                ),

            "simulated":
                True,

            "timestamp":
                timestamp
        }


    # ======================================
    # BLOCKED BY GUARDRAIL
    # ======================================

    if (
        guardrail_decision
        == "STOP"
    ):

        return {

            "payment_id":
                payment_id,

            "amount":
                amount,

            "action":
                final_action,

            "execution_status":
                "BLOCKED",

            "message":
                (
                    "Recovery action was blocked "
                    "by RecoverAI guardrails."
                ),

            "simulated":
                True,

            "timestamp":
                timestamp
        }


    # ======================================
    # RETRY LATER
    # ======================================

    if (
        final_action
        == "retry_later"
    ):

        return {

            "payment_id":
                payment_id,

            "amount":
                amount,

            "action":
                final_action,

            "execution_status":
                "SCHEDULED",

            "message":
                (
                    "A future payment retry "
                    "has been simulated."
                ),

            "simulated":
                True,

            "timestamp":
                timestamp
        }


    # ======================================
    # RETRY PAYMENT
    # ======================================

    if (
        final_action
        == "retry_payment"
    ):

        return {

            "payment_id":
                payment_id,

            "amount":
                amount,

            "action":
                final_action,

            "execution_status":
                "RETRY_SIMULATED",

            "message":
                (
                    "Immediate payment retry "
                    "has been simulated."
                ),

            "simulated":
                True,

            "timestamp":
                timestamp
        }


    # ======================================
    # UPDATE PAYMENT METHOD
    # ======================================

    if (
        final_action
        == "update_payment_method"
    ):

        return {

            "payment_id":
                payment_id,

            "amount":
                amount,

            "action":
                final_action,

            "execution_status":
                "CUSTOMER_ACTION_REQUIRED",

            "message":
                (
                    "Customer payment-method "
                    "update flow has been simulated."
                ),

            "simulated":
                True,

            "timestamp":
                timestamp
        }


    # ======================================
    # ALTERNATE PAYMENT METHOD
    # ======================================

    if (
        final_action
        == "alternate_payment_method"
    ):

        return {

            "payment_id":
                payment_id,

            "amount":
                amount,

            "action":
                final_action,

            "execution_status":
                "CUSTOMER_ACTION_REQUIRED",

            "message":
                (
                    "Alternate payment-method "
                    "request has been simulated."
                ),

            "simulated":
                True,

            "timestamp":
                timestamp
        }


    # ======================================
    # HUMAN REVIEW ACTION
    # ======================================

    if (
        final_action
        == "human_review"
    ):

        return {

            "payment_id":
                payment_id,

            "amount":
                amount,

            "action":
                final_action,

            "execution_status":
                "AWAITING_APPROVAL",

            "message":
                (
                    "Case has been sent to "
                    "the simulated review queue."
                ),

            "simulated":
                True,

            "timestamp":
                timestamp
        }


    # ======================================
    # DEFAULT
    # ======================================

    return {

        "payment_id":
            payment_id,

        "amount":
            amount,

        "action":
            final_action,

        "execution_status":
            "NO_ACTION",

        "message":
            (
                "No executable recovery "
                "action was identified."
            ),

        "simulated":
            True,

        "timestamp":
            timestamp
    }


# ==========================================
# TEST
# ==========================================

if __name__ == "__main__":

    result = execute_recovery_action(

        payment_id="PAY001",

        amount=2500,

        final_action="retry_later",

        guardrail_decision="PROCEED"
    )


    print("\n")
    print("=" * 70)
    print("RECOVERAI ACTION EXECUTOR TEST")
    print("=" * 70)


    for key, value in result.items():

        print(
            f"{key}: {value}"
        )