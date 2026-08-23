const LOCAL_API = "http://127.0.0.1:8000";

const LIVE_API =
    "https://ai-revenue-recovery-kugs.onrender.com";


const API_URL =
    (
        window.location.hostname === "127.0.0.1"
        ||
        window.location.hostname === "localhost"
    )
        ? LOCAL_API
        : LIVE_API;


// =========================================================
// SHARED DATA
// =========================================================

let failedPaymentsCache = [];

let auditCache = [];

let actionCache = [];

let humanReviewCache = [];


// =========================================================
// HELPERS
// =========================================================

function formatMoney(value) {

    return `₹${Number(
        value || 0
    ).toLocaleString("en-IN")}`;
}


function formatLabel(value) {

    if (!value) {
        return "-";
    }

    return String(value)
        .replaceAll("_", " ")
        .replace(
            /\b\w/g,
            letter =>
                letter.toUpperCase()
        );
}


function safeNumber(value) {

    const number =
        Number(value);

    return Number.isNaN(number)
        ? 0
        : number;
}


function formatTime(value) {

    if (!value) {
        return "-";
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return value;
    }


    return date.toLocaleString();
}


// =========================================================
// COMMON FETCH
// =========================================================

async function fetchJson(
    url,
    options = {}
) {

    const response =
        await fetch(
            url,
            options
        );


    let data = null;


    try {

        data =
            await response.json();

    }

    catch {

        data = null;
    }


    if (!response.ok) {

        throw new Error(

            data?.detail
            ||
            `Request failed (${response.status})`
        );
    }


    return data;
}


// =========================================================
// RECOVERY SUMMARY
// =========================================================

async function loadSummary() {

    try {

        const data =
            await fetchJson(
                `${API_URL}/recovery-summary`
            );


        document.getElementById(
            "revenue-at-risk"
        ).textContent =
            formatMoney(
                data.revenue_at_risk
            );


        document.getElementById(
            "expected-revenue"
        ).textContent =
            formatMoney(
                data.expected_recoverable_revenue
            );


        document.getElementById(
            "recovered-revenue"
        ).textContent =
            formatMoney(
                data.actual_recovered_revenue
            );


        document.getElementById(
            "recovery-rate"
        ).textContent =
            `${safeNumber(
                data.recovery_rate
            )}%`;


        document.getElementById(
            "failed-count"
        ).textContent =
            safeNumber(
                data.failed_payments
            );


        document.getElementById(
            "pipeline-failed"
        ).textContent =
            safeNumber(
                data.failed_payments
            );


        document.getElementById(
            "pipeline-recovered"
        ).textContent =
            formatMoney(
                data.actual_recovered_revenue
            );


        document.getElementById(
            "guardrail-human-review"
        ).textContent =
            safeNumber(
                data.human_review_cases
            );


        document.getElementById(
            "guardrail-blocked"
        ).textContent =
            safeNumber(
                data.blocked_cases
            );

    }

    catch (error) {

        console.error(
            "Summary error:",
            error
        );
    }
}


// =========================================================
// FAILED PAYMENTS
// =========================================================

async function loadFailedPayments() {

    const table =
        document.getElementById(
            "payments-table"
        );


    try {

        const payments =
            await fetchJson(
                `${API_URL}/failed-payments`
            );


        failedPaymentsCache =
            Array.isArray(payments)
                ? payments
                : [];


        table.innerHTML =
            "";


        if (
            failedPaymentsCache.length ===
            0
        ) {

            table.innerHTML = `

                <tr>

                    <td colspan="5">

                        No failed payments found.

                    </td>

                </tr>
            `;


            renderLifecycle();

            return;
        }


        failedPaymentsCache.forEach(
            payment => {

                const row =
                    document.createElement(
                        "tr"
                    );


                row.innerHTML = `

                    <td>

                        <strong>
                            ${payment.payment_id}
                        </strong>

                    </td>


                    <td>

                        ${formatMoney(
                            payment.amount
                        )}

                    </td>


                    <td>

                        ${formatLabel(
                            payment.failure_reason
                        )}

                    </td>


                    <td>

                        ${payment.attempt_count}

                    </td>


                    <td>

                        <button
                            class="analyze-btn"
                        >

                            Analyze

                        </button>

                    </td>
                `;


                row
                    .querySelector(
                        ".analyze-btn"
                    )
                    .addEventListener(

                        "click",

                        () => {

                            analyzePayment(
                                payment
                            );

                        }
                    );


                table.appendChild(
                    row
                );

            }
        );


        renderLifecycle();

    }

    catch (error) {

        console.error(
            "Failed payments error:",
            error
        );


        table.innerHTML = `

            <tr>

                <td colspan="5">

                    Unable to load failed payments.

                </td>

            </tr>
        `;
    }
}


