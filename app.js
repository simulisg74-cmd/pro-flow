/* ==========================================================================
   STATE MANAGEMENT & INITIALIZATION
   ========================================================================== */

// Default mock data to populate the app on first run
const DEFAULT_STATIONS = {
    "Karkasas": ["Karkasas #1", "Karkasas #2"],
    "Gipso surinkimas": ["Gipso surinkimas #1"],
    "Langai": ["Langai #1"],
    "Apdaila": ["Apdaila #1", "Apdaila #2", "Apdaila #3"]
};

const DEFAULT_ORDERS = [
    {
        id: "PAN-1001",
        name: "Išorinė siena karkasinė A-1",
        qty: 1,
        priority: "Aukštas",
        stationGroup: "Karkasas",
        deadline: new Date(Date.now() + 2 * 3600000).toISOString().slice(0, 16), // 2 hours from now
        status: "Gaminama",
        assignedStation: "Karkasas #1",
        workerName: "Jonas Pavardenis",
        startedAt: Date.now() - 45 * 60 * 1000, // started 45 mins ago
        completedAt: null,
        durationSeconds: 0,
        queueType: "pamaina",
        batch: "D-1",
        type: "Pilnaviduris",
        plannedMinutes: 120
    },
    {
        id: "PAN-1002",
        name: "Pertvara vidinė V-3",
        qty: 2,
        priority: "Vidutinis",
        stationGroup: "Gipso surinkimas",
        deadline: new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 16), // 8 hours from now
        status: "Ruošiama",
        assignedStation: "",
        workerName: "",
        startedAt: null,
        completedAt: null,
        durationSeconds: 0,
        queueType: "atsarga",
        batch: "D-1",
        type: "Belanginis",
        plannedMinutes: 120
    },
    {
        id: "PAN-1003",
        name: "Apdailos skydas S-8",
        qty: 1,
        priority: "Žemas",
        stationGroup: "Apdaila",
        deadline: new Date(Date.now() - 1 * 3600000).toISOString().slice(0, 16), // 1 hour ago (Delayed!)
        status: "Planuojama",
        assignedStation: "",
        workerName: "",
        startedAt: null,
        completedAt: null,
        durationSeconds: 0,
        queueType: "pamaina",
        batch: "D-1",
        type: "Langinis",
        plannedMinutes: 120
    },
    {
        id: "PAN-1004",
        name: "Stogo gegnė G-12",
        qty: 5,
        priority: "Aukštas",
        stationGroup: "Apdaila",
        deadline: new Date(Date.now() + 24 * 3600000).toISOString().slice(0, 16),
        status: "Baigta",
        assignedStation: "Apdaila #2",
        workerName: "Tomas K.",
        startedAt: Date.now() - 3 * 3600000,
        completedAt: Date.now() - 1.5 * 3600000,
        durationSeconds: 5400, // 1.5 hours
        queueType: "pamaina",
        batch: "D-1",
        type: "Pilnaviduris",
        plannedMinutes: 120
    }
];

const DEFAULT_ALERTS = [
    {
        id: 1,
        type: "info",
        title: "Sistema paruošta",
        desc: "Gamybos planavimo programa inicializuota sėkmingai.",
        time: new Date(Date.now() - 120 * 60000).toLocaleTimeString("lt-LT", {hour: '2-digit', minute:'2-digit'})
    },
    {
        id: 2,
        type: "warning",
        title: "Užsakymas PAN-1003 vėluoja",
        desc: "Pasiektas planuotas terminas, bet gamyba dar nepradėta.",
        time: new Date(Date.now() - 60 * 60000).toLocaleTimeString("lt-LT", {hour: '2-digit', minute:'2-digit'})
    }
];

const DEFAULT_INVENTORY = {
    profiles: 150,  // Profiliai
    rails: 80,      // Bėgeliai
    windows: 20,    // Langai
    cladding: 100,  // Apdaila
    gypsum: 120,    // Gipsas
    wool: 90,       // Vata
    rubber_seal: 60, // Sandarinimo guma
    rubber_glaze: 40 // Stiklinimo guma
};

// App State
let state = {
    stations: JSON.parse(localStorage.getItem("pro_flow_stations")) || DEFAULT_STATIONS,
    orders: JSON.parse(localStorage.getItem("pro_flow_orders")) || DEFAULT_ORDERS,
    alerts: JSON.parse(localStorage.getItem("pro_flow_alerts")) || DEFAULT_ALERTS,
    inventory: JSON.parse(localStorage.getItem("pro_flow_inventory")) || DEFAULT_INVENTORY
};

// Authentication state for Master configuration
let isMasterAuthenticated = false;
// Load MASTER_PIN from localStorage or default to "4209"
let MASTER_PIN = localStorage.getItem("pro_flow_master_pin") || "4209";

// Migration: Ensure Langai station exists in current state
if (!state.stations.hasOwnProperty("Langai")) {
    const newStations = {};
    Object.keys(state.stations).forEach(key => {
        newStations[key] = state.stations[key];
        if (key === "Gipso surinkimas") {
            newStations["Langai"] = ["Langai #1"];
        }
    });
    if (!newStations.hasOwnProperty("Langai")) {
        newStations["Langai"] = ["Langai #1"];
    }
    state.stations = newStations;
    localStorage.setItem("pro_flow_stations", JSON.stringify(state.stations));
}

// Migration: Ensure new fields exist on all orders
state.orders = state.orders.map(order => {
    if (order.plannedMinutes === undefined) order.plannedMinutes = 120;
    if (!order.batch) order.batch = "D-1";
    if (!order.type) order.type = "Pilnaviduris";
    return order;
});
localStorage.setItem("pro_flow_orders", JSON.stringify(state.orders));

// Migration: Ensure new inventory fields exist
if (state.inventory) {
    let migrated = false;
    // Migrate old rubber key to rubber_seal
    if (state.inventory.hasOwnProperty("rubber") && !state.inventory.hasOwnProperty("rubber_seal")) {
        state.inventory.rubber_seal = state.inventory.rubber;
        delete state.inventory.rubber;
        migrated = true;
    }
    // Check if other new keys are missing and populate from default
    const keys = Object.keys(DEFAULT_INVENTORY);
    keys.forEach(key => {
        if (!state.inventory.hasOwnProperty(key)) {
            state.inventory[key] = DEFAULT_INVENTORY[key];
            migrated = true;
        }
    });
    if (migrated) {
        localStorage.setItem("pro_flow_inventory", JSON.stringify(state.inventory));
    }
}

// Save state helper
function saveState() {
    localStorage.setItem("pro_flow_stations", JSON.stringify(state.stations));
    localStorage.setItem("pro_flow_orders", JSON.stringify(state.orders));
    localStorage.setItem("pro_flow_alerts", JSON.stringify(state.alerts));
    localStorage.setItem("pro_flow_inventory", JSON.stringify(state.inventory));
    
    // Trigger reactive UI updates
    updateDashboardKPIs();
    updateKanbanBoard();
    updateStationsControl();
    updateOrdersTable();
    updateWorkerStationDropdown();
    updateActiveJobsList();
    updateShiftMonitor();
    if (typeof updateWarehouseTab === "function") updateWarehouseTab();
    renderCharts();
}

