// config.js
// Konfiguration + mock-data + URL-parametre
export function API_BASE_URL() {
    return "http://localhost:8080/api/ticketservice"
    //return "https://ticketservicemas-b4addvfjf6hthedj.norwayeast-01.azurewebsites.net/api/ticketservice"
}

export function AUTH_BASE_URL() {
    return "http://localhost:8080"
    //return "https://ticketservicemas-b4addvfjf6hthedj.norwayeast-01.azurewebsites.net"
}
export const USE_MOCK = false;

export const MOCK_STATS = {
    totalTickets: 30,
    successCount: 23,
    failureCount: 5,
    defaultedCount: 2,
    accuracy: 23 / 30
};

const today = new Date();
export function daysAgo(n) {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d.toISOString();
}

export const MOCK_TICKETS = [
    { metricsDepartmentID: 1, subject: "Login issue", createdAt: daysAgo(7), status: "SUCCESS", departmentName: "Support", predictedTeam: "Support Team" },
    { metricsDepartmentID: 2, subject: "Order #1234", createdAt: daysAgo(7), status: "SUCCESS", departmentName: "Sales", predictedTeam: "Sales Team" },
    { metricsDepartmentID: 3, subject: "Billing question", createdAt: daysAgo(6), status: "SUCCESS", departmentName: "Finance", predictedTeam: "Finance Team" },
    { metricsDepartmentID: 4, subject: "Password reset", createdAt: daysAgo(6), status: "SUCCESS", departmentName: "Support", predictedTeam: "Support Team" },
    { metricsDepartmentID: 5, subject: "API integration", createdAt: daysAgo(5), status: "SUCCESS", departmentName: "Tech", predictedTeam: "Tech Team" },
    { metricsDepartmentID: 6, subject: "Invoice missing", createdAt: daysAgo(5), status: "SUCCESS", departmentName: "Finance", predictedTeam: "Finance Team" },
    { metricsDepartmentID: 7, subject: "Refund request", createdAt: daysAgo(4), status: "SUCCESS", departmentName: "Finance", predictedTeam: "Finance Team" },
    { metricsDepartmentID: 8, subject: "New user onboarding", createdAt: daysAgo(4), status: "SUCCESS", departmentName: "Support", predictedTeam: "Support Team" },
    { metricsDepartmentID: 9, subject: "Product demo", createdAt: daysAgo(3), status: "SUCCESS", departmentName: "Sales", predictedTeam: "Sales Team" },
    { metricsDepartmentID: 10, subject: "SLA question", createdAt: daysAgo(3), status: "SUCCESS", departmentName: "Support", predictedTeam: "Support Team" },
    { metricsDepartmentID: 11, subject: "Contract change", createdAt: daysAgo(2), status: "SUCCESS", departmentName: "Sales", predictedTeam: "Sales Team" },
    { metricsDepartmentID: 12, subject: "Feature request", createdAt: daysAgo(2), status: "SUCCESS", departmentName: "Tech", predictedTeam: "Tech Team" },
    { metricsDepartmentID: 13, subject: "DB timeout", createdAt: daysAgo(1), status: "SUCCESS", departmentName: "Tech", predictedTeam: "Tech Team" },
    { metricsDepartmentID: 14, subject: "Latency spike", createdAt: daysAgo(1), status: "SUCCESS", departmentName: "Tech", predictedTeam: "Tech Team" },
    { metricsDepartmentID: 15, subject: "Slow UI", createdAt: daysAgo(0), status: "SUCCESS", departmentName: "Support", predictedTeam: "Support Team" },
    { metricsDepartmentID: 16, subject: "Export data", createdAt: daysAgo(0), status: "SUCCESS", departmentName: "Tech", predictedTeam: "Tech Team" },
    { metricsDepartmentID: 17, subject: "Wrong routing 1", createdAt: daysAgo(6), status: "FAILURE", departmentName: "Support", predictedTeam: "Sales Team" },
    { metricsDepartmentID: 18, subject: "Wrong routing 2", createdAt: daysAgo(5), status: "FAILURE", departmentName: "Sales", predictedTeam: "Support Team" },
    { metricsDepartmentID: 19, subject: "Wrong routing 3", createdAt: daysAgo(3), status: "FAILURE", departmentName: "Finance", predictedTeam: "Support Team" },
    { metricsDepartmentID: 20, subject: "Wrong routing 4", createdAt: daysAgo(2), status: "FAILURE", departmentName: "Tech", predictedTeam: "Finance Team" },
    { metricsDepartmentID: 21, subject: "Wrong routing 5", createdAt: daysAgo(1), status: "FAILURE", departmentName: "Finance", predictedTeam: "Sales Team" },
    { metricsDepartmentID: 22, subject: "Fallback 1", createdAt: daysAgo(4), status: "DEFAULTED", departmentName: "Support", predictedTeam: "Default Queue" },
    { metricsDepartmentID: 23, subject: "Fallback 2", createdAt: daysAgo(2), status: "DEFAULTED", departmentName: "Sales", predictedTeam: "Default Queue" },
    { metricsDepartmentID: 24, subject: "Extra success 1", createdAt: daysAgo(3), status: "SUCCESS", departmentName: "Support", predictedTeam: "Support Team" },
    { metricsDepartmentID: 25, subject: "Extra success 2", createdAt: daysAgo(2), status: "SUCCESS", departmentName: "Tech", predictedTeam: "Tech Team" },
    { metricsDepartmentID: 26, subject: "Extra success 3", createdAt: daysAgo(1), status: "SUCCESS", departmentName: "Finance", predictedTeam: "Finance Team" },
    { metricsDepartmentID: 27, subject: "Extra success 4", createdAt: daysAgo(0), status: "SUCCESS", departmentName: "Sales", predictedTeam: "Sales Team" },
    { metricsDepartmentID: 28, subject: "Extra success 5", createdAt: daysAgo(0), status: "SUCCESS", departmentName: "Support", predictedTeam: "Support Team" },
    { metricsDepartmentID: 29, subject: "Extra success 6", createdAt: daysAgo(1), status: "SUCCESS", departmentName: "Tech", predictedTeam: "Tech Team" },
    { metricsDepartmentID: 30, subject: "Extra success 7", createdAt: daysAgo(2), status: "SUCCESS", departmentName: "Finance", predictedTeam: "Finance Team" }
];

export const urlParams = new URLSearchParams(window.location.search);

export const SELECTED_DEPARTMENT_ID = urlParams.get("departmentId")
    ? parseInt(urlParams.get("departmentId"), 10)
    : null;

export const SELECTED_DEPARTMENT_NAME = urlParams.get("departmentName");
