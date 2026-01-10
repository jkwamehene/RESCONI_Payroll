// Global Variables
let employees = [];
let currentAllowances = []; // Temporary storage for the "Add Employee" form

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    loadEmployees();
    updateDashboard();
    updateEmployeeTable();
    populateEmployeeSelect();

    // Form submit handler
    const employeeForm = document.getElementById('employeeForm');
    if (employeeForm) {
        employeeForm.addEventListener('submit', handleFormSubmit);
    }
});

// --- Section Navigation ---
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
    const target = document.getElementById(sectionId);
    if (target) target.classList.add('active');

    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('onclick')?.includes(sectionId)) link.classList.add('active');
    });
}

// --- Flexible Allowance Logic ---
function addAllowanceRow() {
    const type = document.getElementById('allowanceType').value;
    const amount = parseFloat(document.getElementById('allowanceAmount').value) || 0;

    if (amount > 0) {
        currentAllowances.push({ type, amount });
        renderAllowanceList();
        document.getElementById('allowanceAmount').value = '';
        updateCalculations();
    } else {
        alert("Please enter a valid amount.");
    }
}

function removeAllowance(index) {
    currentAllowances.splice(index, 1);
    renderAllowanceList();
    updateCalculations();
}

function renderAllowanceList() {
    const list = document.getElementById('allowanceList');
    list.innerHTML = currentAllowances.map((item, index) => `
        <div class="d-flex justify-content-between align-items-center bg-white p-2 mb-2 border-start border-primary border-4 shadow-sm rounded">
            <span class="small"><strong>${item.type}:</strong> GHS ${formatCurrency(item.amount)}</span>
            <button type="button" class="btn btn-sm text-danger p-0" onclick="removeAllowance(${index})">
                <i class="fas fa-times-circle"></i>
            </button>
        </div>
    `).join('');
}

// --- Payroll Engine (Updated for Flexible Allowances) ---
function calculatePayroll(basicSalary, allowancesArray) {
    const basic = parseFloat(basicSalary) || 0;
    const totalAllowances = allowancesArray.reduce((sum, a) => sum + a.amount, 0);

    // Gross Pay
    const grossPay = basic + totalAllowances;

    // Deductions (Ghana Statutory)
    const ssnitT1Employee = basic * 0.055; 
    const nhisEmployee = basic * 0.025; 

    // Taxable Income = Gross - SSNIT
    const taxableIncome = grossPay - ssnitT1Employee;

    // PAYE Calculation
    const paye = calculatePAYE(taxableIncome);

    const totalDeductions = ssnitT1Employee + nhisEmployee + paye;
    const netPay = grossPay - totalDeductions;

    return {
        grossPay,
        ssnitT1Employee,
        nhisEmployee,
        paye,
        taxableIncome,
        totalDeductions,
        netPay
    };
}

function calculatePAYE(income) {
    let tax = 0;
    if (income <= 402) tax = 0;
    else if (income <= 512) tax = (income - 402) * 0.05;
    else if (income <= 642) tax = 5.5 + (income - 512) * 0.10;
    else if (income <= 3642) tax = 18.5 + (income - 642) * 0.175;
    else if (income <= 20000) tax = 543.5 + (income - 3642) * 0.25;
    else if (income <= 50000) tax = 4633 + (income - 20000) * 0.30;
    else tax = 13633 + (income - 50000) * 0.35;
    return tax;
}

// --- UI Logic ---
function updateCalculations() {
    const basic = document.getElementById('basicSalary').value;
    const payroll = calculatePayroll(basic, currentAllowances);

    document.getElementById('calcSsnit').textContent = "GHS " + formatCurrency(payroll.ssnitT1Employee);
    document.getElementById('calcTaxable').textContent = "GHS " + formatCurrency(payroll.taxableIncome);
    document.getElementById('calcPaye').textContent = "GHS " + formatCurrency(payroll.paye);
    document.getElementById('calcGross').textContent = "GHS " + formatCurrency(payroll.grossPay);
    document.getElementById('calcNet').textContent = "GHS " + formatCurrency(payroll.netPay);
}

function handleFormSubmit(e) {
    e.preventDefault();
    const empId = document.getElementById('employeeId').value;
    const basic = document.getElementById('basicSalary').value;
    
    const payroll = calculatePayroll(basic, currentAllowances);

    const employeeData = {
        employeeId: empId,
        fullName: document.getElementById('fullName').value,
        position: document.getElementById('position').value,
        ghanaCard: document.getElementById('ghanaCard').value,
        tin: document.getElementById('tin').value,
        basicSalary: parseFloat(basic),
        allowances: [...currentAllowances], // Copy the array
        ...payroll
    };

    const idx = employees.findIndex(emp => emp.employeeId === empId);
    if (idx !== -1) employees[idx] = employeeData;
    else employees.push(employeeData);

    saveEmployees();
    resetEmployeeForm();
    showSection('dashboard');
    updateDashboard();
    updateEmployeeTable();
    populateEmployeeSelect();
}

function resetEmployeeForm() {
    document.getElementById('employeeForm').reset();
    currentAllowances = [];
    renderAllowanceList();
    updateCalculations();
}

// --- Data Persistence ---
function loadEmployees() {
    const stored = localStorage.getItem('resconi_employees');
    if (stored) employees = JSON.parse(stored);
}

function saveEmployees() {
    localStorage.setItem('resconi_employees', JSON.stringify(employees));
}

