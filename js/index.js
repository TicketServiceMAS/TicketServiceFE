// index.js
import {
    getRoutingStats,
    getRoutingStatsForDepartment,
    getTicketsForDepartment,
} from "./api.js";
import { loadTicketList } from "./tickets.js";

import {
    USE_MOCK,
    MOCK_STATS,
    MOCK_TICKETS,
    SELECTED_DEPARTMENT_ID,
    SELECTED_DEPARTMENT_NAME,
} from "./config.js";

import {
    initTheme,
    setupSettingsMenu,
} from "./theme.js";

import {
    startLiveUpdatedLabel,
    loadAllTicketsFromBackend,
} from "./timeUtils.js";

import {
    allTickets,
    setAllTickets,
    computeStatsFromTickets,
    buildDailyAccuracySeries,
    buildAccuracyPrediction,
    renderTicketList,
} from "./statsUtils.js";

let chartInstance = null;
let predictionChartInstance = null;
let autoRefreshTimer = null;
let nextRefreshLabelTimer = null;
let nextRefreshTimestamp = null;
let isAutoRefreshing = false;
let autoRefreshEnabled = true;
let autoRefreshIntervalMs = 60_000;
let lastTicketTotal = null;
let latestStatsSnapshot = null;

const AUTO_REFRESH_ENABLED_KEY = "autoRefreshEnabled";
const AUTO_REFRESH_INTERVAL_KEY = "autoRefreshIntervalMs";

function setLiveStatus(message, isBusy = false) {
    const liveRegion = document.getElementById("liveStatus");
    if (!liveRegion) return;

    liveRegion.textContent = message;
    liveRegion.setAttribute("aria-busy", isBusy ? "true" : "false");
}

function toggleLoadingOverlay(isVisible) {
    const overlay = document.getElementById("loadingOverlay");
    if (!overlay) return;

    if (isVisible) {
        overlay.classList.add("active");
        overlay.setAttribute("aria-busy", "true");
        setLiveStatus("Opdaterer data...", true);
    } else {
        overlay.classList.remove("active");
        overlay.setAttribute("aria-busy", "false");
        const liveRegion = document.getElementById("liveStatus");
        const currentMessage = liveRegion?.textContent || "Data er opdateret";
        setLiveStatus(currentMessage, false);
    }
}

function loadAutoRefreshPreferences() {
    try {
        const savedEnabled = window.localStorage.getItem(AUTO_REFRESH_ENABLED_KEY);
        const savedInterval = parseInt(window.localStorage.getItem(AUTO_REFRESH_INTERVAL_KEY), 10);

        autoRefreshEnabled = savedEnabled === null ? true : savedEnabled === "true";
        if (!Number.isNaN(savedInterval) && savedInterval > 0) {
            autoRefreshIntervalMs = savedInterval;
        }
    } catch (err) {
        console.warn("Kunne ikke læse auto-refresh indstillinger", err);
    }
}

function persistAutoRefreshPreferences() {
    try {
        window.localStorage.setItem(AUTO_REFRESH_ENABLED_KEY, String(autoRefreshEnabled));
        window.localStorage.setItem(AUTO_REFRESH_INTERVAL_KEY, String(autoRefreshIntervalMs));
    } catch (err) {
        console.warn("Kunne ikke gemme auto-refresh indstillinger", err);
    }
}

function syncAutoRefreshUI() {
    const toggle = document.getElementById("autoRefreshToggleInput");
    if (toggle) {
        toggle.checked = autoRefreshEnabled;
    }

    const select = document.getElementById("autoRefreshIntervalSelect");
    if (select) {
        select.value = String(autoRefreshIntervalMs);
    }

    const statusLabel = document.getElementById("autoRefreshStatusLabel");
    if (statusLabel) {
        const seconds = Math.round(autoRefreshIntervalMs / 1000);
        statusLabel.textContent = autoRefreshEnabled
            ? `Aktiveret (${seconds}s)`
            : "Slået fra";
    }
}

