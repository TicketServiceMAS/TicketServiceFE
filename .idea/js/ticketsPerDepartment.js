import { getTicketsForDepartment } from "./api.js";

const params = new URLSearchParams(window.location.search);
const departmentName = params.get("departmentName");
const departmentId = params.get("departmentId");

let donutChartInstance = null; // Gem chart-instance, så vi kan destroye den ved reload

async function loadTickets() {
    const title = document.getElementById("deptName");
    const output = document.getElementById("ticket-output");

    output.textContent = "Henter data...";

    // Sæt titel fra URL
    title.textContent = decodeURIComponent(departmentName);

    try {
        const stats = await getTicketsForDepartment(departmentId);

        if (!stats || typeof stats !== "object") {
            output.innerHTML = "<p>Ingen statistik fundet.</p>";
            return;
        }

        const totalTickets = stats.totalTickets ?? 0;
        const success = stats.successCount ?? 0;
        const failure = stats.failureCount ?? 0;
        const defaulted = stats.defaultedCount ?? 0;
        const accuracy = totalTickets > 0 ? (success / totalTickets) * 100 : 0;

        // Render ticket stats
        output.innerHTML = `
            <div class="ticket-stats">
                <p><strong>Total tickets:</strong> ${totalTickets}</p>
                <p><strong>Success:</strong> ${success}</p>
                <p><strong>Failure:</strong> ${failure}</p>
                <p><strong>Defaulted:</strong> ${defaulted}</p>
                <p><strong>Accuracy:</strong> ${accuracy.toFixed(1)}%</p>
            </div>
            <canvas id="donutChart" style="max-width:400px; margin-top:20px;"></canvas>
        `;

        const ctx = document.getElementById("donutChart").getContext("2d");

        if (donutChartInstance) {
            donutChartInstance.destroy(); // Undgå multiple chart-instans
        }

        donutChartInstance = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: ["Success", "Failure", "Defaulted"],
                datasets: [{
                    data: [success, failure, defaulted],
                    backgroundColor: ["#4ade80", "#f87171", "#facc15"],
                    hoverBackgroundColor: ["#16a34a", "#b91c1c", "#f59e0b"],
                    borderWidth: 0
                }]
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
                                const value = context.raw || 0;
                                const pct = totalTickets > 0 ? ((value / totalTickets) * 100).toFixed(1) : "0.0";
                                return `${context.label}: ${value} (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });

    } catch (err) {
        output.innerHTML = `<p style="color:red;">Fejl: ${err.message}</p>`;
    }
}

window.addEventListener("DOMContentLoaded", loadTickets);
