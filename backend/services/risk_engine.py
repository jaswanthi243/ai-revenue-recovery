# ==========================================
# RECOVERAI - RISK ENGINE
# ==========================================


def get_priority(amount, attempt_count):

    if amount >= 5000 and attempt_count <= 1:
        return "HIGH"

    elif amount >= 2000 and attempt_count <= 2:
        return "MEDIUM"

    else:
        return "LOW"


def get_recovery_probability(failure_reason, attempt_count):

    probability = 70

    if failure_reason == "network_error":
        probability += 10

    elif failure_reason == "insufficient_funds":
        probability += 5

    elif failure_reason == "card_expired":
        probability -= 5

    elif failure_reason == "bank_declined":
        probability -= 15

    if attempt_count >= 2:
        probability -= 10

    probability = max(0, min(probability, 100))

    return probability


def calculate_expected_revenue(amount, probability):

    return amount * probability / 100