import { getDailyMisroutingStats } from "./api.js";
import { initTheme, setupSettingsMenu } from "./theme.js";

let chartInstance = null;

function formatDateLabel(isoDate) {
    if (!isoDate) return "";
    try {
        const [y, m, d] = isoDate.split("-");
        return `${d}-${m}-${y}`;
    } catch {
        return isoDate;
    }
}

function renderChart(data) {
    const ctx = document.getElementById("misroutingHistoryChart");
    if (!ctx) return;

    const labels = data.map((row) => formatDateLabel(row.date));
    const misrouted = data.map((row) => row.misroutedCount);

    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }

    chartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [
                {
                    label: "Forkert routede tickets pr. dag",
                    data: misrouted,
                    tension: 0.25,
                    pointRadius: 3,
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: "Antal forkert routede"
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: "Dato"
                    }
                }
            },
            plugins: {
                legend: {
                    display: true
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const row = data[ctx.dataIndex];
                            return `Forkert: ${row.misroutedCount} af ${row.totalTickets} (${row.misroutedPercentage.toFixed(
                                1
                            )}%)`;
                        }
                    }
                }
            }
        }
    });
}

function renderTable(data) {
    const tbody = document.getElementById("misroutingHistoryTableBody");
    if (!tbody) return;

    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align:center;color:#6b7280;padding:12px;">
                    Ingen data at vise for det valgte interval.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = data
        .map((row) => {
            return `
                <tr>
                    <td>${formatDateLabel(row.date)}</td>
                    <td>${row.totalTickets}</td>
                    <td>${row.misroutedCount}</td>
                    <td>${row.misroutedPercentage.toFixed(1)}%</td>
                </tr>
            `;
        })
        .join("");
}

async function loadHistory() {
    const fromInput = document.getElementById("fromDate");
    const toInput = document.getElementById("toDate");

    const params = {};
    if (fromInput && fromInput.value) {
        params.from = fromInput.value;
    }
    if (toInput && toInput.value) {
        params.to = toInput.value;
    }

    try {
        const data = await getDailyMisroutingStats(params);
        renderChart(data);
        renderTable(data);
    } catch (err) {
        console.error("Fejl ved hentning af historiske misrouting-stats:", err);
        renderTable([]);
    }
}

window.addEventListener("DOMContentLoaded", () => {
    initTheme?.();
    setupSettingsMenu?.();

    const filterBtn = document.getElementById("applyFilterBtn");
    if (filterBtn) {
        filterBtn.addEventListener("click", () => {
            loadHistory();
        });
    }

    loadHistory();
});
