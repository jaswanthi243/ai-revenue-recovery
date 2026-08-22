from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import pandas as pd
import os
from datetime import datetime

from services.recovery_agent import analyze_payment
from services.guardrails import apply_guardrails
from services.risk_engine import (
    get_priority,
    get_recovery_probability,
    calculate_expected_revenue
)


# ==========================================
# BASE PATHS
# ==========================================

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

PAYMENTS_FILE = os.path.join(
    BASE_DIR,
    "data",
    "payments.csv"
)

AUDIT_FILE = os.path.join(
    BASE_DIR,
    "audit_log.csv"
)


# ==========================================
# RECOVERAI API
# ==========================================

app = FastAPI(
    title="RecoverAI API",
    description="AI-powered failed payment recovery system",
    version="1.0.0"
)


# ==========================================
# CORS
# ==========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# PAYMENT REQUEST MODEL
# ==========================================

class PaymentRequest(BaseModel):
    payment_id: str
    amount: float
    failure_reason: str
    attempt_count: int


# ==========================================
# LOAD PAYMENT DATA
# ==========================================

def load_payments():

    return pd.read_csv(
        PAYMENTS_FILE
    )


# ==========================================
# HOME
# ==========================================

@app.get("/")
def home():

    return {
        "status": "online",
        "service": "RecoverAI",
        "message": "RecoverAI API is running"
    }


# ==========================================
# HEALTH CHECK
# ==========================================

@app.get("/health")
def health_check():

    return {
        "status": "healthy"
    }


# ==========================================
# ALL PAYMENTS
# ==========================================

@app.get("/payments")
def get_payments():

    payments = load_payments()

    return payments.to_dict(
        orient="records"
    )


# ==========================================
# FAILED PAYMENTS
# ==========================================

@app.get("/failed-payments")
def get_failed_payments():

    payments = load_payments()

    failed = payments[
        payments["status"] == "failed"
    ]

    return failed.to_dict(
        orient="records"
    )


# ==========================================
# SINGLE PAYMENT
# ==========================================

@app.get("/payments/{payment_id}")
def get_payment(payment_id: str):

    payments = load_payments()

    payment = payments[
        payments["payment_id"] == payment_id
    ]

    if payment.empty:

        raise HTTPException(
            status_code=404,
            detail="Payment not found"
        )

    return payment.iloc[0].to_dict()


# ==========================================
# RECOVERY SUMMARY
# ==========================================

@app.get("/recovery-summary")
def recovery_summary():

    payments = load_payments()

    failed = payments[
        payments["status"] == "failed"
    ]

    revenue_at_risk = float(
        failed["amount"].sum()
    )

    expected_revenue = 0
    actual_recovered_revenue = 0


    for _, payment in failed.iterrows():

        amount = payment["amount"]

        attempt_count = (
            payment["attempt_count"]
        )

        failure_reason = (
            payment["failure_reason"]
        )


        probability = get_recovery_probability(
            failure_reason,
            attempt_count
        )


        expected_revenue += (
            calculate_expected_revenue(
                amount,
                probability
            )
        )


        decision, _ = apply_guardrails(
            amount,
            attempt_count,
            probability
        )


        if (
            decision == "PROCEED"
            and probability >= 70
        ):

            actual_recovered_revenue += (
                amount
            )


    if revenue_at_risk > 0:

        recovery_rate = (
            actual_recovered_revenue
            / revenue_at_risk
        ) * 100

    else:

        recovery_rate = 0


    return {

        "failed_payments":
            len(failed),

        "revenue_at_risk":
            round(
                revenue_at_risk,
                2
            ),

        "expected_recoverable_revenue":
            round(
                expected_revenue,
                2
            ),

        "actual_recovered_revenue":
            round(
                actual_recovered_revenue,
                2
            ),

        "recovery_rate":
            round(
                recovery_rate,
                2
            )
    }


# ==========================================
# ANALYZE PAYMENT
# ==========================================