function updateNextRefreshLabel() {
    const heroLabel = document.getElementById("nextRefreshLabel");
    const dropdownLabel = document.getElementById("autoRefreshNextLabel");

    if (!autoRefreshEnabled) {
        if (heroLabel) heroLabel.textContent = "Auto-refresh er slået fra";
        if (dropdownLabel) dropdownLabel.textContent = "Auto-refresh er slået fra";
        return;
    }

    if (!nextRefreshTimestamp) {
        if (heroLabel) heroLabel.textContent = "Planlægges...";
        if (dropdownLabel) dropdownLabel.textContent = "Planlægges...";
        return;
    }

    const diffMs = Math.max(0, nextRefreshTimestamp - Date.now());
    const diffSec = Math.ceil(diffMs / 1000);
    const timeText = new Date(nextRefreshTimestamp).toLocaleTimeString("da-DK", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });

    const text = `Om ${diffSec}s (kl. ${timeText})`;
    if (heroLabel) heroLabel.textContent = text;
    if (dropdownLabel) dropdownLabel.textContent = text;
}

function renderStatusStrip({ accuracyPercent, totalTickets, incorrect, defaulted }) {
    const accuracyEl = document.getElementById("statusAccuracy");
    const queueEl = document.getElementById("statusQueue");
    const failuresEl = document.getElementById("statusFailures");
    const defaultedEl = document.getElementById("statusDefaulted");

    const fmt = (val) => new Intl.NumberFormat("da-DK").format(val ?? 0);

    if (accuracyEl) {
        accuracyEl.textContent = `${(accuracyPercent ?? 0).toFixed(1)}%`;
    }
    if (queueEl) {
        queueEl.textContent = fmt(totalTickets ?? 0);
    }
    if (failuresEl) {
        failuresEl.textContent = fmt(incorrect ?? 0);
    }
    if (defaultedEl) {
        defaultedEl.textContent = fmt(defaulted ?? 0);
    }
}

function renderSkeletonState() {
    const output = document.getElementById("output");
    if (!output) return;

    output.innerHTML = `
        <div class="card skeleton-card">
            <div class="skeleton-header">
                <div class="skeleton-line w-30"></div>
                <div class="skeleton-pill"></div>
            </div>
            <div class="content-layout">
                <div class="skeleton-column">
                    <div class="skeleton-line w-40"></div>
                    <div class="skeleton-line w-60"></div>
                    <div class="skeleton-grid">
                        <div class="skeleton-tile"></div>
                        <div class="skeleton-tile"></div>
                        <div class="skeleton-tile"></div>
                        <div class="skeleton-tile"></div>
                    </div>
                    <div class="skeleton-table">
                        <div class="skeleton-line w-90"></div>
                        <div class="skeleton-line w-80"></div>
                        <div class="skeleton-line w-85"></div>
                    </div>
                </div>
                <div class="skeleton-column">
                    <div class="skeleton-chart"></div>
                    <div class="skeleton-line w-70"></div>
                    <div class="skeleton-chart"></div>
                </div>
            </div>
        </div>
        <div id="ticket-output"></div>
    `;
}

function updateNewTicketsBadge(newTicketsCount) {
    const badge = document.getElementById("newTicketsBadge");
    if (!badge) return;

    const count = Math.max(0, newTicketsCount ?? 0);
    badge.textContent = count > 0 ? `Nye tickets: +${count}` : "Nye tickets: 0";
    badge.classList.toggle("has-new", count > 0);
}

