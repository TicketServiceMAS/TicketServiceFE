import { getRoutingStats } from "./api.js";

let chartInstance = null; // så vi kan nulstille grafen ved reload

async function loadStats() {
    const output = document.getElementById("output");

    try {
        output.innerHTML = `Indlæser statistik...`;

        const stats = await getRoutingStats();

        const total = stats.totalTickets ?? 0;
        const success = stats.successCount ?? 0;
        const failure = stats.failureCount ?? 0;
        const defaulted = stats.defaultedCount ?? 0;
        const incorrect = failure + defaulted;

        // Undefined = alt der ikke har en kendt status
        const undefinedCount = Math.max(total - (success + failure + defaulted), 0);

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

        // Byg UI
        output.innerHTML = `
            <section class="card">
                <div class="card-header">
                    <h2>Routing accuracy</h2>
                    <span class="badge ${badgeClass}">
                        ${accuracyRounded}% korrekt
                    </span>
                </div>

                <div class="content-layout">
                    <div>
                        <div class="accuracy-main">${accuracyRounded}%</div>
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
                                <div class="stat-label">Undefined</div>
                                <div class="stat-value">${undefinedCount}</div>
                                <div class="stat-extra">
                                    Tickets uden registreret status
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="chart-wrapper">
                        <canvas id="accuracyChart"></canvas>
                        <div class="chart-caption">Fordeling af korrekte, forkerte og undefined tickets</div>
                    </div>
                </div>
            </section>
        `;

        // Lav donut-grafen
        const canvas = document.getElementById("accuracyChart");
        if (!canvas) {
            console.error("Kunne ikke finde canvas-elementet til grafen.");
            return;
        }

        const ctx = canvas.getContext("2d");

        if (chartInstance) {
            chartInstance.destroy();
        }

        chartInstance = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: ["Korrekte", "Forkerte", "Undefined"],
                datasets: [
                    {
                        data: [success, incorrect, undefinedCount],
                        backgroundColor: [
                            "#16a34a", // grøn – korrekt
                            "#ef4444", // rød – forkert
                            "#9ca3af"  // grå – undefined
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
                                const pct =
                                    total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
                                return `${label}: ${value} (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error("Fejl ved hentning af stats:", error);
        output.innerHTML = `
            <section class="card">
                <p style="color:#dc2626; font-size:0.9rem;">
                    Der opstod en fejl ved kald til backend.<br>
                    <small>${error}</small>
                </p>
            </section>
        `;
    }
}

loadStats();
