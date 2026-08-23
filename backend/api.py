from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from services.action_executor import execute_recovery_action
import pandas as pd
import os

from datetime import datetime

from services.recovery_agent import analyze_payment


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

    description=(
        "AI-powered failed payment "
        "recovery system"
    ),

    version="2.0.0"
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

    customer_id: str | None = None

class ExecuteActionRequest(BaseModel):

    payment_id: str
    amount: float
    final_action: str
    guardrail_decision: str
# ==========================================
# LOAD PAYMENT DATA
# ==========================================

def load_payments():

    return pd.read_csv(
        PAYMENTS_FILE
    )


# ==========================================
# FIND CUSTOMER ID
# ==========================================

def find_customer_id(
    payment_id
):

    payments = load_payments()

    match = payments[
        payments["payment_id"]
        == payment_id
    ]


    if match.empty:

        return None


    return str(
        match.iloc[0]["customer_id"]
    )


# ==========================================
# HOME
# ==========================================

@app.get("/")
def home():

    return {

        "status":
            "online",

        "service":
            "RecoverAI",

        "version":
            "2.0.0",

        "message":
            "RecoverAI API is running"
    }


# ==========================================
# HEALTH CHECK
# ==========================================

@app.get("/health")
def health_check():

    return {

        "status":
            "healthy",

        "service":
            "RecoverAI"
    }


# ==========================================
# ALL PAYMENTS
# ==========================================

@app.get("/payments")
def get_payments():

    payments = load_payments()

    payments = payments.fillna("")

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


    failed = failed.fillna("")


    return failed.to_dict(
        orient="records"
    )


# ==========================================
# SINGLE PAYMENT
# ==========================================

@app.get(
    "/payments/{payment_id}"
)
def get_payment(
    payment_id: str
):

    payments = load_payments()


    payment = payments[
        payments["payment_id"]
        == payment_id
    ]


    if payment.empty:

        raise HTTPException(

            status_code=404,

            detail="Payment not found"
        )


    result = (
        payment
        .iloc[0]
        .fillna("")
        .to_dict()
    )


    return result


# ==========================================
# RECOVERY SUMMARY
# ==========================================

@app.get("/recovery-summary")
def recovery_summary():

    payments = load_payments()


    failed = payments[
        payments["status"]
        == "failed"
    ]


    revenue_at_risk = float(
        failed["amount"].sum()
    )


    total_expected_revenue = 0

    actual_recovered_revenue = 0

    human_review_count = 0

    blocked_count = 0


    # ======================================
    # ANALYZE EVERY FAILED PAYMENT USING
    # THE NEW RECOVERAI AGENT
    # ======================================

    for _, payment in (
        failed.iterrows()
    ):

        result = analyze_payment(

            payment_id=
                payment[
                    "payment_id"
                ],

            customer_id=
                payment[
                    "customer_id"
                ],

            amount=
                payment[
                    "amount"
                ],

            failure_reason=
                payment[
                    "failure_reason"
                ],

            attempt_count=
                payment[
                    "attempt_count"
                ],

            payment_status=
                payment[
                    "status"
                ]
        )


        # ==================================
        # EXPECTED REVENUE
        # ==================================

        total_expected_revenue += (
            result[
                "expected_revenue"
            ]
        )


        # ==================================
        # SIMULATED RECOVERY
        # ==================================

        if (

            result[
                "guardrail_decision"
            ]
            == "PROCEED"

            and

            result[
                "recovery_probability"
            ]
            >= 70

        ):

            actual_recovered_revenue += (
                payment["amount"]
            )


        # ==================================
        # HUMAN REVIEW
        # ==================================

        if (

            result[
                "guardrail_decision"
            ]
            == "HUMAN_REVIEW"

        ):

            human_review_count += 1


        # ==================================
        # BLOCKED
        # ==================================

        if (

            result[
                "guardrail_decision"
            ]
            == "STOP"

        ):

            blocked_count += 1


    # ======================================
    # RECOVERY RATE
    # ======================================

    if revenue_at_risk > 0:

        recovery_rate = (

            actual_recovered_revenue

            / revenue_at_risk

        ) * 100

    else:

        recovery_rate = 0


    # ======================================
    # RESPONSE
    # ======================================

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
                total_expected_revenue,
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
            ),

        "human_review_cases":
            human_review_count,

        "blocked_cases":
            blocked_count
    }


