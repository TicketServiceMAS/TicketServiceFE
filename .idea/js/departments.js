import { getDepartments } from "./api.js";

async function loadDepartments() {
    const output = document.getElementById("department-output");
    output.textContent = "Henter departments...";

    try {
        const departments = await getDepartments();

        output.innerHTML = departments.map(dep => `
            <div class="department-item"
                 onclick="window.location.href='department.html?id=${dep.id}'">
                 
                <div class="department-title">${dep.departmentName}</div>
                <div class="department-meta">
                    Mail: ${dep.mailAddress}<br>
                    Category ID: ${dep.categoryID}
                </div>
            </div>
        `).join("");

    } catch (err) {
        output.innerHTML = `<p style="color:red;">Fejl: ${err.message}</p>`;
    }
}

window.addEventListener("DOMContentLoaded", loadDepartments);
