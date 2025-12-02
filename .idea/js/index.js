// .idea/js/index.js
import {
    getRoutingStats,
    getRoutingStatsForDepartment,
    getDepartments,
    getTicketsForDepartment
} from "./api.js";

/**
 * MOCKDATA – sæt USE_MOCK = false når backend-data er klar
 */
const USE_MOCK = false;

const MOCK_STATS = {
    totalTickets: 30,
    successCount: 23,
    failureCount: 5,
    defaultedCount: 2,
    accuracy: 23 / 30 // ca. 76,7%
};

const today = new Date();
function daysAgo(n) {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d.toISOString();
}

const MOCK_TICKETS = [
    // SUCCES-tickets fordelt over 7 dage
    { metricsDepartmentID: 1, subject: "Login issue", createdAt: daysAgo(7), status: "SUCCESS", departmentName: "Support", predictedTeam: "Support Team" },
    { metricsDepartmentID: 2, subject: "Order #1234", createdAt: daysAgo(7), status: "SUCCESS", departmentName: "Sales", predictedTeam: "Sales Team" },
    { metricsDepartmentID: 3, subject: "Billing question", createdAt: daysAgo(6), status: "SUCCESS", departmentName: "Finance", predictedTeam: "Finance Team" },
    { metricsDepartmentID: 4, subject: "Password reset", createdAt: daysAgo(6), status: "SUCCESS", departmentName: "Support", predictedTeam: "Support Team" },
    { metricsDepartmentID: 5, subject: "API integration", createdAt: daysAgo(5), status: "SUCCESS", departmentName: "Tech", predictedTeam: "Tech Team" },
    { metricsDepartmentID: 6, subject: "Invoice missing", createdAt: daysAgo(5), status: "SUCCESS", departmentName: "Finance", predictedTeam: "Finance Team" },
    { metricsDepartmentID: 7, subject: "Refund request", createdAt: daysAgo(4), status: "SUCCESS", departmentName: "Finance", predictedTeam: "Finance Team" },
    { metricsDepartmentID: 8, subject: "New user onboarding", createdAt: daysAgo(4), status: "SUCCESS", departmentName: "Support", predictedTeam: "Support Team" },
    { metricsDepartmentID: 9, subject: "Product demo", createdAt: daysAgo(3), status: "SUCCESS", departmentName: "Sales", predictedTeam: "Sales Team" },
    { metricsDepartmentID: 10, subject: "SLA question", createdAt: daysAgo(3), status: "SUCCESS", departmentName: "Support", predictedTeam: "Support Team" },
    { metricsDepartmentID: 11, subject: "Contract change", createdAt: daysAgo(2), status: "SUCCESS", departmentName: "Sales", predictedTeam: "Sales Team" },
    { metricsDepartmentID: 12, subject: "Feature request", createdAt: daysAgo(2), status: "SUCCESS", departmentName: "Tech", predictedTeam: "Tech Team" },
    { metricsDepartmentID: 13, subject: "DB timeout", createdAt: daysAgo(1), status: "SUCCESS", departmentName: "Tech", predictedTeam: "Tech Team" },
    { metricsDepartmentID: 14, subject: "Latency spike", createdAt: daysAgo(1), status: "SUCCESS", departmentName: "Tech", predictedTeam: "Tech Team" },
    { metricsDepartmentID: 15, subject: "Slow UI", createdAt: daysAgo(0), status: "SUCCESS", departmentName: "Support", predictedTeam: "Support Team" },
    { metricsDepartmentID: 16, subject: "Export data", createdAt: daysAgo(0), status: "SUCCESS", departmentName: "Tech", predictedTeam: "Tech Team" },

    // FAILURE-tickets
    { metricsDepartmentID: 17, subject: "Wrong routing 1", createdAt: daysAgo(6), status: "FAILURE", departmentName: "Support", predictedTeam: "Sales Team" },
    { metricsDepartmentID: 18, subject: "Wrong routing 2", createdAt: daysAgo(5), status: "FAILURE", departmentName: "Sales", predictedTeam: "Support Team" },
    { metricsDepartmentID: 19, subject: "Wrong routing 3", createdAt: daysAgo(3), status: "FAILURE", departmentName: "Finance", predictedTeam: "Support Team" },
    { metricsDepartmentID: 20, subject: "Wrong routing 4", createdAt: daysAgo(2), status: "FAILURE", departmentName: "Tech", predictedTeam: "Finance Team" },
    { metricsDepartmentID: 21, subject: "Wrong routing 5", createdAt: daysAgo(1), status: "FAILURE", departmentName: "Finance", predictedTeam: "Sales Team" },

    // DEFAULTED-tickets
    { metricsDepartmentID: 22, subject: "Fallback 1", createdAt: daysAgo(4), status: "DEFAULTED", departmentName: "Support", predictedTeam: "Default Queue" },
    { metricsDepartmentID: 23, subject: "Fallback 2", createdAt: daysAgo(2), status: "DEFAULTED", departmentName: "Sales", predictedTeam: "Default Queue" },

    // Et par ekstra for at få 30 i alt
    { metricsDepartmentID: 24, subject: "Extra success 1", createdAt: daysAgo(3), status: "SUCCESS", departmentName: "Support", predictedTeam: "Support Team" },
    { metricsDepartmentID: 25, subject: "Extra success 2", createdAt: daysAgo(2), status: "SUCCESS", departmentName: "Tech", predictedTeam: "Tech Team" },
    { metricsDepartmentID: 26, subject: "Extra success 3", createdAt: daysAgo(1), status: "SUCCESS", departmentName: "Finance", predictedTeam: "Finance Team" },
    { metricsDepartmentID: 27, subject: "Extra success 4", createdAt: daysAgo(0), status: "SUCCESS", departmentName: "Sales", predictedTeam: "Sales Team" },
    { metricsDepartmentID: 28, subject: "Extra success 5", createdAt: daysAgo(0), status: "SUCCESS", departmentName: "Support", predictedTeam: "Support Team" },
    { metricsDepartmentID: 29, subject: "Extra success 6", createdAt: daysAgo(1), status: "SUCCESS", departmentName: "Tech", predictedTeam: "Tech Team" },
    { metricsDepartmentID: 30, subject: "Extra success 7", createdAt: daysAgo(2), status: "SUCCESS", departmentName: "Finance", predictedTeam: "Finance Team" }
];

