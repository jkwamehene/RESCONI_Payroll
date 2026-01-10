let employees = [];
let currentAllowances = [];

document.addEventListener('DOMContentLoaded', () => {
    loadEmployees();
    updateDashboard();
    updateEmployeeTable();
    populateEmployeeSelect();
});

function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

// --- Allowance Staging ---
function addAllowanceRow() {
    const type = document.getElementById('allowanceType').value;
    const amt = parseFloat(document.getElementById('allowanceAmount').value) || 0;
    if(amt > 0) {
        currentAllowances.push({ type, amount: amt });
        renderAllowanceList();
        updateCalculations();
        document.getElementById('allowanceAmount').value = '';
    }
}

function renderAllowanceList() {
    const container = document.getElementById('allowanceList');
    container.innerHTML = currentAllowances.map((a, i) => `
        <div class="badge bg-secondary p-2 me-2 mb-2">
            ${a.type}: GHS ${a.amount.toFixed(2)} 
            <span class="ms-2" style="cursor:pointer" onclick="removeAllowance(${i})">&times;</span>
        </div>
    `).join('');
}

function removeAllowance(index) {
    currentAllowances.splice(index, 1);
    renderAllowanceList();
    updateCalculations();
}

// --- Payroll Engine ---
function calculatePayroll(basic, allowances) {
    const b = parseFloat(basic) || 0;
    const totalAllow = allowances.reduce((sum, a) => sum + a.amount, 0);
    const gross = b + totalAllow;
    
    const ssnit = b * 0.055;
    const taxable = gross - ssnit;
    const paye = calculatePAYE(taxable);
    const nhis = b * 0.025;
    
    const deductions = ssnit + paye + nhis;
    return { gross, ssnit, paye, nhis, deductions, net: gross - deductions };
}

function calculatePAYE(income) {
    if (income <= 402) return 0;
    if (income <= 512) return (income - 402) * 0.05;
    if (income <= 642) return 5.5 + (income - 512) * 0.10;
    if (income <= 3642) return 18.5 + (income - 642) * 0.175;
    if (income <= 20000) return 543.5 + (income - 3642) * 0.25;
    return 4633 + (income - 20000) * 0.30; // Simplified for brevity
}

// --- UI Updates ---
function updateCalculations() {
    const basic = document.getElementById('basicSalary').value;
    const res = calculatePayroll(basic, currentAllowances);
    document.getElementById('calcSsnit').textContent = "GHS " + res.ssnit.toFixed(2);
    document.getElementById('calcPaye').textContent = "GHS " + res.paye.toFixed(2);
    document.getElementById('calcGross').textContent = "GHS " + res.gross.toFixed(2);
    document.getElementById('calcNet').textContent = "GHS " + res.net.toFixed(2);
}

document.getElementById('employeeForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const res = calculatePayroll(document.getElementById('basicSalary').value, currentAllowances);
    
    const emp = {
        employeeId: document.getElementById('employeeId').value,
        fullName: document.getElementById('fullName').value,
        ghanaCard: document.getElementById('ghanaCard').value,
        position: document.getElementById('position').value,
        bankName: document.getElementById('bankName').value,
        bankBranch: document.getElementById('bankBranch').value,
        basicSalary: parseFloat(document.getElementById('basicSalary').value),
        allowances: [...currentAllowances],
        ...res
    };
    
    employees.push(emp);
    saveEmployees();
    resetEmployeeForm();
    showSection('dashboard');
    updateDashboard();
    updateEmployeeTable();
    populateEmployeeSelect();
});

function resetEmployeeForm() {
    document.getElementById('employeeForm').reset();
    currentAllowances = [];
    renderAllowanceList();
    updateCalculations();
}

function generatePayslip(emp) {
    const monthYear = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }).toUpperCase();
    
    const rows = [
        ['Basic Salary', emp.basicSalary, 'SSNIT (5.5%)', emp.ssnit],
        ['Allowances', emp.gross - emp.basicSalary, 'Income Tax', emp.paye],
        ['', 0, 'NHIS (2.5%)', emp.nhis]
    ];

    document.getElementById('payslipContent').innerHTML = `
        <div class="logo-watermark"></div>
        <div class="text-center mb-4">
            <h3 class="fw-800">RESCONI PAYROLL SERVICES</h3>
            <div class="badge bg-dark px-4">PERIOD: ${monthYear}</div>
        </div>
        <div class="header-info-grid">
            <div class="info-box"><strong>NAME:</strong> ${emp.fullName.toUpperCase()}</div>
            <div class="info-box"><strong>STAFF ID:</strong> ${emp.employeeId}</div>
            <div class="info-box"><strong>NIA:</strong> ${emp.ghanaCard}</div>
            <div class="info-box"><strong>POSITION:</strong> ${emp.position}</div>
        </div>
        <table class="main-ledger-table">
            <thead>
                <tr><th>EARNINGS</th><th class="text-end">GHS</th><th>DEDUCTIONS</th><th class="text-end">GHS</th></tr>
            </thead>
            <tbody>
                ${rows.map(r => `<tr><td>${r[0]}</td><td class="text-end">${r[1].toFixed(2)}</td><td>${r[2]}</td><td class="text-end">${r[3].toFixed(2)}</td></tr>`).join('')}
                <tr class="totals-row">
                    <td>TOTAL EARNINGS</td><td class="text-end">${emp.gross.toFixed(2)}</td>
                    <td>TOTAL DEDUCTIONS</td><td class="text-end">${emp.deductions.toFixed(2)}</td>
                </tr>
            </tbody>
        </table>
        <div class="ledger-footer">
            <div class="footer-grid">
                <div class="footer-item small"><strong>BANK DETAILS:</strong><br>${emp.bankName}<br>${emp.bankBranch}</div>
                <div class="footer-item"><strong>GROSS PAY:</strong><br>${emp.gross.toFixed(2)}</div>
                <div class="footer-item highlight"><strong>NET SALARY:</strong><br>GHS ${emp.net.toFixed(2)}</div>
            </div>
        </div>
    `;
}

// Standard data management functions
function loadEmployees() { const s = localStorage.getItem('resconi_employees'); if(s) employees = JSON.parse(s); }
function saveEmployees() { localStorage.setItem('resconi_employees', JSON.stringify(employees)); }
function updateDashboard() { /* updates total values */ }
function updateEmployeeTable() { /* renders table rows */ }
function populateEmployeeSelect() { /* updates payslip dropdown */ }
function loadSelectedEmployee() {
    const id = document.getElementById('selectEmployee').value;
    const emp = employees.find(e => e.employeeId === id);
    if(emp) { generatePayslip(emp); document.getElementById('payslipContainer').style.display = 'block'; }
}