/* ==========================================================================
   APP INITIALIZATION & ROUTING
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
    // Initialize icons
    lucide.createIcons();
    
    // Clock setup
    setInterval(updateClock, 1000);
    updateClock();
    
    // Tab switching
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            const tabId = item.getAttribute("data-tab");
            switchTab(tabId);
        });
    });

    // Check location hash for direct linking
    let initialTab = window.location.hash.replace("#", "") || "dashboard";
    const masterTabs = ["dashboard", "shift", "kanban", "stations", "orders", "warehouse"];
    if (masterTabs.includes(initialTab) && !isMasterAuthenticated) {
        initialTab = "worker";
        window.location.hash = "worker";
    }
    switchTab(initialTab);

    // Modal Events
    setupModalEvents();

    // Workstation Quick UI events
    setupWorkstationEvents();

    // Worker Console Events
    setupWorkerConsoleEvents();

    // Order Manager Events
    setupOrderManagerEvents();

    // Matrix Batch Filter Events Sync
    const matrixFilter = document.getElementById("matrix-batch-filter");
    const warehouseFilter = document.getElementById("warehouse-batch-filter");

    const syncFiltersAndRefresh = (val) => {
        if (matrixFilter) matrixFilter.value = val;
        if (warehouseFilter) warehouseFilter.value = val;
        updateShiftMonitor();
        if (typeof updateWarehouseTab === "function") updateWarehouseTab();
    };

    if (matrixFilter) {
        matrixFilter.addEventListener("change", (e) => {
            syncFiltersAndRefresh(e.target.value);
        });
    }
    if (warehouseFilter) {
        warehouseFilter.addEventListener("change", (e) => {
            syncFiltersAndRefresh(e.target.value);
        });
    }

    // Clear Plan Event
    const btnClearPlan = document.getElementById("btn-clear-plan");
    if (btnClearPlan) {
        btnClearPlan.addEventListener("click", () => {
            if (confirm("DĖMESIO: Ar tikrai norite išvalyti visus užsakymus iš gamybos plano ir pradėti naują pamainą? Šis veiksmas ištrins visus įrašus iš lentelės.")) {
                state.orders = [];
                addSystemAlert("danger", "Išvalytas planas", "Meistras pilnai išvalė gamybos planą.");
                saveState();
                alert("Planas sėkmingai išvalytas!");
            }
        });
    }

    // CSV Import Events
    const btnImportCsv = document.getElementById("btn-import-csv");
    const csvFileInput = document.getElementById("csv-file-input");
    if (btnImportCsv && csvFileInput) {
        btnImportCsv.addEventListener("click", () => {
            csvFileInput.value = ""; // Reset value so change event fires even for same file
            csvFileInput.click();
        });
        csvFileInput.addEventListener("change", handleCSVImport);
    }

    // Warehouse left panel toggle collapse
    const btnToggleWarehouseLeft = document.getElementById("btn-toggle-warehouse-left");
    if (btnToggleWarehouseLeft) {
        btnToggleWarehouseLeft.addEventListener("click", () => {
            const layout = document.querySelector(".warehouse-layout");
            const icon = document.getElementById("toggle-warehouse-icon");
            if (layout && icon) {
                layout.classList.toggle("left-collapsed");
                const isCollapsed = layout.classList.contains("left-collapsed");
                if (isCollapsed) {
                    icon.setAttribute("data-lucide", "chevron-right");
                    btnToggleWarehouseLeft.setAttribute("title", "Išskleisti sandėlio likučius");
                } else {
                    icon.setAttribute("data-lucide", "chevron-left");
                    btnToggleWarehouseLeft.setAttribute("title", "Suskleisti sandėlio likučius");
                }
                // Refresh icons so Lucide replaces data-lucide with SVG
                lucide.createIcons();
            }
        });
    }

    // Sidebar toggle collapse
    const btnToggleSidebar = document.getElementById("btn-toggle-sidebar");
    if (btnToggleSidebar) {
        btnToggleSidebar.addEventListener("click", () => {
            const container = document.querySelector(".app-container");
            const icon = document.getElementById("toggle-sidebar-icon");
            if (container && icon) {
                container.classList.toggle("sidebar-collapsed");
                const isCollapsed = container.classList.contains("sidebar-collapsed");
                if (isCollapsed) {
                    icon.setAttribute("data-lucide", "chevron-right");
                    btnToggleSidebar.setAttribute("title", "Išskleisti meniu");
                } else {
                    icon.setAttribute("data-lucide", "chevron-left");
                    btnToggleSidebar.setAttribute("title", "Suskleisti meniu");
                }
                // Refresh icons
                lucide.createIcons();
            }
        });
    }

    // Initial render
    saveState();

    // Live counter for in-progress orders (updates every second)
    setInterval(updateLiveTimers, 1000);
});

// Clock implementation
function updateClock() {
    const clockEl = document.getElementById("clock");
    if (clockEl) {
        clockEl.textContent = new Date().toLocaleTimeString("lt-LT");
    }
}

// Tab router
function switchTab(tabId) {
    const masterTabs = ["dashboard", "shift", "kanban", "stations", "orders", "warehouse"];
    if (masterTabs.includes(tabId) && !isMasterAuthenticated) {
        const enteredPin = prompt("Įveskite meistro PIN kodą (numatytasis: 4209):");
        if (enteredPin === MASTER_PIN) {
            isMasterAuthenticated = true;
            const btnLock = document.getElementById("btn-lock-master");
            if (btnLock) btnLock.style.display = "flex";
            addSystemAlert("info", "Meistras prisijungė", "Sėkmingai autorizuotas meistro PIN kodas.");
        } else {
            if (enteredPin !== null) {
                alert("Neteisingas PIN kodas!");
            }
            return;
        }
    }

    // Hide all tabs
    document.querySelectorAll(".tab-content").forEach(tab => {
        tab.classList.remove("active-tab");
    });
    
    // Remove active state from nav items
    document.querySelectorAll(".nav-item").forEach(item => {
        item.classList.remove("active");
    });

    // Find requested tab
    const targetTab = document.getElementById(`tab-${tabId}`);
    const targetNavItem = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
    
    if (targetTab && targetNavItem) {
        targetTab.classList.add("active-tab");
        targetNavItem.classList.add("active");
        
        // Update header details
        const titleEl = document.getElementById("page-title");
        const descEl = document.getElementById("page-description");
        
        window.location.hash = tabId;

        switch (tabId) {
            case "dashboard":
                titleEl.textContent = "Prietaisų Skydelis";
                descEl.textContent = "Bendras gamybos našumas, rodikliai ir analizė.";
                renderCharts();
                break;
            case "worker":
                titleEl.textContent = "Darbuotojo Konsolė";
                descEl.textContent = "Įveskite panelės ID, pradėkite arba baikite atliekamus darbus.";
                updateWorkerStationDropdown();
                updateActiveJobsList();
                break;
            case "kanban":
                titleEl.textContent = "Gamybos Eigos Lenta";
                descEl.textContent = "Užsakymų judėjimas tarp gamybinių būsenų.";
                updateKanbanBoard();
                break;
            case "stations":
                titleEl.textContent = "Stotelių Valdymas";
                descEl.textContent = "Valdykite karkaso, gipso surinkimo ir apdailos stotelių skaičių.";
                updateStationsControl();
                // Populate current PIN in the settings input
                const pinInput = document.getElementById("form-master-pin-input");
                if (pinInput) pinInput.value = MASTER_PIN;
                break;
            case "shift":
                titleEl.textContent = "Pamainos Monitorius";
                descEl.textContent = "Gamybos plano vykdymas ir gaminio buvimo laiko stotelėse sekimas.";
                updateShiftMonitor();
                break;
            case "orders":
                titleEl.textContent = "Užsakymų Sąrašas";
                descEl.textContent = "Detalus gamybos užsakymų valdymas, redagavimas ir paieška.";
                updateOrdersTable();
                break;
            case "warehouse":
                titleEl.textContent = "Sandėlis ir Medžiagos";
                descEl.textContent = "Medžiagų atsargos, likučiai ir poreikio prognozė 24 užsakymams.";
                updateWarehouseTab();
                break;
        }
    }
}

// Alert Logging Helper
function addSystemAlert(type, title, desc) {
    const timeStr = new Date().toLocaleTimeString("lt-LT", {hour: '2-digit', minute:'2-digit'});
    const newAlert = {
        id: Date.now(),
        type,
        title,
        desc,
        time: timeStr
    };
    state.alerts.unshift(newAlert);
    if (state.alerts.length > 20) {
        state.alerts.pop(); // limit log to 20 items
    }
    saveState();
}

/* ==========================================================================
   TAB 1: DASHBOARD & CHART.JS
   ========================================================================== */
let statusChart = null;
let loadChart = null;

function updateDashboardKPIs() {
    let planned = 0;
    let active = 0;
    let completed = 0;
    let delayed = 0;
    
    const now = new Date();

    state.orders.forEach(order => {
        if (order.status === "Planuojama" || order.status === "Ruošiama") {
            planned++;
        } else if (order.status === "Gaminama" || order.status === "Kokybės kontrolė") {
            active++;
        } else if (order.status === "Baigta") {
            completed++;
        }
        
        // Check for delay
        if (order.status !== "Baigta" && order.deadline) {
            const deadlineDate = new Date(order.deadline);
            if (deadlineDate < now) {
                delayed++;
            }
        }
    });

    document.getElementById("kpi-planned").textContent = planned;
    document.getElementById("kpi-active").textContent = active;
    document.getElementById("kpi-completed").textContent = completed;
    document.getElementById("kpi-delayed").textContent = delayed;

    // Render Alerts feed
    renderAlertsFeed();
}

function renderAlertsFeed() {
    const alertsContainer = document.getElementById("alerts-container");
    if (!alertsContainer) return;

    if (state.alerts.length === 0) {
        alertsContainer.innerHTML = `<div class="empty-feed">Įspėjimų nėra. Viskas veikia pagal planą.</div>`;
        return;
    }

    alertsContainer.innerHTML = state.alerts.map(alert => {
        let iconName = "info";
        let alertClass = "alert-info";
        
        if (alert.type === "warning") {
            iconName = "alert-triangle";
            alertClass = "alert-warning";
        } else if (alert.type === "danger") {
            iconName = "x-circle";
            alertClass = "alert-danger";
        }

        return `
            <div class="alert-item ${alertClass}">
                <i data-lucide="${iconName}"></i>
                <div class="alert-content">
                    <span class="alert-title">${alert.title}</span>
                    <span class="alert-desc">${alert.desc}</span>
                </div>
                <span class="alert-time">${alert.time}</span>
            </div>
        `;
    }).join("");

    lucide.createIcons();
}

function renderCharts() {
    const ctxStatus = document.getElementById("chart-orders-status");
    const ctxLoad = document.getElementById("chart-stations-load");
    
    if (!ctxStatus || !ctxLoad) return;

    // Destroy existing charts to avoid redraw issues
    if (statusChart) statusChart.destroy();
    if (loadChart) loadChart.destroy();

    // Data compilation for status
    const statusData = {
        "Planuojama": 0,
        "Ruošiama": 0,
        "Gaminama": 0,
        "Kokybės kontrolė": 0,
        "Baigta": 0
    };
    state.orders.forEach(o => statusData[o.status]++);

    // Data compilation for sections active load
    const activeSectionData = {
        "Karkasas": 0,
        "Gipso surinkimas": 0,
        "Apdaila": 0
    };
    state.orders.forEach(o => {
        if (o.status === "Gaminama" || o.status === "Kokybės kontrolė") {
            activeSectionData[o.stationGroup]++;
        }
    });

    // Chart 1: Statuses (Doughnut)
    statusChart = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
            labels: Object.keys(statusData),
            datasets: [{
                data: Object.values(statusData),
                backgroundColor: [
                    '#3b82f6', // Planuojama
                    '#a855f7', // Ruošiama
                    '#f59e0b', // Gaminama
                    '#6366f1', // Kokybės Kontrolė
                    '#10b981'  // Baigta
                ],
                borderWidth: 1,
                borderColor: '#1e293b'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#cbd5e1', font: { family: 'Outfit', size: 11 } }
                },
                title: {
                    display: true,
                    text: 'Užsakymų Būsenos',
                    color: '#f1f5f9',
                    font: { family: 'Outfit', size: 14, weight: 'bold' }
                }
            }
        }
    });

    // Chart 2: Active Loads per Group (Bar)
    loadChart = new Chart(ctxLoad, {
        type: 'bar',
        data: {
            labels: Object.keys(activeSectionData),
            datasets: [{
                label: 'Aktyvūs Užsakymai',
                data: Object.values(activeSectionData),
                backgroundColor: 'rgba(59, 130, 246, 0.4)',
                borderColor: '#3b82f6',
                borderWidth: 1.5,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { ticks: { color: '#64748b' }, grid: { display: false } },
                y: { 
                    ticks: { color: '#64748b', stepSize: 1 }, 
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    min: 0
                }
            },
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: 'Darbo Stotelių Apkrova',
                    color: '#f1f5f9',
                    font: { family: 'Outfit', size: 14, weight: 'bold' }
                }
            }
        }
    });
}

