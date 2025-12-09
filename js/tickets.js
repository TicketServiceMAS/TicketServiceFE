import { getDepartmentTicketList, markTicketAsMisrouted, updateTicketPriority } from "./api.js";
import { SELECTED_DEPARTMENT_ID } from "./config.js";

const PAGE_SIZE = 10;
let allTickets = [];
let filters = {
    search: "",
    status: "",
    routing: "",
    priority: "",
};
let currentPage = 1;
let currentView = "table";

function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("da-DK");
}

const PRIORITY_ORDER = ["P1", "P0", "P3", "P2"];

function formatPriority(raw) {
    if (!raw) return "P1";
    const str = String(raw).trim();
    if (!str) return "P1";
    const normalized = str.toUpperCase();
    return normalized;
}

export async function loadTicketList(departmentId) {
    const container = document.getElementById("ticket-list");
    if (!container) return;

    const activeDepartment = departmentId ?? SELECTED_DEPARTMENT_ID;
    if (!activeDepartment) {
        container.innerHTML = "";
        return;
    }

    container.innerHTML = `
        <div style="padding:10px 0;font-size:0.9rem;color:#6b7280;">
            Indlæser tickets for department #${activeDepartment}...
        </div>
    `;

    try {
        const data = await getDepartmentTicketList(activeDepartment);

        let tickets;
        if (Array.isArray(data)) {
            tickets = data;
        } else if (data && Array.isArray(data.tickets)) {
            tickets = data.tickets;
        } else {
            tickets = [];
        }

        allTickets = tickets;
        filters = { search: "", status: "", routing: "", priority: "" };
        currentView = currentView || "table";
        currentPage = 1;

        if (!tickets.length) {
            container.innerHTML = `
                <div style="padding:12px 0;font-size:0.9rem;color:#6b7280;">
                    Der blev ikke fundet nogle tickets for dette department.
                </div>
            `;
            return;
        }

        renderTicketList(container);
    } catch (e) {
        console.error("Fejl ved hentning af tickets:", e);
        container.innerHTML = `
            <p style="color:#b91c1c;font-size:0.9rem;">
                Kunne ikke hente tickets for dette department.<br>
                <small>${e && e.message ? e.message : e}</small>
            </p>
        `;
    }
}

function buildFilterBar(statuses) {
    return `
        <div class="ticket-controls">
            <div class="ticket-filters">
                <input
                    type="search"
                    class="ticket-filter-input"
                    id="ticketSearchInput"
                    placeholder="Søg efter ticket eller subject..."
                    value="${filters.search}"
                />
                <select class="ticket-filter-select" id="ticketStatusFilter">
                    <option value="">Alle statusser</option>
                    ${statuses
                        .map(status => {
                            const active = filters.status === status ? "selected" : "";
                            return `<option value="${status}" ${active}>${status}</option>`;
                        })
                        .join("")}
                </select>
                <select class="ticket-filter-select" id="ticketRoutingFilter">
                    <option value="">Alle routingtyper</option>
                    <option value="correct" ${filters.routing === "correct" ? "selected" : ""}>Korrekt routing</option>
                    <option value="incorrect" ${filters.routing === "incorrect" ? "selected" : ""}>Forkert routing</option>
                </select>
            </div>
            <div class="ticket-view-toggle">
                <button class="view-toggle-btn ${currentView === "table" ? "active" : ""}" data-view="table">Tabel</button>
                <button class="view-toggle-btn ${currentView === "card" ? "active" : ""}" data-view="card">Kort</button>
            </div>
        </div>
    `;
}

function renderFilterChips(statuses, priorities) {
    const statusContainer = document.getElementById("statusChipContainer");
    const priorityContainer = document.getElementById("priorityChipContainer");
    const chipRow = document.getElementById("ticketChipRow");

    if (chipRow) {
        chipRow.style.display = statuses.length ? "flex" : "none";
    }

    if (statusContainer) {
        const statusOptions = ["", ...statuses];
        statusContainer.innerHTML = statusOptions
            .map(status => {
                const label = status || "Alle";
                const isActive = filters.status === status;
                return `<button class="ticket-chip ${isActive ? "ticket-chip-active" : ""}" data-type="status" data-value="${status}">${label}</button>`;
            })
            .join("");
    }

    if (priorityContainer) {
        const seen = new Set();
        const orderedOptions = ["", ...PRIORITY_ORDER, ...priorities].filter(value => {
            const key = value.toUpperCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        priorityContainer.innerHTML = orderedOptions
            .map(priority => {
                const label = priority || "Alle";
                const isActive = filters.priority.toLowerCase() === priority.toLowerCase();
                return `<button class="ticket-chip ${isActive ? "ticket-chip-active" : ""}" data-type="priority" data-value="${priority}">${label}</button>`;
            })
            .join("");
    }

    const chipButtons = document.querySelectorAll("#ticketChipRow .ticket-chip");
    chipButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const type = btn.getAttribute("data-type");
            const value = btn.getAttribute("data-value") || "";

            if (type === "status") {
                filters.status = value;
            }

            if (type === "priority") {
                filters.priority = value;
            }

            currentPage = 1;
            renderTicketList(document.getElementById("ticket-list"));
        });
    });
}

