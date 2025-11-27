// api.js

const API_BASE_URL = "http://localhost:8080";

export async function getTickets() {
    const response = await fetch(`${API_BASE_URL}/api/ticketservice`);
    return await response.text();  // eller .json() hvis backend returnerer JSON
}