let chartInstance = null;              // donut
let predictionChartInstance = null;    // line chart (forecast)
let liveUpdatedInterval = null;        // live-timeren
let allTickets = [];                   // alle tickets/metrics på tværs af departments

// Læs evt. valgt department fra URL’en
const urlParams = new URLSearchParams(window.location.search);
const SELECTED_DEPARTMENT_ID = urlParams.get("departmentId")
    ? parseInt(urlParams.get("departmentId"), 10)
    : null;
const SELECTED_DEPARTMENT_NAME = urlParams.get("departmentName");

/**
 * Hjælper til at udregne stats ud fra en liste af tickets/metrics
 */
function computeStatsFromTickets(tickets) {
    const result = {
        totalTickets: 0,
        successCount: 0,
        failureCount: 0,
        defaultedCount: 0
    };

    if (!Array.isArray(tickets) || tickets.length === 0) {
        return result;
    }

    result.totalTickets = tickets.length;

    for (const t of tickets) {
        const status = (t.status ?? t.routingStatus ?? "").toUpperCase();

        if (status === "SUCCESS") {
            result.successCount++;
        } else if (status === "FAILURE") {
            result.failureCount++;
        } else if (status === "DEFAULTED") {
            result.defaultedCount++;
        }
    }

    return result;
}

