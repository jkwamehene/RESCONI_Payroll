// Global Variables
let employees = [];
let currentEditId = null;

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    loadEmployees();
    updateDashboard();
    updateEmployeeTable();
    populateEmployeeSelect();

    // Add event listeners for live calculation in the "Add Employee" form
    const salaryInputs = ['basicSalary', 'housingAllowance', 'transportAllowance'];
    salaryInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', updateCalculations);
        }
    });

    // Form submit handler
    const employeeForm = document.getElementById('employeeForm');
    if (employeeForm) {
        employeeForm.addEventListener('submit', handleFormSubmit);
        
        employeeForm.addEventListener('reset', function() {
            currentEditId = null;
            setTimeout(updateCalculations, 0); 
        });
    }

    // Employee select handler for Payslips
    const selectEmployee = document.getElementById('selectEmployee');
    if (selectEmployee) {
        selectEmployee.addEventListener('change', handleEmployeeSelect);
    }
});

// --- Section Navigation ---
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Update nav links styling
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('onclick')?.includes(sectionId)) {
            link.classList.add('active');
        }
    });
}

// --- Data Management ---
function loadEmployees() {
    const stored = localStorage.getItem('resconi_employees');
    if (stored) {
        employees = JSON.parse(stored);
    }
}

function saveEmployees() {
    localStorage.setItem('resconi_employees', JSON.stringify(employees));
}

// --- Payroll Engine (Ghana Specific) ---
function calculatePayroll(basicSalary, housingAllowance, transportAllowance) {
    const basic = parseFloat(basicSalary) || 0;
    const housing = parseFloat(housingAllowance) || 0;
    const transport = parseFloat(transportAllowance) || 0;

    // Gross Pay
    const grossPay = basic + housing + transport;

    // Employee Deductions
    const ssnitT1Employee = basic * 0.055; // 5.5% Tier 1
    const ssnitT2Employee = basic * 0.05;  // 5% Tier 2
    const nhisEmployee = basic * 0.025;    // 2.5% NHIS

    // Taxable Income = Gross - Employee SSNIT
    const taxableIncome = grossPay - (ssnitT1Employee + ssnitT2Employee);

    // PAYE Calculation (Ghana 2024/2025 Brackets)
    const paye = calculatePAYE(taxableIncome);

    const totalDeductions = ssnitT1Employee + ssnitT2Employee + nhisEmployee + paye;
    const netPay = grossPay - totalDeductions;

    return {
        grossPay,
        ssnitT1Employee,
        ssnitT2Employee,
        nhisEmployee,
        paye,
        totalDeductions,
        netPay
    };
}

function calculatePAYE(income) {
    let tax = 0;
    if (income <= 402) {
        tax = 0;
    } else if (income <= 512) {
        tax = (income - 402) * 0.05;
    } else if (income <= 642) {
        tax = 5.5 + (income - 512) * 0.10;
    } else if (income <= 3642) {
        tax = 18.5 + (income - 642) * 0.175;
    } else if (income <= 20000) {
        tax = 543.5 + (income - 3642) * 0.25;
    } else if (income <= 50000) {
        tax = 4633 + (income - 20000) * 0.30;
    } else {
        tax = 13633 + (income - 50000) * 0.35;
    }
    return tax;
}

// --- UI Logic & Updates ---
function updateCalculations() {
    const basic = document.getElementById('basicSalary')?.value || 0;
    const housing = document.getElementById('housingAllowance')?.value || 0;
    const transport = document.getElementById('transportAllowance')?.value || 0;

    const payroll = calculatePayroll(basic, housing, transport);

    // Update the Sidebar Preview
    const fields = {
        'calcSsnitT1': payroll.ssnitT1Employee,
        'calcPaye': payroll.paye,
        'calcGrossPay': payroll.grossPay,
        'calcNetPay': payroll.netPay
    };

    for (const [id, value] of Object.entries(fields)) {
        const el = document.getElementById(id);
        if (el) el.textContent = "GHS " + formatCurrency(value);
    }
}