// =========================================================
// ANALYZE PAYMENT
// =========================================================

async function analyzePayment(
    payment
) {

    const box =
        document.getElementById(
            "decision-box"
        );


    box.innerHTML = `

        <div class="loading-box">

            RecoverAI is analyzing
            ${payment.payment_id}...

        </div>
    `;


    box.scrollIntoView({

        behavior:
            "smooth",

        block:
            "center"
    });


    try {

        const data =
            await fetchJson(

                `${API_URL}/analyze-payment`,

                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            payment_id:
                                payment.payment_id,

                            customer_id:
                                payment.customer_id,

                            amount:
                                payment.amount,

                            failure_reason:
                                payment.failure_reason,

                            attempt_count:
                                payment.attempt_count
                        })
                }
            );


        const priority =
            data.risk_analysis.priority
            ||
            "LOW";


        const probability =
            safeNumber(
                data.risk_analysis
                    .recovery_probability
            );


        const expected =
            safeNumber(
                data.risk_analysis
                    .expected_recovery
            );


        const score =
            safeNumber(
                data.risk_analysis
                    .recovery_score
            );


        const reliability =
            safeNumber(
                data.risk_analysis
                    .customer_reliability
            );


        const riskLevel =
            data.risk_analysis
                .risk_level
            ||
            "-";


        const guardrail =
            data.guardrails
                .decision
            ||
            "UNKNOWN";


        const confidence =
            Math.round(

                safeNumber(
                    data.recoverai
                        .confidence
                )

                * 100
            );


        let guardrailClass =
            "guardrail-proceed";


        if (
            guardrail ===
            "HUMAN_REVIEW"
        ) {

            guardrailClass =
                "guardrail-review";
        }


        if (
            guardrail ===
            "STOP"
        ) {

            guardrailClass =
                "guardrail-stop";
        }


        box.innerHTML = `

            <div class="decision-grid">


                <div class="decision-card">

                    <span>
                        Payment
                    </span>

                    <strong>

                        ${data.payment_id}

                        ·

                        ${formatMoney(
                            data.amount
                        )}

                    </strong>

                </div>


                <div class="decision-card">

                    <span>
                        Priority
                    </span>

                    <strong
                        class="
                            risk-badge
                            risk-${String(
                                priority
                            ).toLowerCase()}
                        "
                    >

                        ${priority}

                    </strong>

                </div>


                <div class="decision-card">

                    <span>
                        Risk Level
                    </span>

                    <strong>

                        ${formatLabel(
                            riskLevel
                        )}

                    </strong>

                </div>


                <div class="decision-card">

                    <span>
                        Recovery Score
                    </span>

                    <strong>
                        ${score}/100
                    </strong>

                </div>


                <div class="decision-card">

                    <span>
                        Customer Reliability
                    </span>

                    <strong>
                        ${reliability}/100
                    </strong>

                </div>


                <div class="decision-card">

                    <span>
                        Expected Recovery
                    </span>

                    <strong class="money-success">

                        ${formatMoney(
                            expected
                        )}

                    </strong>

                </div>


                <div
                    class="
                        decision-card
                        full-width
                    "
                >

                    <span>
                        Recovery Probability
                    </span>

                    <strong>
                        ${probability}%
                    </strong>


                    <div class="progress">

                        <div
                            class="progress-bar"
                            style="
                                width:
                                ${Math.min(
                                    probability,
                                    100
                                )}%
                            "
                        >
                        </div>

                    </div>

                </div>


                <div class="decision-card">

                    <span>
                        AI Confidence
                    </span>

                    <strong>
                        ${confidence}%
                    </strong>

                </div>


                <div class="decision-card">

                    <span>
                        AI Recommendation
                    </span>

                    <strong>

                        ${formatLabel(
                            data.recoverai
                                .recommendation
                        )}

                    </strong>

                </div>


                <div class="decision-card">

                    <span>
                        Final Action
                    </span>

                    <strong>

                        ${formatLabel(
                            data.final_action
                        )}

                    </strong>

                </div>


                <div class="decision-card">

                    <span>
                        Guardrail Decision
                    </span>

                    <strong
                        class="${guardrailClass}"
                    >

                        ${formatLabel(
                            guardrail
                        )}

                    </strong>

                </div>


                <div class="decision-card">

                    <span>
                        Safety Status
                    </span>

                    <strong class="safe-text">
                        VALIDATED
                    </strong>

                </div>


                <div
                    class="
                        decision-card
                        full-width
                    "
                >

                    <span>
                        Why RecoverAI chose this
                    </span>

                    <strong>

                        ${data.recoverai.reasoning}

                    </strong>

                </div>


                <div
                    class="
                        decision-card
                        full-width
                    "
                >

                    <span>
                        Guardrail Explanation
                    </span>

                    <strong>

                        ${data.guardrails.reason}

                    </strong>

                </div>


                <div
                    class="
                        decision-card
                        full-width
                        execute-card
                    "
                >

                    <span>
                        Recovery Execution
                    </span>

                    <p>

                        This is a simulated recovery
                        action. No real payment
                        is processed.

                    </p>


                    <button
                        id="execute-btn"
                        class="execute-recovery-btn"
                    >

                        ${
                            guardrail ===
                            "HUMAN_REVIEW"

                                ?

                            "Send to Human Review"

                                :

                            "Execute Recovery"
                        }

                    </button>


                    <div
                        id="execution-result"
                        class="execution-result"
                    >
                    </div>

                </div>


            </div>
        `;


        document
            .getElementById(
                "execute-btn"
            )
            .addEventListener(

                "click",

                () => {

                    executeRecovery(

                        data.payment_id,

                        data.amount,

                        data.final_action,

                        guardrail
                    );

                }
            );


        await loadAuditHistory();


        renderLifecycle();

    }

    catch (error) {

        console.error(
            "Analyze error:",
            error
        );


        box.innerHTML = `

            <div class="empty-decision">

                Unable to analyze payment:

                ${error.message}

            </div>
        `;
    }
}