function startLiveUpdatedLabel(element, timestamp) {
    if (!element || !timestamp) return;

    if (liveUpdatedInterval) {
        clearInterval(liveUpdatedInterval);
        liveUpdatedInterval = null;
    }

    function render() {
        const now = Date.now();
        const diffMs = now - timestamp.getTime();
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHours = Math.floor(diffMin / 60);
        const diffDays = Math.floor(diffHours / 24);

        let text;
        if (diffSec < 5) {
            text = "Opdateret lige nu";
        } else if (diffSec < 60) {
            text = `Opdateret for ${diffSec} sek. siden`;
        } else if (diffMin < 60) {
            text = `Opdateret for ${diffMin} min. siden`;
        } else if (diffHours < 24) {
            text = `Opdateret for ${diffHours} timer siden`;
        } else {
            text = `Opdateret for ${diffDays} dage siden`;
        }

        element.textContent = text;
    }

    render();
    liveUpdatedInterval = setInterval(render, 1000);
}

function formatDateTime(isoString) {
    if (!isoString) return "";
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return isoString;
    return d.toLocaleString("da-DK");
}

/**
 * Hent ALLE tickets/metrics fra backend via departments-endpoints
 * (bruges i global view når USE_MOCK = false)
 */
async function loadAllTicketsFromBackend() {
    try {
        const departments = await getDepartments();
        if (!Array.isArray(departments) || departments.length === 0) {
            console.warn("Ingen departments fundet");
            return [];
        }

        const ids = departments
            .map(d => d.departmentID ?? d.categoryID ?? d.id)
            .filter(id => id != null);

        const results = await Promise.all(
            ids.map(async id => {
                try {
                    const data = await getTicketsForDepartment(id);

                    // Forventer nu et objekt med ticket-statistikker.
                    if (data && typeof data === "object") {
                        return {
                            departmentId: id,
                            ...data
                        };
                    }

                    console.warn("Ukendt dataformat fra getTicketsForDepartment:", id, data);
                    return null;
                } catch (e) {
                    console.warn("Kunne ikke hente tickets for department", id, e);
                    return null;
                }
            })
        );

        // Fjern nulls, returner liste af objekter
        return results.filter(Boolean);

    } catch (e) {
        console.error("Fejl ved hentning af alle tickets:", e);
        return [];
    }
}

/**
 * Fejlstatistik pr. "predicted team"
 */
function buildPredictedTeamErrorStats(tickets) {
    const map = new Map();

    for (const t of tickets) {
        const deptName =
            (t.department && t.department.departmentName) ??
            t.departmentName ??
            "";

        const predictedRaw =
            t.predictedTeam ??
            t.predicted_team ??
            deptName;

        const predicted = (predictedRaw || "Ukendt team").trim();

        let entry = map.get(predicted);
        if (!entry) {
            entry = { predictedTeam: predicted, total: 0, incorrect: 0 };
            map.set(predicted, entry);
        }

        entry.total++;

        const status = (t.status ?? t.routingStatus ?? "").toUpperCase();
        if (status && status !== "SUCCESS") {
            entry.incorrect++;
        }
    }

    return Array.from(map.values())
        .filter(c => c.total > 0 && c.incorrect > 0)
        .map(c => ({
            ...c,
            errorRate: (c.incorrect / c.total) * 100
        }))
        .sort((a, b) => b.errorRate - a.errorRate);
}

/**
 * Byg en tidsserie med daglig accuracy (% SUCCESS) ud fra tickets.
 */
function buildDailyAccuracySeries(tickets) {
    const map = new Map();

    for (const t of tickets) {
        const created = t.createdAt ?? t.created_at ?? t.timestamp;
        if (!created) continue;

        const d = new Date(created);
        if (Number.isNaN(d.getTime())) continue;

        const key = d.toISOString().slice(0, 10); // YYYY-MM-DD

        let entry = map.get(key);
        if (!entry) {
            entry = { date: key, success: 0, total: 0 };
            map.set(key, entry);
        }

        entry.total++;

        const status = (t.status ?? t.routingStatus ?? "").toUpperCase();
        if (status === "SUCCESS") {
            entry.success++;
        }
    }

    const series = Array.from(map.values())
        .sort((a, b) => a.date.localeCompare(b.date));

    return series.map(e => {
        const dateObj = new Date(e.date);
        return {
            date: e.date,
            label: dateObj.toLocaleDateString("da-DK", {
                day: "2-digit",
                month: "2-digit"
            }),
            accuracy: e.total > 0 ? (e.success / e.total) * 100 : 0
        };
    });
}