# ==========================================
# ANALYZE SINGLE PAYMENT
# ==========================================

@app.post("/analyze-payment")
def analyze_payment_endpoint(
    payment: PaymentRequest
):

    # ======================================
    # GET CUSTOMER ID
    # ======================================

    customer_id = (
        payment.customer_id
    )


    if not customer_id:

        customer_id = (
            find_customer_id(
                payment.payment_id
            )
        )


    if not customer_id:

        raise HTTPException(

            status_code=404,

            detail=(
                "Customer ID could not "
                "be found for payment"
            )
        )


    # ======================================
    # RUN COMPLETE RECOVERAI AGENT
    # ======================================

    result = analyze_payment(

        payment_id=
            payment.payment_id,

        customer_id=
            customer_id,

        amount=
            payment.amount,

        failure_reason=
            payment.failure_reason,

        attempt_count=
            payment.attempt_count,

        payment_status=
            "failed"
    )


    # ======================================
    # AI CONFIDENCE
    # ======================================

    ai_confidence = (

        result[
            "recovery_probability"
        ]

        / 100
    )


    # ======================================
    # AUDIT RECORD
    # ======================================

    audit_record = {

        "timestamp":
            datetime.now().isoformat(
                timespec="seconds"
            ),

        "payment_id":
            result[
                "payment_id"
            ],

        "customer_id":
            result[
                "customer_id"
            ],

        "amount":
            result[
                "amount"
            ],

        "failure_reason":
            result[
                "failure_reason"
            ],

        "attempt_count":
            result[
                "attempt_count"
            ],

        "priority":
            result[
                "priority"
            ],

        "customer_reliability":
            result[
                "customer_reliability"
            ],

        "probability":
            result[
                "recovery_probability"
            ],

        "recovery_score":
            result[
                "recovery_score"
            ],

        "risk_level":
            result[
                "risk_level"
            ],

        "expected_recovery":
            result[
                "expected_revenue"
            ],

        "agent_mode":
            "RecoverAI Agent",

        "ai_recommendation":
            result[
                "recommendation"
            ],

        "ai_confidence":
            ai_confidence,

        "ai_reasoning":
            result[
                "reasoning"
            ],

        "guardrail_decision":
            result[
                "guardrail_decision"
            ],

        "guardrail_reason":
            result[
                "guardrail_reason"
            ],

        "final_action":
            result[
                "final_action"
            ]
    }


    # ======================================
    # SAVE AUDIT RECORD
    # ======================================

    audit_df = pd.DataFrame(
        [audit_record]
    )


    if (

        not os.path.exists(
            AUDIT_FILE
        )

        or

        os.path.getsize(
            AUDIT_FILE
        ) == 0

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


    # ======================================
    # API RESPONSE
    # ======================================

    return {

        "payment_id":
            result[
                "payment_id"
            ],

        "customer_id":
            result[
                "customer_id"
            ],

        "amount":
            result[
                "amount"
            ],

        "failure_reason":
            result[
                "failure_reason"
            ],

        "attempt_count":
            result[
                "attempt_count"
            ],


        "risk_analysis": {

            "priority":
                result[
                    "priority"
                ],

            "customer_reliability":
                result[
                    "customer_reliability"
                ],

            "recovery_probability":
                result[
                    "recovery_probability"
                ],

            "recovery_score":
                result[
                    "recovery_score"
                ],

            "risk_level":
                result[
                    "risk_level"
                ],

            "expected_recovery":
                result[
                    "expected_revenue"
                ]
        },


        "recoverai": {

            "agent_mode":
                "RecoverAI Agent",

            "recommendation":
                result[
                    "recommendation"
                ],

            "confidence":
                ai_confidence,

            "reasoning":
                result[
                    "reasoning"
                ]
        },


        "guardrails": {

            "decision":
                result[
                    "guardrail_decision"
                ],

            "reason":
                result[
                    "guardrail_reason"
                ]
        },


        "final_action":
            result[
                "final_action"
            ]
    }
# ==========================================
# EXECUTE RECOVERY ACTION
# ==========================================

@app.post("/execute-action")
def execute_action(
    request: ExecuteActionRequest
):

    result = execute_recovery_action(

        payment_id=
            request.payment_id,

        amount=
            request.amount,

        final_action=
            request.final_action,

        guardrail_decision=
            request.guardrail_decision
    )

    return result

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