function renderTableRows(tickets) {
    return `
        <table class="ticket-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Status</th>
                    <th>Prioritet</th>
                    <th>Subject</th>
                    <th>Dato</th>
                    <th class="ticket-table-actions">Handling</th>
                </tr>
            </thead>
            <tbody>
                ${tickets
                    .map(t => {
                        const isFailure = t.status === "FAILURE";
                        return `
                            <tr class="ticket-table-row" data-ticket-id="${t.id}">
                                <td class="ticket-id">#${t.id}</td>
                                <td><span class="ticket-status ${isFailure ? "status-failure" : "status-success"}">${t.status}</span></td>
                                <td>${renderPriorityControl(t.id, t.priority)}</td>
                                <td>${t.subject}</td>
                                <td>${formatDate(t.date)}</td>
                                <td class="ticket-table-actions">
                                    <button
                                        class="ticket-flag-button"
                                        data-ticket-id="${t.id}"
                                        ${isFailure ? "disabled" : ""}
                                    >
                                        ${isFailure ? "Markeret som forkert" : "Marker som forkert routing"}
                                    </button>
                                </td>
                            </tr>
                        `;
                    })
                    .join("")}
            </tbody>
        </table>
    `;
}

function renderCardRows(tickets) {
    return tickets
        .map(t => {
            const isFailure = t.status === "FAILURE";
            return `
                <div class="ticket-card" data-ticket-id="${t.id}">
                    <div class="ticket-card-header">
                        <h3>Ticket #${t.id}</h3>
                        <button
                            class="ticket-flag-button"
                            data-ticket-id="${t.id}"
                            ${isFailure ? "disabled" : ""}
                        >
                            ${isFailure ? "Markeret som forkert" : "Marker som forkert routing"}
                        </button>
                    </div>
                    <p><strong>Status:</strong> ${t.status}</p>
                    <p><strong>Prioritet:</strong> ${renderPriorityControl(t.id, t.priority)}</p>
                    <p><strong>Subject:</strong> ${t.subject}</p>
                    <p><strong>Date:</strong> ${formatDate(t.date)}</p>
                </div>
            `;
        })
        .join('<hr class="ticket-divider">');
}

function normalizeTicket(ticket) {
    return {
        raw: ticket,
        id:
            ticket.metricsDepartmentID ??
            ticket.id ??
            ticket.ticketId ??
            ticket.ticketNumber ??
            "Ukendt",
        status: (ticket.status ?? ticket.routingStatus ?? "").toUpperCase() || "-",
        subject: ticket.subject ?? ticket.title ?? "(ingen subject)",
        date: ticket.createdAt ?? ticket.created_at ?? ticket.date,
        priority: formatPriority(ticket.priority || ticket.priorityLevel || ticket.severity || ticket.priority_name)
    };
}

function getNormalizedTickets() {
    return allTickets.map(normalizeTicket);
}

function filterTickets() {
    const term = filters.search.trim().toLowerCase();

    return getNormalizedTickets().filter(t => {
        const matchesSearch = term
            ? `${t.id}`.toLowerCase().includes(term) || t.subject.toLowerCase().includes(term)
            : true;

        const matchesStatus = filters.status
            ? t.status === filters.status
            : true;

        const isMisrouted = t.status === "FAILURE";
        const matchesRouting = filters.routing === "correct"
            ? !isMisrouted
            : filters.routing === "incorrect"
                ? isMisrouted
                : true;

        const matchesPriority = filters.priority
            ? (t.priority || "Normal").toLowerCase() === filters.priority.toLowerCase()
            : true;

        return matchesSearch && matchesStatus && matchesRouting && matchesPriority;
    });
}

function paginate(tickets) {
    const totalPages = Math.max(1, Math.ceil(tickets.length / PAGE_SIZE));
    currentPage = Math.min(Math.max(1, currentPage), totalPages);

    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;

    return {
        totalPages,
        pageTickets: tickets.slice(start, end)
    };
}