/**
 * Simpel forecast: lineær trend fra historiske data, projiceret N dage frem.
 */
function buildAccuracyPrediction(dailySeries, horizonDays = 7) {
    if (!dailySeries || dailySeries.length === 0) return [];

    if (dailySeries.length === 1) {
        const last = dailySeries[0];
        const baseDate = new Date(last.date);
        const result = [];

        for (let i = 1; i <= horizonDays; i++) {
            const d = new Date(baseDate);
            d.setDate(d.getDate() + i);

            result.push({
                date: d.toISOString().slice(0, 10),
                label: d.toLocaleDateString("da-DK", {
                    day: "2-digit",
                    month: "2-digit"
                }),
                accuracy: last.accuracy
            });
        }
        return result;
    }

    const first = dailySeries[0];
    const last = dailySeries[dailySeries.length - 1];
    const n = dailySeries.length;

    const slope = (last.accuracy - first.accuracy) / (n - 1); // pct-point pr. dag
    const baseDate = new Date(last.date);
    const result = [];

    for (let i = 1; i <= horizonDays; i++) {
        const d = new Date(baseDate);
        d.setDate(d.getDate() + i);

        let acc = last.accuracy + slope * i;
        if (acc > 100) acc = 100;
        if (acc < 0) acc = 0;

        result.push({
            date: d.toISOString().slice(0, 10),
            label: d.toLocaleDateString("da-DK", {
                day: "2-digit",
                month: "2-digit"
            }),
            accuracy: acc
        });
    }

    return result;
}

/**
 * Render ticket-liste baseret på status (SUCCESS / FAILURE / DEFAULTED)
 */