function downloadReport() {
    if (!latestStatsSnapshot) {
        console.warn("Ingen data til rapport endnu.");
        return;
    }

    const payload = {
        generatedAt: new Date().toISOString(),
        scope: latestStatsSnapshot.scopeLabel,
        summary: latestStatsSnapshot,
        tickets: allTickets
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `routing-report-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/* ================= HOVED-FUNKTION: loadStats ================= */

async function loadStats(options = {}) {
    const { skipOverlay = false } = options;

    const output = document.getElementById("output");

    if (!output) {
        console.error("Kunne ikke finde elementet med id='output'.");
        return;
    }

    if (!skipOverlay) {
        renderSkeletonState();
    }

    if (!skipOverlay) {
        toggleLoadingOverlay(true);
    }

    setLiveStatus("Indlæser statistik...", true);

    try {
        console.log("Henter stats + tickets...");

        let stats;
        let tickets;
        let scopeLabel;

        const isDepartmentView =
            SELECTED_DEPARTMENT_ID != null && !Number.isNaN(SELECTED_DEPARTMENT_ID);

        let departmentData = null;

        if (isDepartmentView) {
            const depId = SELECTED_DEPARTMENT_ID;
            console.log("Loader department view for id", depId);

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
                const [statsFromApi, deptData] = await Promise.all([
                    getRoutingStatsForDepartment(depId),
                    getTicketsForDepartment(depId)
                ]);

                stats = statsFromApi;
                departmentData = deptData;

                if (Array.isArray(deptData)) {
                    tickets = deptData;
                } else if (deptData && Array.isArray(deptData.tickets)) {
                    tickets = deptData.tickets;
                } else {
                    console.warn("Ukendt format fra getTicketsForDepartment:", deptData);
                    tickets = [];
                }

                await loadTicketList(depId);
            }

            const inferredName =
                SELECTED_DEPARTMENT_NAME
                    ? decodeURIComponent(SELECTED_DEPARTMENT_NAME)
                    : (departmentData &&
                        (departmentData.departmentName ||
                            (departmentData.department &&
                                departmentData.department.departmentName))) ||
                    "";

            // 🔥 OPDATER FRONTEND-TITLE HER — nu virker det!
            const titleEl = document.getElementById("main-title");
            const subtitleEl = document.getElementById("main-subtitle");
            const overlineEl = document.getElementById("main-overline");

            if (titleEl) titleEl.textContent = inferredName;
            if (subtitleEl)
                subtitleEl.textContent = "Alle tickets for dette department.";
            if (overlineEl) overlineEl.textContent = "Department overview";

            scopeLabel = inferredName
                ? `Department: ${inferredName}`
                : `Department #${depId}`;
        } else {
            // normal forside
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


        // <--- her brugte du før allTickets = tickets || [];
        setAllTickets(tickets || []);

        const total = stats.totalTickets ?? 0;
        const success = stats.successCount ?? 0;
        const failure = stats.failureCount ?? 0;
        const defaulted = stats.defaultedCount ?? 0;

        const incorrect = failure + defaulted;

        const newTicketsDelta = lastTicketTotal != null
            ? Math.max(0, total - lastTicketTotal)
            : total;
        updateNewTicketsBadge(newTicketsDelta);
        lastTicketTotal = total;

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

        renderStatusStrip({
            accuracyPercent,
            totalTickets: total,
            incorrect,
            defaulted
        });

        latestStatsSnapshot = {
            scopeLabel,
            total,
            success,
            failure,
            defaulted,
            incorrect,
            accuracyPercent: Number(accuracyPercent.toFixed(2))
        };

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

        const isDepartmentViewNow =
            SELECTED_DEPARTMENT_ID != null && !Number.isNaN(SELECTED_DEPARTMENT_ID);

        if (isDepartmentViewNow) {
            output.innerHTML =
                "";
        } else {
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
        }

        setLiveStatus(`Statistik opdateret for ${scopeLabel}`, false);

        try {
            window.localStorage.setItem("routingAccuracyLast", String(accuracyPercent));
        } catch (e) {
            console.warn("Kunne ikke gemme routingAccuracyLast i localStorage:", e);
        }

        const updatedEl = document.getElementById("lastUpdated");
        if (updatedEl) {
            const ts = new Date();
            startLiveUpdatedLabel(updatedEl, ts);
        }

        if (isDepartmentViewNow) {
            return;
        }

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

        setLiveStatus("Fejl ved indlæsning af statistik", false);

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
    } finally {
        if (!skipOverlay) {
            toggleLoadingOverlay(false);
        }
    }
}