@app.post("/analyze-payment")
def analyze_payment_endpoint(
    payment: PaymentRequest
):

    # --------------------------------------
    # RISK ANALYSIS
    # --------------------------------------

    priority = get_priority(
        payment.amount,
        payment.attempt_count
    )


    probability = get_recovery_probability(
        payment.failure_reason,
        payment.attempt_count
    )


    expected_revenue = (
        calculate_expected_revenue(
            payment.amount,
            probability
        )
    )


    # --------------------------------------
    # RECOVERAI AGENT
    # --------------------------------------

    agent_result = analyze_payment(
        payment.payment_id,
        payment.amount,
        payment.failure_reason,
        payment.attempt_count,
        priority,
        probability
    )


    # --------------------------------------
    # GUARDRAILS
    # --------------------------------------

    decision, guardrail_reason = (
        apply_guardrails(
            payment.amount,
            payment.attempt_count,
            probability
        )
    )


    # --------------------------------------
    # FINAL ACTION
    # --------------------------------------

    if decision == "PROCEED":

        final_action = (
            agent_result["recommendation"]
        )

    elif decision == "HUMAN_REVIEW":

        final_action = "human_review"

    else:

        final_action = "stop_recovery"


    # ======================================
    # CREATE AUDIT RECORD
    # ======================================

    audit_record = {

        "timestamp":
            datetime.now().isoformat(
                timespec="seconds"
            ),

        "payment_id":
            payment.payment_id,

        "amount":
            payment.amount,

        "failure_reason":
            payment.failure_reason,

        "attempt_count":
            payment.attempt_count,

        "priority":
            priority,

        "probability":
            probability,

        "expected_recovery":
            round(
                expected_revenue,
                2
            ),

        "agent_mode":
            agent_result["agent_mode"],

        "ai_recommendation":
            agent_result["recommendation"],

        "ai_confidence":
            agent_result["confidence"],

        "ai_reasoning":
            agent_result["reasoning"],

        "guardrail_decision":
            decision,

        "guardrail_reason":
            guardrail_reason,

        "final_action":
            final_action
    }


    audit_df = pd.DataFrame(
        [audit_record]
    )


    # ======================================
    # WRITE AUDIT RECORD
    # ======================================

    if (
        not os.path.exists(AUDIT_FILE)
        or os.path.getsize(AUDIT_FILE) == 0
    ):

        audit_df.to_csv(
            AUDIT_FILE,
            mode="w",
            header=True,
            index=False
        )

    else:

        audit_df.to_csv(
            AUDIT_FILE,
            mode="a",
            header=False,
            index=False
        )


    print(
        "Audit record saved to:",
        AUDIT_FILE
    )


    # --------------------------------------
    # API RESPONSE
    # --------------------------------------

    return {

        "payment_id":
            payment.payment_id,

        "amount":
            payment.amount,

        "failure_reason":
            payment.failure_reason,

        "attempt_count":
            payment.attempt_count,


        "risk_analysis": {

            "priority":
                priority,

            "recovery_probability":
                probability,

            "expected_recovery":
                round(
                    expected_revenue,
                    2
                )
        },


        "recoverai": {

            "agent_mode":
                agent_result["agent_mode"],

            "recommendation":
                agent_result["recommendation"],

            "confidence":
                agent_result["confidence"],

            "reasoning":
                agent_result["reasoning"]
        },


        "guardrails": {

            "decision":
                decision,

            "reason":
                guardrail_reason
        },


        "final_action":
            final_action
    }


# ==========================================
# AUDIT HISTORY
# ==========================================

@app.get("/audit-history")
def get_audit_history():

    if not os.path.exists(
        AUDIT_FILE
    ):

        return []


    try:

        audit = pd.read_csv(
            AUDIT_FILE
        )

        audit = audit.fillna("")

        return audit.to_dict(
            orient="records"
        )


    except pd.errors.EmptyDataError:

        return []