function handleFormSubmit(e) {
    e.preventDefault();

    const empId = document.getElementById('employeeId').value.trim();
    const payroll = calculatePayroll(
        document.getElementById('basicSalary').value,
        document.getElementById('housingAllowance').value,
        document.getElementById('transportAllowance').value
    );

    const employeeData = {
        employeeId: empId,
        fullName: document.getElementById('fullName').value.trim(),
        position: document.getElementById('position').value.trim(),
        ghanaCard: document.getElementById('ghanaCard').value.trim(),
        tin: document.getElementById('tin').value.trim(),
        basicSalary: parseFloat(document.getElementById('basicSalary').value) || 0,
        housingAllowance: parseFloat(document.getElementById('housingAllowance').value) || 0,
        transportAllowance: parseFloat(document.getElementById('transportAllowance').value) || 0,
        ...payroll
    };

    const existingIndex = employees.findIndex(emp => emp.employeeId === empId);

    if (existingIndex !== -1) {
        employees[existingIndex] = employeeData;
    } else {
        employees.push(employeeData);
    }

    saveEmployees();
    updateDashboard();
    updateEmployeeTable();
    populateEmployeeSelect();
    
    document.getElementById('employeeForm').reset();
    showSection('dashboard');
}

function updateDashboard() {
    const totalEmployees = employees.length;
    const totalGross = employees.reduce((sum, emp) => sum + emp.grossPay, 0);
    const totalNet = employees.reduce((sum, emp) => sum + emp.netPay, 0);

    if(document.getElementById('totalEmployees')) document.getElementById('totalEmployees').textContent = totalEmployees;
    if(document.getElementById('totalGrossPay')) document.getElementById('totalGrossPay').textContent = "GHS " + formatCurrency(totalGross);
    if(document.getElementById('totalNetPay')) document.getElementById('totalNetPay').textContent = "GHS " + formatCurrency(totalNet);
}

