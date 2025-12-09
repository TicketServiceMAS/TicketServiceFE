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

/* ================= HOVED-FUNKTION: loadStats ================= */

async function loadStats(options = {}) {
    const { skipOverlay = false } = options;

    const output = document.getElementById("output");

    if (!output) {
        console.error("Kunne ikke finde elementet med id='output'.");
        return;
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

        if (isDepartmentView) {
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
            output.innerHTML = `
                <section class="card fade-in">
                    <div class="card-header">
                        <div>
                            <h2>Tickets</h2>
                            <div class="card-header-sub">
                                ${scopeLabel} – alle tickets for dette department vises nedenfor.
                            </div>
                        </div>
                    </div>
                </section>
            `;
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
    } finally {
        toggleLoadingOverlay(false);
    }
}

/* ===== INIT ===== */

window.addEventListener("DOMContentLoaded", () => {
    initTheme();
    setupSettingsMenu({ onRefresh: handleManualRefresh });

    const backBtn = document.getElementById("backToDepartments");
    const ticketSection = document.getElementById("departmentTicketListSection");

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

    loadStats();
});
