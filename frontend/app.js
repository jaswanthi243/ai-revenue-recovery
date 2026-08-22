const API_URL = "https://ai-revenue-recovery-kugs.onrender.com";


function formatMoney(value) {

    return `₹${Number(value).toLocaleString("en-IN")}`;
}


function formatLabel(value) {

    if (!value) {
        return "-";
    }

    return value
        .replaceAll("_", " ")
        .replace(/\b\w/g, letter => letter.toUpperCase());
}


// ==========================================
// LOAD RECOVERY SUMMARY
// ==========================================

async function loadSummary() {

    try {

        const response = await fetch(
            `${API_URL}/recovery-summary`
        );

        const data = await response.json();


        document.getElementById(
            "revenue-at-risk"
        ).textContent =
            formatMoney(data.revenue_at_risk);


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

    }

    catch (error) {

        console.error(
            "Unable to load recovery summary:",
            error
        );
    }
}


// ==========================================
// LOAD FAILED PAYMENTS
// ==========================================

async function loadFailedPayments() {

    try {

        const response = await fetch(
            `${API_URL}/failed-payments`
        );

        const payments = await response.json();

        const table =
            document.getElementById(
                "payments-table"
            );

        table.innerHTML = "";


        payments.forEach(payment => {

            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>
                    <strong>
                        ${payment.payment_id}
                    </strong>
                </td>

                <td>
                    ${formatMoney(payment.amount)}
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
                        onclick='analyzePayment(
                            ${JSON.stringify(payment)}
                        )'
                    >
                        Analyze
                    </button>

                </td>
            `;


            table.appendChild(row);

        });

    }

    catch (error) {

        console.error(
            "Unable to load failed payments:",
            error
        );
    }
}


// ==========================================
// ANALYZE PAYMENT
// ==========================================

async function analyzePayment(payment) {

    const decisionBox =
        document.getElementById(
            "decision-box"
        );


    decisionBox.innerHTML =
        "RecoverAI is analyzing this payment...";


    try {

        const response = await fetch(
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
                        payment.attempt_count
                })
            }
        );


        const data = await response.json();


        const priority =
            data.risk_analysis.priority;


        const probability =
            data.risk_analysis
                .recovery_probability;


        const guardrail =
            data.guardrails.decision;


        let guardrailClass =
            "guardrail-proceed";


        if (guardrail === "HUMAN_REVIEW") {

            guardrailClass =
                "guardrail-review";

        }


        if (guardrail === "STOP") {

            guardrailClass =
                "guardrail-stop";

        }


        let confidence = "N/A";


        if (
            data.recoverai.confidence !== null &&
            data.recoverai.confidence !== undefined
        ) {

            confidence =
                `${Math.round(
                    data.recoverai.confidence * 100
                )}%`;
        }


        decisionBox.className = "";


        decisionBox.innerHTML = `

            <div class="decision-grid">


                <div class="decision-card">

                    <span>Payment</span>

                    <strong>
                        ${data.payment_id}
                        ·
                        ${formatMoney(data.amount)}
                    </strong>

                </div>


                <div class="decision-card">

                    <span>Risk Priority</span>

                    <strong
                        class="
                        risk-badge
                        risk-${priority.toLowerCase()}
                        "
                    >
                        ${priority}
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

                    <strong>
                        ${formatMoney(
                            data.risk_analysis
                                .expected_recovery
                        )}
                    </strong>

                </div>


                <div class="decision-card">

                    <span>AI Confidence</span>

                    <strong>
                        ${confidence}
                    </strong>

                </div>


                <div class="decision-card">

                    <span>Agent Mode</span>

                    <strong>
                        ${formatLabel(
                            data.recoverai.agent_mode
                        )}
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


                <div class="decision-card full-width">

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
                        ${formatLabel(guardrail)}
                    </strong>

                </div>


                <div class="decision-card">

                    <span>Final Action</span>

                    <strong>
                        ${formatLabel(
                            data.final_action
                        )}
                    </strong>

                </div>


                <div class="decision-card full-width">

                    <span>
                        Guardrail Explanation
                    </span>

                    <strong>
                        ${data.guardrails.reason}
                    </strong>

                </div>


            </div>
        `;


        // ======================================
        // REFRESH RECOVERY ACTIVITY
        // ======================================

        await loadAuditHistory();


    }

    catch (error) {

        decisionBox.innerHTML =
            "Unable to analyze the payment.";

        console.error(error);
    }
}


// ==========================================
// LOAD AUDIT HISTORY
// ==========================================

async function loadAuditHistory() {

    try {

        const response = await fetch(
            `${API_URL}/audit-history`
        );

        const records = await response.json();

        const table =
            document.getElementById(
                "audit-table"
            );

        table.innerHTML = "";


        if (records.length === 0) {

            table.innerHTML = `
                <tr>
                    <td colspan="7">
                        No recovery activity yet.
                    </td>
                </tr>
            `;

            return;
        }


        // Make a copy before reversing
        const newestRecords =
            [...records].reverse();


        newestRecords.forEach(record => {

            const row =
                document.createElement("tr");


            let confidence = "N/A";


            if (
                record.ai_confidence !== "" &&
                record.ai_confidence !== null &&
                record.ai_confidence !== undefined
            ) {

                confidence =
                    `${Math.round(
                        Number(
                            record.ai_confidence
                        ) * 100
                    )}%`;
            }


            const priority =
                record.priority || "LOW";


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

                    <span
                        class="${guardrailClass}"
                    >
                        ${formatLabel(
                            record.guardrail_decision
                        )}
                    </span>

                </td>


                <td>
                    ${formatLabel(
                        record.agent_mode
                    )}
                </td>

            `;


            table.appendChild(row);

        });

    }

    catch (error) {

        console.error(
            "Unable to load audit history:",
            error
        );
    }
}


// ==========================================
// INITIAL PAGE LOAD
// ==========================================

loadSummary();
loadFailedPayments();
loadAuditHistory();