// =========================================================
// EXECUTE RECOVERY
// =========================================================

async function executeRecovery(
    paymentId,
    amount,
    finalAction,
    guardrailDecision
) {

    const resultBox =
        document.getElementById(
            "execution-result"
        );


    const button =
        document.getElementById(
            "execute-btn"
        );


    button.disabled =
        true;


    button.textContent =
        "Processing...";


    try {

        const result =
            await fetchJson(

                `${API_URL}/execute-action`,

                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            payment_id:
                                paymentId,

                            amount:
                                amount,

                            final_action:
                                finalAction,

                            guardrail_decision:
                                guardrailDecision
                        })
                }
            );


        let statusClass =
            "execution-success";


        if (
            result.execution_status ===
            "AWAITING_APPROVAL"
        ) {

            statusClass =
                "execution-review";
        }


        if (
            result.execution_status ===
            "BLOCKED"
        ) {

            statusClass =
                "execution-blocked";
        }


        resultBox.innerHTML = `

            <div class="${statusClass}">

                <strong>

                    ${formatLabel(
                        result.execution_status
                    )}

                </strong>

                <p>

                    ${result.message}

                </p>

                <small>

                    ${formatTime(
                        result.timestamp
                    )}

                </small>

            </div>
        `;


        button.textContent =
            "Action Processed";


        await Promise.all([

            loadActionCenter(),

            loadHumanReviews(),

            loadSummary()

        ]);


        renderLifecycle();

        renderCommunicationCenter();

    }

    catch (error) {

        console.error(
            "Execute error:",
            error
        );


        button.disabled =
            false;


        button.textContent =
            "Try Again";


        resultBox.innerHTML = `

            <div class="execution-blocked">

                ${error.message}

            </div>
        `;
    }
}


// =========================================================
// ACTION CENTER
// =========================================================

async function loadActionCenter() {

    await Promise.all([

        loadActionSummary(),

        loadActionHistory()

    ]);
}


// =========================================================
// ACTION SUMMARY
// =========================================================

async function loadActionSummary() {

    try {

        const data =
            await fetchJson(
                `${API_URL}/action-summary`
            );


        document.getElementById(
            "action-total"
        ).textContent =
            safeNumber(
                data.total_actions
            );


        document.getElementById(
            "action-scheduled"
        ).textContent =
            safeNumber(
                data.scheduled
            );


        document.getElementById(
            "action-review"
        ).textContent =
            safeNumber(
                data.awaiting_approval
            );


        document.getElementById(
            "action-approved"
        ).textContent =
            safeNumber(
                data.approved
            );


        document.getElementById(
            "action-rejected"
        ).textContent =
            safeNumber(
                data.rejected
            );


        document.getElementById(
            "action-blocked"
        ).textContent =
            safeNumber(
                data.blocked
            );


        document.getElementById(
            "action-customer"
        ).textContent =
            safeNumber(
                data.customer_action_required
            );

    }

    catch (error) {

        console.error(
            "Action summary error:",
            error
        );
    }
}


