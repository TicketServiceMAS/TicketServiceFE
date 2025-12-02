// .idea/js/departments.js
import {
    getDepartments,
    createDepartment,
    deleteDepartment
} from "./api.js";

let allDepartments = []; // gemmer alle departments så vi kan søge/opdatere lokalt

/** ------------------------------
 *  Render departments i output
 * ------------------------------ */
function renderDepartments(list) {
    const output = document.getElementById("department-output");

    if (!list || list.length === 0) {
        output.innerHTML = `
            <p style="color:#6b7280; font-size:0.9rem;">
                Ingen departments fundet.
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
                     data-department-id="${id}"
                     onclick="window.location.href='index.html?departmentId=${id}&departmentName=${encodedName}'">

                    <div class="department-main">
                        <div class="department-title">${name}</div>
                        <div class="department-subtitle">Mail: ${mail}</div>
                    </div>

                    <div class="department-meta">
                        <span class="department-chip">ID: ${id}</span>
                        <button
                            type="button"
                            class="department-delete-btn"
                            data-role="delete-department"
                            data-id="${id}"
                            data-name="${name}"
                        >
                            Slet
                        </button>
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
        allDepartments = departments || [];
        renderDepartments(allDepartments);
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
 *  Add department UI helpers
 * ------------------------------ */
function showAddForm(show) {
    const container = document.getElementById("addDepartmentContainer");
    const msgEl = document.getElementById("addDepartmentMessage");
    if (!container) return;

    if (show) {
        container.classList.remove("hidden");
    } else {
        container.classList.add("hidden");
        // ryd form + beskeder
        const form = document.getElementById("addDepartmentForm");
        const nameInput = document.getElementById("newDepartmentName");
        const mailInput = document.getElementById("newDepartmentMail");
        if (form) form.reset();
        if (nameInput) nameInput.value = "";
        if (mailInput) mailInput.value = "";
        if (msgEl) {
            msgEl.textContent = "";
            msgEl.classList.add("hidden");
            msgEl.classList.remove("add-department-error", "add-department-success");
        }
    }
}

function setAddFormMessage(type, text) {
    const msgEl = document.getElementById("addDepartmentMessage");
    if (!msgEl) return;

    if (!text) {
        msgEl.textContent = "";
        msgEl.classList.add("hidden");
        msgEl.classList.remove("add-department-error", "add-department-success");
        return;
    }

    msgEl.textContent = text;
    msgEl.classList.remove("hidden", "add-department-error", "add-department-success");

    if (type === "error") {
        msgEl.classList.add("add-department-error");
    } else if (type === "success") {
        msgEl.classList.add("add-department-success");
    }
}

/** ------------------------------
 *  Opsæt add department form
 * ------------------------------ */
function setupAddDepartment() {
    const toggleBtn = document.getElementById("toggleAddDepartment");
    const cancelBtn = document.getElementById("cancelAddDepartment");
    const form = document.getElementById("addDepartmentForm");
    const saveBtn = document.getElementById("saveDepartmentBtn");

    if (toggleBtn) {
        toggleBtn.addEventListener("click", () => {
            const container = document.getElementById("addDepartmentContainer");
            if (!container) return;
            const isHidden = container.classList.contains("hidden");
            showAddForm(isHidden);
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener("click", () => {
            showAddForm(false);
        });
    }

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const nameInput = document.getElementById("newDepartmentName");
            const mailInput = document.getElementById("newDepartmentMail");

            const departmentName = nameInput?.value.trim();
            const mailAddress = mailInput?.value.trim() || null;

            if (!departmentName) {
                setAddFormMessage("error", "Navn er obligatorisk.");
                return;
            }

            try {
                if (saveBtn) {
                    saveBtn.disabled = true;
                    saveBtn.textContent = "Gemmer...";
                }
                setAddFormMessage(null, "");
                const payload = { departmentName, mailAddress };

                const created = await createDepartment(payload);

                // Tilføj det nye department til lokal liste og re-render
                allDepartments = [...allDepartments, created];
                renderDepartments(allDepartments);

                setAddFormMessage("success", "Department oprettet.");
                // Luk formen efter kort delay
                setTimeout(() => {
                    showAddForm(false);
                }, 600);
            } catch (err) {
                setAddFormMessage("error", err.message || "Der opstod en fejl under oprettelse.");
            } finally {
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.textContent = "Gem";
                }
            }
        });
    }
}

/** ------------------------------
 *  Delete department (med advarsel)
 * ------------------------------ */
function setupDeleteHandler() {
    const output = document.getElementById("department-output");
    if (!output) return;

    // Event delegation: én listener til alle delete-knapper
    output.addEventListener("click", async (event) => {
        const btn = event.target.closest("[data-role='delete-department']");
        if (!btn) return;

        // undgå at klikket også trigger navigation på .department-item
        event.stopPropagation();

        const id = btn.getAttribute("data-id");
        const name = btn.getAttribute("data-name") || id;

        const confirmed = window.confirm(
            `Er du sikker på, at du vil slette "${name}"?\n\n` +
            `Denne handling kan ikke fortrydes, og department bliver slettet permanent.`
        );

        if (!confirmed) return;

        try {
            btn.disabled = true;
            btn.textContent = "Sletter...";

            await deleteDepartment(id);

            // fjern fra lokal liste og re-render
            allDepartments = allDepartments.filter(
                d => String(d.departmentID) !== String(id)
            );
            renderDepartments(allDepartments);

            // (optionelt) lille besked
            alert(`Department "${name}" er nu slettet.`);
        } catch (err) {
            alert("Kunne ikke slette department: " + (err.message || "Ukendt fejl"));
            btn.disabled = false;
            btn.textContent = "Slet";
        }
    });
}

/** ------------------------------
 *  Init
 * ------------------------------ */
window.addEventListener("DOMContentLoaded", () => {
    loadDepartments();
    setupSearch();
    setupAddDepartment();
    setupDeleteHandler();
});
