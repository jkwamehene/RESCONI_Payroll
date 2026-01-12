let employees = JSON.parse(localStorage.getItem('resconi_staff')) || [];
let tempAllowances = [];

/**
 * Enhanced Section Switcher
 * Now automatically closes the mobile hamburger menu when a link is clicked.
 */
function showSection(id) {
    // 1. Switch Sections
    document.querySelectorAll('.section').forEach(s => {
        s.style.display = 'none';
        s.classList.remove('active');
    });
    const target = document.getElementById(id);
    target.style.display = 'block';
    target.classList.add('active');

    // 2. Mobile Menu Auto-Close
    const navbarCollapse = document.getElementById('navbarNav');
    const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
    if (bsCollapse) {
        bsCollapse.hide();
    }
}

// Allowance Management
function addAllowanceRow() {
    const type = document.getElementById('allowanceType').value;
    const amount = parseFloat(document.getElementById('allowanceAmount').value) || 0;
    if (amount > 0) {
        tempAllowances.push({ type, amount });
        renderAllowanceList();
        updateCalculations();
        document.getElementById('allowanceAmount').value = '';
    }
}

function renderAllowanceList() {
    const list = document.getElementById('allowanceList');
    list.innerHTML = tempAllowances.map((a, i) => `
        <span class="badge bg-secondary me-2 mb-2 p-2" style="display: inline-flex; align-items: center;">
            ${a.type}: GHS ${a.amount.toFixed(2)} 
            <i class="fas fa-times ms-2 cursor-pointer" onclick="removeAllowance(${i})" style="font-size: 0.8rem;"></i>
        </span>
    `).join('');
}

function removeAllowance(i) {
    tempAllowances.splice(i, 1);
    renderAllowanceList();
    updateCalculations();
}

/**
 * Ghana Tax Engine 2026
 * Calculates PAYE, SSNIT, and NHIS
 */
function getPayroll(basic, allowances) {
    const totalAllow = allowances.reduce((sum, a) => sum + a.amount, 0);
    const gross = basic + totalAllow;
    const ssnit = basic * 0.055; 
    const taxable = gross - ssnit;
    
    // PAYE 2025/2026 Tiers (Ghana Revenue Authority)
    let tax = 0;
    let rem = taxable;
    const tiers = [
        { amt: 490, rate: 0 },
        { amt: 110, rate: 0.05 },
        { amt: 130, rate: 0.10 },
        { amt: 3166, rate: 0.175 },
        { amt: 16104, rate: 0.25 },
        { amt: 30000, rate: 0.30 },
        { amt: Infinity, rate: 0.35 }
    ];

    for (const t of tiers) {
        if (rem > t.amt) {
            tax += t.amt * t.rate;
            rem -= t.amt;
        } else {
            tax += rem * t.rate;
            break;
        }
    }

    const nhis = basic * 0.025; 
    const deductions = ssnit + tax + nhis;
    return { gross, ssnit, paye: tax, nhis, deductions, net: gross - deductions, taxable };
}

function updateCalculations() {
    const basic = parseFloat(document.getElementById('basicSalary').value) || 0;
    const res = getPayroll(basic, tempAllowances);
    
    // Update live computation sidebar
    document.getElementById('calcSsnit').innerText = "GHS " + res.ssnit.toFixed(2);
    document.getElementById('calcPaye').innerText = "GHS " + res.paye.toFixed(2);
    document.getElementById('calcNet').innerText = "GHS " + res.net.toFixed(2);
}

// Form Submission
document.getElementById('employeeForm').onsubmit = function(e) {
    e.preventDefault();
    const basic = parseFloat(document.getElementById('basicSalary').value);
    const payroll = getPayroll(basic, tempAllowances);

    const staff = {
        employeeId: document.getElementById('employeeId').value,
        fullName: document.getElementById('fullName').value,
        ghanaCard: document.getElementById('ghanaCard').value,
        position: document.getElementById('position').value,
        bankName: document.getElementById('bankName').value,
        bankBranch: document.getElementById('bankBranch').value,
        basicSalary: basic,
        allowances: [...tempAllowances],
        ...payroll
    };

    employees.push(staff);
    localStorage.setItem('resconi_staff', JSON.stringify(employees));
    alert('Personnel record committed successfully.');
    location.reload(); // Refresh to update registry and dashboard
};

function loadSelectedEmployee() {
    const id = document.getElementById('selectEmployee').value;
    const emp = employees.find(e => e.employeeId === id);
    if (emp) {
        generatePayslip(emp);
        document.getElementById('payslipContainer').style.display = 'block';
    } else {
        document.getElementById('payslipContainer').style.display = 'none';
    }
}

/**
 * Payslip Generator
 * Formats the data into a clean, professional ledger
 */
