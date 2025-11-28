import { getDepartments } from "./api.js";

async function loadDepartments() {
    const output = document.getElementById("department-output");

    try {
        output.innerHTML = "Henter departments...";

        const departments = await getDepartments();

        if (!departments || departments.length === 0) {
            output.innerHTML = "<p>Ingen departments fundet.</p>";
            return;
        }

        const html = `
            <div class="department-list">
                ${departments.map(dep => `
                    <div class="department-item">
                        <div class="department-header">
                            <div class="department-title">
                                ${dep.subject || "(ingen subject)"}
                            </div>
                            <div class="department-status">
                                ${dep.status || "-"}
                            </div>
                        </div>
                        <div class="department-meta">
                            Ticket ID: ${dep.ticketId || "-"} ·
                            Priority: ${dep.priority || "-"}
                        </div>
                    </div>
                `).join("")}
            </div>
        `;

        output.innerHTML = html;
    } catch (error) {
        console.error("Fejl ved hentning af departments:", error);
        output.innerHTML = `
            <p style="color:#dc2626; font-size:0.9rem;">
                Der opstod en fejl ved hentning af departments.<br>
                <small>${error}</small>
            </p>
        `;
    }
}

loadDepartments();
