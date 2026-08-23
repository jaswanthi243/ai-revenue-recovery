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


# ==========================================
# RECOVERY PROBABILITY
# ==========================================

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


# ==========================================
# EXPECTED RECOVERABLE REVENUE
# ==========================================

def calculate_expected_revenue(amount, probability):

    return amount * probability / 100


# ==========================================
# CUSTOMER RELIABILITY
# ==========================================

def calculate_customer_reliability(customer):

    if customer is None:
        return 50

    successful = customer["successful_payments"]
    failed = customer["failed_payments"]

    total = successful + failed

    if total == 0:
        return 50

    reliability = (successful / total) * 100

    return round(reliability)


# ==========================================
# RECOVERY SCORE
# ==========================================

def calculate_recovery_score(
    recovery_probability,
    customer_reliability,
    attempt_count,
    amount
):

    score = recovery_probability

    # Customer history
    if customer_reliability >= 90:
        score += 10

    elif customer_reliability >= 75:
        score += 5

    elif customer_reliability < 50:
        score -= 10

    # Previous attempts
    if attempt_count >= 3:
        score -= 10

    elif attempt_count >= 2:
        score -= 5

    # High-value transactions require caution
    if amount >= 5000:
        score -= 5

    # Keep score between 0 and 100
    score = max(0, min(score, 100))

    return round(score)


# ==========================================
# RISK LEVEL
# ==========================================

def get_risk_level(score):

    if score >= 80:
        return "LOW RISK"

    elif score >= 60:
        return "MEDIUM RISK"

    else:
        return "HIGH RISK"


# ==========================================
# TEST
# ==========================================

if __name__ == "__main__":

    recovery_probability = get_recovery_probability(
        "card_expired",
        1
    )

    customer = {
        "successful_payments": 12,
        "failed_payments": 1
    }

    customer_reliability = calculate_customer_reliability(
        customer
    )

    score = calculate_recovery_score(
        recovery_probability,
        customer_reliability,
        1,
        3500
    )

    risk = get_risk_level(score)

    print("Recovery Probability:", recovery_probability, "%")
    print("Customer Reliability:", customer_reliability, "/100")
    print("Recovery Score:", score, "/100")
    print("Risk Level:", risk)