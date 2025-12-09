import {
    getDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    getRoutingStatsForDepartment,
} from "./api.js";
import { initTheme, setupSettingsMenu } from "./theme.js";

let allDepartments = [];
let editingDepartmentId = null;

// filter / sort state
let currentFilter = "all";
let currentSearchQuery = "";
let isSkeletonActive = false;
let renderTimer = null;

function updateResultBadge(value) {
    const badge = document.getElementById("departmentResultBadge");
    if (badge) {
        badge.textContent = value;
    }
}

function buildSkeletonPlaceholder() {
    return `
        <div class="department-skeleton">
            ${Array.from({ length: 4 })
                .map(() => `
                    <div class="skeleton-row">
                        <span class="skeleton-line long"></span>
                        <span class="skeleton-line short"></span>
                    </div>
                `)
                .join("")}
        </div>
    `;
}

function triggerSkeletonRender() {
    isSkeletonActive = true;
    renderDepartments();

    if (renderTimer) {
        clearTimeout(renderTimer);
    }

    renderTimer = setTimeout(() => {
        isSkeletonActive = false;
        renderDepartments();
    }, 320);
}

function setDepartmentLiveStatus(message, isBusy = false) {
    const liveRegion = document.getElementById("departmentLiveRegion");
    if (!liveRegion) return;

    liveRegion.textContent = message;
    liveRegion.setAttribute("aria-busy", isBusy ? "true" : "false");
}

// Simpel email-validering
function isValidEmail(email) {
    if (!email) return false;
    const regex = /^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$/;
    return regex.test(email);
}

/** Render departments */
function renderDepartments() {
    const output = document.getElementById("department-output");
    if (!output) return;

    if (isSkeletonActive) {
        updateResultBadge("…");
        output.innerHTML = buildSkeletonPlaceholder();
        return;
    }

    let list = [...allDepartments];

    const q = currentSearchQuery.trim().toLowerCase();
    if (q !== "") {
        list = list.filter(dep => {
            const name = (dep.departmentName || "").toLowerCase();
            const mail = (dep.mailAddress || "").toLowerCase();
            const idStr = String(dep.departmentID ?? "");
            return (
                name.includes(q) ||
                mail.includes(q) ||
                idStr.includes(q)
            );
        });
    }

    if (currentFilter === "high") {
        list.sort((a, b) => (b.accuracy || 0) - (a.accuracy || 0));
    } else if (currentFilter === "low") {
        list.sort((a, b) => (a.accuracy || 0) - (b.accuracy || 0));
    }

    updateResultBadge(list.length);

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
                <div
                    class="department-item"
                    data-id="${id}"
                    role="button"
                    tabindex="0"
                    aria-label="Åbn dashboard for ${name} (ID ${id})"
                >
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

/** Klik-håndtering for department items */
function attachDepartmentItemHandlers() {
    const container = document.getElementById("department-output");
    if (!container) return;

    const items = container.querySelectorAll(".department-item");
    items.forEach(item => {
        const id = item.getAttribute("data-id");
        if (!id) return;

        item.addEventListener("click", (e) => {
            const actionBtn = e.target.closest(".department-action");
            if (actionBtn) {
                return;
            }

            const dep = allDepartments.find(d => String(d.departmentID) === String(id));
            const name = dep?.departmentName ?? "";
            const encodedName = encodeURIComponent(name);

            window.location.href = `index.html?departmentId=${id}&departmentName=${encodedName}`;
        });

        item.addEventListener("keydown", (e) => {
            if (e.key !== "Enter" && e.key !== " ") return;

            const actionBtn = e.target.closest(".department-action");
            if (actionBtn) return;

            e.preventDefault();
            const dep = allDepartments.find(d => String(d.departmentID) === String(id));
            const name = dep?.departmentName ?? "";
            const encodedName = encodeURIComponent(name);

            window.location.href = `index.html?departmentId=${id}&departmentName=${encodedName}`;
        });
    });

    const editBtns = container.querySelectorAll(".department-action-edit");
    editBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const id = btn.getAttribute("data-id");
            openEditForm(id);
        });
    });

    const deleteBtns = container.querySelectorAll(".department-action-delete");
    deleteBtns.forEach(btn => {
        btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            const id = btn.getAttribute("data-id");
            await handleDeleteDepartment(id);
        });
    });
}