async function handleManualRefresh() {
    toggleLoadingOverlay(true);

    try {
        await loadStats({ skipOverlay: true });

        const isDepartmentView =
            SELECTED_DEPARTMENT_ID != null && !Number.isNaN(SELECTED_DEPARTMENT_ID);

        if (isDepartmentView) {
            await loadTicketList(SELECTED_DEPARTMENT_ID);
        }

        scheduleAutoRefresh();
    } finally {
        toggleLoadingOverlay(false);
    }
}

async function performAutoRefresh() {
    if (isAutoRefreshing || !autoRefreshEnabled) return;

    const isDepartmentView =
        SELECTED_DEPARTMENT_ID != null && !Number.isNaN(SELECTED_DEPARTMENT_ID);

    isAutoRefreshing = true;

    try {
        await loadStats({ skipOverlay: true });

        if (isDepartmentView) {
            await loadTicketList(SELECTED_DEPARTMENT_ID);
        }
    } catch (error) {
        console.error("Automatisk opdatering fejlede", error);
    } finally {
        isAutoRefreshing = false;
    }
}

function scheduleAutoRefresh() {
    if (autoRefreshTimer) {
        clearTimeout(autoRefreshTimer);
    }
    if (nextRefreshLabelTimer) {
        clearInterval(nextRefreshLabelTimer);
    }

    if (!autoRefreshEnabled) {
        nextRefreshTimestamp = null;
        updateNextRefreshLabel();
        return;
    }

    const interval = autoRefreshIntervalMs || 60_000;
    nextRefreshTimestamp = Date.now() + interval;
    updateNextRefreshLabel();

    nextRefreshLabelTimer = setInterval(updateNextRefreshLabel, 1000);

    autoRefreshTimer = setTimeout(async () => {
        await performAutoRefresh();
        scheduleAutoRefresh();
    }, interval);
}

function setupAutoRefreshControls() {
    loadAutoRefreshPreferences();
    syncAutoRefreshUI();
    updateNextRefreshLabel();

    const toggle = document.getElementById("autoRefreshToggleInput");
    if (toggle) {
        toggle.addEventListener("change", () => {
            autoRefreshEnabled = toggle.checked;
            persistAutoRefreshPreferences();
            syncAutoRefreshUI();
            scheduleAutoRefresh();
        });
    }

    const select = document.getElementById("autoRefreshIntervalSelect");
    if (select) {
        select.addEventListener("change", () => {
            const parsed = parseInt(select.value, 10);
            if (!Number.isNaN(parsed) && parsed > 0) {
                autoRefreshIntervalMs = parsed;
                persistAutoRefreshPreferences();
                syncAutoRefreshUI();
                scheduleAutoRefresh();
            }
        });
    }
}

/* ===== INIT ===== */

window.addEventListener("DOMContentLoaded", () => {
    initTheme();
    setupAutoRefreshControls();
    setupSettingsMenu({ onRefresh: handleManualRefresh });

    const backBtn = document.getElementById("backToDepartments");
    const ticketSection = document.getElementById("departmentTicketListSection");
    const refreshNowButton = document.getElementById("refreshNowButton");
    const downloadReportButton = document.getElementById("downloadReportButton");

    const isDepartmentView =
        SELECTED_DEPARTMENT_ID != null && !Number.isNaN(SELECTED_DEPARTMENT_ID);

    if (backBtn) {
        if (isDepartmentView) {
            backBtn.style.display = "inline-flex";
            backBtn.addEventListener("click", () => {
                try {
                    sessionStorage.removeItem("selectedDepartmentId");
                    sessionStorage.removeItem("selectedDepartmentName");
                    localStorage.removeItem("selectedDepartmentId");
                    localStorage.removeItem("selectedDepartmentName");
                } catch (err) {
                    console.warn("Kunne ikke rydde department-relateret storage", err);
                }

                window.location.href = "./departments.html";
            });
        } else {
            backBtn.style.display = "none";
        }
    }

    if (ticketSection) {
        ticketSection.style.display = isDepartmentView ? "block" : "none";
    }

    if (refreshNowButton) {
        refreshNowButton.addEventListener("click", handleManualRefresh);
    }

    if (downloadReportButton) {
        downloadReportButton.addEventListener("click", downloadReport);
    }

    scheduleAutoRefresh();
    loadStats();
});
