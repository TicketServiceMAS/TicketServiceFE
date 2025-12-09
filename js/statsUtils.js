// statsUtils.js
// Beregning af stats, serier til grafer og ticket-liste

import { formatDateTime } from "./timeUtils.js";

export let allTickets = [];

export function setAllTickets(tickets) {
    allTickets = Array.isArray(tickets) ? tickets : [];
}

export function computeStatsFromTickets(tickets) {
    const result = {
        totalTickets: 0,
        successCount: 0,
        failureCount: 0,
        defaultedCount: 0
    };

    if (!Array.isArray(tickets) || tickets.length === 0) {
        return result;
    }

    result.totalTickets = tickets.length;

    for (const t of tickets) {
        const status = (t.status ?? t.routingStatus ?? "").toUpperCase();

        if (status === "SUCCESS") {
            result.successCount++;
        } else if (status === "FAILURE") {
            result.failureCount++;
        } else if (status === "DEFAULTED") {
            result.defaultedCount++;
        }
    }

    return result;
}

export function buildDailyAccuracySeries(tickets) {
    const map = new Map();

    for (const t of tickets) {
        const created =
            t.createdAt ??
            t.created_at ??
            t.timestamp ??
            t.date;
        if (!created) continue;

        const d = new Date(created);
        if (Number.isNaN(d.getTime())) continue;

        const key = d.toISOString().slice(0, 10);

        let entry = map.get(key);
        if (!entry) {
            entry = { date: key, success: 0, total: 0 };
            map.set(key, entry);
        }

        entry.total++;

        const status = (t.status ?? t.routingStatus ?? "").toUpperCase();
        if (status === "SUCCESS") {
            entry.success++;
        }
    }

    const series = Array.from(map.values())
        .sort((a, b) => a.date.localeCompare(b.date));

    return series.map(e => {
        const dateObj = new Date(e.date);
        return {
            date: e.date,
            label: dateObj.toLocaleDateString("da-DK", {
                day: "2-digit",
                month: "2-digit"
            }),
            accuracy: e.total > 0 ? (e.success / e.total) * 100 : 0
        };
    });
}

export function buildAccuracyPrediction(dailySeries, horizonDays = 7) {
    if (!dailySeries || dailySeries.length === 0) return [];

    if (dailySeries.length === 1) {
        const last = dailySeries[0];
        const baseDate = new Date(last.date);
        const result = [];

        for (let i = 1; i <= horizonDays; i++) {
            const d = new Date(baseDate);
            d.setDate(d.getDate() + i);

            result.push({
                date: d.toISOString().slice(0, 10),
                label: d.toLocaleDateString("da-DK", {
                    day: "2-digit",
                    month: "2-digit"
                }),
                accuracy: last.accuracy
            });
        }
        return result;
    }

    const first = dailySeries[0];
    const last = dailySeries[dailySeries.length - 1];
    const n = dailySeries.length;

    const slope = (last.accuracy - first.accuracy) / (n - 1);
    const baseDate = new Date(last.date);
    const result = [];

    for (let i = 1; i <= horizonDays; i++) {
        const d = new Date(baseDate);
        d.setDate(d.getDate() + i);

        let acc = last.accuracy + slope * i;
        if (acc > 100) acc = 100;
        if (acc < 0) acc = 0;

        result.push({
            date: d.toISOString().slice(0, 10),
            label: d.toLocaleDateString("da-DK", {
                day: "2-digit",
                month: "2-digit"
            }),
            accuracy: acc
        });
    }

    return result;
}

export function renderTicketList(status, label) {
    const container = document.getElementById("ticketList");
    if (!container) return;

    if (!Array.isArray(allTickets) || allTickets.length === 0) {
        container.innerHTML = `
            <div style="font-size:0.85rem;color:#6b7280;">
                Ingen ticket-data tilgængelig fra backend endnu.
            </div>
        `;
        return;
    }

    const upperStatus = status.toUpperCase();

    const filtered = allTickets.filter(t => {
        const s = (t.status ?? t.routingStatus ?? "").toUpperCase();
        return s === upperStatus;
    });

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="font-size:0.85rem;color:#6b7280;">
                Ingen tickets fundet for: <strong>${label}</strong>.
            </div>
        `;
        return;
    }

    const rows = filtered.slice(0, 50).map(t => {
        const id =
            t.metricsDepartmentID ??
            t.id ??
            t.ticketId ??
            t.ticketNumber ??
            "Ukendt ID";

        const subject = t.subject ?? t.title ?? "(ingen subject)";
        const created = t.createdAt ?? t.created_at ?? t.date;
        const createdText = created ? formatDateTime(created) : "-";

        const deptName =
            (t.department && t.department.departmentName) ??
            t.departmentName ??
            "";

        const statusVal = t.status ?? t.routingStatus ?? "";

        return `
            <tr>
                <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${id}</td>
                <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${subject}</td>
                <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${createdText}</td>
                <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${statusVal}</td>
            </tr>
        `;
    }).join("");

    container.innerHTML = `
        <div style="margin-bottom:6px;">
            <div class="stat-label" style="margin-bottom:4px;">Tickets – ${label}</div>
            <div style="font-size:0.8rem;color:#6b7280;">
                Viser ${filtered.length > 50 ? "de første 50 af " : ""}${filtered.length} tickets.
            </div>
        </div>
        <div style="overflow:auto;max-height:260px;border:1px solid #e5e7eb;border-radius:6px;">
            <table style="border-collapse:collapse;width:100%;font-size:0.8rem;">
                <thead style="background:#f9fafb;position:sticky;top:0;z-index:1;">
                    <tr>
                        <th style="text-align:left;padding:6px 8px;border-bottom:1px solid #e5e7eb;">Ticket ID</th>
                        <th style="text-align:left;padding:6px 8px;border-bottom:1px solid #e5e7eb;">Subject</th>
                        <th style="text-align:left;padding:6px 8px;border-bottom:1px solid #e5e7eb;">Oprettet</th>
                        <th style="text-align:left;padding:6px 8px;border-bottom:1px solid #e5e7eb;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>
    `;
}
