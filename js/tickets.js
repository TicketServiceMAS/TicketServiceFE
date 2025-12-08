import { getDepartmentTicketList, markTicketAsMisrouted } from "./api.js";

function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("da-DK");
}

export async function loadTicketList(departmentId) {
    const container = document.getElementById("ticket-list");
    if (!container) return;

    if (!departmentId) {
        container.innerHTML = "<p>Ingen department valgt.</p>";
        return;
    }

    container.innerHTML = `
        <div style="padding:10px 0;font-size:0.9rem;color:#6b7280;">
            Indlæser tickets for department #${departmentId}...
        </div>
    `;

    try {
        const data = await getDepartmentTicketList(departmentId);

        let tickets;
        if (Array.isArray(data)) {
            tickets = data;
        } else if (data && Array.isArray(data.tickets)) {
            tickets = data.tickets;
        } else {
            tickets = [];
        }

        if (!tickets.length) {
            container.innerHTML = `
                <div style="padding:12px 0;font-size:0.9rem;color:#6b7280;">
                    Der blev ikke fundet nogle tickets for dette department.
                </div>
            `;
            return;
        }

        renderTicketList(container, tickets);
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

function renderTicketList(container, tickets) {
    const html = tickets
        .map(t => {
            const id =
                t.metricsDepartmentID ??
                t.id ??
                t.ticketId ??
                t.ticketNumber ??
                "Ukendt";

            const status = (t.status ?? t.routingStatus ?? "").toUpperCase() || "-";
            const subject = t.subject ?? t.title ?? "(ingen subject)";
            const date = t.createdAt ?? t.created_at ?? t.date;
            const isFailure = status === "FAILURE";

            return `
                <div class="ticket-card" data-ticket-id="${id}">
                    <div class="ticket-card-header">
                        <h3>Ticket #${id}</h3>
                        <button
                            class="ticket-flag-button"
                            data-ticket-id="${id}"
                            ${isFailure ? "disabled" : ""}
                        >
                            ${isFailure ? "Markeret som forkert" : "Marker som forkert routing"}
                        </button>
                    </div>
                    <p><strong>Status:</strong> ${status}</p>
                    <p><strong>Subject:</strong> ${subject}</p>
                    <p><strong>Date:</strong> ${formatDate(date)}</p>
                </div>
            `;
        })
        .join('<hr class="ticket-divider">');

    container.innerHTML = html;

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
