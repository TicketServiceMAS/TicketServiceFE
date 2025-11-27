// index.js

import { getTickets } from "./api.js";

async function loadData() {
    try {
        const data = await getTickets();
        console.log("Data fra backend:", data);

        document.body.innerHTML += `<p>Backend svar: ${data}</p>`;
    } catch (error) {
        console.error("Fejl ved API-kald:", error);
    }
}

loadData();
