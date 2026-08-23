// =========================================================
// RECOVERAI FRONTEND
// =========================================================

const API_URL =
    "https://ai-revenue-recovery-kugs.onrender.com";


// =========================================================
// HELPERS
// =========================================================

function formatMoney(value) {

    const number =
        Number(value || 0);

    return `₹${number.toLocaleString("en-IN")}`;
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

    if (Number.isNaN(number)) {
        return 0;
    }

    return number;
}


// =========================================================
// LOAD RECOVERY SUMMARY
// =========================================================

async function loadSummary() {

    try {

        const response =
            await fetch(
                `${API_URL}/recovery-summary`
            );


        if (!response.ok) {

            throw new Error(
                "Unable to load recovery summary"
            );
        }


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


        if (
            document.getElementById(
                "guardrail-human-review"
            )
        ) {

            document.getElementById(
                "guardrail-human-review"
            ).textContent =
                safeNumber(
                    data.human_review_cases
                );
        }


        if (
            document.getElementById(
                "guardrail-blocked"
            )
        ) {

            document.getElementById(
                "guardrail-blocked"
            ).textContent =
                safeNumber(
                    data.blocked_cases
                );
        }

    }

    catch (error) {

        console.error(
            "Unable to load recovery summary:",
            error
        );
    }
}


// =========================================================
// LOAD FAILED PAYMENTS
// =========================================================