/* ==========================================================================
   TAB 2: WORKER CONSOLE
   ========================================================================== */
let selectedWorkerOrder = null;

function updateWorkerStationDropdown() {
    const workerStationSelect = document.getElementById("worker-station");
    if (!workerStationSelect) return;

    let optionsHtml = '<option value="" disabled selected>Pasirinkite stotelę...</option>';
    
    Object.keys(state.stations).forEach(group => {
        optionsHtml += `<optgroup label="${group}">`;
        state.stations[group].forEach(station => {
            optionsHtml += `<option value="${station}">${station}</option>`;
        });
        optionsHtml += `</optgroup>`;
    });

    workerStationSelect.innerHTML = optionsHtml;
}

function setupWorkerConsoleEvents() {
    const inputId = document.getElementById("worker-panel-id");
    const btnSearch = document.getElementById("btn-worker-search");
    const btnStart = document.getElementById("btn-worker-start");
    const btnFinish = document.getElementById("btn-worker-finish");
    const workerNameInput = document.getElementById("worker-name");
    const workerStationSelect = document.getElementById("worker-station");
    const previewCard = document.getElementById("worker-order-preview");
    const errorText = document.getElementById("worker-id-error");

    if (!btnSearch) return;

    const findOrder = () => {
        const orderId = inputId.value.trim().toUpperCase();
        errorText.textContent = "";
        previewCard.classList.add("hidden");
        selectedWorkerOrder = null;

        if (!orderId) {
            errorText.textContent = "Įveskite panelės ID.";
            return;
        }

        const found = state.orders.find(o => o.id.toUpperCase() === orderId);
        if (!found) {
            errorText.textContent = `Užsakymas su ID „${orderId}“ nerastas.`;
            return;
        }

        selectedWorkerOrder = found;
        
        // Show details in preview
        document.getElementById("preview-title").textContent = `Panelė ${found.id}`;
        document.getElementById("preview-name").textContent = found.name;
        document.getElementById("preview-qty").textContent = `${found.qty} vnt.`;
        document.getElementById("preview-status").textContent = found.status;
        
        const priorityEl = document.getElementById("preview-priority");
        priorityEl.textContent = found.priority;
        priorityEl.className = "badge";
        if (found.priority === "Aukštas") priorityEl.classList.add("badge-danger");
        else if (found.priority === "Vidutinis") priorityEl.classList.add("badge-warning");
        else priorityEl.classList.add("badge-info");

        // Autocomplete form if already in progress
        if (found.status === "Gaminama") {
            workerNameInput.value = found.workerName || "";
            workerStationSelect.value = found.assignedStation || "";
        }

        previewCard.classList.remove("hidden");
    };

    btnSearch.addEventListener("click", findOrder);
    inputId.addEventListener("keypress", (e) => {
        if (e.key === "Enter") findOrder();
    });

    // QR Code scanner implementation
    const btnQr = document.getElementById("btn-worker-qr");
    const qrContainer = document.getElementById("qr-reader-container");
    const btnStopQr = document.getElementById("btn-stop-qr");
    let html5QrScanner = null;

    if (btnQr && qrContainer && btnStopQr) {
        btnQr.addEventListener("click", () => {
            qrContainer.classList.remove("hidden");
            errorText.textContent = "";

            if (html5QrScanner) {
                // If scanner already exists, try to stop it first
                try {
                    html5QrScanner.stop();
                } catch(e) {}
            }

            // Create scanner instance
            html5QrScanner = new Html5Qrcode("qr-reader");
            const config = { fps: 10, qrbox: { width: 220, height: 220 } };

            html5QrScanner.start(
                { facingMode: "environment" }, // back camera
                config,
                (decodedText) => {
                    // Success scanned callback
                    inputId.value = decodedText.trim();
                    
                    // Stop camera stream
                    html5QrScanner.stop().then(() => {
                        qrContainer.classList.add("hidden");
                        findOrder(); // Automatically load searched order
                    }).catch(err => {
                        console.error("Klaida stabdant kamerą: ", err);
                        qrContainer.classList.add("hidden");
                        findOrder();
                    });
                },
                (errorMessage) => {
                    // Quietly ignore scanning errors
                }
            ).catch(err => {
                console.error("Nepavyko paleisti kameros: ", err);
                errorText.textContent = "Klaida: Nepavyko įjungti kameros. Įsitikinkite, kad suteiktas leidimas kamerai.";
                qrContainer.classList.add("hidden");
            });
        });

        btnStopQr.addEventListener("click", () => {
            if (html5QrScanner) {
                html5QrScanner.stop().then(() => {
                    qrContainer.classList.add("hidden");
                }).catch(err => {
                    qrContainer.classList.add("hidden");
                });
            } else {
                qrContainer.classList.add("hidden");
            }
        });
    }

    // Start Work Action
    btnStart.addEventListener("click", () => {
        if (!selectedWorkerOrder) {
            errorText.textContent = "Pirmiausia suraskite panelę pagal ID.";
            return;
        }
        
        const workerName = workerNameInput.value.trim();
        const station = workerStationSelect.value;

        if (!workerName) {
            alert("Prašome įvesti darbuotojo vardą.");
            return;
        }
        if (!station) {
            alert("Prašome pasirinkti gamybos stotelę.");
            return;
        }

        if (selectedWorkerOrder.status === "Baigta") {
            alert("Ši panelė jau yra užbaigta!");
            return;
        }

        // Check if station is already busy by another order
        const stationBusy = state.orders.find(o => o.assignedStation === station && o.status === "Gaminama" && o.id !== selectedWorkerOrder.id);
        if (stationBusy) {
            alert(`Stotelė ${station} šiuo metu užimta gaminant panelę ${stationBusy.id}.`);
            return;
        }

        // Start order
        selectedWorkerOrder.status = "Gaminama";
        selectedWorkerOrder.assignedStation = station;
        selectedWorkerOrder.workerName = workerName;
        selectedWorkerOrder.startedAt = Date.now();
        selectedWorkerOrder.completedAt = null;
        selectedWorkerOrder.durationSeconds = 0;

        addSystemAlert("info", "Pradėtas darbas", `${workerName} pradėjo darbus prie panelės ${selectedWorkerOrder.id} stotelėje „${station}“.`);
        
        // Reset preview/form
        inputId.value = "";
        workerNameInput.value = "";
        workerStationSelect.value = "";
        previewCard.classList.add("hidden");
        selectedWorkerOrder = null;
        
        alert("Darbas sėkmingai pradėtas ir užregistruotas!");
    });

    // Finish Work Action
    btnFinish.addEventListener("click", () => {
        if (!selectedWorkerOrder) {
            errorText.textContent = "Pirmiausia suraskite panelę pagal ID.";
            return;
        }

        if (selectedWorkerOrder.status !== "Gaminama") {
            alert("Negalima užbaigti darbo, nes gamybos būsena nėra „Gaminama“.");
            return;
        }

        // Complete order and move to Quality Control
        selectedWorkerOrder.status = "Kokybės kontrolė";
        selectedWorkerOrder.completedAt = Date.now();
        
        // Calculate duration
        const durationMs = selectedWorkerOrder.completedAt - selectedWorkerOrder.startedAt;
        selectedWorkerOrder.durationSeconds = Math.round(durationMs / 1000);
        
        const minutes = Math.round(selectedWorkerOrder.durationSeconds / 60);

        addSystemAlert("success", "Pabaigtas darbas", `${selectedWorkerOrder.workerName} užbaigė panelės ${selectedWorkerOrder.id} gamybą stotelėje „${selectedWorkerOrder.assignedStation}“. Trukmė: ~${minutes} min.`);
        
        // Reset preview/form
        inputId.value = "";
        workerNameInput.value = "";
        workerStationSelect.value = "";
        previewCard.classList.add("hidden");
        selectedWorkerOrder = null;
        
        alert("Gamyba užbaigta ir perduota kokybės kontrolei!");
    });
}

function updateActiveJobsList() {
    const container = document.getElementById("active-jobs-container");
    if (!container) return;

    const activeOrders = state.orders.filter(o => o.status === "Gaminama");

    if (activeOrders.length === 0) {
        container.innerHTML = `<div class="empty-feed">Šiuo metu jokių aktyvių darbų stotelėse nevyksta.</div>`;
        return;
    }

    container.innerHTML = activeOrders.map(order => {
        return `
            <div class="active-job-item">
                <div class="job-main-info">
                    <div class="job-id-row">
                        <span class="badge badge-warning">GAMINAMA</span>
                        <span class="job-title">${order.id} - ${order.name}</span>
                    </div>
                    <div class="job-meta-row">
                        <span><i data-lucide="user"></i> ${order.workerName}</span>
                        <span><i data-lucide="cpu"></i> ${order.assignedStation}</span>
                    </div>
                </div>
                <div class="job-actions-right">
                    <div class="job-duration" data-start-time="${order.startedAt}">00:00:00</div>
                    <button class="btn btn-secondary btn-icon" onclick="quickFinishJob('${order.id}')" title="Užbaigti darbą">
                        <i data-lucide="check"></i>
                    </button>
                </div>
            </div>
        `;
    }).join("");

    lucide.createIcons();
    updateLiveTimers(); // Immediate ticks
}

