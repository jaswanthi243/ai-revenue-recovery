const API_URL =
    "https://ai-revenue-recovery-kugs.onrender.com";


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


// =========================================================
// SUMMARY
// =========================================================

async function loadSummary() {

    try {

        const response =
            await fetch(
                `${API_URL}/recovery-summary`
            );


        const data =
            await response.json();


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
            `${data.recovery_rate}%`;


        document.getElementById(
            "failed-count"
        ).textContent =
            data.failed_payments;


        document.getElementById(
            "pipeline-failed"
        ).textContent =
            data.failed_payments;


        document.getElementById(
            "pipeline-recovered"
        ).textContent =
            formatMoney(
                data.actual_recovered_revenue
            );


        document.getElementById(
            "guardrail-human-review"
        ).textContent =
            data.human_review_cases;


        document.getElementById(
            "guardrail-blocked"
        ).textContent =
            data.blocked_cases;

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

        const response =
            await fetch(
                `${API_URL}/failed-payments`
            );


        const payments =
            await response.json();


        table.innerHTML = "";


        payments.forEach(
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


                row.querySelector(
                    ".analyze-btn"
                ).addEventListener(

                    "click",

                    () =>
                        analyzePayment(
                            payment
                        )
                );


                table.appendChild(
                    row
                );

            }
        );

    }

    catch (error) {

        console.error(
            error
        );

    }
}


// =========================================================
// ANALYZE PAYMENT
// =========================================================

