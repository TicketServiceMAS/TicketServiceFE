import { getDepartments } from "./api.js";

async function loadDepartments() {
    const output = document.getElementById("department-output");

    if (!output) {
        console.error("Kunne ikke finde #department-output");
        return;
    }

    output.innerHTML = "Henter departments...";

    try {
        const departments = await getDepartments();
        console.log("Departments modtaget:", departments);

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
                                ${dep.departmentName || "(ingen navn)"}
                            </div>
                            <div class="department-status">
                                ID: ${dep.categoryID ?? "-"}
                            </div>
                        </div>
                        <div class="department-meta">
                            Mail: ${dep.mailAddress ?? "-"}
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
                <small>${error && error.message ? error.message : error}</small>
            </p>
        `;
    }
}

window.addEventListener("DOMContentLoaded", loadDepartments);
