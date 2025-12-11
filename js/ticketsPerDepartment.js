import { getTicketsForDepartment, getAllTicketsForDepartment } from "./api.js";

const params = new URLSearchParams(window.location.search);
const departmentName = params.get("departmentName");
const departmentId = params.get("departmentId");

let donutChartInstance = null;
let departmentTickets = [];

async function loadTickets() {
    const title = document.getElementById("deptName");
    const output = document.getElementById("ticket-output");

    output.textContent = "Henter data...";

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

        // --- UPDATED: Added <div id="ticket-list"></div> ---
        output.innerHTML = `
            <div class="ticket-stats">
                <p><strong>Total tickets:</strong> ${totalTickets}</p>
                <p><strong>Success:</strong> ${success}</p>
                <p><strong>Failure:</strong> ${failure}</p>
                <p><strong>Defaulted:</strong> ${defaulted}</p>
                <p><strong>Accuracy:</strong> ${accuracy.toFixed(1)}%</p>
            </div>

            <canvas id="donutChart" style="max-width:400px; margin-top:20px;"></canvas>

            <h2 style="margin-top:30px;">Ticket List</h2>
            <div id="ticket-list">Henter tickets...</div>
        `;

        const ctx = document.getElementById("donutChart").getContext("2d");

        if (donutChartInstance) {
            donutChartInstance.destroy();
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
                    legend: { position: "bottom" },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const value = context.raw || 0;
                                const pct = totalTickets > 0 ? ((value / totalTickets) * 100).toFixed(1) : "0.0";
                                return `${context.label}: ${value} (${pct}%)`;
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

        // --- NEW: Load all tickets after stats ---
        loadAllTickets();

    } catch (err) {
        output.innerHTML = `<p style="color:red;">Fejl: ${err.message}</p>`;
    }
}

/* ---------------------------------------------------------
   NEW FUNCTION: Fetch and render all tickets for the department
--------------------------------------------------------- */
async function loadAllTickets() {
    const listContainer = document.getElementById("ticket-list");

    try {
        const tickets = await getAllTicketsForDepartment(departmentId);
        departmentTickets = Array.isArray(tickets) ? tickets : [];

        if (!departmentTickets.length) {
            listContainer.innerHTML = "<p>Ingen tickets fundet.</p>";
            return;
        }

        listContainer.innerHTML = `
            <div style="font-size:0.9rem;color:#6b7280;">
                Klik på en farve på donut-grafen for at se de tilhørende tickets fra backend.
            </div>
        `;

        renderTicketList("SUCCESS", "Korrekt routede tickets (SUCCESS)");

    } catch (err) {
        listContainer.innerHTML = `<p style="color:red;">Fejl ved hentning af tickets: ${err.message}</p>`;
    }
}

function renderTicketList(status, label) {
    const listContainer = document.getElementById("ticket-list");
    if (!listContainer) return;

    if (!departmentTickets.length) {
        listContainer.innerHTML = "<p>Ingen tickets fundet.</p>";
        return;
    }

    const normalizedStatus = String(status || "").toUpperCase();

    const filtered = departmentTickets.filter(ticket => {
        const ticketStatus = (ticket.status ?? ticket.routingStatus ?? "").toUpperCase();
        return ticketStatus === normalizedStatus;
    });

    if (!filtered.length) {
        listContainer.innerHTML = `
            <div style="font-size:0.9rem;color:#6b7280;">
                Ingen tickets fundet for <strong>${label}</strong>.
            </div>
        `;
        return;
    }

    const rows = filtered.slice(0, 50).map(ticket => {
        const id = ticket.id ?? ticket.ticketId ?? ticket.metricsDepartmentID ?? "Ukendt ID";
        const description = ticket.description ?? ticket.subject ?? "(Ingen beskrivelse)";
        const created = ticket.createdAt ?? ticket.created_at ?? ticket.date ?? "";
        const statusValue = ticket.status ?? ticket.routingStatus ?? "";

        return `
            <tr>
                <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${id}</td>
                <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${description}</td>
                <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${created}</td>
                <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${statusValue}</td>
            </tr>
        `;
    }).join("");

    listContainer.innerHTML = `
        <div style="margin-bottom:8px;">
            <div style="font-weight:600;">${label}</div>
            <div style="font-size:0.85rem;color:#6b7280;">Viser ${filtered.length > 50 ? "de første 50 af " : ""}${filtered.length} tickets fra backend.</div>
        </div>
        <div style="border:1px solid #e5e7eb;border-radius:6px;overflow:auto;max-height:320px;">
            <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
                <thead style="background:#f9fafb;position:sticky;top:0;">
                    <tr>
                        <th style="text-align:left;padding:8px;border-bottom:1px solid #e5e7eb;">Ticket ID</th>
                        <th style="text-align:left;padding:8px;border-bottom:1px solid #e5e7eb;">Beskrivelse</th>
                        <th style="text-align:left;padding:8px;border-bottom:1px solid #e5e7eb;">Oprettet</th>
                        <th style="text-align:left;padding:8px;border-bottom:1px solid #e5e7eb;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>
    `;
}

window.addEventListener("DOMContentLoaded", loadTickets);
