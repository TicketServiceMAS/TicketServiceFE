import {
    getDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment
} from "./api.js";

let allDepartments = [];          // gemmer alle departments så vi kan søge/opdatere lokalt
let editingDepartmentId = null;   // track hvilket department der redigeres lige nu

// Simpel email-validering – matcher backend regex ret tæt
function isValidEmail(email) {
    if (!email) return false;
    const regex = /^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$/;
    return regex.test(email);
}

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

            return `
                <div class="department-item" data-id="${id}">
                    <div class="department-main">
                        <div class="department-title">${name}</div>
                        <div class="department-subtitle">Mail: ${mail}</div>
                    </div>

                    <div class="department-meta">
                        <span class="department-chip">ID: ${id}</span>
                        <div class="department-actions">
                            <button
                                type="button"
                                class="department-action department-action-edit"
                                data-id="${id}"
                            >
                                Rediger
                            </button>
                            <button
                                type="button"
                                class="department-action department-action-delete"
                                data-id="${id}"
                            >
                                Slet
                            </button>
                        </div>
                    </div>
                </div>
            `;
        })
        .join("");

    attachDepartmentItemHandlers();
}

/** ------------------------------
 *  Klik-håndtering for department items
 * ------------------------------ */
function attachDepartmentItemHandlers() {
    const container = document.getElementById("department-output");
    if (!container) return;

    const items = container.querySelectorAll(".department-item");
    items.forEach(item => {
        const id = item.getAttribute("data-id");
        if (!id) return;

        // Klik på selve rækken -> gå til dashboard
        item.addEventListener("click", (e) => {
            const actionBtn = e.target.closest(".department-action");
            if (actionBtn) {
                // hvis det er edit/slet-knap, håndteres separat
                return;
            }

            const dep = allDepartments.find(d => String(d.departmentID) === String(id));
            const name = dep?.departmentName ?? "";
            const encodedName = encodeURIComponent(name);

            window.location.href = `index.html?departmentId=${id}&departmentName=${encodedName}`;
        });
    });

    // Edit-knapper
    const editBtns = container.querySelectorAll(".department-action-edit");
    editBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const id = btn.getAttribute("data-id");
            openEditForm(id);
        });
    });

    // Delete-knapper
    const deleteBtns = container.querySelectorAll(".department-action-delete");
    deleteBtns.forEach(btn => {
        btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            const id = btn.getAttribute("data-id");
            await handleDeleteDepartment(id);
        });
    });
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
 *  Edit department UI helpers
 * ------------------------------ */
function showEditForm(show) {
    const container = document.getElementById("editDepartmentContainer");
    const msgEl = document.getElementById("editDepartmentMessage");
    if (!container) return;

    if (show) {
        container.classList.remove("hidden");
    } else {
        container.classList.add("hidden");
        editingDepartmentId = null;
        const form = document.getElementById("editDepartmentForm");
        const nameInput = document.getElementById("editDepartmentName");
        const mailInput = document.getElementById("editDepartmentMail");
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

/** ------------------------------
 *  Åbn edit-form for et bestemt department
 * ------------------------------ */
function openEditForm(departmentId) {
    const dep = allDepartments.find(d => String(d.departmentID) === String(departmentId));
    if (!dep) {
        alert("Kunne ikke finde det valgte department.");
        return;
    }

    editingDepartmentId = dep.departmentID;

    const nameInput = document.getElementById("editDepartmentName");
    const mailInput = document.getElementById("editDepartmentMail");

    if (nameInput) nameInput.value = dep.departmentName || "";
    if (mailInput) mailInput.value = dep.mailAddress || "";

    setEditFormMessage(null, "");
    showEditForm(true);
}

/** ------------------------------
 *  Håndter sletning af department
 * ------------------------------ */
async function handleDeleteDepartment(departmentId) {
    const dep = allDepartments.find(d => String(d.departmentID) === String(departmentId));
    const name = dep?.departmentName ?? `ID ${departmentId}`;

    const ok = window.confirm(`Er du sikker på, at du vil slette department "${name}"?`);
    if (!ok) return;

    try {
        await deleteDepartment(departmentId);

        // fjern lokalt
        allDepartments = allDepartments.filter(d => String(d.departmentID) !== String(departmentId));

        // hvis vi var i gang med at redigere det, luk formen
        if (String(editingDepartmentId) === String(departmentId)) {
            showEditForm(false);
        }

        renderDepartments(allDepartments);
    } catch (err) {
        alert(err.message || "Der opstod en fejl under sletning.");
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
            const mailAddress = mailInput?.value.trim();

            if (!departmentName) {
                setAddFormMessage("error", "Navn er obligatorisk.");
                return;
            }

            if (!mailAddress) {
                setAddFormMessage("error", "Mailadresse er obligatorisk.");
                return;
            }

            if (!isValidEmail(mailAddress)) {
                setAddFormMessage("error", "Mailadressen er ikke gyldig.");
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

                if (!created) {
                    // backend kan returnere null hvis email er invalid
                    setAddFormMessage("error", "Backend oprettede ikke department (tjek mailadresse).");
                    return;
                }

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
 *  Opsæt edit department form
 * ------------------------------ */
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

            if (editingDepartmentId == null) {
                setEditFormMessage("error", "Der er ikke valgt noget department at redigere.");
                return;
            }

            const nameInput = document.getElementById("editDepartmentName");
            const mailInput = document.getElementById("editDepartmentMail");

            const departmentName = nameInput?.value.trim();
            const mailAddress = mailInput?.value.trim();

            if (!departmentName) {
                setEditFormMessage("error", "Navn er obligatorisk.");
                return;
            }

            if (!mailAddress) {
                setEditFormMessage("error", "Mailadresse er obligatorisk.");
                return;
            }

            if (!isValidEmail(mailAddress)) {
                setEditFormMessage("error", "Mailadressen er ikke gyldig.");
                return;
            }

            try {
                if (updateBtn) {
                    updateBtn.disabled = true;
                    updateBtn.textContent = "Gemmer...";
                }
                setEditFormMessage(null, "");

                const payload = { departmentName, mailAddress };
                const updated = await updateDepartment(editingDepartmentId, payload);

                // Opdater lokalt array
                allDepartments = allDepartments.map(dep =>
                    String(dep.departmentID) === String(editingDepartmentId) ? updated : dep
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
                    updateBtn.textContent = "Gem ændringer";
                }
            }
        });
    }
}

/** ------------------------------
 *  Init
 * ------------------------------ */
window.addEventListener("DOMContentLoaded", () => {
    loadDepartments();
    setupSearch();
    setupAddDepartment();
    setupEditDepartment();
});
