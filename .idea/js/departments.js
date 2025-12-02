import { getDepartments } from "./api.js";

async function loadDepartments() {
    const output = document.getElementById("department-output");
    output.textContent = "Henter departments...";

    try {
        const departments = await getDepartments();

        output.innerHTML = departments.map(dep => {
            const id = dep.departmentID;
            const name = dep.departmentName ?? "Ukendt department";
            const mail = dep.mailAddress || "Ingen mail";

            const encodedName = encodeURIComponent(name);

            return `
                <div class="department-item"
                     onclick="window.location.href='index.html?departmentId=${id}&departmentName=${encodedName}'">

                    <div class="department-main">
                        <div class="department-title">${name}</div>

                        <div class="department-subtitle">
                            Mail: ${mail}
                        </div>
                    </div>

                    <div class="department-meta">
                        <span class="department-chip">
                            ID: ${id}
                        </span>
                    </div>
                </div>
            `;
        }).join("");

    } catch (err) {
        output.innerHTML = `
            <p style="color:#b91c1c; font-weight:500;">
                Fejl ved indlæsning: ${err.message}
            </p>`;
    }
}

window.addEventListener("DOMContentLoaded", loadDepartments);
