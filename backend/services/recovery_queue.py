# ==========================================
# RECOVERAI - SMART RECOVERY QUEUE
# ==========================================


def calculate_queue_score(
    expected_revenue,
    recovery_score,
    priority
):

    score = expected_revenue

    # Recovery score influence
    score += recovery_score * 10

    # Priority influence
    if priority == "HIGH":
        score += 500

    elif priority == "MEDIUM":
        score += 250

    return round(score, 2)


def build_recovery_queue(results):

    queue = []

    for result in results:

        queue_score = calculate_queue_score(
            result["expected_recovery"],
            result["recovery_score"],
            result["priority"]
        )

        item = result.copy()

        item["queue_score"] = queue_score

        queue.append(item)

    # Highest-value opportunity first
    queue.sort(
        key=lambda x: x["queue_score"],
        reverse=True
    )

    return queue


def display_queue(queue):

    print("\n")
    print("=" * 100)
    print("RECOVERAI SMART RECOVERY QUEUE")
    print("=" * 100)

    for position, item in enumerate(queue, start=1):

        print(
            f"{position}. "
            f"{item['payment_id']} | "
            f"INR {item['amount']} | "
            f"Expected: INR {item['expected_recovery']} | "
            f"Score: {item['recovery_score']} | "
            f"Priority: {item['priority']} | "
            f"Action: {item['final_action']}"
        )


# ==========================================
# TEST
# ==========================================

if __name__ == "__main__":

    test_results = [

        {
            "payment_id": "PAY001",
            "amount": 2500,
            "expected_recovery": 1875,
            "recovery_score": 75,
            "priority": "MEDIUM",
            "final_action": "retry_later"
        },

        {
            "payment_id": "PAY007",
            "amount": 7500,
            "expected_recovery": 4125,
            "recovery_score": 50,
            "priority": "HIGH",
            "final_action": "human_review"
        }
    ]

    queue = build_recovery_queue(
        test_results
    )

    display_queue(queue)