/** Hent departments + metrics */
async function loadDepartments(showSkeleton = false) {
    const output = document.getElementById("department-output");
    if (!output) return;

    if (showSkeleton) {
        triggerSkeletonRender();
    } else {
        output.textContent = "Henter departments...";
    }
    setDepartmentLiveStatus("Henter departments...", true);

    try {
        const departments = await getDepartments();

        const withStats = await Promise.all(
            (departments || []).map(async (dep) => {
                const id = dep.departmentID ?? dep.id;
                let accuracy = 0;

                try {
                    const stats = await getRoutingStatsForDepartment(id);
                    const total = stats.totalTickets ?? 0;
                    const success = stats.successCount ?? 0;
                    const accPct =
                        stats.accuracy != null
                            ? stats.accuracy * 100
                            : (total > 0 ? (success / total) * 100 : 0);
                    accuracy = accPct;
                } catch (err) {
                    console.warn("Kunne ikke hente stats for department", id, err);
                }

                return {
                    ...dep,
                    accuracy,
                };
            })
        );

        allDepartments = withStats;
        isSkeletonActive = false;
        renderDepartments();
        setDepartmentLiveStatus(`Indlæste ${withStats.length} departments`, false);
    } catch (err) {
        output.innerHTML = `
            <p style="color:#b91c1c; font-weight:500;">
                Fejl ved indlæsning: ${err.message}
            </p>`;
        isSkeletonActive = false;
        updateResultBadge(0);
        setDepartmentLiveStatus("Fejl ved indlæsning af departments", false);
    }
}

/** Søgning */
function setupSearch() {
    const searchInput = document.getElementById("departmentSearch");
    if (!searchInput) return;

    searchInput.addEventListener("input", () => {
        currentSearchQuery = searchInput.value || "";
        triggerSkeletonRender();
    });
}

/** Filter-chips */
function setupFilterChips() {
    const chips = document.querySelectorAll(".toolbar-chip");
    if (!chips.length) return;

    chips.forEach(chip => {
        chip.addEventListener("click", () => {
            chips.forEach(c => c.classList.remove("toolbar-chip-active"));
            chip.classList.add("toolbar-chip-active");

            const text = chip.textContent.toLowerCase();

            if (text.includes("høj")) {
                currentFilter = "high";
            } else if (text.includes("lav")) {
                currentFilter = "low";
            } else {
                currentFilter = "all";
            }

            triggerSkeletonRender();
        });
    });
}

/** Add department UI */
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

/** Edit department UI */
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

/** Åbn edit-form */
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

/** Slet department */
async function handleDeleteDepartment(departmentId) {
    const dep = allDepartments.find(d => String(d.departmentID) === String(departmentId));
    const name = dep?.departmentName ?? `ID ${departmentId}`;

    const ok = window.confirm(`Er du sikker på, at du vil slette department "${name}"?`);
    if (!ok) return;

    try {
        await deleteDepartment(departmentId);

        allDepartments = allDepartments.filter(d => String(d.departmentID) !== String(departmentId));

        if (String(editingDepartmentId) === String(departmentId)) {
            showEditForm(false);
        }

        renderDepartments();
    } catch (err) {
        alert(err.message || "Der opstod en fejl under sletning.");
    }
}

/** Setup add department */
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
                    setAddFormMessage("error", "Backend oprettede ikke department (tjek mailadresse).");
                    return;
                }

                allDepartments = [...allDepartments, { ...created, accuracy: 0 }];
                renderDepartments();

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

/** Setup edit department */
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

                allDepartments = allDepartments.map(dep =>
                    String(dep.departmentID) === String(editingDepartmentId)
                        ? { ...dep, ...updated }
                        : dep
                );

                renderDepartments();
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

/** Init */
window.addEventListener("DOMContentLoaded", () => {
    initTheme();
    loadDepartments();
    setupSearch();
    setupFilterChips();
    setupAddDepartment();
    setupEditDepartment();
    setupSettingsMenu({ onRefresh: () => loadDepartments(true) });
});
