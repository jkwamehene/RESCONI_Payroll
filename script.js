let employees = JSON.parse(localStorage.getItem('resconi_staff')) || [];
let tempAllowances = [];

function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
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
        <span class="badge bg-secondary me-2 p-2">${a.type}: GHS ${a.amount.toFixed(2)} 
        <i class="fas fa-times ms-2 cursor-pointer" onclick="removeAllowance(${i})"></i></span>
    `).join('');
}

function removeAllowance(i) {
    tempAllowances.splice(i, 1);
    renderAllowanceList();
    updateCalculations();
}

// Ghana Tax Engine
function getPayroll(basic, allowances) {
    const totalAllow = allowances.reduce((sum, a) => sum + a.amount, 0);
    const gross = basic + totalAllow;
    const ssnit = basic * 0.055;
    const taxable = gross - ssnit;
    
    // PAYE 2025/2026 Tiers
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
    document.getElementById('calcSsnit').innerText = "GHS " + res.ssnit.toFixed(2);
    document.getElementById('calcPaye').innerText = "GHS " + res.paye.toFixed(2);
    document.getElementById('calcGross').innerText = "GHS " + res.gross.toFixed(2);
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
    location.reload();
};

function loadSelectedEmployee() {
    const id = document.getElementById('selectEmployee').value;
    const emp = employees.find(e => e.employeeId === id);
    if (emp) {
        generatePayslip(emp);
        document.getElementById('payslipContainer').style.display = 'block';
    }
}

function generatePayslip(emp) {
    const date = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }).toUpperCase();
    
    // Preparing Table Rows
    const earnings = [
        ['Basic Salary', emp.basicSalary],
        ...emp.allowances.map(a => [a.type, a.amount])
    ];
    const deductions = [
        ['S.S.N.I.T (5.5%)', emp.ssnit],
        ['Income Tax (PAYE)', emp.paye],
        ['NHIS Employee', emp.nhis]
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
                <td>${eLabel}</td><td class="text-end">${eVal}</td>
                <td>${dLabel}</td><td class="text-end">${dVal}</td>
            </tr>`;
    }

    document.getElementById('payslipContent').innerHTML = `
        <div class="logo-watermark"></div>
        <div class="text-center mb-4">
            <h4 class="fw-800 mb-0">RESCONI PAYROLL SERVICES</h4>
            <p class="small text-muted mb-0">PAY ADVICE FOR THE MONTH OF ${date}</p>
        </div>
        
        <div class="header-info-grid">
            <div class="info-box"><strong>NAME:</strong> ${emp.fullName.toUpperCase()}</div>
            <div class="info-box"><strong>STAFF ID:</strong> ${emp.employeeId}</div>
            <div class="info-box"><strong>NIA NO:</strong> ${emp.ghanaCard || 'N/A'}</div>
            <div class="info-box"><strong>POSITION:</strong> ${emp.position || 'STAFF'}</div>
        </div>

        <table class="main-ledger-table">
            <thead>
                <tr>
                    <th style="width: 35%">EARNINGS</th><th class="text-end" style="width: 15%">AMOUNT</th>
                    <th style="width: 35%">DEDUCTIONS</th><th class="text-end" style="width: 15%">AMOUNT</th>
                </tr>
            </thead>
            <tbody>
                ${tableBody}
                <tr class="totals-row">
                    <td>GROSS EARNINGS</td><td class="text-end">${emp.gross.toFixed(2)}</td>
                    <td>TOTAL DEDUCTIONS</td><td class="text-end">${emp.deductions.toFixed(2)}</td>
                </tr>
            </tbody>
        </table>

        <div class="ledger-footer">
            <div class="footer-grid">
                <div class="footer-item">
                    <strong>PAYMENT MODE:</strong><br>
                    <span class="small">${emp.bankName || 'BANK TRANSFER'}</span><br>
                    <span class="extra-small text-muted">${emp.bankBranch || ''}</span>
                </div>
                <div class="footer-item">
                    <strong>DEDUCTIONS:</strong><br>GHS ${emp.deductions.toFixed(2)}
                </div>
                <div class="footer-item highlight">
                    <strong class="small">NET SALARY</strong><br>
                    <span class="h5 fw-bold">GHS ${emp.net.toFixed(2)}</span>
                </div>
            </div>
        </div>
    `;
}

// Initialization for Dashboard
window.onload = function() {
    const list = document.getElementById('employeeTableBody');
    const select = document.getElementById('selectEmployee');
    if(employees.length > 0) list.innerHTML = "";
    
    let totalG = 0, totalN = 0;

    employees.forEach(emp => {
        totalG += emp.gross;
        totalN += emp.net;
        list.innerHTML += `
            <tr>
                <td class="ps-4 fw-bold">${emp.employeeId}</td>
                <td>${emp.fullName}</td>
                <td>${emp.position}</td>
                <td>GHS ${emp.gross.toFixed(2)}</td>
                <td class="text-primary fw-bold">GHS ${emp.net.toFixed(2)}</td>
                <td class="text-end pe-4">
                    <button class="btn btn-sm btn-light" onclick="generatePayslipById('${emp.employeeId}')"><i class="fas fa-eye"></i></button>
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