// =========================================================
// ACTION STATUS CLASS
// =========================================================

function getActionStatusClass(
    status
) {

    switch (status) {

        case "SCHEDULED":

            return "status-scheduled";


        case "AWAITING_APPROVAL":

            return "status-review";


        case "BLOCKED":

            return "status-blocked";


        case "CUSTOMER_ACTION_REQUIRED":

            return "status-customer";


        case "APPROVED":

            return "status-approved";


        case "REJECTED":

            return "status-rejected";


        default:

            return "status-normal";
    }
}


// =========================================================
// ACTION HISTORY
// =========================================================

async function loadActionHistory() {

    const table =
        document.getElementById(
            "action-history-table"
        );


    try {

        const records =
            await fetchJson(
                `${API_URL}/action-history`
            );


        actionCache =
            Array.isArray(records)
                ? records
                : [];


        table.innerHTML =
            "";


        if (
            actionCache.length ===
            0
        ) {

            table.innerHTML = `

                <tr>

                    <td colspan="6">

                        No recovery actions yet.

                    </td>

                </tr>
            `;


            renderLifecycle();

            renderCommunicationCenter();

            return;
        }


        actionCache.forEach(
            record => {

                const row =
                    document.createElement(
                        "tr"
                    );


                row.innerHTML = `

                    <td>

                        <strong>
                            ${record.payment_id}
                        </strong>

                    </td>


                    <td>

                        ${formatMoney(
                            record.amount
                        )}

                    </td>


                    <td>

                        ${formatLabel(
                            record.action
                        )}

                    </td>


                    <td>

                        <span
                            class="
                                action-status
                                ${getActionStatusClass(
                                    record.execution_status
                                )}
                            "
                        >

                            ${formatLabel(
                                record.execution_status
                            )}

                        </span>

                    </td>


                    <td>

                        ${
                            record.simulated
                                ?
                            "Yes"
                                :
                            "No"
                        }

                    </td>


                    <td>

                        ${formatTime(
                            record.timestamp
                        )}

                    </td>
                `;


                table.appendChild(
                    row
                );

            }
        );


        renderLifecycle();

        renderCommunicationCenter();

    }

    catch (error) {

        console.error(
            "Action history error:",
            error
        );
    }
}


// =========================================================
// HUMAN REVIEW
// =========================================================

async function loadHumanReviews() {

    const container =
        document.getElementById(
            "human-review-list"
        );


    try {

        const reviews =
            await fetchJson(
                `${API_URL}/human-reviews`
            );


        humanReviewCache =
            Array.isArray(reviews)
                ? reviews
                : [];


        document.getElementById(
            "pending-review-count"
        ).textContent =
            humanReviewCache.length;


        container.innerHTML =
            "";


        if (
            humanReviewCache.length ===
            0
        ) {

            container.innerHTML = `

                <div class="empty-review">

                    <div class="empty-review-icon">

                        ✓

                    </div>

                    <strong>

                        No pending reviews

                    </strong>

                    <p>

                        All guarded recovery cases
                        have been handled.

                    </p>

                </div>
            `;


            renderLifecycle();

            return;
        }


        humanReviewCache.forEach(
            review => {

                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "human-review-card";


                card.innerHTML = `

                    <div class="review-card-top">

                        <div>

                            <span class="review-payment-label">
                                PAYMENT
                            </span>

                            <h3>
                                ${review.payment_id}
                            </h3>

                        </div>


                        <div class="review-amount">

                            ${formatMoney(
                                review.amount
                            )}

                        </div>

                    </div>


                    <div class="review-details">

                        <div>

                            <span>
                                Proposed Action
                            </span>

                            <strong>

                                ${formatLabel(
                                    review.action
                                )}

                            </strong>

                        </div>


                        <div>

                            <span>
                                Status
                            </span>

                            <strong
                                class="
                                    guardrail-review
                                "
                            >

                                Awaiting Approval

                            </strong>

                        </div>


                        <div class="review-message">

                            <span>
                                Review Reason
                            </span>

                            <strong>

                                ${review.message}

                            </strong>

                        </div>

                    </div>


                    <div class="review-note-box">

                        <label>
                            Reviewer Note
                        </label>

                        <textarea
                            id="review-note-${review.payment_id}"
                            placeholder="Optional reviewer note..."
                        ></textarea>

                    </div>


                    <div class="review-buttons">

                        <button class="approve-btn">

                            ✓ Approve

                        </button>


                        <button class="reject-btn">

                            ✕ Reject

                        </button>

                    </div>


                    <div
                        id="review-result-${review.payment_id}"
                        class="review-result"
                    >
                    </div>
                `;


                card
                    .querySelector(
                        ".approve-btn"
                    )
                    .addEventListener(

                        "click",

                        () => {

                            submitHumanReview(

                                review.payment_id,

                                "approve"
                            );

                        }
                    );


                card
                    .querySelector(
                        ".reject-btn"
                    )
                    .addEventListener(

                        "click",

                        () => {

                            submitHumanReview(

                                review.payment_id,

                                "reject"
                            );

                        }
                    );


                container.appendChild(
                    card
                );

            }
        );


        renderLifecycle();

    }

    catch (error) {

        console.error(
            "Human reviews error:",
            error
        );


        container.innerHTML = `

            <div class="empty-review">

                Unable to load
                human reviews.

            </div>
        `;
    }
}


