import { getTicketsForDepartment } from "./api.js";

const params = new URLSearchParams(window.location.search);
const departmentId = params.get("id");

async function loadTickets() {
    const title = document.getElementById("deptName");
    const output = document.getElementById("ticket-output");

    output.textContent = "Henter tickets...";

    try {
        const data = await getTicketsForDepartment(departmentId);

        // Skriv department navn
        title.textContent = data.departmentName;

        // Hvis ingen tickets
        if (!data.tickets || data.tickets.length === 0) {
            output.innerHTML = "<p>Ingen tickets fundet for dette department.</p>";
            return;
        }

        // Render tickets (MetricsDepartment entries)
        output.innerHTML = data.tickets.map(t => `
            <div class="ticket-item">
                <strong>Ticket ID:</strong> ${t.ticketId}<br>
                <strong>Status:</strong> ${t.status}<br>
                <strong>Modtaget:</strong> ${t.receivedDate || "ukendt"}<br>
                <strong>Department:</strong> ${data.departmentName}
            </div>
        `).join("");

    } catch (err) {
        output.innerHTML = `<p style="color:red;">Fejl: ${err.message}</p>`;
    }
}

window.addEventListener("DOMContentLoaded", loadTickets);
