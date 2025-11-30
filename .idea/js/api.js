// .idea/js/api.js
const API_BASE_URL = "http://localhost:8080";

// Hent alle departments
export async function getDepartments() {
    const r = await fetch(`${API_BASE_URL}/api/ticketservice/departments`);
    if (!r.ok) throw new Error("Kunne ikke hente departments");
    return await r.json();
}

// Hent alle metrics/tickets for et department
export async function getTicketsForDepartment(id) {
    const r = await fetch(`${API_BASE_URL}/api/ticketservice/departments/${id}/tickets`);
    if (!r.ok) throw new Error("Kunne ikke hente tickets for department");
    return await r.json();
}

// Hent samlede routing stats
export async function getRoutingStats() {
    const r = await fetch(`${API_BASE_URL}/api/ticketservice/stats`);
    if (!r.ok) throw new Error("Kunne ikke hente stats");
    return await r.json();
}
