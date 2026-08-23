# ==========================================
# RECOVERAI - ACTION EXECUTOR
# ==========================================

from services.action_history import save_action


def execute_recovery_action(
    payment_id,
    amount,
    final_action,
    guardrail_decision
):

    # ======================================
    # 1. HUMAN REVIEW REQUIRED
    # ======================================

    if guardrail_decision == "HUMAN_REVIEW":

        return save_action(

            payment_id=payment_id,

            amount=amount,

            action=final_action,

            execution_status="AWAITING_APPROVAL",

            message=(
                "Recovery action requires "
                "human approval before execution."
            ),

            simulated=True
        )


    # ======================================
    # 2. BLOCKED BY GUARDRAILS
    # ======================================

    if guardrail_decision == "STOP":

        return save_action(

            payment_id=payment_id,

            amount=amount,

            action=final_action,

            execution_status="BLOCKED",

            message=(
                "Recovery action was blocked "
                "by RecoverAI guardrails."
            ),

            simulated=True
        )


    # ======================================
    # 3. RETRY LATER
    # ======================================

    if final_action == "retry_later":

        return save_action(

            payment_id=payment_id,

            amount=amount,

            action=final_action,

            execution_status="SCHEDULED",

            message=(
                "A future payment retry "
                "has been simulated."
            ),

            simulated=True
        )


    # ======================================
    # 4. RETRY PAYMENT
    # ======================================

    if final_action == "retry_payment":

        return save_action(

            payment_id=payment_id,

            amount=amount,

            action=final_action,

            execution_status="RETRY_SIMULATED",

            message=(
                "Immediate payment retry "
                "has been simulated."
            ),

            simulated=True
        )


    # ======================================
    # 5. UPDATE PAYMENT METHOD
    # ======================================

    if final_action == "update_payment_method":

        return save_action(

            payment_id=payment_id,

            amount=amount,

            action=final_action,

            execution_status="CUSTOMER_ACTION_REQUIRED",

            message=(
                "Customer payment-method "
                "update flow has been simulated."
            ),

            simulated=True
        )


    # ======================================
    # 6. ALTERNATE PAYMENT METHOD
    # ======================================

    if final_action == "alternate_payment_method":

        return save_action(

            payment_id=payment_id,

            amount=amount,

            action=final_action,

            execution_status="CUSTOMER_ACTION_REQUIRED",

            message=(
                "Alternate payment-method "
                "request has been simulated."
            ),

            simulated=True
        )


    # ======================================
    # 7. HUMAN REVIEW ACTION
    # ======================================

    if final_action == "human_review":

        return save_action(

            payment_id=payment_id,

            amount=amount,

            action=final_action,

            execution_status="AWAITING_APPROVAL",

            message=(
                "Case has been sent to "
                "the simulated human review queue."
            ),

            simulated=True
        )


    # ======================================
    # 8. STOP RECOVERY
    # ======================================

    if final_action == "stop_recovery":

        return save_action(

            payment_id=payment_id,

            amount=amount,

            action=final_action,

            execution_status="BLOCKED",

            message=(
                "Recovery workflow has been "
                "stopped by RecoverAI."
            ),

            simulated=True
        )


    # ======================================
    # 9. DEFAULT
    # ======================================

    return save_action(

        payment_id=payment_id,

        amount=amount,

        action=final_action,

        execution_status="NO_ACTION",

        message=(
            "No executable recovery "
            "action was identified."
        ),

        simulated=True
    )


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