async function analyzePayment(payment) {

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

        const response =
            await fetch(

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


        const data =
            await response.json();


        const priority =
            data.risk_analysis.priority;


        const probability =
            data.risk_analysis
                .recovery_probability;


        const expected =
            data.risk_analysis
                .expected_recovery;


        const score =
            data.risk_analysis
                .recovery_score;


        const reliability =
            data.risk_analysis
                .customer_reliability;


        const guardrail =
            data.guardrails.decision;


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


        const confidence =
            Math.round(
                data.recoverai
                    .confidence
                * 100
            );


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
                            risk-${priority.toLowerCase()}
                        "
                    >
                        ${priority}
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


                <div class="decision-card full-width">

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
                                ${probability}%
                            "
                        >
                        </div>

                    </div>

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
                        Agent Mode
                    </span>

                    <strong>
                        ${formatLabel(
                            data.recoverai
                                .agent_mode
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
                        Execute Recovery
                    </button>


                    <div
                        id="execution-result"
                        class="execution-result"
                    >
                    </div>

                </div>

            </div>
        `;


        document.getElementById(
            "execute-btn"
        ).addEventListener(

            "click",

            () =>
                executeRecovery(

                    data.payment_id,

                    data.amount,

                    data.final_action,

                    guardrail
                )
        );


        await loadAuditHistory();

    }

    catch (error) {

        box.innerHTML =
            "Unable to analyze payment.";

        console.error(
            error
        );
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
        "Executing...";


    resultBox.innerHTML = `

        <div class="execution-loading">

            Simulating recovery action...

        </div>
    `;


    try {

        const response =
            await fetch(

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


        const result =
            await response.json();


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
                    ${result.timestamp}
                </small>

            </div>
        `;


        button.textContent =
            "Action Simulated";


        await loadActionCenter();

    }

    catch (error) {

        button.disabled =
            false;


        button.textContent =
            "Try Again";


        resultBox.innerHTML = `

            <div class="execution-blocked">

                Execution Failed

            </div>
        `;


        console.error(
            error
        );
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

        const response =
            await fetch(
                `${API_URL}/action-summary`
            );


        const data =
            await response.json();


        document.getElementById(
            "action-total"
        ).textContent =
            data.total_actions;


        document.getElementById(
            "action-scheduled"
        ).textContent =
            data.scheduled;


        document.getElementById(
            "action-review"
        ).textContent =
            data.awaiting_approval;


        document.getElementById(
            "action-blocked"
        ).textContent =
            data.blocked;


        document.getElementById(
            "action-customer"
        ).textContent =
            data.customer_action_required;

    }

    catch (error) {

        console.error(
            "Action summary error:",
            error
        );
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

        const response =
            await fetch(
                `${API_URL}/action-history`
            );


        const records =
            await response.json();


        table.innerHTML =
            "";


        if (
            records.length === 0
        ) {

            table.innerHTML = `

                <tr>

                    <td colspan="6">

                        No recovery actions yet.

                    </td>

                </tr>
            `;

            return;
        }


        records.forEach(
            record => {

                const row =
                    document.createElement(
                        "tr"
                    );


                let statusClass =
                    "status-normal";


                if (
                    record.execution_status ===
                    "AWAITING_APPROVAL"
                ) {

                    statusClass =
                        "status-review";
                }


                if (
                    record.execution_status ===
                    "BLOCKED"
                ) {

                    statusClass =
                        "status-blocked";
                }


                if (
                    record.execution_status ===
                    "SCHEDULED"
                ) {

                    statusClass =
                        "status-scheduled";
                }


                if (
                    record.execution_status ===
                    "CUSTOMER_ACTION_REQUIRED"
                ) {

                    statusClass =
                        "status-customer";
                }


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
                                ${statusClass}
                            "
                        >

                            ${formatLabel(
                                record.execution_status
                            )}

                        </span>

                    </td>


                    <td>

                        ${record.simulated
                            ? "Yes"
                            : "No"}

                    </td>


                    <td>

                        ${record.timestamp}

                    </td>
                `;


                table.appendChild(
                    row
                );

            }
        );

    }

    catch (error) {

        console.error(
            "Action history error:",
            error
        );
    }
}


// =========================================================
// QUEUE SCORE
// =========================================================

function calculateQueueScore(record) {

    let score =
        safeNumber(
            record.expected_recovery
        );


    score +=
        safeNumber(
            record.recovery_score
        ) * 10;


    const priority =
        String(
            record.priority || ""
        ).toUpperCase();


    if (
        priority === "HIGH"
    ) {

        score +=
            500;
    }


    else if (
        priority === "MEDIUM"
    ) {

        score +=
            250;
    }


    return score;
}


// =========================================================
// SMART QUEUE
// =========================================================

function buildRecoveryQueue(records) {

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

function displayRecoveryQueue(queue) {

    const table =
        document.getElementById(
            "recovery-queue-table"
        );


    table.innerHTML =
        "";


    if (
        queue.length === 0
    ) {

        table.innerHTML = `

            <tr>

                <td colspan="8">

                    Analyze payments to
                    build the queue.

                </td>

            </tr>
        `;

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
            x =>
                x.guardrail_decision ===
                "HUMAN_REVIEW"
        ).length;


    queue.forEach(
        (item, index) => {

            const row =
                document.createElement(
                    "tr"
                );


            const priority =
                item.priority ||
                "LOW";


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
                    ${item.recovery_score}/100
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

        const response =
            await fetch(
                `${API_URL}/audit-history`
            );


        const records =
            await response.json();


        const table =
            document.getElementById(
                "audit-table"
            );


        table.innerHTML =
            "";


        if (
            records.length === 0
        ) {

            table.innerHTML = `

                <tr>
                    <td colspan="7">
                        No recovery activity yet.
                    </td>
                </tr>
            `;

            return;
        }


        const newest =
            [...records].reverse();


        newest.forEach(
            record => {

                const row =
                    document.createElement(
                        "tr"
                    );


                const priority =
                    record.priority ||
                    "LOW";


                const confidence =
                    record.ai_confidence !== ""
                        ?
                        `${Math.round(
                            Number(
                                record.ai_confidence
                            ) * 100
                        )}%`
                        :
                        "N/A";


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


        const queue =
            buildRecoveryQueue(
                records
            );


        displayRecoveryQueue(
            queue
        );


        document.getElementById(
            "pipeline-analyzed"
        ).textContent =

            new Set(
                records.map(
                    x =>
                        x.payment_id
                )
            ).size;


        document.getElementById(
            "pipeline-reviewed"
        ).textContent =

            records.filter(
                x =>
                    x.guardrail_decision ===
                    "HUMAN_REVIEW"
            ).length;

    }

    catch (error) {

        console.error(
            error
        );
    }
}


// =========================================================
// SCROLL
// =========================================================

function scrollToQueue() {

    document.getElementById(
        "recovery-queue-section"
    ).scrollIntoView({

        behavior:
            "smooth"

    });
}


// =========================================================
// REFRESH
// =========================================================

async function refreshDashboard() {

    await Promise.all([

        loadSummary(),

        loadFailedPayments(),

        loadAuditHistory(),

        loadActionCenter()

    ]);
}


// =========================================================
// INITIAL LOAD
// =========================================================

document.addEventListener(

    "DOMContentLoaded",

    () => {

        refreshDashboard();

    }
);