// =========================================================
// APPROVE / REJECT
// =========================================================

async function submitHumanReview(
    paymentId,
    decision
) {

    const note =
        document.getElementById(
            `review-note-${paymentId}`
        );


    const resultBox =
        document.getElementById(
            `review-result-${paymentId}`
        );


    const endpoint =
        decision ===
        "approve"

            ?

        "/human-review/approve"

            :

        "/human-review/reject";


    try {

        if (resultBox) {

            resultBox.innerHTML = `

                <div class="review-processing">

                    Processing...

                </div>
            `;
        }


        await fetchJson(

            `${API_URL}${endpoint}`,

            {

                method:
                    "POST",

                headers: {

                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify({

                        payment_id:
                            paymentId,

                        reviewer_note:
                            note?.value
                                .trim()
                            ||
                            null
                    })
            }
        );


        await Promise.all([

            loadHumanReviews(),

            loadActionCenter(),

            loadSummary()

        ]);


        renderLifecycle();

        renderCommunicationCenter();

    }

    catch (error) {

        console.error(
            "Review decision error:",
            error
        );


        if (resultBox) {

            resultBox.innerHTML = `

                <div class="review-result-error">

                    ${error.message}

                </div>
            `;
        }
    }
}


// =========================================================
// LIFECYCLE HELPERS
// =========================================================

async function loadRecoveryLifecycle() {

    await Promise.all([

        loadFailedPayments(),

        loadAuditHistory(),

        loadActionHistory(),

        loadHumanReviews()

    ]);


    renderLifecycle();
}


function getLatestAuditMap() {

    const map =
        new Map();


    auditCache.forEach(
        record => {

            map.set(
                record.payment_id,
                record
            );

        }
    );


    return map;
}


function getLatestActionMap() {

    const map =
        new Map();


    /*
        Action history API returns
        newest records first.

        Therefore the first record
        found for a payment is its
        current status.
    */

    actionCache.forEach(
        record => {

            if (
                !map.has(
                    record.payment_id
                )
            ) {

                map.set(
                    record.payment_id,
                    record
                );
            }

        }
    );


    return map;
}


// =========================================================
// CREATE LIFECYCLE
// =========================================================

function createLifecycleStages(
    payment,
    audit,
    action
) {

    const stages = [

        {

            label:
                "Failed",

            type:
                "failed"
        }
    ];


    if (audit) {

        stages.push({

            label:
                "Analyzed",

            type:
                "analyzed"
        });
    }


    if (!action) {

        return stages;
    }


    switch (
        action.execution_status
    ) {

        case "AWAITING_APPROVAL":

            stages.push({

                label:
                    "Human Review",

                type:
                    "review"
            });

            break;


        case "APPROVED":

            stages.push(

                {

                    label:
                        "Human Review",

                    type:
                        "review"
                },

                {

                    label:
                        "Approved",

                    type:
                        "approved"
                }
            );

            break;


        case "REJECTED":

            stages.push(

                {

                    label:
                        "Human Review",

                    type:
                        "review"
                },

                {

                    label:
                        "Rejected",

                    type:
                        "rejected"
                }
            );

            break;


        case "SCHEDULED":

            stages.push({

                label:
                    "Scheduled",

                type:
                    "scheduled"
            });

            break;


        case "CUSTOMER_ACTION_REQUIRED":

            stages.push({

                label:
                    "Customer Action",

                type:
                    "customer"
            });

            break;


        case "RETRY_SIMULATED":

            stages.push({

                label:
                    "Retry Simulated",

                type:
                    "scheduled"
            });

            break;


        case "BLOCKED":

            stages.push({

                label:
                    "Blocked",

                type:
                    "blocked"
            });

            break;


        default:

            stages.push({

                label:
                    formatLabel(
                        action.execution_status
                    ),

                type:
                    "neutral"
            });
    }


    return stages;
}


// =========================================================
// RENDER LIFECYCLE
// =========================================================

function renderLifecycle() {

    const container =
        document.getElementById(
            "lifecycle-list"
        );


    if (!container) {

        return;
    }


    const auditMap =
        getLatestAuditMap();


    const actionMap =
        getLatestActionMap();


    container.innerHTML =
        "";


    let analyzedCount =
        0;


    let progressCount =
        0;


    let reviewCount =
        0;


    let blockedCount =
        0;


    failedPaymentsCache.forEach(
        payment => {

            const audit =
                auditMap.get(
                    payment.payment_id
                );


            const action =
                actionMap.get(
                    payment.payment_id
                );


            if (audit) {

                analyzedCount++;
            }


            if (action) {

                if (
                    action.execution_status ===
                    "AWAITING_APPROVAL"
                ) {

                    reviewCount++;
                }


                else if (
                    action.execution_status ===
                    "BLOCKED"
                ) {

                    blockedCount++;
                }


                else {

                    progressCount++;
                }
            }


            const stages =
                createLifecycleStages(

                    payment,

                    audit,

                    action
                );


            const stagesHTML =
                stages
                    .map(

                        (
                            stage,
                            index
                        ) => `

                            <div
                                class="
                                    lifecycle-step
                                    lifecycle-${stage.type}
                                "
                            >

                                <span
                                    class="
                                        lifecycle-step-dot
                                    "
                                >
                                </span>

                                <span
                                    class="
                                        lifecycle-step-label
                                    "
                                >

                                    ${stage.label}

                                </span>

                            </div>


                            ${
                                index <
                                stages.length - 1

                                    ?

                                `
                                <div
                                    class="
                                        lifecycle-connector
                                    "
                                >
                                </div>
                                `

                                    :

                                ""
                            }
                        `
                    )
                    .join("");


            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "lifecycle-item";


            item.innerHTML = `

                <div class="lifecycle-payment">

                    <div>

                        <strong>

                            ${payment.payment_id}

                        </strong>

                        <span>

                            ${formatLabel(
                                payment.failure_reason
                            )}

                        </span>

                    </div>


                    <strong
                        class="
                            lifecycle-amount
                        "
                    >

                        ${formatMoney(
                            payment.amount
                        )}

                    </strong>

                </div>


                <div class="lifecycle-track">

                    ${stagesHTML}

                </div>
            `;


            container.appendChild(
                item
            );

        }
    );


    document.getElementById(
        "lifecycle-failed"
    ).textContent =
        failedPaymentsCache.length;


    document.getElementById(
        "lifecycle-analyzed"
    ).textContent =
        analyzedCount;


    document.getElementById(
        "lifecycle-progress"
    ).textContent =
        progressCount;


    document.getElementById(
        "lifecycle-review"
    ).textContent =
        reviewCount;


    document.getElementById(
        "lifecycle-blocked"
    ).textContent =
        blockedCount;
}


// =========================================================
// CUSTOMER COMMUNICATION
// =========================================================

function getCustomerMessage(
    action
) {

    const actionName =
        action.action;


    const status =
        action.execution_status;


    if (
        status ===
        "AWAITING_APPROVAL"
    ) {

        return {

            channel:
                "Internal only",

            title:
                "Customer message paused",

            message:
                "No customer message will be sent while the recovery case is awaiting human approval."
        };
    }


    if (
        status ===
        "BLOCKED"
    ) {

        return {

            channel:
                "No message",

            title:
                "Recovery stopped",

            message:
                "RecoverAI blocked this recovery action. No automated payment request is sent to the customer."
        };
    }


    if (
        status ===
        "REJECTED"
    ) {

        return {

            channel:
                "No message",

            title:
                "Recovery rejected",

            message:
                "The recovery case was rejected during human review. No automated customer request is generated."
        };
    }


    if (
        status ===
        "APPROVED"
    ) {

        return {

            channel:
                "Preview",

            title:
                "Recovery approved",

            message:
                "Your payment requires attention. Please review your payment method to help complete the pending payment."
        };
    }


    if (
        actionName ===
        "retry_later"
    ) {

        return {

            channel:
                "Email / SMS preview",

            title:
                "Payment retry scheduled",

            message:
                "We couldn't complete your payment. A retry is planned for later. Please make sure sufficient funds are available."
        };
    }


    if (
        actionName ===
        "update_payment_method"
    ) {

        return {

            channel:
                "Email / App preview",

            title:
                "Update your payment method",

            message:
                "Your payment method appears to need an update. Please update your payment details to complete the pending payment."
        };
    }


    if (
        actionName ===
        "alternate_payment_method"
    ) {

        return {

            channel:
                "Email / App preview",

            title:
                "Try another payment method",

            message:
                "Your payment could not be completed with the current payment method. Please choose another available payment method."
        };
    }


    if (
        actionName ===
        "retry_payment"
    ) {

        return {

            channel:
                "Status preview",

            title:
                "Payment retry attempted",

            message:
                "RecoverAI simulated another payment attempt after detecting a temporary payment issue."
        };
    }


    return {

        channel:
            "Preview",

        title:
            "Recovery update",

        message:
            "RecoverAI has generated a recovery action for this pending payment."
    };
}


// =========================================================
// RENDER COMMUNICATION CENTER
// =========================================================

function renderCommunicationCenter() {

    const container =
        document.getElementById(
            "communication-list"
        );


    if (!container) {

        return;
    }


    container.innerHTML =
        "";


    const latestActions =
        Array.from(
            getLatestActionMap()
                .values()
        );


    if (
        latestActions.length ===
        0
    ) {

        container.innerHTML = `

            <div class="empty-review">

                Execute a recovery action to
                generate customer communication
                previews.

            </div>
        `;

        return;
    }


    latestActions.forEach(
        action => {

            const communication =
                getCustomerMessage(
                    action
                );


            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "communication-card";


            card.innerHTML = `

                <div
                    class="
                        communication-card-top
                    "
                >

                    <div>

                        <span>
                            PAYMENT
                        </span>

                        <strong>

                            ${action.payment_id}

                        </strong>

                    </div>


                    <span
                        class="
                            communication-channel
                        "
                    >

                        ${communication.channel}

                    </span>

                </div>


                <h3>

                    ${communication.title}

                </h3>


                <p
                    class="
                        communication-message
                    "
                >

                    ${communication.message}

                </p>


                <div
                    class="
                        communication-meta
                    "
                >

                    <span>

                        Action:

                        ${formatLabel(
                            action.action
                        )}

                    </span>


                    <span>

                        Status:

                        ${formatLabel(
                            action.execution_status
                        )}

                    </span>


                    <span>

                        Value:

                        ${formatMoney(
                            action.amount
                        )}

                    </span>

                </div>
            `;


            container.appendChild(
                card
            );

        }
    );
}


// =========================================================
// SMART RECOVERY QUEUE
// =========================================================

function calculateQueueScore(
    record
) {

    let score =

        safeNumber(
            record.expected_recovery
        )

        +

        (
            safeNumber(
                record.recovery_score
            )

            * 10
        );


    const priority =
        String(
            record.priority ||
            ""
        ).toUpperCase();


    if (
        priority ===
        "HIGH"
    ) {

        score +=
            500;
    }


    else if (
        priority ===
        "MEDIUM"
    ) {

        score +=
            250;
    }


    return score;
}


// =========================================================
// BUILD QUEUE
// =========================================================

function buildRecoveryQueue(
    records
) {

    const latest =
        new Map();


    records.forEach(
        record => {

            latest.set(
                record.payment_id,
                record
            );

        }
    );


    return Array.from(
        latest.values()
    )

        .map(
            item => ({

                ...item,

                queue_score:
                    calculateQueueScore(
                        item
                    )

            })
        )

        .sort(
            (a, b) =>
                b.queue_score -
                a.queue_score
        );
}


// =========================================================
// DISPLAY QUEUE
// =========================================================

function displayRecoveryQueue(
    queue
) {

    const table =
        document.getElementById(
            "recovery-queue-table"
        );


    table.innerHTML =
        "";


    if (
        queue.length ===
        0
    ) {

        table.innerHTML = `

            <tr>

                <td colspan="8">

                    Analyze payments to
                    build the queue.

                </td>

            </tr>
        `;


        document.getElementById(
            "queue-count"
        ).textContent =
            "0";


        document.getElementById(
            "top-opportunity"
        ).textContent =
            "-";


        document.getElementById(
            "top-expected"
        ).textContent =
            "₹0";


        document.getElementById(
            "queue-human-review"
        ).textContent =
            "0";


        return;
    }


    document.getElementById(
        "queue-count"
    ).textContent =
        queue.length;


    document.getElementById(
        "top-opportunity"
    ).textContent =
        queue[0].payment_id;


    document.getElementById(
        "top-expected"
    ).textContent =
        formatMoney(
            queue[0].expected_recovery
        );


    document.getElementById(
        "queue-human-review"
    ).textContent =

        queue.filter(
            item =>
                item.guardrail_decision ===
                "HUMAN_REVIEW"
        ).length;


    queue.forEach(
        (
            item,
            index
        ) => {

            const priority =
                String(
                    item.priority ||
                    "LOW"
                ).toUpperCase();


            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>
                    #${index + 1}
                </td>


                <td>

                    <strong>
                        ${item.payment_id}
                    </strong>

                </td>


                <td>

                    ${formatMoney(
                        item.amount
                    )}

                </td>


                <td>

                    ${formatMoney(
                        item.expected_recovery
                    )}

                </td>


                <td>

                    ${safeNumber(
                        item.recovery_score
                    )}/100

                </td>


                <td>

                    <span
                        class="
                            risk-badge
                            risk-${priority.toLowerCase()}
                        "
                    >

                        ${priority}

                    </span>

                </td>


                <td>

                    ${formatLabel(
                        item.guardrail_decision
                    )}

                </td>


                <td>

                    ${formatLabel(
                        item.final_action
                    )}

                </td>
            `;


            table.appendChild(
                row
            );

        }
    );
}


// =========================================================
// AUDIT HISTORY
// =========================================================

async function loadAuditHistory() {

    try {

        const records =
            await fetchJson(
                `${API_URL}/audit-history`
            );


        auditCache =
            Array.isArray(records)
                ? records
                : [];


        const table =
            document.getElementById(
                "audit-table"
            );


        table.innerHTML =
            "";


        if (
            auditCache.length ===
            0
        ) {

            table.innerHTML = `

                <tr>

                    <td colspan="7">

                        No recovery activity yet.

                    </td>

                </tr>
            `;


            displayRecoveryQueue(
                []
            );


            renderLifecycle();

            return;
        }


        [...auditCache]
            .reverse()
            .forEach(
                record => {

                    const priority =
                        String(
                            record.priority ||
                            "LOW"
                        ).toUpperCase();


                    const confidence =

                        record.ai_confidence !==
                            ""

                        &&

                        record.ai_confidence !==
                            null

                        &&

                        record.ai_confidence !==
                            undefined

                            ?

                        `${Math.round(

                            Number(
                                record.ai_confidence
                            )

                            * 100

                        )}%`

                            :

                        "N/A";


                    const row =
                        document.createElement(
                            "tr"
                        );


                    row.innerHTML = `

                        <td>

                            <strong>
                                ${record.payment_id}
                            </strong>

                        </td>


                        <td>

                            ${formatMoney(
                                record.amount
                            )}

                        </td>


                        <td>

                            <span
                                class="
                                    risk-badge
                                    risk-${priority.toLowerCase()}
                                "
                            >

                                ${priority}

                            </span>

                        </td>


                        <td>

                            ${formatLabel(
                                record.ai_recommendation
                            )}

                        </td>


                        <td>
                            ${confidence}
                        </td>


                        <td>

                            ${formatLabel(
                                record.guardrail_decision
                            )}

                        </td>


                        <td>

                            ${formatLabel(
                                record.agent_mode
                            )}

                        </td>
                    `;


                    table.appendChild(
                        row
                    );

                }
            );


        displayRecoveryQueue(

            buildRecoveryQueue(
                auditCache
            )
        );


        document.getElementById(
            "pipeline-analyzed"
        ).textContent =

            new Set(

                auditCache.map(
                    item =>
                        item.payment_id
                )

            ).size;


        document.getElementById(
            "pipeline-reviewed"
        ).textContent =

            auditCache.filter(
                item =>
                    item.guardrail_decision ===
                    "HUMAN_REVIEW"
            ).length;


        renderLifecycle();

    }

    catch (error) {

        console.error(
            "Audit history error:",
            error
        );
    }
}


// =========================================================
// SCROLL HELPERS
// =========================================================

function scrollToQueue() {

    document.getElementById(
        "recovery-queue-section"
    ).scrollIntoView({

        behavior:
            "smooth"
    });
}


function scrollToLifecycle() {

    document.getElementById(
        "lifecycle-section"
    ).scrollIntoView({

        behavior:
            "smooth"
    });
}


function scrollToHumanReview() {

    document.getElementById(
        "human-review-center"
    ).scrollIntoView({

        behavior:
            "smooth"
    });
}


// =========================================================
// REFRESH DASHBOARD
// =========================================================

async function refreshDashboard() {

    await Promise.all([

        loadSummary(),

        loadFailedPayments(),

        loadAuditHistory(),

        loadActionCenter(),

        loadHumanReviews()

    ]);


    renderLifecycle();

    renderCommunicationCenter();
}


// =========================================================
// INITIAL LOAD
// =========================================================

document.addEventListener(

    "DOMContentLoaded",

    refreshDashboard
);