// Global action triggered by click on check button in active jobs
window.quickFinishJob = function(orderId) {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;
    
    order.status = "Kokybės kontrolė";
    order.completedAt = Date.now();
    
    const durationMs = order.completedAt - order.startedAt;
    order.durationSeconds = Math.round(durationMs / 1000);
    const minutes = Math.round(order.durationSeconds / 60);

    addSystemAlert("success", "Pabaigtas darbas", `${order.workerName} užbaigė panelės ${order.id} gamybą stotelėje „${order.assignedStation}“. Trukmė: ~${minutes} min.`);
    alert(`Gamyba užbaigta ir perduota kokybės kontrolei!`);
};

// Tick helper for in-progress timers
function updateLiveTimers() {
    const timerEls = document.querySelectorAll(".job-duration, .kanban-timer");
    const now = Date.now();
    
    timerEls.forEach(el => {
        const startTimestamp = parseInt(el.getAttribute("data-start-time"), 10);
        if (isNaN(startTimestamp)) return;

        const diffSeconds = Math.floor((now - startTimestamp) / 1000);
        
        const hrs = Math.floor(diffSeconds / 3600);
        const mins = Math.floor((diffSeconds % 3600) / 60);
        const secs = diffSeconds % 60;
        
        const formatted = [
            hrs.toString().padStart(2, '0'),
            mins.toString().padStart(2, '0'),
            secs.toString().padStart(2, '0')
        ].join(':');

        el.textContent = formatted;
    });
}

/* ==========================================================================
   TAB 3: KANBAN BOARD
   ========================================================================== */
function updateKanbanBoard() {
    const columns = {
        "Planuojama": document.getElementById("kanban-planned"),
        "Ruošiama": document.getElementById("kanban-prep"),
        "Gaminama": document.getElementById("kanban-active"),
        "Kokybės kontrolė": document.getElementById("kanban-qc"),
        "Baigta": document.getElementById("kanban-completed")
    };

    // Keep counts
    const counts = {
        "Planuojama": 0,
        "Ruošiama": 0,
        "Gaminama": 0,
        "Kokybės kontrolė": 0,
        "Baigta": 0
    };

    // Clean columns
    Object.keys(columns).forEach(col => {
        if (columns[col]) columns[col].innerHTML = "";
    });

    state.orders.forEach(order => {
        counts[order.status]++;
        const colContainer = columns[order.status];
        if (!colContainer) return;

        const prioClass = `prio-${order.priority.toLowerCase()}`;
        
        let metaHtml = "";
        if (order.status === "Gaminama") {
            metaHtml = `
                <div class="card-worker-badge">
                    <span class="worker-dot"></span>
                    <span>${order.workerName} (${order.assignedStation})</span>
                </div>
                <div class="card-worker-badge text-muted">
                    <i data-lucide="clock"></i>
                    <span class="kanban-timer" data-start-time="${order.startedAt}">00:00:00</span>
                </div>
            `;
        } else if (order.status === "Kokybės kontrolė") {
            metaHtml = `
                <div class="card-worker-badge">
                    <span>Stotelė: ${order.assignedStation}</span>
                </div>
                <div class="card-worker-badge text-muted">
                    <span>Atliko: ${order.workerName}</span>
                </div>
            `;
        } else if (order.status === "Baigta") {
            const mins = Math.round(order.durationSeconds / 60);
            metaHtml = `
                <div class="card-worker-badge">
                    <i data-lucide="check" class="neon-text-green"></i>
                    <span>Gaminta: ${mins} min. (${order.assignedStation})</span>
                </div>
            `;
        } else {
            metaHtml = `
                <div class="card-worker-badge text-muted">
                    <span>Reikalinga sekcija: ${order.stationGroup}</span>
                </div>
            `;
        }

        const card = document.createElement("div");
        card.className = `kanban-card ${prioClass}`;
        card.innerHTML = `
            <div class="card-title-row">
                <span class="card-panel-id">${order.id}</span>
                <span class="badge ${order.priority === 'Aukštas' ? 'badge-danger' : order.priority === 'Vidutinis' ? 'badge-warning' : 'badge-info'}">${order.priority}</span>
            </div>
            <div class="card-title">${order.name}</div>
            <div class="card-details">
                <span>Kiekis: ${order.qty} vnt.</span>
                <span>Terminas: ${new Date(order.deadline).toLocaleDateString("lt-LT")} ${new Date(order.deadline).toLocaleTimeString("lt-LT", {hour:'2-digit', minute:'2-digit'})}</span>
            </div>
            ${metaHtml}
            <div class="card-actions">
                <button class="btn-card-move" onclick="moveOrderState('${order.id}', -1)" title="Perkelti atgal" ${order.status === 'Planuojama' ? 'disabled style="opacity:0.2"' : ''}>
                    <i data-lucide="chevron-left"></i>
                </button>
                <button class="btn-card-move" onclick="moveOrderState('${order.id}', 1)" title="Perkelti į priekį" ${order.status === 'Baigta' ? 'disabled style="opacity:0.2"' : ''}>
                    <i data-lucide="chevron-right"></i>
                </button>
            </div>
        `;
        
        colContainer.appendChild(card);
    });

    // Update counts headers
    document.getElementById("count-planned").textContent = counts["Planuojama"];
    document.getElementById("count-prep").textContent = counts["Ruošiama"];
    document.getElementById("count-active").textContent = counts["Gaminama"];
    document.getElementById("count-qc").textContent = counts["Kokybės kontrolė"];
    document.getElementById("count-completed").textContent = counts["Baigta"];

    lucide.createIcons();
    updateLiveTimers();
}

// Move orders manually inside Kanban using buttons
window.moveOrderState = function(orderId, direction) {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    const states = ["Planuojama", "Ruošiama", "Gaminama", "Kokybės kontrolė", "Baigta"];
    const currentIndex = states.indexOf(order.status);
    let nextIndex = currentIndex + direction;

    if (nextIndex >= 0 && nextIndex < states.length) {
        const nextStatus = states[nextIndex];
        
        // Edge cases handling:
        if (nextStatus === "Gaminama" && !order.assignedStation) {
            // Cannot start without assigning worker. Must redirect to worker console or open dialog
            const worker = prompt("Pradėti darbą rankiniu būdu. Įveskite darbuotojo vardą:");
            if (!worker) return;
            const station = prompt(`Įveskite stotelę (sekcija ${order.stationGroup}):`, `${order.stationGroup} #1`);
            if (!station) return;
            
            order.workerName = worker;
            order.assignedStation = station;
            order.startedAt = Date.now();
        }

        if (nextStatus === "Kokybės kontrolė" && order.status === "Gaminama") {
            order.completedAt = Date.now();
            const elapsed = Math.round((order.completedAt - order.startedAt) / 1000);
            order.durationSeconds = elapsed > 0 ? elapsed : 1;
        }

        order.status = nextStatus;
        addSystemAlert("info", "Būsenos keitimas", `Užsakymas ${order.id} perkeltas į būseną „${nextStatus}“.`);
    }
};

/* ==========================================================================
   TAB 4: STATIONS CONFIG (MASTER CONFIGURATION)
   ========================================================================== */
function updateStationsControl() {
    const gridContainer = document.getElementById("stations-grid-container");
    if (!gridContainer) return;

    gridContainer.innerHTML = Object.keys(state.stations).map(groupName => {
        const list = state.stations[groupName];
        
        const stationsHtml = list.map(stationName => {
            // Check if there is an active job running in this station
            const activeOrder = state.orders.find(o => o.assignedStation === stationName && o.status === "Gaminama");
            
            let statusDotClass = "idle";
            let statusText = "Laisva";
            
            if (activeOrder) {
                statusDotClass = "busy";
                statusText = `Užimta: <a href="#worker" onclick="switchTab('worker'); fillWorkerPanel('${activeOrder.id}');" class="station-panel-link">${activeOrder.id}</a>`;
            }

            return `
                <div class="station-item">
                    <div class="station-name-area">
                        <span class="station-status-dot ${statusDotClass}"></span>
                        <span class="station-label">${stationName}</span>
                    </div>
                    <span class="station-info-status">${statusText}</span>
                </div>
            `;
        }).join("");

        return `
            <div class="station-group-card glass">
                <div class="station-group-header">
                    <div class="group-title-info">
                        <h2>${groupName}</h2>
                        <span>Aktyvių stotelių skaičius: ${list.length}</span>
                    </div>
                    <div class="group-controls">
                        <button class="btn-circle" onclick="changeStationsCount('${groupName}', -1)" title="Pašalinti stotelę">
                            <i data-lucide="minus"></i>
                        </button>
                        <button class="btn-circle" onclick="changeStationsCount('${groupName}', 1)" title="Pridėti stotelę">
                            <i data-lucide="plus"></i>
                        </button>
                    </div>
                </div>
                <div class="stations-list">
                    ${stationsHtml || '<div class="text-muted text-center" style="font-size:13px; padding:10px;">Stotelių nėra įdiegta</div>'}
                </div>
            </div>
        `;
    }).join("");

    lucide.createIcons();
}

window.changeStationsCount = function(groupName, direction) {
    const currentList = state.stations[groupName] || [];

    if (direction > 0) {
        // Add new station
        const newNumber = currentList.length + 1;
        const newStationName = `${groupName} #${newNumber}`;
        currentList.push(newStationName);
        addSystemAlert("info", "Pridėta stotelė", `Meistras pridėjo naują stotelę „${newStationName}“.`);
    } else {
        // Remove last station
        if (currentList.length === 0) return;
        
        const lastStationName = currentList[currentList.length - 1];
        
        // Safety check: is there a job active in this station?
        const busyJob = state.orders.find(o => o.assignedStation === lastStationName && (o.status === "Gaminama" || o.status === "Kokybės kontrolė"));
        if (busyJob) {
            alert(`DĖMESIO: Stotelėje „${lastStationName}“ šiuo metu gaminama panelė ${busyJob.id}. Norėdami pašalinti stotelę, pirma užbaikite arba atšaukite gamybą!`);
            return;
        }

        currentList.pop();
        addSystemAlert("warning", "Pašalinta stotelė", `Meistras pašalino stotelę „${lastStationName}“.`);
    }

    state.stations[groupName] = currentList;
    saveState();
};

