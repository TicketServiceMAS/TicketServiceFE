// .idea/js/departments.js
import { getDepartments } from "./api.js";

let allDepartments = []; // gemmer alle departments så vi kan søge i dem

/** ------------------------------
 *  Render departments i output
 * ------------------------------ */
function renderDepartments(list) {
    const output = document.getElementById("department-output");

    if (!list || list.length === 0) {
        output.innerHTML = `
            <p style="color:#6b7280; font-size:0.9rem;">
                Ingen departments matcher din søgning.
            </p>`;
        return;
    }

    output.innerHTML = list
        .map(dep => {
            const id = dep.departmentID;
            const name = dep.departmentName ?? "Ukendt department";
            const mail = dep.mailAddress || "Ingen mail";

            const encodedName = encodeURIComponent(name);

            return `
                <div class="department-item"
                     onclick="window.location.href='index.html?departmentId=${id}&departmentName=${encodedName}'">

                    <div class="department-main">
                        <div class="department-title">${name}</div>
                        <div class="department-subtitle">Mail: ${mail}</div>
                    </div>

                    <div class="department-meta">
                        <span class="department-chip">ID: ${id}</span>
                    </div>
                </div>
            `;
        })
        .join("");
}

/** ------------------------------
 *  Hent departments fra API
 * ------------------------------ */
async function loadDepartments() {
    const output = document.getElementById("department-output");
    output.textContent = "Henter departments...";

    try {
        const departments = await getDepartments();
        allDepartments = departments;     // gem alle
        renderDepartments(allDepartments); // vis alle
    } catch (err) {
        output.innerHTML = `
            <p style="color:#b91c1c; font-weight:500;">
                Fejl ved indlæsning: ${err.message}
            </p>`;
    }
}

/** ------------------------------
 *  Søgning i real-tid
 * ------------------------------ */
function setupSearch() {
    const searchInput = document.getElementById("departmentSearch");
    if (!searchInput) return;

    searchInput.addEventListener("input", () => {
        const q = searchInput.value.trim().toLowerCase();

        if (q === "") {
            renderDepartments(allDepartments);
            return;
        }

        const filtered = allDepartments.filter(dep => {
            const name = (dep.departmentName || "").toLowerCase();
            const mail = (dep.mailAddress || "").toLowerCase();
            const idStr = String(dep.departmentID ?? "");

            return (
                name.includes(q) ||
                mail.includes(q) ||
                idStr.includes(q)
            );
        });

        renderDepartments(filtered);
    });
}

/** ------------------------------
 *  Init
 * ------------------------------ */
window.addEventListener("DOMContentLoaded", () => {
    loadDepartments();
    setupSearch();
});
