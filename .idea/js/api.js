// .idea/js/api.js
const API_BASE_URL = "http://localhost:8080/api/ticketservice";

// Hent alle departments
export async function getDepartments() {
    const r = await fetch(`${API_BASE_URL}/departments`);
    if (!r.ok) {
        throw new Error(`Kunne ikke hente departments (status ${r.status})`);
    }
    return await r.json();
}

// Hent alle metrics/tickets for et department (pt. afhænger af jeres backend-format)
export async function getTicketsForDepartment(id) {
    const r = await fetch(`${API_BASE_URL}/metrics/departments/${id}`);
    if (!r.ok) {
        throw new Error(`Kunne ikke hente metrics/tickets for department ${id} (status ${r.status})`);
    }
    return await r.json();
}

// Hent samlede routing stats (alle departments)
export async function getRoutingStats() {
    const r = await fetch(`${API_BASE_URL}/stats`);
    if (!r.ok) {
        throw new Error(`Kunne ikke hente stats (status ${r.status})`);
    }
    return await r.json();
}

// Hent routing stats for ét department
export async function getRoutingStatsForDepartment(id) {
    const r = await fetch(`${API_BASE_URL}/stats/${id}`);
    if (!r.ok) {
        throw new Error(`Kunne ikke hente stats for department ${id} (status ${r.status})`);
    }
    return await r.json();
}