async function loadFailedPayments() {

    const table =
        document.getElementById(
            "payments-table"
        );


    try {

        table.innerHTML = `

            <tr>

                <td colspan="5">
                    Loading failed payments...
                </td>

            </tr>
        `;


        const response =
            await fetch(
                `${API_URL}/failed-payments`
            );


        if (!response.ok) {

            throw new Error(
                "Unable to load failed payments"
            );
        }


        const payments =
            await response.json();


        table.innerHTML = "";


        if (
            !Array.isArray(payments) ||
            payments.length === 0
        ) {

            table.innerHTML = `

                <tr>

                    <td colspan="5">
                        No failed payments found.
                    </td>

                </tr>
            `;

            return;
        }


        payments.forEach(
            payment => {

                const row =
                    document.createElement(
                        "tr"
                    );


                row.innerHTML = `

                    <td>

                        <div class="payment-id">

                            <span class="payment-dot">
                            </span>

                            <strong>
                                ${payment.payment_id}
                            </strong>

                        </div>

                    </td>


                    <td>

                        <strong>
                            ${formatMoney(
                                payment.amount
                            )}
                        </strong>

                    </td>


                    <td>

                        ${formatLabel(
                            payment.failure_reason
                        )}

                    </td>


                    <td>

                        <span class="attempt-badge">

                            ${payment.attempt_count}

                        </span>

                    </td>


                    <td>

                        <button
                            class="analyze-btn"
                        >
                            Analyze
                        </button>

                    </td>
                `;


                const button =
                    row.querySelector(
                        ".analyze-btn"
                    );


                button.addEventListener(
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

    }

    catch (error) {

        console.error(
            "Unable to load failed payments:",
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

async function analyzePayment(payment) {

    const decisionBox =
        document.getElementById(
            "decision-box"
        );


    decisionBox.className =
        "analyzing-decision";


    decisionBox.innerHTML = `

        <div class="analyzing-content">

            <div class="ai-loader"></div>

            <strong>
                RecoverAI is analyzing
                ${payment.payment_id}
            </strong>

            <span>
                Evaluating recovery probability,
                customer risk and guardrails...
            </span>

        </div>
    `;


    decisionBox.scrollIntoView({

        behavior: "smooth",

        block: "center"

    });


    try {

        const response =
            await fetch(

                `${API_URL}/analyze-payment`,

                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        payment_id:
                            payment.payment_id,

                        amount:
                            payment.amount,

                        failure_reason:
                            payment.failure_reason,

                        attempt_count:
                            payment.attempt_count,

                        customer_id:
                            payment.customer_id
                    })
                }
            );


        if (!response.ok) {

            throw new Error(
                "Payment analysis failed"
            );
        }


        const data =
            await response.json();


        const priority =
            data.risk_analysis
                ?.priority || "LOW";


        const probability =
            safeNumber(
                data.risk_analysis
                    ?.recovery_probability
            );


        const expectedRecovery =
            safeNumber(
                data.risk_analysis
                    ?.expected_recovery
            );


        const recoveryScore =
            safeNumber(
                data.risk_analysis
                    ?.recovery_score
            );


        const customerReliability =
            safeNumber(
                data.risk_analysis
                    ?.customer_reliability
            );


        const riskLevel =
            data.risk_analysis
                ?.risk_level || "-";


        const guardrail =
            data.guardrails
                ?.decision ||
            "UNKNOWN";


        const guardrailReason =
            data.guardrails
                ?.reason ||
            "-";


        const recommendation =
            data.recoverai
                ?.recommendation ||
            "-";


        const reasoning =
            data.recoverai
                ?.reasoning ||
            "No reasoning available.";


        const finalAction =
            data.final_action ||
            recommendation;


        const agentMode =
            data.recoverai
                ?.agent_mode ||
            "RecoverAI Agent";


        let confidence =
            "N/A";


        if (
            data.recoverai?.confidence !==
                null &&
            data.recoverai?.confidence !==
                undefined
        ) {

            confidence =
                `${Math.round(
                    Number(
                        data.recoverai
                            .confidence
                    ) * 100
                )}%`;
        }


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


        decisionBox.className = "";


        decisionBox.innerHTML = `

            <div class="decision-hero">

                <div>

                    <span class="decision-label">
                        RECOVERAI DECISION
                    </span>

                    <h3>
                        ${data.payment_id}
                    </h3>

                    <p>
                        ${formatLabel(
                            payment.failure_reason
                        )}
                    </p>

                </div>


                <div class="decision-amount">

                    <span>
                        PAYMENT VALUE
                    </span>

                    <strong>
                        ${formatMoney(
                            data.amount
                        )}
                    </strong>

                </div>

            </div>


            <div class="decision-grid">


                <div class="decision-card">

                    <span>
                        Risk Priority
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
                        ${recoveryScore}/100
                    </strong>

                </div>


                <div class="decision-card">

                    <span>
                        Customer Reliability
                    </span>

                    <strong>
                        ${customerReliability}/100
                    </strong>

                </div>


                <div class="decision-card">

                    <span>
                        Expected Recovery
                    </span>

                    <strong class="money-success">

                        ${formatMoney(
                            expectedRecovery
                        )}

                    </strong>

                </div>


                <div class="decision-card">

                    <span>
                        AI Confidence
                    </span>

                    <strong>
                        ${confidence}
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

                    <div class="probability-row">

                        <strong>
                            ${probability}%
                        </strong>

                        <span>
                            Estimated likelihood
                            of successful recovery
                        </span>

                    </div>


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
                        AI Recommendation
                    </span>

                    <strong>
                        ${formatLabel(
                            recommendation
                        )}
                    </strong>

                </div>


                <div class="decision-card">

                    <span>
                        Agent Mode
                    </span>

                    <strong>
                        ${formatLabel(
                            agentMode
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
                        Final Action
                    </span>

                    <strong>
                        ${formatLabel(
                            finalAction
                        )}
                    </strong>

                </div>


                <div
                    class="
                        decision-card
                        full-width
                        reasoning-card
                    "
                >

                    <span>
                        Why RecoverAI chose this
                    </span>

                    <strong>
                        ${reasoning}
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
                        ${guardrailReason}
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

                    <p class="execute-description">

                        The selected recovery action
                        will be simulated.
                        No real payment is processed.

                    </p>

                    <button
                        id="execute-recovery-button"
                        class="execute-recovery-btn"
                    >
                        Execute Recovery
                    </button>


                    <div
                        id="execution-result-${data.payment_id}"
                        class="execution-result"
                    >
                    </div>

                </div>

            </div>
        `;


        const executeButton =
            document.getElementById(
                "execute-recovery-button"
            );


        executeButton.addEventListener(
            "click",
            () => {

                executeRecovery(

                    data.payment_id,

                    data.amount,

                    finalAction,

                    guardrail
                );

            }
        );


        await loadAuditHistory();

    }

    catch (error) {

        console.error(
            error
        );


        decisionBox.className =
            "empty-decision";


        decisionBox.innerHTML = `

            Unable to analyze this payment.

            <strong>
                Please try again.
            </strong>
        `;
    }
}


// =========================================================
// EXECUTE RECOVERY ACTION
// =========================================================

async function executeRecovery(
    paymentId,
    amount,
    finalAction,
    guardrailDecision
) {

    const resultBox =
        document.getElementById(
            `execution-result-${paymentId}`
        );


    const executeButton =
        document.getElementById(
            "execute-recovery-button"
        );


    if (!resultBox) {

        return;
    }


    if (executeButton) {

        executeButton.disabled =
            true;

        executeButton.textContent =
            "Executing...";
    }


    resultBox.innerHTML = `

        <div class="execution-loading">

            <div
                class="execution-spinner"
            >
            </div>

            Executing simulated
            recovery action...

        </div>
    `;


    try {

        const response =
            await fetch(

                `${API_URL}/execute-action`,

                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

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


        if (!response.ok) {

            throw new Error(
                "Execution request failed"
            );
        }


        const result =
            await response.json();


        let statusClass =
            "execution-success";


        let statusIcon =
            "✓";


        if (
            result.execution_status ===
            "AWAITING_APPROVAL"
        ) {

            statusClass =
                "execution-review";

            statusIcon =
                "!";
        }


        if (
            result.execution_status ===
            "BLOCKED"
        ) {

            statusClass =
                "execution-blocked";

            statusIcon =
                "×";
        }


        if (
            result.execution_status ===
            "NO_ACTION"
        ) {

            statusClass =
                "execution-neutral";

            statusIcon =
                "•";
        }


        resultBox.innerHTML = `

            <div class="${statusClass}">

                <div
                    class="
                        execution-status-header
                    "
                >

                    <span
                        class="
                            execution-status-icon
                        "
                    >
                        ${statusIcon}
                    </span>

                    <strong>
                        ${formatLabel(
                            result.execution_status
                        )}
                    </strong>

                </div>


                <p>
                    ${result.message}
                </p>


                <div
                    class="
                        execution-meta
                    "
                >

                    <span>
                        Action:
                        ${formatLabel(
                            result.action
                        )}
                    </span>

                    <span>
                        Simulation:
                        ${result.simulated
                            ? "Yes"
                            : "No"}
                    </span>

                </div>


                <small>
                    ${result.timestamp}
                </small>

            </div>
        `;


        if (executeButton) {

            executeButton.textContent =
                "Action Simulated";
        }


        await loadAuditHistory();

        await loadSummary();

    }

    catch (error) {

        console.error(
            "Recovery execution failed:",
            error
        );


        resultBox.innerHTML = `

            <div class="execution-blocked">

                <div
                    class="
                        execution-status-header
                    "
                >

                    <span
                        class="
                            execution-status-icon
                        "
                    >
                        ×
                    </span>

                    <strong>
                        Execution Failed
                    </strong>

                </div>

                <p>
                    Unable to execute
                    the recovery action.
                </p>

            </div>
        `;


        if (executeButton) {

            executeButton.disabled =
                false;

            executeButton.textContent =
                "Try Again";
        }
    }
}


// =========================================================
// CALCULATE SMART QUEUE SCORE
// =========================================================

function calculateQueueScore(record) {

    const expectedRecovery =
        safeNumber(
            record.expected_recovery
        );


    const recoveryScore =
        safeNumber(
            record.recovery_score
        );


    const priority =
        String(
            record.priority || ""
        ).toUpperCase();


    let score =
        expectedRecovery;


    score +=
        recoveryScore * 10;


    if (
        priority === "HIGH"
    ) {

        score += 500;
    }


    else if (
        priority === "MEDIUM"
    ) {

        score += 250;
    }


    return Math.round(
        score * 100
    ) / 100;
}


// =========================================================
// BUILD SMART RECOVERY QUEUE
// =========================================================

function buildRecoveryQueue(records) {

    if (!Array.isArray(records)) {

        return [];
    }


    const latestPayments =
        new Map();


    records.forEach(
        record => {

            if (!record.payment_id) {
                return;
            }


            latestPayments.set(
                record.payment_id,
                record
            );

        }
    );


    return Array.from(
        latestPayments.values()
    )
        .map(
            record => ({

                ...record,

                queue_score:
                    calculateQueueScore(
                        record
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
// DISPLAY SMART RECOVERY QUEUE
// =========================================================

function displayRecoveryQueue(
    queue
) {

    const table =
        document.getElementById(
            "recovery-queue-table"
        );


    if (!table) {

        return;
    }


    table.innerHTML = "";


    if (
        !Array.isArray(queue) ||
        queue.length === 0
    ) {

        table.innerHTML = `

            <tr>

                <td colspan="8">

                    Analyze a payment to begin
                    building the recovery queue.

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


    const humanReviewCount =
        queue.filter(
            item =>
                item.guardrail_decision ===
                "HUMAN_REVIEW"
        ).length;


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
        humanReviewCount;


    queue.forEach(
        (item, index) => {

            const row =
                document.createElement(
                    "tr"
                );


            const priority =
                String(
                    item.priority ||
                    "LOW"
                ).toUpperCase();


            const guardrail =
                item.guardrail_decision ||
                "PROCEED";


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


            let actionClass =
                "queue-action-normal";


            if (
                item.final_action ===
                "human_review"
            ) {

                actionClass =
                    "queue-action-review";
            }


            if (
                guardrail ===
                "STOP"
            ) {

                actionClass =
                    "queue-action-stop";
            }


            const rankClass =
                index === 0
                    ?
                    "queue-rank queue-rank-first"
                    :
                    "queue-rank";


            row.innerHTML = `

                <td>

                    <span
                        class="${rankClass}"
                    >
                        #${index + 1}
                    </span>

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

                    <strong
                        class="expected-value"
                    >

                        ${formatMoney(
                            item.expected_recovery
                        )}

                    </strong>

                </td>


                <td>

                    <div
                        class="
                            queue-score-wrapper
                        "
                    >

                        <div
                            class="
                                score-number-row
                            "
                        >

                            <strong>
                                ${safeNumber(
                                    item.recovery_score
                                )}
                            </strong>

                            <small>
                                /100
                            </small>

                        </div>


                        <div
                            class="queue-score-bar"
                        >

                            <div
                                class="
                                    queue-score-fill
                                "
                                style="
                                    width:
                                    ${Math.min(
                                        safeNumber(
                                            item.recovery_score
                                        ),
                                        100
                                    )}%
                                "
                            >
                            </div>

                        </div>

                    </div>

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

                    <strong
                        class="${guardrailClass}"
                    >

                        ${formatLabel(
                            guardrail
                        )}

                    </strong>

                </td>


                <td>

                    <strong
                        class="${actionClass}"
                    >

                        ${formatLabel(
                            item.final_action
                        )}

                    </strong>

                </td>
            `;


            table.appendChild(
                row
            );

        }
    );
}


// =========================================================
// LOAD AUDIT HISTORY
// =========================================================

async function loadAuditHistory() {

    try {

        const response =
            await fetch(
                `${API_URL}/audit-history`
            );


        if (!response.ok) {

            throw new Error(
                "Unable to load audit history"
            );
        }


        const records =
            await response.json();


        const table =
            document.getElementById(
                "audit-table"
            );


        table.innerHTML = "";


        if (
            !Array.isArray(records) ||
            records.length === 0
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


            updateGuardrails(
                []
            );


            return;
        }


        const newestRecords =
            [...records].reverse();


        newestRecords.forEach(
            record => {

                const row =
                    document.createElement(
                        "tr"
                    );


                let confidence =
                    "N/A";


                if (
                    record.ai_confidence !==
                        "" &&
                    record.ai_confidence !==
                        null &&
                    record.ai_confidence !==
                        undefined
                ) {

                    confidence =
                        `${Math.round(
                            Number(
                                record.ai_confidence
                            ) * 100
                        )}%`;
                }


                const priority =
                    String(
                        record.priority ||
                        "LOW"
                    ).toUpperCase();


                let guardrailClass =
                    "guardrail-proceed";


                if (
                    record.guardrail_decision ===
                    "HUMAN_REVIEW"
                ) {

                    guardrailClass =
                        "guardrail-review";
                }


                if (
                    record.guardrail_decision ===
                    "STOP"
                ) {

                    guardrailClass =
                        "guardrail-stop";
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

                        <strong
                            class="${guardrailClass}"
                        >

                            ${formatLabel(
                                record.guardrail_decision
                            )}

                        </strong>

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


        const recoveryQueue =
            buildRecoveryQueue(
                records
            );


        displayRecoveryQueue(
            recoveryQueue
        );


        updateGuardrails(
            records
        );


        updatePipeline(
            records
        );

    }

    catch (error) {

        console.error(
            "Unable to load audit history:",
            error
        );
    }
}


// =========================================================
// UPDATE GUARDRAILS
// =========================================================

function updateGuardrails(
    records
) {

    const humanReviewCount =
        records.filter(
            record =>
                record.guardrail_decision ===
                "HUMAN_REVIEW"
        ).length;


    const blockedCount =
        records.filter(
            record =>
                record.guardrail_decision ===
                "STOP"
        ).length;


    if (
        document.getElementById(
            "guardrail-human-review"
        )
    ) {

        document.getElementById(
            "guardrail-human-review"
        ).textContent =
            humanReviewCount;
    }


    if (
        document.getElementById(
            "guardrail-blocked"
        )
    ) {

        document.getElementById(
            "guardrail-blocked"
        ).textContent =
            blockedCount;
    }


    if (
        document.getElementById(
            "pipeline-reviewed"
        )
    ) {

        document.getElementById(
            "pipeline-reviewed"
        ).textContent =
            humanReviewCount;
    }
}


// =========================================================
// UPDATE PIPELINE
// =========================================================

function updatePipeline(
    records
) {

    const uniquePayments =
        new Set(
            records.map(
                record =>
                    record.payment_id
            )
        );


    if (
        document.getElementById(
            "pipeline-analyzed"
        )
    ) {

        document.getElementById(
            "pipeline-analyzed"
        ).textContent =
            uniquePayments.size;
    }
}


// =========================================================
// SCROLL TO QUEUE
// =========================================================

function scrollToQueue() {

    const section =
        document.getElementById(
            "recovery-queue-section"
        );


    if (!section) {

        return;
    }


    section.scrollIntoView({

        behavior: "smooth",

        block: "start"

    });
}


// =========================================================
// REFRESH DASHBOARD
// =========================================================

async function refreshDashboard() {

    const buttons =
        document.querySelectorAll(
            "button"
        );


    buttons.forEach(
        button =>
            button.disabled = true
    );


    try {

        await Promise.all([

            loadSummary(),

            loadFailedPayments(),

            loadAuditHistory()

        ]);

    }

    finally {

        buttons.forEach(
            button =>
                button.disabled = false
        );
    }
}


// =========================================================
// INITIAL PAGE LOAD
// =========================================================

document.addEventListener(

    "DOMContentLoaded",

    () => {

        loadSummary();

        loadFailedPayments();

        loadAuditHistory();

    }
);