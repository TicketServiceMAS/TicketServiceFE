import { getDepartmentTicketList } from "./api.js";

// Change this to whatever department you want to display
//const departmentId = 6;

export async function loadTicketList(departmentId) {
    const container = document.getElementById("ticket-list");
    container.innerHTML = "<p>Loading...</p>";
    if (departmentId instanceof Event) {
        console.warn("loadTicketList received an Event object instead of departmentId");
        return [];
    }

    try {
        const tickets = await getDepartmentTicketList(departmentId);

        if (!tickets || tickets.length === 0) {
            container.innerHTML = "<p>No tickets found for this department.</p>";
            return;
        }

        // Build HTML list
        container.innerHTML = tickets.map(ticket => `
            <div class="ticket">
                <h3>Ticket #${ticket.metricsDepartmentID}</h3>
                <p><strong>Status:</strong> ${ticket.status}</p>
                <p><strong>Subject:</strong> ${ticket.subject}</p>
                <p><strong>Date:</strong> ${ticket.date}</p>
            </div>
            <hr>
        `).join("");

    } catch (err) {
        container.innerHTML = `<p style="color:red;">Error loading tickets.</p>`;
        console.error(err);
    }
}

// Load tickets when the page is ready
window.addEventListener("DOMContentLoaded", loadTicketList);
