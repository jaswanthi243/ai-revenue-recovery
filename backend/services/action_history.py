# ==========================================
# RECOVERAI - ACTION HISTORY
# ==========================================

from datetime import datetime


# In-memory action history for demo purposes
action_history = []


def save_action(
    payment_id,
    amount,
    action,
    execution_status,
    message,
    simulated=True
):

    record = {

        "payment_id": payment_id,

        "amount": amount,

        "action": action,

        "execution_status":
            execution_status,

        "message": message,

        "simulated": simulated,

        "timestamp":
            datetime.now().isoformat(
                timespec="seconds"
            )
    }

    action_history.append(record)

    return record


def get_action_history():

    return action_history


def get_action_summary():

    scheduled = 0
    awaiting_approval = 0
    blocked = 0
    customer_action = 0

    for record in action_history:

        status = record.get(
            "execution_status"
        )

        if status == "SCHEDULED":

            scheduled += 1

        elif status == "AWAITING_APPROVAL":

            awaiting_approval += 1

        elif status == "BLOCKED":

            blocked += 1

        elif status == "CUSTOMER_ACTION_REQUIRED":

            customer_action += 1


    return {

        "total_actions":
            len(action_history),

        "scheduled":
            scheduled,

        "awaiting_approval":
            awaiting_approval,

        "blocked":
            blocked,

        "customer_action_required":
            customer_action
    }


# ==========================================
# TEST
# ==========================================

if __name__ == "__main__":

    save_action(

        payment_id="PAY001",

        amount=2500,

        action="retry_later",

        execution_status="SCHEDULED",

        message=(
            "A future payment retry "
            "has been simulated."
        )
    )


    print("\nACTION HISTORY")

    for item in get_action_history():

        print(item)


    print("\nACTION SUMMARY")

    print(
        get_action_summary()
    )