// --- Payslip Generator (Professional Columnar Layout) ---
function generatePayslip(employee) {
    const now = new Date();
    const monthYear = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }).toUpperCase();

    const payslipHTML = `
        <div class="ledger-wrapper">
            <div class="text-center mb-4">
                <h4 class="fw-800 mb-0">RESCONI PAYROLL SERVICES</h4>
                <p class="small text-muted mb-0">PRIVATE PERSONNEL EMOLUMENT STATEMENT</p>
                <div class="badge bg-primary mt-2">PAY PERIOD: ${monthYear}</div>
            </div>

            <div class="row g-0 border mb-4">
                <div class="col-6 p-2 border-end border-bottom small"><strong>NAME:</strong> ${employee.fullName.toUpperCase()}</div>
                <div class="col-6 p-2 border-bottom small"><strong>STAFF ID:</strong> ${employee.employeeId}</div>
                <div class="col-6 p-2 border-end small"><strong>NIA NO:</strong> ${employee.ghanaCard || '---'}</div>
                <div class="col-6 p-2 small"><strong>POSITION:</strong> ${employee.position || 'STAFF'}</div>
            </div>

            <div class="ledger-grid">
                <div class="ledger-column">
                    <div class="ledger-header-cell">Earnings & Allowances</div>
                    <div class="ledger-row"><span>Basic Salary</span><span>${formatCurrency(employee.basicSalary)}</span></div>
                    ${employee.allowances.map(a => `
                        <div class="ledger-row"><span>${a.type}</span><span>${formatCurrency(a.amount)}</span></div>
                    `).join('')}
                    <div class="ledger-row total-row"><span>GROSS PAY</span><span>GHS ${formatCurrency(employee.grossPay)}</span></div>
                </div>

                <div class="ledger-column">
                    <div class="ledger-header-cell">Statutory Deductions</div>
                    <div class="ledger-row"><span>SSNIT Employee (5.5%)</span><span>${formatCurrency(employee.ssnitT1Employee)}</span></div>
                    <div class="ledger-row"><span>Income Tax (PAYE)</span><span>${formatCurrency(employee.paye)}</span></div>
                    <div class="ledger-row"><span>NHIS (2.5%)</span><span>${formatCurrency(employee.nhisEmployee)}</span></div>
                    <div class="ledger-row total-row"><span>TOTAL DEDUCTIONS</span><span>GHS ${formatCurrency(employee.totalDeductions)}</span></div>
                </div>
            </div>

            <div class="summary-bar rounded shadow-sm">
                <div class="summary-item"><small>GROSS EARNINGS</small><br><strong>${formatCurrency(employee.grossPay)}</strong></div>
                <div class="summary-item"><small>TOTAL DEDUCTIONS</small><br><strong>${formatCurrency(employee.totalDeductions)}</strong></div>
                <div class="summary-item" style="color: #60a5fa;"><small>NET PAYOUT</small><br><strong>GHS ${formatCurrency(employee.netPay)}</strong></div>
            </div>

            <div class="mt-4 text-center">
                <p class="extra-small text-muted mb-0">This payslip is electronically generated. No signature is required.</p>
                <p class="extra-small text-muted mt-1">Date: ${now.toLocaleDateString('en-GB')}</p>
            </div>
        </div>
    `;
    
    const content = document.getElementById('payslipContent');
    if (content) content.innerHTML = payslipHTML;
}

// --- Utilities ---
function formatCurrency(amount) {
    return parseFloat(amount).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function updateDashboard() {
    const totalCount = employees.length;
    const totalGross = employees.reduce((s, e) => s + e.grossPay, 0);
    const totalNet = employees.reduce((s, e) => s + e.netPay, 0);

    document.getElementById('totalEmployees').textContent = totalCount;
    document.getElementById('totalGrossPay').textContent = "GHS " + formatCurrency(totalGross);
    document.getElementById('totalNetPay').textContent = "GHS " + formatCurrency(totalNet);
}

function updateEmployeeTable() {
    const tbody = document.getElementById('employeeTableBody');
    if (!tbody) return;
    if (employees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-5">No Records Found</td></tr>';
        return;
    }
    tbody.innerHTML = employees.map(emp => `
        <tr>
            <td class="ps-4 fw-bold">${emp.employeeId}</td>
            <td>${emp.fullName}</td>
            <td><span class="badge bg-light text-dark border">${emp.position}</span></td>
            <td>${formatCurrency(emp.grossPay)}</td>
            <td class="fw-bold text-primary">${formatCurrency(emp.netPay)}</td>
            <td class="text-end pe-4">
                <button class="btn btn-sm btn-outline-danger border-0" onclick="deleteEmployee('${emp.employeeId}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

function deleteEmployee(id) {
    if (confirm("Permanently remove this employee?")) {
        employees = employees.filter(e => e.employeeId !== id);
        saveEmployees();
        updateDashboard();
        updateEmployeeTable();
        populateEmployeeSelect();
    }
}

function populateEmployeeSelect() {
    const sel = document.getElementById('selectEmployee');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Search Registry --</option>' + 
        employees.map(e => `<option value="${e.employeeId}">${e.employeeId} - ${e.fullName}</option>`).join('');
}

function loadSelectedEmployee() {
    const id = document.getElementById('selectEmployee').value;
    const container = document.getElementById('payslipContainer');
    if (!id) {
        container.style.display = 'none';
        return;
    }
    const emp = employees.find(e => e.employeeId === id);
    if (emp) {
        generatePayslip(emp);
        container.style.display = 'block';
    }
}