function renderTicketList(container) {
    const normalizedTickets = getNormalizedTickets();
    const filteredTickets = filterTickets();
    const uniqueStatuses = Array.from(
        new Set(normalizedTickets.map(t => t.status))
    ).filter(Boolean);
    const uniquePriorities = Array.from(
        new Set(normalizedTickets.map(t => t.priority))
    ).filter(Boolean);

    const { totalPages, pageTickets } = paginate(filteredTickets);

    const resultsHtml = currentView === "table"
        ? renderTableRows(pageTickets)
        : renderCardRows(pageTickets);

    renderFilterChips(uniqueStatuses, uniquePriorities);

    container.innerHTML = `
        ${buildFilterBar(uniqueStatuses)}
        <div id="ticket-results">${resultsHtml}</div>
        <div class="ticket-pagination">
            <button class="pagination-btn" data-direction="prev" ${currentPage === 1 ? "disabled" : ""}>Forrige</button>
            <span class="pagination-info">Side ${currentPage} af ${totalPages}</span>
            <button class="pagination-btn" data-direction="next" ${currentPage >= totalPages ? "disabled" : ""}>Næste</button>
        </div>
    `;

    wireUpInteractions(container, totalPages);
    attachFlagButtonHandlers(container);
    attachPriorityHandlers(container);
}

function wireUpInteractions(container, totalPages) {
    const searchInput = container.querySelector("#ticketSearchInput");
    const statusSelect = container.querySelector("#ticketStatusFilter");
    const routingSelect = container.querySelector("#ticketRoutingFilter");
    const paginationButtons = container.querySelectorAll(".pagination-btn");
    const viewButtons = container.querySelectorAll(".view-toggle-btn");

    if (searchInput) {
        searchInput.addEventListener("input", event => {
            filters.search = event.target.value;
            currentPage = 1;
            renderTicketList(container);
        });
    }

    if (statusSelect) {
        statusSelect.addEventListener("change", event => {
            filters.status = event.target.value;
            currentPage = 1;
            renderTicketList(container);
        });
    }

    if (routingSelect) {
        routingSelect.addEventListener("change", event => {
            filters.routing = event.target.value;
            currentPage = 1;
            renderTicketList(container);
        });
    }

    paginationButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const dir = btn.dataset.direction;
            if (dir === "prev" && currentPage > 1) {
                currentPage -= 1;
            } else if (dir === "next" && currentPage < totalPages) {
                currentPage += 1;
            }
            renderTicketList(container);
        });
    });

    viewButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const view = btn.dataset.view;
            if (view && view !== currentView) {
                currentView = view;
                renderTicketList(container);
            }
        });
    });
}

function attachFlagButtonHandlers(container) {
    const buttons = container.querySelectorAll(".ticket-flag-button");
    buttons.forEach(btn => {
        btn.addEventListener("click", async () => {
            const ticketId = btn.dataset.ticketId;
            if (!ticketId) return;

            const confirmed = window.confirm(
                `Er du sikker på, at ticket #${ticketId} er routet forkert?\n` +
                `Den bliver markeret som FAILURE, og statistikken opdateres.`
            );
            if (!confirmed) return;

            try {
                btn.disabled = true;
                btn.textContent = "Opdaterer...";

                await markTicketAsMisrouted(ticketId);

                window.location.reload();
            } catch (e) {
                console.error("Kunne ikke markere ticket som forkert:", e);
                btn.disabled = false;
                btn.textContent = "Marker som forkert routing";
                alert("Der opstod en fejl ved opdatering af ticketen.");
            }
        });
    });
}

function renderPriorityControl(ticketId, priority) {
    const normalizedPriority = priority || PRIORITY_ORDER[0];
    const seen = new Set();
    const options = [normalizedPriority, ...PRIORITY_ORDER].filter(option => {
        const key = option.toUpperCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    const optionHtml = options
        .map(option => {
            const isSelected = option.toLowerCase() === normalizedPriority.toLowerCase();
            return `<option value="${option}" ${isSelected ? "selected" : ""}>${option}</option>`;
        })
        .join("");

    return `
        <label class="priority-control">
            <span class="visually-hidden">Prioritet for ticket #${ticketId}</span>
            <select class="priority-select" data-ticket-id="${ticketId}" data-current-priority="${normalizedPriority}">
                ${optionHtml}
            </select>
        </label>
    `;
}

function attachPriorityHandlers(container) {
    const selects = container.querySelectorAll(".priority-select");
    selects.forEach(select => {
        select.addEventListener("change", async event => {
            const newPriority = event.target.value;
            const ticketId = event.target.getAttribute("data-ticket-id");
            const previousPriority = event.target.getAttribute("data-current-priority") || newPriority;

            if (!ticketId || !newPriority) return;

            event.target.disabled = true;
            event.target.classList.add("priority-select-saving");

            try {
                await updateTicketPriority(ticketId, newPriority);
                event.target.setAttribute("data-current-priority", newPriority);
                event.target.classList.add("priority-select-saved");
                setTimeout(() => event.target.classList.remove("priority-select-saved"), 1000);
            } catch (e) {
                console.error("Kunne ikke opdatere prioritet:", e);
                alert("Kunne ikke opdatere ticketens prioritet.");
                event.target.value = previousPriority;
            } finally {
                event.target.disabled = false;
                event.target.classList.remove("priority-select-saving");
            }
        });
    });
}
