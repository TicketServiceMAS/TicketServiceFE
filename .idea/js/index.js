// .idea/js/departments.js
import {
    getDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment
} from "./api.js";

let allDepartments = [];
let currentEditId = null;

/* ------------ RENDER ------------ */
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

            return `
                <div class="department-item"
                     data-department-id="${id}"
                     data-department-name="${name}">
                    <div class="department-main">
                        <div class="department-title">${name}</div>
                        <div class="department-subtitle">Mail: ${mail}</div>
                    </div>

                    <div class="department-meta">
                        <span class="department-chip">ID: ${id}</span>
                        <button
                            type="button"
                            class="department-edit-btn"
                            data-role="edit-department"
                            data-id="${id}"
                        >
                            Rediger
                        </button>
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

/* ------------ LOAD ------------ */
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

/* ------------ SEARCH ------------ */
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

/* ------------ ADD HELPERS ------------ */
function showAddForm(show) {
    const container = document.getElementById("addDepartmentContainer");
    const msgEl = document.getElementById("addDepartmentMessage");
    if (!container) return;

    if (show) {
        container.classList.remove("hidden");
    } else {
        container.classList.add("hidden");
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

/* ------------ EDIT HELPERS ------------ */
function showEditForm(show, dep) {
    const container = document.getElementById("editDepartmentContainer");
    const msgEl = document.getElementById("editDepartmentMessage");
    if (!container) return;

    if (show) {
        container.classList.remove("hidden");
        if (dep) {
            currentEditId = dep.departmentID;
            const nameInput = document.getElementById("editDepartmentName");
            const mailInput = document.getElementById("editDepartmentMail");
            if (nameInput) nameInput.value = dep.departmentName || "";
            if (mailInput) mailInput.value = dep.mailAddress || "";
        }
    } else {
        container.classList.add("hidden");
        currentEditId = null;
        const form = document.getElementById("editDepartmentForm");
        const nameInput = document.getElementById("editDepartmentName");
        const mailInput = document.getElementById("editDepartmentMail");
        if (form) form.reset();
        if (nameInput) nameInput.value = "";
        if (mailInput) mailInput.value = "";
    }

    if (msgEl) {
        msgEl.textContent = "";
        msgEl.classList.add("hidden");
        msgEl.classList.remove("add-department-error", "add-department-success");
    }
}

function setEditFormMessage(type, text) {
    const msgEl = document.getElementById("editDepartmentMessage");
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

/* ------------ ADD FORM ------------ */
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
            // luk evt. edit-form hvis åbent
            showEditForm(false);
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

                allDepartments = [...allDepartments, created];
                renderDepartments(allDepartments);

                setAddFormMessage("success", "Department oprettet.");
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

/* ------------ EDIT FORM ------------ */
function setupEditDepartment() {
    const cancelBtn = document.getElementById("cancelEditDepartment");
    const form = document.getElementById("editDepartmentForm");
    const updateBtn = document.getElementById("updateDepartmentBtn");

    if (cancelBtn) {
        cancelBtn.addEventListener("click", () => {
            showEditForm(false);
        });
    }

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!currentEditId) {
                setEditFormMessage("error", "Ingen department valgt.");
                return;
            }

            const nameInput = document.getElementById("editDepartmentName");
            const mailInput = document.getElementById("editDepartmentMail");

            const departmentName = nameInput?.value.trim();
            const mailAddress = mailInput?.value.trim() || null;

            if (!departmentName) {
                setEditFormMessage("error", "Navn er obligatorisk.");
                return;
            }

            try {
                if (updateBtn) {
                    updateBtn.disabled = true;
                    updateBtn.textContent = "Opdaterer...";
                }
                setEditFormMessage(null, "");
                const payload = { departmentName, mailAddress };

                const updated = await updateDepartment(currentEditId, payload);

                allDepartments = allDepartments.map(dep =>
                    String(dep.departmentID) === String(currentEditId)
                        ? { ...dep, ...updated }
                        : dep
                );
                renderDepartments(allDepartments);

                setEditFormMessage("success", "Department opdateret.");
                setTimeout(() => {
                    showEditForm(false);
                }, 600);
            } catch (err) {
                setEditFormMessage("error", err.message || "Der opstod en fejl under opdatering.");
            } finally {
                if (updateBtn) {
                    updateBtn.disabled = false;
                    updateBtn.textContent = "Opdater";
                }
            }
        });
    }
}

/* ------------ CLICK HANDLER (navigation + edit + delete) ------------ */
function setupClickHandlers() {
    const output = document.getElementById("department-output");
    if (!output) return;

    output.addEventListener("click", async (event) => {
        const item = event.target.closest(".department-item");
        if (!item) return;

        const deleteBtn = event.target.closest("[data-role='delete-department']");
        const editBtn = event.target.closest("[data-role='edit-department']");

        // DELETE
        if (deleteBtn) {
            const id = deleteBtn.getAttribute("data-id");
            const dep = allDepartments.find(d => String(d.departmentID) === String(id));
            const name = dep?.departmentName || deleteBtn.getAttribute("data-name") || id;

            const confirmed = window.confirm(
                `Er du sikker på, at du vil slette "${name}"?\n\n` +
                `Denne handling kan ikke fortrydes, og department bliver slettet permanent.`
            );

            if (!confirmed) return;

            try {
                deleteBtn.disabled = true;
                deleteBtn.textContent = "Sletter...";

                await deleteDepartment(id);

                allDepartments = allDepartments.filter(
                    d => String(d.departmentID) !== String(id)
                );
                renderDepartments(allDepartments);

                alert(`Department "${name}" er nu slettet.`);
            } catch (err) {
                alert("Kunne ikke slette department: " + (err.message || "Ukendt fejl"));
                deleteBtn.disabled = false;
                deleteBtn.textContent = "Slet";
            }

            return; // vigtigt: ingen navigation bagefter
        }

        // EDIT
        if (editBtn) {
            const id = editBtn.getAttribute("data-id");
            const dep = allDepartments.find(d => String(d.departmentID) === String(id));
            if (!dep) return;

            // Luk add-form hvis åben, og vis edit
            showAddForm(false);
            showEditForm(true, dep);
            return; // ingen navigation
        }

        // Navigation når man klikker "et andet sted" på kortet
        const id = item.getAttribute("data-department-id");
        const dep = allDepartments.find(d => String(d.departmentID) === String(id));
        const name = dep?.departmentName || item.getAttribute("data-department-name") || "";
        const encodedName = encodeURIComponent(name);

        window.location.href = `index.html?departmentId=${id}&departmentName=${encodedName}`;
    });
}

/* ------------ INIT ------------ */
window.addEventListener("DOMContentLoaded", () => {
    loadDepartments();
    setupSearch();
    setupAddDepartment();
    setupEditDepartment();
    setupClickHandlers();
});