function generatePayslip(emp) {
    const date = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }).toUpperCase();
    
    const earnings = [
        ['Basic Salary', emp.basicSalary],
        ...emp.allowances.map(a => [a.type, a.amount])
    ];
    const deductions = [
        ['SSNIT Employee (5.5%)', emp.ssnit],
        ['Income Tax (PAYE)', emp.paye],
        ['NHIS (2.5%)', emp.nhis]
    ];

    const maxRows = Math.max(earnings.length, deductions.length);
    let tableBody = '';

    for (let i = 0; i < maxRows; i++) {
        const eLabel = earnings[i] ? earnings[i][0] : '';
        const eVal = earnings[i] ? earnings[i][1].toFixed(2) : '';
        const dLabel = deductions[i] ? deductions[i][0] : '';
        const dVal = deductions[i] ? deductions[i][1].toFixed(2) : '';

        tableBody += `
            <tr>
                <td data-label="Earnings">${eLabel}</td><td class="text-end">${eVal}</td>
                <td data-label="Deductions">${dLabel}</td><td class="text-end">${dVal}</td>
            </tr>`;
    }

    document.getElementById('payslipContent').innerHTML = `
        <div class="payslip-wrapper p-3 p-md-5">
            <div class="text-center mb-4">
                <h2 class="brand-title h4 fw-bold">RESCONI PAYROLL SERVICES</h2>
                <p class="brand-subtitle small text-muted">PRIVATE PERSONNEL EMOLUMENT STATEMENT</p>
                <div class="badge bg-primary p-2 mt-2">PAY PERIOD: ${date} 2026</div>
            </div>
            
            <div class="row g-3 mb-4 small">
                <div class="col-6 col-md-3"><strong>NAME:</strong><br>${emp.fullName.toUpperCase()}</div>
                <div class="col-6 col-md-3"><strong>STAFF ID:</strong><br>${emp.employeeId}</div>
                <div class="col-6 col-md-3"><strong>NIA NO:</strong><br>${emp.ghanaCard || 'N/A'}</div>
                <div class="col-6 col-md-3"><strong>POSITION:</strong><br>${emp.position || 'STAFF'}</div>
            </div>

            <div class="table-responsive">
                <table class="table table-bordered ledger-table">
                    <thead class="table-dark">
                        <tr>
                            <th colspan="2">Earnings & Allowances</th>
                            <th colspan="2">Statutory Deductions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableBody}
                    </tbody>
                    <tfoot class="table-light fw-bold">
                        <tr>
                            <td>GROSS PAY</td><td class="text-end">GHS ${emp.gross.toFixed(2)}</td>
                            <td>TOTAL DEDUCTIONS</td><td class="text-end">GHS ${emp.deductions.toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <div class="net-section bg-primary text-white p-3 rounded text-center mt-4">
                <div class="small text-uppercase">Final Net Payout</div>
                <div class="h3 fw-bold mb-0">GHS ${emp.net.toFixed(2)}</div>
            </div>

            <div class="text-center mt-4 small text-muted">
                <p>This payslip is electronically generated. No signature is required.</p>
                <p>Generated on: ${new Date().toLocaleDateString('en-GB')}</p>
            </div>
        </div>
    `;
}

// Initialization for Dashboard on Page Load
window.onload = function() {
    const list = document.getElementById('employeeTableBody');
    const select = document.getElementById('selectEmployee');
    if(!list || !select) return;

    list.innerHTML = "";
    let totalG = 0, totalN = 0;

    employees.forEach(emp => {
        totalG += emp.gross;
        totalN += emp.net;
        list.innerHTML += `
            <tr>
                <td class="ps-4 fw-bold">${emp.employeeId}</td>
                <td>${emp.fullName}</td>
                <td class="d-none d-md-table-cell">${emp.position}</td>
                <td>GHS ${emp.gross.toFixed(2)}</td>
                <td class="text-primary fw-bold">GHS ${emp.net.toFixed(2)}</td>
                <td class="text-end pe-4">
                    <button class="btn btn-sm btn-outline-primary" onclick="generatePayslipById('${emp.employeeId}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>`;
        select.innerHTML += `<option value="${emp.employeeId}">${emp.fullName} (${emp.employeeId})</option>`;
    });

    document.getElementById('totalEmployees').innerText = employees.length;
    document.getElementById('totalGrossPay').innerText = "GHS " + totalG.toFixed(2);
    document.getElementById('totalNetPay').innerText = "GHS " + totalN.toFixed(2);
};

function generatePayslipById(id) {
    showSection('generatePayslip');
    document.getElementById('selectEmployee').value = id;
    loadSelectedEmployee();
}

function resetEmployeeForm() {
    document.getElementById('employeeForm').reset();
    tempAllowances = [];
    renderAllowanceList();
    updateCalculations();
}
