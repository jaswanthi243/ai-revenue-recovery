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
# NORMALIZE RECORD
# ==========================================

def normalize_record(row):

    try:

        row["amount"] = float(
            row.get(
                "amount",
                0
            )
        )

    except (
        ValueError,
        TypeError
    ):

        row["amount"] = 0


    row["simulated"] = (

        str(
            row.get(
                "simulated",
                "True"
            )
        ).lower()

        == "true"
    )


    return row


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


    file_exists = (

        os.path.exists(
            ACTION_HISTORY_FILE
        )

        and

        os.path.getsize(
            ACTION_HISTORY_FILE
        ) > 0
    )


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

            records.append(
                normalize_record(
                    row
                )
            )


    return records


# ==========================================
# GET LATEST RECORD FOR EACH PAYMENT
# ==========================================

def get_latest_action_records():

    history = get_action_history()


    latest = {}


    for record in history:

        payment_id = record.get(
            "payment_id"
        )


        if not payment_id:

            continue


        latest[
            payment_id
        ] = record


    return list(
        latest.values()
    )


# ==========================================
# GET LATEST RECORD FOR PAYMENT
# ==========================================

def get_latest_action_for_payment(
    payment_id
):

    history = get_action_history()


    for record in reversed(
        history
    ):

        if (
            record.get(
                "payment_id"
            )
            == payment_id
        ):

            return record


    return None


# ==========================================
# GET PENDING HUMAN REVIEWS
# ==========================================

def get_pending_reviews():

    latest_records = (
        get_latest_action_records()
    )


    pending = []


    for record in latest_records:

        if (

            record.get(
                "execution_status"
            )
            == "AWAITING_APPROVAL"

        ):

            pending.append(
                record
            )


    return pending


# ==========================================
# APPROVE HUMAN REVIEW
# ==========================================

def approve_review(
    payment_id,
    reviewer_note=None
):

    current = (
        get_latest_action_for_payment(
            payment_id
        )
    )


    if not current:

        return {

            "success":
                False,

            "message":
                "No action found for payment."
        }


    if (
        current.get(
            "execution_status"
        )
        != "AWAITING_APPROVAL"
    ):

        return {

            "success":
                False,

            "message":
                (
                    "Payment is not currently "
                    "awaiting human approval."
                )
        }


    message = (
        "Human reviewer approved the "
        "recovery case."
    )


    if reviewer_note:

        message += (
            f" Reviewer note: "
            f"{reviewer_note}"
        )


    record = save_action(

        payment_id=
            current[
                "payment_id"
            ],

        amount=
            current[
                "amount"
            ],

        action=
            current[
                "action"
            ],

        execution_status=
            "APPROVED",

        message=
            message,

        simulated=True
    )


    return {

        "success":
            True,

        "record":
            record
    }


# ==========================================
# REJECT HUMAN REVIEW
# ==========================================

def reject_review(
    payment_id,
    reviewer_note=None
):

    current = (
        get_latest_action_for_payment(
            payment_id
        )
    )


    if not current:

        return {

            "success":
                False,

            "message":
                "No action found for payment."
        }


    if (
        current.get(
            "execution_status"
        )
        != "AWAITING_APPROVAL"
    ):

        return {

            "success":
                False,

            "message":
                (
                    "Payment is not currently "
                    "awaiting human approval."
                )
        }


    message = (
        "Human reviewer rejected the "
        "recovery case."
    )


    if reviewer_note:

        message += (
            f" Reviewer note: "
            f"{reviewer_note}"
        )


    record = save_action(

        payment_id=
            current[
                "payment_id"
            ],

        amount=
            current[
                "amount"
            ],

        action=
            current[
                "action"
            ],

        execution_status=
            "REJECTED",

        message=
            message,

        simulated=True
    )


    return {

        "success":
            True,

        "record":
            record
    }


# ==========================================
# GET ACTION SUMMARY
# ==========================================

def get_action_summary():

    history = (
        get_latest_action_records()
    )


    scheduled = 0

    awaiting_approval = 0

    blocked = 0

    customer_action = 0

    retry_simulated = 0

    approved = 0

    rejected = 0

    no_action = 0


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


        elif status == "APPROVED":

            approved += 1


        elif status == "REJECTED":

            rejected += 1


        elif status == "NO_ACTION":

            no_action += 1


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
            retry_simulated,

        "approved":
            approved,

        "rejected":
            rejected,

        "no_action":
            no_action
    }


# ==========================================
# CLEAR HISTORY
# LOCAL TEST ONLY
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
        "\nSaving human review test..."
    )


    save_action(

        payment_id="PAY007",

        amount=7500,

        action="human_review",

        execution_status=
            "AWAITING_APPROVAL",

        message=(
            "Recovery action requires "
            "human approval before execution."
        ),

        simulated=True
    )


    print(
        "\nPending Reviews:"
    )


    for item in (
        get_pending_reviews()
    ):

        print(
            item
        )


    print(
        "\nApproving PAY007..."
    )


    print(
        approve_review(
            "PAY007",
            "Approved during local test."
        )
    )


    print(
        "\nSummary:"
    )


    print(
        get_action_summary()
    )