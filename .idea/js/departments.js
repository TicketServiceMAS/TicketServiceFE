import { getDepartments } from "./api.js";

async function loadDepartments() {
    const output = document.getElementById("department-output");
    output.textContent = "Henter departments...";

    try {
        const departments = await getDepartments();

        output.innerHTML = departments.map(dep => `
            <div class="department-item"
                 onclick="window.location.href='department.html?id=${dep.id}'">

                <div class="department-main">
                    <div class="department-title">${dep.departmentName}</div>

                    <div class="department-subtitle">
                        ${dep.mailAddress ? `Mail: ${dep.mailAddress}` : "Ingen mail"}  
                    </div>
                </div>

                <div class="department-meta">
                    <span class="department-chip">
                        ID: ${dep.categoryID}
                    </span>
                </div>
            </div>
        `).join("");

    } catch (err) {
        output.innerHTML = `
            <p style="color:#b91c1c; font-weight:500;">
                Fejl ved indlæsning: ${err.message}
            </p>`;
    }
}

window.addEventListener("DOMContentLoaded", loadDepartments);