window.fillWorkerPanel = function(orderId) {
    const input = document.getElementById("worker-panel-id");
    if (input) {
        input.value = orderId;
        // Trigger search click manually
        document.getElementById("btn-worker-search").click();
    }
};

/* ==========================================================================
   TAB 5: ORDERS MANAGEMENT & CRUD
   ========================================================================== */
let searchFilter = "";
let statusFilter = "";
let priorityFilter = "";

function setupOrderManagerEvents() {
    const searchEl = document.getElementById("order-search");
    const filterStatusEl = document.getElementById("filter-status");
    const filterPriorityEl = document.getElementById("filter-priority");

    if (!searchEl) return;

    searchEl.addEventListener("input", (e) => {
        searchFilter = e.target.value.toLowerCase();
        updateOrdersTable();
    });

    filterStatusEl.addEventListener("change", (e) => {
        statusFilter = e.target.value;
        updateOrdersTable();
    });

    filterPriorityEl.addEventListener("change", (e) => {
        priorityFilter = e.target.value;
        updateOrdersTable();
    });
}

function updateOrdersTable() {
    const tbody = document.getElementById("orders-table-body");
    if (!tbody) return;

    const filtered = state.orders.filter(order => {
        const matchesSearch = order.id.toLowerCase().includes(searchFilter) || order.name.toLowerCase().includes(searchFilter);
        const matchesStatus = statusFilter === "" || order.status === statusFilter;
        const matchesPriority = priorityFilter === "" || order.priority === priorityFilter;
        return matchesSearch && matchesStatus && matchesPriority;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="text-align: center; padding: 30px;">Užsakymų pagal nurodytus filtrus nerasta.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(order => {
        let statusBadge = "badge-info";
        if (order.status === "Baigta") statusBadge = "badge-success";
        else if (order.status === "Ruošiama") statusBadge = "badge-purple";
        else if (order.status === "Gaminama") statusBadge = "badge-warning";
        else if (order.status === "Kokybės kontrolė") statusBadge = "badge-indigo";

        let priorityBadge = "badge-info";
        if (order.priority === "Aukštas") priorityBadge = "badge-danger";
        else if (order.priority === "Vidutinis") priorityBadge = "badge-warning";

        const stationLabel = order.assignedStation || `<span class="text-muted">${order.stationGroup} (nepriskirta)</span>`;
        
        let timingHtml = "";
        if (order.status === "Gaminama") {
            timingHtml = `<span class="job-duration" data-start-time="${order.startedAt}">-</span>`;
        } else if (order.status === "Baigta") {
            const min = Math.round(order.durationSeconds / 60);
            timingHtml = `Baigta (~${min} min)`;
        } else {
            timingHtml = `<span class="text-muted">-</span>`;
        }

        return `
            <tr>
                <td class="order-id-cell">${order.id}</td>
                <td>${order.name}</td>
                <td>${order.qty} vnt.</td>
                <td><span class="badge ${priorityBadge}">${order.priority}</span></td>
                <td>${stationLabel}</td>
                <td><span class="badge ${statusBadge}">${order.status}</span></td>
                <td>${timingHtml}</td>
                <td class="actions-cell">
                    <button class="btn-icon edit" onclick="editOrderDialog('${order.id}')" title="Redaguoti">
                        <i data-lucide="edit-2"></i>
                    </button>
                    <button class="btn-icon delete" onclick="deleteOrderAction('${order.id}')" title="Trinti">
                        <i data-lucide="trash-2"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join("");

    lucide.createIcons();
    updateLiveTimers();
}

// Delete order
window.deleteOrderAction = function(orderId) {
    if (confirm(`Ar tikrai norite pašalinti užsakymą ${orderId}?`)) {
        const initialLen = state.orders.length;
        state.orders = state.orders.filter(o => o.id !== orderId);
        if (state.orders.length < initialLen) {
            addSystemAlert("danger", "Pašalintas užsakymas", `Užsakymas ${orderId} buvo ištrintas iš sistemos.`);
        }
    }
};

/* ==========================================================================
   MODAL WINDOW & FORM CONTROLS
   ========================================================================== */
window.adjustFormDuration = function(deltaMinutes) {
    const inputVal = document.getElementById("form-order-duration");
    const displayVal = document.getElementById("form-order-duration-display");
    if (!inputVal || !displayVal) return;

    let currentMinutes = parseInt(inputVal.value, 10) || 120;
    currentMinutes = Math.max(30, currentMinutes + deltaMinutes); // minimum 30 minutes

    inputVal.value = currentMinutes;
    displayVal.value = formatDuration(currentMinutes);
};

/* ==========================================================================
   MODAL WINDOW & FORM CONTROLS
   ========================================================================== */
function setupModalEvents() {
    const modal = document.getElementById("order-modal");
    const btnQuickOrder = document.getElementById("btn-quick-new-order");
    const btnClose = document.getElementById("btn-close-modal");
    const btnCancel = document.getElementById("btn-cancel-order");
    const orderForm = document.getElementById("order-form");

    if (!modal) return;

    const openModal = () => {
        // Generate automatic ID
        document.getElementById("modal-title").textContent = "Naujas Gamybos Užsakymas";
        document.getElementById("form-order-uuid").value = "";
        
        // Auto ID proposal
        const lastNum = state.orders.reduce((max, o) => {
            const m = o.id.match(/PAN-(\d+)/);
            if (m) {
                const val = parseInt(m[1], 10);
                return val > max ? val : max;
            }
            return max;
        }, 1000);
        
        document.getElementById("form-order-id").value = `PAN-${lastNum + 1}`;
        document.getElementById("form-order-id").disabled = false;
        document.getElementById("form-order-name").value = "";
        document.getElementById("form-order-qty").value = "1";
        document.getElementById("form-order-priority").value = "Vidutinis";
        document.getElementById("form-order-station-group").value = "Karkasas";
        document.getElementById("form-order-queue-type").value = "standartinė";
        
        // New fields defaults
        const activeFilter = document.getElementById("matrix-batch-filter") ? document.getElementById("matrix-batch-filter").value : "";
        document.getElementById("form-order-batch").value = activeFilter || "D-1";
        document.getElementById("form-order-type").value = "Pilnaviduris";
        document.getElementById("form-order-duration").value = "120";
        document.getElementById("form-order-duration-display").value = "2 val. 00 min.";

        // Default deadline: tomorrow same time
        const tomorrow = new Date(Date.now() + 24 * 3600000);
        document.getElementById("form-order-deadline").value = tomorrow.toISOString().slice(0, 16);

        modal.classList.remove("hidden");
    };

    const closeModal = () => {
        modal.classList.add("hidden");
    };

    btnQuickOrder.addEventListener("click", openModal);
    btnClose.addEventListener("click", closeModal);
    btnCancel.addEventListener("click", closeModal);
    
    // Close on clicking backdrop
    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
    });

    // Form Submission
    orderForm.addEventListener("submit", (e) => {
        e.preventDefault();
        
        const uuid = document.getElementById("form-order-uuid").value;
        const id = document.getElementById("form-order-id").value.trim().toUpperCase();
        const name = document.getElementById("form-order-name").value.trim();
        const qty = parseInt(document.getElementById("form-order-qty").value, 10);
        const priority = document.getElementById("form-order-priority").value;
        const stationGroup = document.getElementById("form-order-station-group").value;
        const deadline = document.getElementById("form-order-deadline").value;
        const queueType = document.getElementById("form-order-queue-type").value;
        
        // New fields
        const batch = document.getElementById("form-order-batch").value.trim() || "D-1";
        const type = document.getElementById("form-order-type").value;
        const plannedMinutes = parseInt(document.getElementById("form-order-duration").value, 10) || 120;

        if (!id || !name || !deadline) {
            alert("Užpildykite visus privalomus laukus!");
            return;
        }

        if (uuid) {
            // Edit mode
            const order = state.orders.find(o => o.id === uuid);
            if (order) {
                order.name = name;
                order.qty = qty;
                order.priority = priority;
                order.stationGroup = stationGroup;
                order.deadline = deadline;
                order.queueType = queueType;
                order.batch = batch;
                order.type = type;
                order.plannedMinutes = plannedMinutes;
                
                addSystemAlert("info", "Užsakymas redaguotas", `Užsakymas ${id} sėkmingai atnaujintas.`);
            }
        } else {
            // Create mode
            // Check for duplicate ID
            if (state.orders.find(o => o.id.toUpperCase() === id)) {
                alert(`Užsakymas su ID „${id}“ jau egzistuoja. Pasirinkite unikalų ID.`);
                return;
            }

            const newOrder = {
                id,
                name,
                qty,
                priority,
                stationGroup,
                deadline,
                status: "Planuojama",
                assignedStation: "",
                workerName: "",
                startedAt: null,
                completedAt: null,
                durationSeconds: 0,
                queueType,
                batch,
                type,
                plannedMinutes
            };

            state.orders.push(newOrder);
            addSystemAlert("info", "Pridėtas užsakymas", `Sukurta nauja panelė ${id} (${name}).`);
        }

        saveState();
        closeModal();
    });
}

// Edit Dialog opener
window.editOrderDialog = function(orderId) {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    document.getElementById("modal-title").textContent = `Redaguoti Užsakymą ${order.id}`;
    document.getElementById("form-order-uuid").value = order.id;
    document.getElementById("form-order-id").value = order.id;
    document.getElementById("form-order-id").disabled = true; // Lock ID in edit
    
    document.getElementById("form-order-name").value = order.name;
    document.getElementById("form-order-qty").value = order.qty;
    document.getElementById("form-order-priority").value = order.priority;
    document.getElementById("form-order-station-group").value = order.stationGroup;
    document.getElementById("form-order-deadline").value = order.deadline;
    document.getElementById("form-order-queue-type").value = order.queueType || "standartinė";
    
    // New fields
    document.getElementById("form-order-batch").value = order.batch || "D-1";
    document.getElementById("form-order-type").value = order.type || "Pilnaviduris";
    document.getElementById("form-order-duration").value = order.plannedMinutes || 120;
    document.getElementById("form-order-duration-display").value = formatDuration(order.plannedMinutes || 120);

    document.getElementById("order-modal").classList.remove("hidden");
};

/* ==========================================================================
   TAB 1.5: SHIFT MONITOR (MATRICA)
   ========================================================================== */
function setupWorkstationEvents() {
    // Buttons are bound directly in HTML via inline onclick handlers
}

window.quickAddOrderForSlot = function(queueType) {
    // Open order modal
    document.getElementById("btn-quick-new-order").click();
    // Override the queue select value
    document.getElementById("form-order-queue-type").value = queueType;
};

function formatDuration(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h} val. ${m.toString().padStart(2, '0')} min.`;
}

window.adjustOrderTime = function(orderId, deltaMinutes) {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;
    if (order.plannedMinutes === undefined) order.plannedMinutes = 120;
    order.plannedMinutes = Math.max(30, order.plannedMinutes + deltaMinutes); // minimum 30 minutes
    saveState();
};

function updateMatrixBatchFilterDropdown() {
    const filterEl = document.getElementById("matrix-batch-filter");
    const warehouseFilterEl = document.getElementById("warehouse-batch-filter");

    const batches = Array.from(new Set(state.orders.map(o => o.batch).filter(b => b && b.trim())));
    batches.sort();

    let optionsHtml = '<option value="">Visi aukštai</option>';
    batches.forEach(b => {
        optionsHtml += `<option value="${b}">${b} aukštas</option>`;
    });

    const tempSelect = document.createElement("select");
    tempSelect.innerHTML = optionsHtml;

    if (filterEl && filterEl.innerHTML !== tempSelect.innerHTML) {
        const currentValue = filterEl.value;
        filterEl.innerHTML = optionsHtml;
        if (batches.includes(currentValue)) {
            filterEl.value = currentValue;
        } else {
            filterEl.value = "";
        }
    }

    if (warehouseFilterEl && warehouseFilterEl.innerHTML !== tempSelect.innerHTML) {
        const currentValue = warehouseFilterEl.value;
        warehouseFilterEl.innerHTML = optionsHtml;
        if (batches.includes(currentValue)) {
            warehouseFilterEl.value = currentValue;
        } else {
            warehouseFilterEl.value = "";
        }
    }
}

function updateShiftMonitor() {
    updateMatrixBatchFilterDropdown();
    const headerRow = document.getElementById("matrix-header-row");
    const bodyEl = document.getElementById("matrix-body-el");
    if (!headerRow || !bodyEl) return;

    // 1. Gather all stations in order
    const allStations = [];
    Object.keys(state.stations).forEach(group => {
        state.stations[group].forEach(station => {
            allStations.push(station);
        });
    });

    // 2. Render table header
    let headerHtml = `
        <th>Partija (Aukštas)</th>
        <th>Panelės ID</th>
        <th>Tipas</th>
        <th>Planuota</th>
    `;
    allStations.forEach(station => {
        headerHtml += `<th>${station}</th>`;
    });
    headerRow.innerHTML = headerHtml;

    // 3. Filter orders and pad to exactly 12 items for shift and 12 items for queue
    const activeBatchFilter = document.getElementById("matrix-batch-filter") ? document.getElementById("matrix-batch-filter").value : "";
    
    let shiftOrders = [];
    let queueOrders = [];

    if (activeBatchFilter) {
        // If a specific floor is selected, take all panels for that floor in order
        // and dynamically map them to the 12 shift and 12 reserve slots
        const clonedOrders = state.orders.filter(o => o.batch === activeBatchFilter).map(o => ({ ...o }));
        shiftOrders = clonedOrders.slice(0, 12);
        queueOrders = clonedOrders.slice(12, 24);
        
        shiftOrders.forEach(o => o.queueType = "pamaina");
        queueOrders.forEach(o => o.queueType = "atsarga");
    } else {
        // If "Visi aukštai" is selected, filter by the static queueType assigned to them
        shiftOrders = state.orders.filter(o => o.queueType === "pamaina");
        queueOrders = state.orders.filter(o => o.queueType === "atsarga");
    }

    const paddedShift = [...shiftOrders];
    while (paddedShift.length < 12) {
        paddedShift.push({
            isPlaceholder: true,
            id: `Pamainos vieta #${paddedShift.length + 1}`,
            name: "Laukia priskyrimo...",
            priority: "-",
            stationGroup: "-",
            queueType: "pamaina"
        });
    }

    const paddedQueue = [...queueOrders];
    while (paddedQueue.length < 12) {
        paddedQueue.push({
            isPlaceholder: true,
            id: `Atsargos vieta #${paddedQueue.length + 1}`,
            name: "Laukia paruošimo...",
            priority: "-",
            stationGroup: "-",
            queueType: "atsarga"
        });
    }

    const monitorOrders = [...paddedShift, ...paddedQueue];

    // 4. Render rows
    bodyEl.innerHTML = monitorOrders.map(order => {
        const stationColsHtml = allStations.map(station => {
            if (order.isPlaceholder) {
                return `<td class="matrix-cell-empty" style="color: rgba(255,255,255,0.05); font-style: italic;">-</td>`;
            }
            
            const isActiveHere = order.assignedStation === station && (order.status === "Gaminama" || order.status === "Kokybės kontrolė" || order.status === "Baigta");
            
            if (isActiveHere) {
                let cellClass = "";
                let cellInner = "";
                
                if (order.status === "Gaminama") {
                    cellClass = "state-gaminama";
                    cellInner = `
                        <div class="matrix-cell-content">
                            <span class="matrix-worker">👤 ${order.workerName}</span>
                            <span class="matrix-time kanban-timer" data-start-time="${order.startedAt}">00:00:00</span>
                        </div>
                    `;
                } else if (order.status === "Kokybės kontrolė") {
                    cellClass = "state-qc";
                    cellInner = `
                        <div class="matrix-cell-content">
                            <span class="matrix-worker">👤 ${order.workerName}</span>
                            <span class="matrix-time">QC (Kontrolė)</span>
                        </div>
                    `;
                } else if (order.status === "Baigta") {
                    cellClass = "state-baigta";
                    const min = Math.round(order.durationSeconds / 60);
                    cellInner = `
                        <div class="matrix-cell-content">
                            <span class="matrix-worker">👤 ${order.workerName}</span>
                            <span class="matrix-time">Baigta (~${min} m.)</span>
                        </div>
                    `;
                }

                return `<td class="matrix-cell-highlight ${cellClass}">${cellInner}</td>`;
            } else {
                return `<td class="matrix-cell-empty">-</td>`;
            }
        }).join("");

        if (order.isPlaceholder) {
            // Render placeholder row
            return `
                <tr class="placeholder-row" style="opacity: 0.35; border-bottom: 1px dashed rgba(255, 255, 255, 0.05);">
                    <td colspan="4" class="text-muted" style="font-weight: 500;">
                        <i data-lucide="plus-circle" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle; margin-right: 8px; color: var(--neon-blue); cursor: pointer;" onclick="quickAddOrderForSlot('${order.queueType}')" title="Priskirti gaminį šiai vietai"></i>
                        ${order.id} <span style="font-size: 11px; font-weight: 400; font-style: italic;">(${order.name})</span>
                    </td>
                    ${stationColsHtml}
                </tr>
            `;
        }

        // Real order row rendering
        const plannedText = formatDuration(order.plannedMinutes || 120);

        return `
            <tr>
                <td><strong>${order.batch || 'D-1'}</strong></td>
                <td class="order-id-cell"><strong>${order.id}</strong></td>
                <td><span class="badge badge-info" style="font-weight:600; text-transform:none;">${order.type || 'Pilnaviduris'}</span></td>
                <td>
                    <div class="quick-time-adjuster">
                        <button class="btn-time-adjust" onclick="adjustOrderTime('${order.id}', -30)" title="Sumažinti 30 min.">-</button>
                        <span class="adjust-time-val">${plannedText}</span>
                        <button class="btn-time-adjust" onclick="adjustOrderTime('${order.id}', 30)" title="Padidinti 30 min.">+</button>
                    </div>
                </td>
                ${stationColsHtml}
            </tr>
        `;
    }).join("");

    // 5. Update shift capacity stats
    const completedShift = shiftOrders.filter(o => o.status === "Baigta").length;
    const completedQueue = queueOrders.filter(o => o.status === "Baigta").length;

    // Shift progress
    const shiftCountEl = document.getElementById("shift-plan-count");
    const shiftProgressEl = document.getElementById("shift-plan-progress");
    if (shiftCountEl && shiftProgressEl) {
        const percent = Math.min(100, (shiftOrders.length / 12) * 100);
        shiftProgressEl.style.width = `${percent}%`;
        shiftCountEl.innerHTML = `<strong>${shiftOrders.length}</strong> / 12 priskirta <small>(${completedShift} pagaminta)</small>`;
    }

    // Queue progress
    const queueCountEl = document.getElementById("shift-queue-count");
    const queueProgressEl = document.getElementById("shift-queue-progress");
    if (queueCountEl && queueProgressEl) {
        const percent = Math.min(100, (queueOrders.length / 12) * 100);
        queueProgressEl.style.width = `${percent}%`;
        queueCountEl.innerHTML = `<strong>${queueOrders.length}</strong> / 12 priskirta <small>(${queueOrders.filter(o => o.status === 'Ruošiama').length} paruošta eilėje)</small>`;
    }

    lucide.createIcons();
    updateLiveTimers();
}

function handleCSVImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");

    const reader = new FileReader();

    if (isExcel) {
        // Read Excel binary
        reader.onload = function(evt) {
            try {
                const data = new Uint8Array(evt.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                // Read first sheet
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                // Convert sheet to JSON array of arrays
                const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                
                if (rows.length < 2) {
                    alert("Excel failas tuščias arba netinkamas.");
                    return;
                }
                processImportRows(rows);
            } catch (err) {
                console.error(err);
                alert("Nepavyko nuskaityti Excel failo. Klaida: " + err.message + "\n\nPasitikrinkite, ar atnaujinote puslapį su Ctrl+F5.");
            }
        };
        reader.readAsArrayBuffer(file);
    } else {
        // Read CSV text
        reader.onload = function(evt) {
            const text = evt.target.result;
            const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
            if (lines.length < 2) {
                alert("CSV failas tuščias arba netinkamas. Turi būti bent antraštė ir viena duomenų eilutė.");
                return;
            }

            // Detect separator (comma or semicolon)
            const firstLine = lines[0];
            const commaCount = (firstLine.match(/,/g) || []).length;
            const semicolonCount = (firstLine.match(/;/g) || []).length;
            const separator = semicolonCount >= commaCount ? ";" : ",";

            const rows = lines.map(line => parseCSVLine(line, separator));
            processImportRows(rows);
        };
        reader.readAsText(file);
    }
}

function processImportRows(rows) {
    // 1. Surandame, kurioje eilutėje prasideda antraštė (ieškome stulpelio su ID/Panel ID)
    let headerRowIndex = -1;
    let idxId = -1;

    for (let r = 0; r < Math.min(rows.length, 15); r++) {
        const tempHeaders = Array.from(rows[r] || []).map(h => {
            if (h === undefined || h === null) return "";
            return String(h).toLowerCase().replace(/[^a-z0-9]/g, ""); // paliekame tik raides ir skaičius
        });
        
        const tempIdx = tempHeaders.findIndex(h => h.includes("panelid") || h === "id" || h.includes("kodas") || h.includes("gaminioid"));
        if (tempIdx !== -1) {
            headerRowIndex = r;
            idxId = tempIdx;
            break;
        }
    }

    if (headerRowIndex === -1) {
        alert(`Nenustatyti privalomi stulpeliai.\n\nFailo antraštėje turi būti bent stulpelis „Panel ID“ (arba ID, kodas).\n\nPatikrinkite, ar failas nėra tuščias ir ar teisingi stulpelių pavadinimai.`);
        return;
    }

    // 2. Nuskaitome antraštes iš surastos eilutės
    const rawHeaders = Array.from(rows[headerRowIndex]).map(h => String(h || "").toLowerCase().trim());
    const cleanHeaders = rawHeaders.map(h => h.replace(/[^a-z0-9]/g, ""));

    // Stulpelių indeksų paieška
    let idxNameTemp = cleanHeaders.findIndex(h => h.includes("paneltype") || h.includes("gaminys") || h.includes("pavadinimas") || h === "name");
    if (idxNameTemp === -1) {
        idxNameTemp = cleanHeaders.findIndex(h => h === "type" || h === "tipas");
    }
    const idxName = idxNameTemp;

    const idxPanelType = cleanHeaders.findIndex((h, idx) => (h === "type" || h === "tipas") && idx !== idxId);
    const idxBatch = cleanHeaders.findIndex(h => h === "batch" || h === "partija" || h.includes("aukst"));

    const idxQty = cleanHeaders.findIndex(h => h.includes("kiekis") || h.includes("qty") || h.includes("kiek"));
    const idxPrio = cleanHeaders.findIndex(h => h.includes("prioritetas") || h.includes("prio") || h.includes("priority"));
    const idxGroup = cleanHeaders.findIndex(h => h.includes("sekcija") || h.includes("grupe") || h.includes("station") || h.includes("group"));
    const idxDeadline = cleanHeaders.findIndex(h => h.includes("terminas") || h.includes("deadline") || h.includes("data"));
    
    // Find gamybos eilės tipas (pamaina / atsarga)
    const idxQueueType = cleanHeaders.findIndex(h => h.includes("eile") || h.includes("queue") || h.includes("plano"));

    let importedCount = 0;
    let updatedCount = 0;
    let validRowIndex = 0;

    // Pradedame nuskaityti duomenis iš eilutės po antraštės
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
        // Paverčiame eilutės elementus į dense masyvą
        const cols = Array.from(rows[i] || []).map(c => String(c === undefined || c === null ? "" : c).trim());
        if (cols.length < 2 || !cols[idxId]) continue;

        const id = cols[idxId];
        const name = idxName !== -1 && cols[idxName] ? cols[idxName] : (idxPanelType !== -1 && cols[idxPanelType] ? cols[idxPanelType] : "Panelė " + id);
        if (!id || !name) continue;

        const qty = idxQty !== -1 && cols[idxQty] ? parseInt(cols[idxQty], 10) || 1 : 1;
        const batch = idxBatch !== -1 && cols[idxBatch] ? cols[idxBatch] : "D-1";
        
        // Type translation
        let rawType = idxPanelType !== -1 && cols[idxPanelType] ? cols[idxPanelType].toLowerCase() : "upstand";
        let typeTranslated = "Pilnaviduris"; // Default fallback
        if (rawType.includes("window") || rawType.includes("lang")) {
            typeTranslated = "Langinis";
        } else if (rawType.includes("opaque") || rawType.includes("belang") || rawType.includes("akl")) {
            typeTranslated = "Belanginis";
        } else if (rawType.includes("upstand") || rawType.includes("piln") || rawType.includes("parap")) {
            typeTranslated = "Pilnaviduris";
        } else {
            typeTranslated = rawType.charAt(0).toUpperCase() + rawType.slice(1);
        }

        // Priority parsing
        let priority = "Vidutinis";
        if (idxPrio !== -1 && cols[idxPrio]) {
            const pVal = cols[idxPrio].toLowerCase();
            if (pVal.includes("aukš") || pVal.includes("aukst") || pVal.includes("high")) priority = "Aukštas";
            else if (pVal.includes("žem") || pVal.includes("zem") || pVal.includes("low")) priority = "Žemas";
        }

        // Section parsing
        let stationGroup = "Karkasas";
        if (idxGroup !== -1 && cols[idxGroup]) {
            const gVal = cols[idxGroup].toLowerCase();
            if (gVal.includes("gips") || gVal.includes("surink")) stationGroup = "Gipso surinkimas";
            else if (gVal.includes("lang") || gVal.includes("wind")) stationGroup = "Langai";
            else if (gVal.includes("apd") || gVal.includes("fin")) stationGroup = "Apdaila";
        }

        // Deadline parsing
        let deadline = "";
        if (idxDeadline !== -1 && cols[idxDeadline]) {
            const dVal = cols[idxDeadline];
            const dParsed = Date.parse(dVal);
            if (!isNaN(dParsed)) {
                deadline = new Date(dParsed).toISOString().slice(0, 16);
            }
        }
        if (!deadline) {
            // Default: tomorrow
            deadline = new Date(Date.now() + 24 * 3600000).toISOString().slice(0, 16);
        }

        // Queue type parsing (pamaina / atsarga)
        let queueType = "standartinė";
        if (idxQueueType !== -1 && cols[idxQueueType]) {
            const tVal = cols[idxQueueType].toLowerCase();
            if (tVal.includes("pamain") || tVal.includes("shift")) queueType = "pamaina";
            else if (tVal.includes("atsarg") || tVal.includes("queue") || tVal.includes("atsarga")) queueType = "atsarga";
        } else {
            // Auto distribute: first 12 valid panels go to shift, next 12 to reserve
            if (validRowIndex < 12) {
                queueType = "pamaina";
            } else if (validRowIndex < 24) {
                queueType = "atsarga";
            }
        }

        const existingOrder = state.orders.find(o => o.id === id);
        if (existingOrder) {
            // Update
            existingOrder.name = name;
            existingOrder.qty = qty;
            existingOrder.priority = priority;
            existingOrder.stationGroup = stationGroup;
            existingOrder.deadline = deadline;
            existingOrder.queueType = queueType;
            existingOrder.batch = batch;
            existingOrder.type = typeTranslated;
            existingOrder.plannedMinutes = 120; // reset/default to 2 hours
            updatedCount++;
        } else {
            // Create new
            state.orders.push({
                id,
                name,
                qty,
                priority,
                stationGroup,
                deadline,
                status: "Planuojama",
                assignedStation: "",
                workerName: "",
                startedAt: null,
                completedAt: null,
                durationSeconds: 0,
                queueType,
                batch,
                type: typeTranslated,
                plannedMinutes: 120
            });
            importedCount++;
        }
        
        validRowIndex++;
    }

    if (importedCount > 0 || updatedCount > 0) {
        addSystemAlert("info", "Importuotas planas", `Įkelta ${importedCount} naujų užsakymų, atnaujinta ${updatedCount} užsakymai.`);
        saveState();
        alert(`Sėkmingai atlikta!\nUžpildyta vietų plane: ${validRowIndex}\nNaujų užsakymų sukurta: ${importedCount}\nEsamų užsakymų atnaujinta: ${updatedCount}`);
    } else {
        alert("Failas nuskaitytas, bet jokių galiojančių užsakymų nerasta.");
    }
}

// Helper to parse CSV lines handling quotes
function parseCSVLine(text, separator) {
    const result = [];
    let start = 0;
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        if (text[i] === '"') {
            inQuotes = !inQuotes;
        } else if (text[i] === separator && !inQuotes) {
            let col = text.substring(start, i).trim();
            if (col.startsWith('"') && col.endsWith('"')) {
                col = col.substring(1, col.length - 1);
            }
            result.push(col.replace(/""/g, '"'));
            start = i + 1;
        }
    }
    let lastCol = text.substring(start).trim();
    if (lastCol.startsWith('"') && lastCol.endsWith('"')) {
        lastCol = lastCol.substring(1, lastCol.length - 1);
    }
    result.push(lastCol.replace(/""/g, '"'));
    return result;
}

/* ==========================================================================
   TAB 6: WAREHOUSE & MATERIALS MANAGEMENT LOGIC
   ========================================================================== */

const MATERIAL_RECIPES = {
    "Pilnaviduris": {
        profiles: 4,
        rails: 2,
        windows: 0,
        cladding: 2,
        gypsum: 4,
        wool: 2,
        rubber_seal: 2,
        rubber_glaze: 0
    },
    "Langinis": {
        profiles: 6,
        rails: 2,
        windows: 1,
        cladding: 1,
        gypsum: 2,
        wool: 1,
        rubber_seal: 2,
        rubber_glaze: 4
    },
    "Belanginis": {
        profiles: 4,
        rails: 2,
        windows: 0,
        cladding: 2,
        gypsum: 4,
        wool: 2,
        rubber_seal: 2,
        rubber_glaze: 0
    }
};

function getMaterialNameLT(key) {
    const names = {
        profiles: "Profiliai",
        rails: "Bėgeliai",
        windows: "Langai",
        cladding: "Apdaila",
        gypsum: "Gipsas",
        wool: "Vata",
        rubber_seal: "Sandarinimo guma",
        rubber_glaze: "Stiklinimo guma"
    };
    return names[key] || key;
}

function getRecipeString(recipe) {
    const parts = [];
    if (recipe.profiles) parts.push(`${recipe.profiles} prof.`);
    if (recipe.rails) parts.push(`${recipe.rails} bėg.`);
    if (recipe.windows) parts.push(`${recipe.windows} lang.`);
    if (recipe.cladding) parts.push(`${recipe.cladding} apd.`);
    if (recipe.gypsum) parts.push(`${recipe.gypsum} gips.`);
    if (recipe.wool) parts.push(`${recipe.wool} vat.`);
    if (recipe.rubber_seal) parts.push(`${recipe.rubber_seal} sand. guma`);
    if (recipe.rubber_glaze) parts.push(`${recipe.rubber_glaze} stikl. guma`);
    return parts.join(", ");
}

function updateWarehouseTab() {
    // 1. Sync inventory inputs from state
    const keys = ["profiles", "rails", "windows", "cladding", "gypsum", "wool", "rubber_seal", "rubber_glaze"];
    keys.forEach(key => {
        const inputEl = document.getElementById(`inv-${key}`);
        if (inputEl) {
            inputEl.value = state.inventory[key] !== undefined ? state.inventory[key] : 0;
        }
    });

    // 2. Filter shift and reserve orders
    const activeBatchFilter = document.getElementById("matrix-batch-filter") ? document.getElementById("matrix-batch-filter").value : "";
    
    let shiftOrders = [];
    let queueOrders = [];

    if (activeBatchFilter) {
        // If a specific floor is selected, take all panels for that floor in order
        // and dynamically map them to the 12 shift and 12 reserve slots
        const clonedOrders = state.orders.filter(o => o.batch === activeBatchFilter).map(o => ({ ...o }));
        shiftOrders = clonedOrders.slice(0, 12);
        queueOrders = clonedOrders.slice(12, 24);
        
        shiftOrders.forEach(o => o.queueType = "pamaina");
        queueOrders.forEach(o => o.queueType = "atsarga");
    } else {
        // If "Visi aukštai" is selected, filter by the static queueType assigned to them
        shiftOrders = state.orders.filter(o => o.queueType === "pamaina");
        queueOrders = state.orders.filter(o => o.queueType === "atsarga");
    }

    // Filter out placeholders
    const activeOrders = [...shiftOrders, ...queueOrders].filter(o => !o.isPlaceholder);

    const tbody = document.getElementById("warehouse-matrix-body");
    if (!tbody) return;

    if (activeOrders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" class="text-center text-muted" style="text-align: center; padding: 30px;">Gamybos planas tuščias. Nėra planuojamų gaminių medžiagų patikrai.</td></tr>`;
        const badgeEl = document.getElementById("warehouse-totals-badge");
        if (badgeEl) {
            badgeEl.className = "badge badge-info";
            badgeEl.textContent = "Planuojamų gaminių nėra";
        }
        return;
    }

    // 3. Cumulative simulation
    let currentStock = { ...state.inventory };
    let totalRequired = {
        profiles: 0,
        rails: 0,
        windows: 0,
        cladding: 0,
        gypsum: 0,
        wool: 0,
        rubber_seal: 0,
        rubber_glaze: 0
    };

    let rowsHtml = "";
    activeOrders.forEach((order, idx) => {
        const orderIndex = idx + 1;
        const isCompleted = order.status === "Baigta";
        const type = order.type || "Pilnaviduris";
        const recipe = MATERIAL_RECIPES[type] || MATERIAL_RECIPES["Pilnaviduris"];
        const qty = order.qty || 1;

        let cellsHtml = [];
        const materialKeys = ["profiles", "rails", "windows", "cladding", "gypsum", "wool", "rubber_seal", "rubber_glaze"];

        materialKeys.forEach(matKey => {
            const reqVal = (recipe[matKey] || 0) * qty;

            if (isCompleted) {
                if (reqVal > 0) {
                    cellsHtml.push(`<td class="text-center" style="text-align: center;"><span style="color: var(--neon-green); opacity: 0.5;">✓</span></td>`);
                } else {
                    cellsHtml.push(`<td class="text-center" style="text-align: center; opacity: 0.25;">-</td>`);
                }
                return;
            }

            if (reqVal === 0) {
                cellsHtml.push(`<td class="text-center" style="text-align: center; opacity: 0.25;">-</td>`);
                return;
            }

            totalRequired[matKey] += reqVal;

            if (currentStock[matKey] >= reqVal) {
                currentStock[matKey] -= reqVal;
                cellsHtml.push(`<td class="text-center" style="text-align: center;"><span style="color: var(--neon-green); font-weight: bold; filter: drop-shadow(0 0 3px rgba(16,185,129,0.3));" title="Yra (Reikia ${reqVal})">✓</span></td>`);
            } else {
                const missingQty = reqVal - Math.max(0, currentStock[matKey]);
                currentStock[matKey] -= reqVal;
                cellsHtml.push(`<td class="text-center" style="text-align: center;"><span style="color: var(--neon-red); font-weight: bold; filter: drop-shadow(0 0 3px rgba(239,68,68,0.3));" title="Trūksta ${missingQty} vnt. (Reikia ${reqVal})">✗ <small style="font-size: 10px; font-weight: 500;">(-${missingQty})</small></span></td>`);
            }
        });

        let statusText = "";
        let statusClass = "";

        if (isCompleted) {
            statusText = "🟢 Pagaminta";
            statusClass = "status-completed";
        } else {
            let orderHasDeficit = false;
            let missingSummary = [];

            Object.keys(recipe).forEach(matKey => {
                const reqVal = recipe[matKey] * qty;
                if (reqVal > 0) {
                    const stockAfter = currentStock[matKey];
                    if (stockAfter < 0) {
                        orderHasDeficit = true;
                        const deficit = Math.min(reqVal, -stockAfter);
                        missingSummary.push(`${getMaterialNameLT(matKey)} (${deficit} vnt.)`);
                    }
                }
            });

            if (!orderHasDeficit) {
                statusText = "🟢 Paruošta";
                statusClass = "status-ready";
            } else {
                statusText = `🔴 Trūksta: ${missingSummary.join(", ")}`;
                statusClass = "status-missing";
            }
        }

        const queueGroupText = order.queueType === "pamaina" ? "Pamaina" : "Atsarga";

        rowsHtml += `
            <tr class="${isCompleted ? 'opacity-50' : ''}">
                <td>${orderIndex} <small class="text-muted">(${queueGroupText})</small></td>
                <td class="order-id-cell"><strong>${order.id}</strong></td>
                <td><span class="badge badge-info" style="font-weight: 600; text-transform: none;">${type}</span></td>
                ${cellsHtml.join("")}
                <td class="${statusClass}"><strong>${statusText}</strong></td>
            </tr>
        `;
    });

    tbody.innerHTML = rowsHtml;

    // 4. Update overall summary
    let overallDeficit = [];
    Object.keys(totalRequired).forEach(matKey => {
        if (state.inventory[matKey] < totalRequired[matKey]) {
            const diff = totalRequired[matKey] - state.inventory[matKey];
            overallDeficit.push(`${getMaterialNameLT(matKey)} (${diff} vnt.)`);
        }
    });

    const badgeEl = document.getElementById("warehouse-totals-badge");
    if (badgeEl) {
        if (overallDeficit.length === 0) {
            badgeEl.className = "badge badge-success";
            badgeEl.textContent = "🟢 Medžiagų pakanka visam planui!";
        } else {
            badgeEl.className = "badge badge-danger";
            badgeEl.textContent = `🔴 Trūksta gamybai: ${overallDeficit.join(", ")}`;
        }
    }
}

window.adjustInventory = function(item, delta) {
    if (state.inventory[item] === undefined) {
        state.inventory[item] = 0;
    }
    state.inventory[item] = Math.max(0, state.inventory[item] + delta);
    saveState();
};

window.onInventoryInputChange = function(item) {
    const inputEl = document.getElementById(`inv-${item}`);
    if (inputEl) {
        const val = parseInt(inputEl.value, 10);
        state.inventory[item] = isNaN(val) ? 0 : Math.max(0, val);
        saveState();
    }
};

window.lockMasterViews = function() {
    isMasterAuthenticated = false;
    const btnLock = document.getElementById("btn-lock-master");
    if (btnLock) btnLock.style.display = "none";
    switchTab("worker");
    addSystemAlert("warning", "Valdymas užrakintas", "Meistras atsijungė iš valdymo sistemos.");
    alert("Valdymas sėkmingai užrakintas. Grąžinama darbuotojo konsolė.");
};

window.updateMasterPinAction = function() {
    const pinInput = document.getElementById("form-master-pin-input");
    if (!pinInput) return;
    const newPin = pinInput.value.trim();
    if (!newPin) {
        alert("PIN kodas negali būti tuščias!");
        return;
    }
    MASTER_PIN = newPin;
    localStorage.setItem("pro_flow_master_pin", newPin);
    addSystemAlert("success", "Pakeistas PIN kodas", "Meistras atnaujino apsaugos PIN kodą.");
    alert(`PIN kodas sėkmingai pakeistas į: ${newPin}`);
};
