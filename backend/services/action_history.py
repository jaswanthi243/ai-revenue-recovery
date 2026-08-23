# ==========================================
# RECOVERAI - PERSISTENT ACTION HISTORY
# ==========================================

import os
import csv
from datetime import datetime


# ==========================================
# FILE LOCATION
# ==========================================

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

ACTION_HISTORY_FILE = os.path.join(
    BASE_DIR,
    "action_history.csv"
)


# ==========================================
# CSV COLUMNS
# ==========================================

FIELDNAMES = [

    "payment_id",

    "amount",

    "action",

    "execution_status",

    "message",

    "simulated",

    "timestamp"
]


# ==========================================
# SAVE ACTION
# ==========================================

def save_action(
    payment_id,
    amount,
    action,
    execution_status,
    message,
    simulated=True
):

    record = {

        "payment_id":
            payment_id,

        "amount":
            float(amount),

        "action":
            action,

        "execution_status":
            execution_status,

        "message":
            message,

        "simulated":
            simulated,

        "timestamp":
            datetime.now().isoformat(
                timespec="seconds"
            )
    }


    # ======================================
    # CHECK WHETHER HEADER IS NEEDED
    # ======================================

    file_exists = (
        os.path.exists(
            ACTION_HISTORY_FILE
        )
        and
        os.path.getsize(
            ACTION_HISTORY_FILE
        ) > 0
    )


    # ======================================
    # WRITE RECORD
    # ======================================

    with open(

        ACTION_HISTORY_FILE,

        mode="a",

        newline="",

        encoding="utf-8"

    ) as file:

        writer = csv.DictWriter(

            file,

            fieldnames=FIELDNAMES
        )


        if not file_exists:

            writer.writeheader()


        writer.writerow(
            record
        )


    return record


# ==========================================
# GET ACTION HISTORY
# ==========================================

def get_action_history():

    if not os.path.exists(
        ACTION_HISTORY_FILE
    ):

        return []


    if os.path.getsize(
        ACTION_HISTORY_FILE
    ) == 0:

        return []


    records = []


    with open(

        ACTION_HISTORY_FILE,

        mode="r",

        newline="",

        encoding="utf-8"

    ) as file:

        reader = csv.DictReader(
            file
        )


        for row in reader:

            # Convert amount back to number

            try:

                row["amount"] = float(
                    row["amount"]
                )

            except (
                ValueError,
                TypeError
            ):

                row["amount"] = 0


            # Convert simulated back to bool

            row["simulated"] = (

                str(
                    row["simulated"]
                ).lower()

                == "true"
            )


            records.append(
                row
            )


    return records


# ==========================================
# GET ACTION SUMMARY
# ==========================================

def get_action_summary():

    history = (
        get_action_history()
    )


    scheduled = 0

    awaiting_approval = 0

    blocked = 0

    customer_action = 0

    retry_simulated = 0


    for record in history:

        status = record.get(
            "execution_status",
            ""
        )


        if status == "SCHEDULED":

            scheduled += 1


        elif (
            status
            == "AWAITING_APPROVAL"
        ):

            awaiting_approval += 1


        elif status == "BLOCKED":

            blocked += 1


        elif (
            status
            == "CUSTOMER_ACTION_REQUIRED"
        ):

            customer_action += 1


        elif (
            status
            == "RETRY_SIMULATED"
        ):

            retry_simulated += 1


    return {

        "total_actions":
            len(history),

        "scheduled":
            scheduled,

        "awaiting_approval":
            awaiting_approval,

        "blocked":
            blocked,

        "customer_action_required":
            customer_action,

        "retry_simulated":
            retry_simulated
    }


# ==========================================
# CLEAR HISTORY
# Useful only for local testing
# ==========================================

def clear_action_history():

    if os.path.exists(
        ACTION_HISTORY_FILE
    ):

        os.remove(
            ACTION_HISTORY_FILE
        )


    return {

        "message":
            "Action history cleared."
    }


# ==========================================
# LOCAL TEST
# ==========================================

if __name__ == "__main__":

    print(
        "\nSaving test action..."
    )


    result = save_action(

        payment_id="PAY001",

        amount=2500,

        action="retry_later",

        execution_status="SCHEDULED",

        message=(
            "A future payment retry "
            "has been simulated."
        ),

        simulated=True
    )


    print(
        "\nSaved:"
    )

    print(
        result
    )


    print(
        "\nAction History:"
    )


    for item in (
        get_action_history()
    ):

        print(
            item
        )


    print(
        "\nAction Summary:"
    )

    print(
        get_action_summary()
    )