function updateEmployeeTable() {
    const tbody = document.getElementById('employeeTableBody');
    if (!tbody) return;

    if (employees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-5 text-muted">No records found</td></tr>';
        return;
    }

    tbody.innerHTML = employees.map(emp => `
        <tr>
            <td class="ps-4 fw-bold">${emp.employeeId}</td>
            <td>${emp.fullName}</td>
            <td><span class="badge bg-light text-dark border">${emp.position || 'Staff'}</span></td>
            <td>${formatCurrency(emp.grossPay)}</td>
            <td class="fw-bold text-primary">${formatCurrency(emp.netPay)}</td>
            <td class="text-end pe-4">
                <button class="btn btn-sm btn-link text-decoration-none" onclick="editEmployee('${emp.employeeId}')">Edit</button>
                <button class="btn btn-sm btn-link text-danger text-decoration-none" onclick="deleteEmployee('${emp.employeeId}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

function editEmployee(id) {
    const emp = employees.find(e => e.employeeId === id);
    if (!emp) return;

    showSection('addEmployee');
    document.getElementById('employeeId').value = emp.employeeId;
    document.getElementById('fullName').value = emp.fullName;
    document.getElementById('position').value = emp.position;
    document.getElementById('ghanaCard').value = emp.ghanaCard;
    document.getElementById('tin').value = emp.tin;
    document.getElementById('basicSalary').value = emp.basicSalary;
    document.getElementById('housingAllowance').value = emp.housingAllowance;
    document.getElementById('transportAllowance').value = emp.transportAllowance;

    updateCalculations();
}

function deleteEmployee(id) {
    if (confirm("Confirm deletion of staff record?")) {
        employees = employees.filter(emp => emp.employeeId !== id);
        saveEmployees();
        updateDashboard();
        updateEmployeeTable();
        populateEmployeeSelect();
    }
}

function populateEmployeeSelect() {
    const select = document.getElementById('selectEmployee');
    if (!select) return;

    select.innerHTML = '<option value="">-- Search Registry --</option>' + 
        employees.map(emp => `<option value="${emp.employeeId}">${emp.employeeId} - ${emp.fullName}</option>`).join('');
}

function handleEmployeeSelect(e) {
    const employeeId = e.target.value;
    const container = document.getElementById('payslipContainer');
    
    if (!employeeId) {
        if(container) container.style.display = 'none';
        return;
    }

    const employee = employees.find(emp => emp.employeeId === employeeId);
    if (employee) {
        generatePayslip(employee);
        if(container) container.style.display = 'block';
    }
}

// --- Professional Ledger Generator ---
function generatePayslip(employee) {
    const now = new Date();
    const monthYear = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }).toUpperCase();
    const dateStr = now.toLocaleDateString('en-GB');

    const payslipHTML = `
        <div class="ledger-container">
            <div class="logo-watermark"></div>
            <div class="header-top text-center mb-4">
                <h3 class="fw-bold mb-0">RESCONI PAYROLL SERVICES</h3>
                <p class="small mb-0 text-muted">OFFICIAL PERSONNEL REMUNERATION STATEMENT</p>
                <div class="badge bg-dark mt-2 px-4">MONTH: ${monthYear}</div>
            </div>

            <div class="header-info-grid mb-4">
                <div class="info-box"><strong>STAFF NAME:</strong> ${employee.fullName.toUpperCase()}</div>
                <div class="info-box"><strong>STAFF ID:</strong> ${employee.employeeId}</div>
                <div class="info-box"><strong>NIA NUMBER:</strong> ${employee.ghanaCard || 'N/A'}</div>
                <div class="info-box"><strong>TIN:</strong> ${employee.tin || 'N/A'}</div>
            </div>

            <table class="ledger-table mb-4">
                <thead>
                    <tr>
                        <th style="width: 50%">DESCRIPTION</th>
                        <th class="text-end" style="width: 25%">EARNINGS (GHS)</th>
                        <th class="text-end" style="width: 25%">DEDUCTIONS (GHS)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td>Basic Salary</td><td class="text-end">${formatCurrency(employee.basicSalary)}</td><td></td></tr>
                    <tr><td>Housing Allowance</td><td class="text-end">${formatCurrency(employee.housingAllowance)}</td><td></td></tr>
                    <tr><td>Transport Allowance</td><td class="text-end">${formatCurrency(employee.transportAllowance)}</td><td></td></tr>
                    
                    <tr><td>Social Security (SSNIT 5.5%)</td><td></td><td class="text-end">${formatCurrency(employee.ssnitT1Employee)}</td></tr>
                    <tr><td>Income Tax (PAYE)</td><td></td><td class="text-end">${formatCurrency(employee.paye)}</td></tr>
                    <tr><td>NHIS (Employee 2.5%)</td><td></td><td class="text-end">${formatCurrency(employee.nhisEmployee)}</td></tr>
                    
                    <tr class="totals-row">
                        <td>MONTHLY TOTALS</td>
                        <td class="text-end">${formatCurrency(employee.grossPay)}</td>
                        <td class="text-end">${formatCurrency(employee.totalDeductions)}</td>
                    </tr>
                </tbody>
            </table>

            <div class="ledger-footer">
                <div class="footer-grid">
                    <div class="footer-item"><strong>GROSS PAY:</strong><br>GHS ${formatCurrency(employee.grossPay)}</div>
                    <div class="footer-item"><strong>DEDUCTIONS:</strong><br>GHS ${formatCurrency(employee.totalDeductions)}</div>
                    <div class="footer-item highlight"><strong>NET SALARY:</strong><br>GHS ${formatCurrency(employee.netPay)}</div>
                </div>
                <div class="footer-note">
                    <p class="mb-0">Electronically generated on ${dateStr}.</p>
                    <p class="small text-muted">This document serves as a valid proof of income for financial institutions.</p>
                </div>
            </div>
        </div>
    `;
    
    const content = document.getElementById('payslipContent');
    if(content) content.innerHTML = payslipHTML;
}

// --- Exports ---
async function downloadPDF() {
    const element = document.getElementById('payslipContent');
    const { jsPDF } = window.jspdf;
    
    try {
        const canvas = await html2canvas(element, { scale: 3 }); // High resolution
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`RESCONI_PAYSLIP_${employees.find(e => e.employeeId === document.getElementById('selectEmployee').value).fullName}.pdf`);
    } catch (err) {
        alert("PDF Generation Error");
    }
}

function printPayslip() {
    window.print();
}

function formatCurrency(amount) {
    return parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}