function renderTicketList(status, label) {
    const container = document.getElementById("ticketList");
    if (!container) return;

    if (!Array.isArray(allTickets) || allTickets.length === 0) {
        container.innerHTML = `
            <div style="font-size:0.85rem;color:#6b7280;">
                Ingen ticket-data tilgængelig fra backend endnu.
            </div>
        `;
        return;
    }

    const upperStatus = status.toUpperCase();

    const filtered = allTickets.filter(t => {
        const s = (t.status ?? t.routingStatus ?? "").toUpperCase();
        return s === upperStatus;
    });

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="font-size:0.85rem;color:#6b7280;">
                Ingen tickets fundet for: <strong>${label}</strong>.
            </div>
        `;
        return;
    }

    const rows = filtered.slice(0, 50).map(t => {
        const id =
            t.metricsDepartmentID ??
            t.id ??
            t.ticketId ??
            t.ticketNumber ??
            "Ukendt ID";

        const subject = t.subject ?? t.title ?? "(ingen subject)";
        const created = t.createdAt ?? t.created_at ?? t.timestamp;
        const createdText = created ? formatDateTime(created) : "-";

        const deptName =
            (t.department && t.department.departmentName) ??
            t.departmentName ??
            "";

        const predictedTeam =
            t.predictedTeam ??
            t.predicted_team ??
            deptName;

        const actualTeam =
            t.actualTeam ??
            t.actual_team ??
            "";

        const statusVal = t.status ?? t.routingStatus ?? "";

        return `
            <tr>
                <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${id}</td>
                <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${subject}</td>
                <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${createdText}</td>
                <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${deptName}</td>
                <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${predictedTeam}</td>
                <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${actualTeam}</td>
                <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${statusVal}</td>
            </tr>
        `;
    }).join("");

    container.innerHTML = `
        <div style="margin-bottom:6px;">
            <div class="stat-label" style="margin-bottom:4px;">Tickets – ${label}</div>
            <div style="font-size:0.8rem;color:#6b7280;">
                Viser ${filtered.length > 50 ? "de første 50 af " : ""}${filtered.length} tickets.
            </div>
        </div>
        <div style="overflow:auto;max-height:260px;border:1px solid #e5e7eb;border-radius:6px;">
            <table style="border-collapse:collapse;width:100%;font-size:0.8rem;">
                <thead style="background:#f9fafb;position:sticky;top:0;z-index:1;">
                    <tr>
                        <th style="text-align:left;padding:6px 8px;border-bottom:1px solid #e5e7eb;">Ticket ID</th>
                        <th style="text-align:left;padding:6px 8px;border-bottom:1px solid #e5e7eb;">Subject</th>
                        <th style="text-align:left;padding:6px 8px;border-bottom:1px solid #e5e7eb;">Oprettet</th>
                        <th style="text-align:left;padding:6px 8px;border-bottom:1px solid #e5e7eb;">Department</th>
                        <th style="text-align:left;padding:6px 8px;border-bottom:1px solid #e5e7eb;">Predicted team</th>
                        <th style="text-align:left;padding:6px 8px;border-bottom:1px solid #e5e7eb;">Actual team</th>
                        <th style="text-align:left;padding:6px 8px;border-bottom:1px solid #e5e7eb;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>
    `;
}

async function loadStats() {
    const output = document.getElementById("output");

    if (!output) {
        console.error("Kunne ikke finde elementet med id='output'.");
        return;
    }

    try {
        console.log("Henter stats + tickets...");

        let stats;
        let tickets;
        let scopeLabel;

        const isDepartmentView =
            SELECTED_DEPARTMENT_ID != null && !Number.isNaN(SELECTED_DEPARTMENT_ID);

        if (isDepartmentView) {
            // --- DEPARTMENT-VIEW: kun tickets/stats for det valgte department ---
            const depId = SELECTED_DEPARTMENT_ID;
            console.log("Loader department view for id", depId);

            let departmentData = null;

            if (USE_MOCK) {
                tickets = MOCK_TICKETS.filter(t => {
                    const ticketDeptId =
                        t.metricsDepartmentID ??
                        t.departmentID ??
                        t.departmentId;
                    return String(ticketDeptId) === String(depId);
                });
                stats = computeStatsFromTickets(tickets);

                if (tickets.length > 0) {
                    departmentData = { departmentName: tickets[0].departmentName };
                }
            } else {
                // Backend: hent både stats og tickets for det valgte department
                const [statsFromApi, deptData] = await Promise.all([
                    getRoutingStatsForDepartment(depId),
                    getTicketsForDepartment(depId)
                ]);

                stats = statsFromApi;
                departmentData = deptData;

                if (Array.isArray(deptData)) {
                    // Hvis endpointet returnerer direkte en liste af metrics
                    tickets = deptData;
                } else if (deptData && Array.isArray(deptData.tickets)) {
                    // Hvis endpointet returnerer { departmentName, tickets: [...] }
                    tickets = deptData.tickets;
                } else {
                    console.warn("Ukendt format fra getTicketsForDepartment:", deptData);
                    tickets = [];
                }
            }

            const inferredName = SELECTED_DEPARTMENT_NAME
                ? decodeURIComponent(SELECTED_DEPARTMENT_NAME)
                : (departmentData &&
                    (departmentData.departmentName ||
                        (departmentData.department && departmentData.department.departmentName))) ||
                "";

            scopeLabel = inferredName
                ? `Department: ${inferredName}`
                : `Department #${depId}`;
        } else {
            // --- GLOBALT DASHBOARD: alle departments ---
            if (USE_MOCK) {
                console.log("Bruger MOCK_DATA – sæt USE_MOCK = false for at bruge backend.");
                stats = MOCK_STATS;
                tickets = MOCK_TICKETS;
            } else {
                const [statsFromApi, ticketsFromApi] = await Promise.all([
                    getRoutingStats(),
                    loadAllTicketsFromBackend()
                ]);
                stats = statsFromApi;
                tickets = ticketsFromApi;
            }

            scopeLabel = "Alle departments";
        }



        allTickets = tickets || [];

        const total = stats.totalTickets ?? 0;
        const success = stats.successCount ?? 0;
        const failure = stats.failureCount ?? 0;
        const defaulted = stats.defaultedCount ?? 0;

        const incorrect = failure + defaulted;

        const accuracyPercent =
            stats.accuracy != null
                ? stats.accuracy * 100
                : (total > 0 ? (success / total) * 100 : 0);

        const accuracyRounded = accuracyPercent.toFixed(1);

        let badgeClass = "bad";
        if (accuracyPercent >= 90) {
            badgeClass = "good";
        } else if (accuracyPercent >= 70) {
            badgeClass = "ok";
        }

        // Trend-indikator
        let trendHtml = "";
        const lastAccuracyRaw = window.localStorage.getItem("routingAccuracyLast");
        const lastAccuracy = lastAccuracyRaw != null ? parseFloat(lastAccuracyRaw) : null;

        if (lastAccuracy != null && !Number.isNaN(lastAccuracy)) {
            const delta = accuracyPercent - lastAccuracy;
            const absDelta = Math.abs(delta);

            if (absDelta >= 0.1) {
                const arrow = delta > 0 ? "▲" : "▼";
                const color = delta > 0 ? "#16a34a" : "#dc2626";
                const sign = delta > 0 ? "+" : "";
                const deltaText = `${sign}${delta.toFixed(1)} pct.point siden sidste visning`;

                trendHtml = `
                    <div class="accuracy-trend"
                         style="margin-top:4px;font-size:0.85rem;display:flex;align-items:center;gap:4px;color:${color};">
                        <span>${arrow}</span>
                        <span>${deltaText}</span>
                    </div>
                `;
            } else {
                trendHtml = `
                    <div class="accuracy-trend"
                         style="margin-top:4px;font-size:0.85rem;color:#6b7280;">
                        Ingen væsentlig ændring siden sidste visning
                    </div>
                `;
            }
        } else {
            trendHtml = `
                <div class="accuracy-trend"
                     style="margin-top:4px;font-size:0.85rem;color:#6b7280;">
                    Første måling – ingen trend endnu
                </div>
            `;
        }

        // Fejlstatistik til tekstlig liste
        const predictedErrorStats = buildPredictedTeamErrorStats(allTickets);
        const top3PredictedError = predictedErrorStats.slice(0, 3);

        let topPredictedHtml = "";
        if (top3PredictedError.length > 0) {
            topPredictedHtml = `
                <div style="margin-top:16px;">
                    <div class="stat-label" style="margin-bottom:6px;">Mest fejlende predicted teams</div>
                    <ol style="margin:0;padding-left:18px;font-size:0.85rem;color:#374151;">
                        ${top3PredictedError.map(c => `
                            <li style="margin-bottom:4px;">
                                <span style="font-weight:500;">${c.predictedTeam}</span>
                                <span style="color:#6b7280;">
                                    &nbsp;· ${c.errorRate.toFixed(1)}% fejl
                                    &nbsp;· ${c.incorrect}/${c.total} tickets
                                </span>
                            </li>
                        `).join("")}
                    </ol>
                </div>
            `;
        }

        // Byg UI
        output.innerHTML = `
            <section class="card fade-in">
                <div class="card-header">
                    <div>
                        <h2>Routing accuracy</h2>
                        <div class="card-header-sub">
                            ${scopeLabel}
                        </div>
                    </div>
                    <span class="badge ${badgeClass}">
                        ${accuracyRounded}% korrekt
                    </span>
                </div>

                <div class="content-layout">
                    <div>
                        <div class="accuracy-main">${accuracyRounded}%</div>
                        ${trendHtml}
                        <div class="accuracy-sub">af tickets er routet korrekt.</div>

                        <div class="stats-grid">
                            <div class="stat-card">
                                <div class="stat-label">Total tickets</div>
                                <div class="stat-value">${total}</div>
                            </div>

                            <div class="stat-card">
                                <div class="stat-label">Korrekte (SUCCESS)</div>
                                <div class="stat-value">${success}</div>
                            </div>

                            <div class="stat-card">
                                <div class="stat-label">Forkerte (FAILURE + DEFAULTED)</div>
                                <div class="stat-value">${incorrect}</div>
                                <div class="stat-extra">
                                    Failure: ${failure} · Defaulted: ${defaulted}
                                </div>
                            </div>

                            <div class="stat-card">
                                <div class="stat-label">Defaulted</div>
                                <div class="stat-value">${defaulted}</div>
                                <div class="stat-extra">
                                    Tickets der er havnet i fallback-routing
                                </div>
                            </div>
                        </div>

                        ${topPredictedHtml}

                        <div id="ticketList" style="margin-top:20px;font-size:0.85rem;">
                            <div style="font-size:0.85rem;color:#6b7280;">
                                Klik på den grønne, røde eller grå del af donut-grafen for at se de tilhørende tickets.
                            </div>
                        </div>
                    </div>

                    <div class="chart-wrapper">
                        <canvas id="accuracyChart"></canvas>
                        <div class="chart-caption">
                            Fordeling af korrekte, forkerte og defaulted tickets
                        </div>

                        <div style="margin-top:18px; padding-top:8px; border-top:1px solid #e5e7eb; height:260px;">
                            <canvas id="statusBarChart"></canvas>
                            <div class="chart-caption" id="statusBarChartCaption" style="margin-top:10px;">
                                Udvikling i routing accuracy (historisk + simpel forecast)
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        `;

        // Gem nuværende accuracy til næste load (trend)
        try {
            window.localStorage.setItem("routingAccuracyLast", String(accuracyPercent));
        } catch (e) {
            console.warn("Kunne ikke gemme routingAccuracyLast i localStorage:", e);
        }

        // Live "sidst opdateret"
        const updatedEl = document.getElementById("lastUpdated");
        if (updatedEl) {
            const ts = new Date();
            startLiveUpdatedLabel(updatedEl, ts);
        }

        // DONUT-graf
        const canvas = document.getElementById("accuracyChart");
        if (!canvas) {
            console.error("Kunne ikke finde canvas-elementet til donut-grafen.");
            return;
        }

        const ctx = canvas.getContext("2d");

        if (chartInstance) {
            chartInstance.destroy();
        }

        chartInstance = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: ["Korrekte", "Failure", "Defaulted"],
                datasets: [
                    {
                        data: [success, failure, defaulted],
                        backgroundColor: [
                            "#16a34a",
                            "#ef4444",
                            "#9ca3af"
                        ],
                        hoverBackgroundColor: [
                            "#15803d",
                            "#dc2626",
                            "#6b7280"
                        ],
                        borderWidth: 0
                    }
                ]
            },
            options: {
                cutout: "60%",
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: {
                            boxWidth: 14,
                            boxHeight: 14,
                            padding: 16
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const label = context.label || "";
                                const value = context.raw || 0;
                                const sum = success + failure + defaulted;
                                const pct =
                                    sum > 0 ? ((value / sum) * 100).toFixed(1) : "0.0";
                                return `${label}: ${value} (${pct}%)`;
                            }
                        }
                    }
                },
                onClick: (evt, elements, chartObj) => {
                    const points = chartObj.getElementsAtEventForMode(
                        evt,
                        "nearest",
                        { intersect: true },
                        true
                    );
                    if (!points.length) return;

                    const firstPoint = points[0];
                    const index = firstPoint.index;

                    if (index === 0) {
                        renderTicketList("SUCCESS", "Korrekt routede tickets (SUCCESS)");
                    } else if (index === 1) {
                        renderTicketList("FAILURE", "Forkerte tickets (FAILURE)");
                    } else if (index === 2) {
                        renderTicketList("DEFAULTED", "Fallback-routede tickets (DEFAULTED)");
                    }
                }
            }
        });

        // LINJE-graf: historisk accuracy + simpel forecast
        const lineCanvas = document.getElementById("statusBarChart");
        const captionEl = document.getElementById("statusBarChartCaption");

        if (!lineCanvas) {
            console.error("Kunne ikke finde canvas-elementet til linjegrafen.");
            return;
        }

        const lineCtx = lineCanvas.getContext("2d");

        const dailySeries = buildDailyAccuracySeries(allTickets);
        const predictionSeries = buildAccuracyPrediction(dailySeries, 7);

        if (predictionChartInstance) {
            predictionChartInstance.destroy();
        }

        if (!dailySeries.length) {
            if (captionEl) {
                captionEl.textContent = "Ingen historiske data endnu til at vise udvikling/prediktion.";
            }
            return;
        }

        const labels = [
            ...dailySeries.map(d => d.label),
            ...predictionSeries.map(d => d.label)
        ];

        const historicalData = [
            ...dailySeries.map(d => d.accuracy),
            ...predictionSeries.map(() => null)
        ];

        const predictedData = [
            ...dailySeries.map(() => null),
            ...predictionSeries.map(d => d.accuracy)
        ];

        predictionChartInstance = new Chart(lineCtx, {
            type: "line",
            data: {
                labels,
                datasets: [
                    {
                        label: "Historisk accuracy",
                        data: historicalData,
                        borderColor: "#16a34a",
                        backgroundColor: "rgba(22, 163, 74, 0.08)",
                        fill: true,
                        borderWidth: 2,
                        tension: 0.35,
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        pointHitRadius: 8
                    },
                    {
                        label: "Forventet accuracy (simpel trend)",
                        data: predictedData,
                        borderColor: "#0ea5e9",
                        borderWidth: 2,
                        tension: 0.35,
                        borderDash: [6, 4],
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        pointHitRadius: 8
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: { top: 4, right: 12, bottom: 4, left: 0 }
                },
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: {
                            usePointStyle: true,
                            pointStyle: "line",
                            boxWidth: 12,
                            padding: 16,
                            font: {
                                size: 11
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const value = context.parsed.y;
                                if (value == null) return "";
                                return `${context.dataset.label}: ${value.toFixed(1)}%`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            autoSkip: true,
                            maxTicksLimit: 7,
                            maxRotation: 0,
                            minRotation: 0,
                            font: { size: 10 }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: {
                            color: "rgba(148, 163, 184, 0.18)",
                            drawBorder: false
                        },
                        ticks: {
                            stepSize: 20,
                            callback: function (value) {
                                return value + "%";
                            },
                            font: { size: 10 }
                        }
                    }
                }
            }
        });

        if (captionEl) {
            captionEl.textContent =
                "Udvikling i routing accuracy (grøn = historisk, blå stiplet = simpel forecast)";
        }

    } catch (error) {
        console.error("Fejl ved hentning af stats:", error);

        const outputFallback = document.getElementById("output");
        if (!outputFallback) return;

        outputFallback.innerHTML = `
            <section class="card fade-in">
                <p style="color:#dc2626; font-size:0.9rem; margin:0;">
                    Der opstod en fejl ved kald til backend.<br>
                    <small>${error && error.message ? error.message : error}</small>
                </p>
            </section>
        `;
    }
}

window.addEventListener("DOMContentLoaded", () => {
    // Tilbage-knap i department-view (hvis knappen findes i HTML)
    const backBtn = document.getElementById("backToDepartments");
    const isDepartmentView =
        SELECTED_DEPARTMENT_ID != null && !Number.isNaN(SELECTED_DEPARTMENT_ID);

    if (backBtn) {
        if (isDepartmentView) {
            backBtn.style.display = "inline-flex";
            backBtn.addEventListener("click", () => {
                window.location.href = "./departments.html";
            });
        } else {
            backBtn.style.display = "none";
        }
    }

    loadStats();
});
