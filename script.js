// Global Variables
let employees = [];
let currentEditId = null;

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    loadEmployees();
    updateDashboard();
    updateEmployeeTable();
    populateEmployeeSelect();

    // Add event listeners for live calculation
    const salaryInputs = ['basicSalary', 'housingAllowance', 'transportAllowance', 'otherAllowances'];
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
        
        // Reset form handler
        employeeForm.addEventListener('reset', function() {
            currentEditId = null;
            setTimeout(updateCalculations, 0); // Delay to allow values to clear
        });
    }

    // Employee select handler for Payslips
    const selectEmployee = document.getElementById('selectEmployee');
    if (selectEmployee) {
        selectEmployee.addEventListener('change', handleEmployeeSelect);
    }
});

// Section Navigation
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    // Show selected section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('onclick')?.includes(sectionId)) {
            link.classList.add('active');
        }
    });
}

// Local Storage Functions
function loadEmployees() {
    const stored = localStorage.getItem('resconi_employees');
    if (stored) {
        employees = JSON.parse(stored);
    }
}

function saveEmployees() {
    localStorage.setItem('resconi_employees', JSON.stringify(employees));
}

// Payroll Calculation Functions
function calculatePayroll(basicSalary, housingAllowance, transportAllowance, otherAllowances) {
    const basic = parseFloat(basicSalary) || 0;
    const housing = parseFloat(housingAllowance) || 0;
    const transport = parseFloat(transportAllowance) || 0;
    const other = parseFloat(otherAllowances) || 0;

    // Gross Pay
    const grossPay = basic + housing + transport + other;

    // Employee Deductions (Ghana Specific)
    const ssnitT1Employee = basic * 0.055; // 5.5% (to Tier 1)
    const ssnitT2Employee = basic * 0.05;  // 5% (to Tier 2)
    const nhisEmployee = basic * 0.025;    // 2.5%

    // Taxable Income = Gross Pay - SSNIT Employee Contribution
    const taxableIncome = grossPay - (ssnitT1Employee + ssnitT2Employee);

    // PAYE Calculation
    const paye = calculatePAYE(taxableIncome);

    // Total Deductions
    const totalDeductions = ssnitT1Employee + ssnitT2Employee + nhisEmployee + paye;

    // Net Pay
    const netPay = grossPay - totalDeductions;

    // Employer Contributions
    const ssnitT1Employer = basic * 0.135; // 13.5%
    const ssnitT2Employer = basic * 0.05;  // 5%
    const nhisEmployer = basic * 0.025;    // 2.5%
    const totalEmployerCost = grossPay + ssnitT1Employer + ssnitT2Employer + nhisEmployer;

    return {
        grossPay,
        ssnitT1Employee,
        ssnitT2Employee,
        nhisEmployee,
        paye,
        totalDeductions,
        netPay,
        ssnitT1Employer,
        ssnitT2Employer,
        nhisEmployer,
        totalEmployerCost
    };
}

function calculatePAYE(taxableIncome) {
    // Current Ghana Graduated Tax Brackets (Monthly)
    const income = taxableIncome;
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

// Live Calculation Update
function updateCalculations() {
    const basicSalary = document.getElementById('basicSalary')?.value || 0;
    const housingAllowance = document.getElementById('housingAllowance')?.value || 0;
    const transportAllowance = document.getElementById('transportAllowance')?.value || 0;
    const otherAllowances = document.getElementById('otherAllowances')?.value || 0;

    const payroll = calculatePayroll(basicSalary, housingAllowance, transportAllowance, otherAllowances);

    // Update display fields
    const fields = {
        'calcSsnitT1': payroll.ssnitT1Employee,
        'calcSsnitT2': payroll.ssnitT2Employee,
        'calcNhis': payroll.nhisEmployee,
        'calcPaye': payroll.paye,
        'calcGrossPay': payroll.grossPay,
        'calcNetPay': payroll.netPay
    };

    for (const [id, value] of Object.entries(fields)) {
        const el = document.getElementById(id);
        if (el) el.textContent = formatCurrency(value);
    }
}

// Form Submit Handler
function handleFormSubmit(e) {
    e.preventDefault();

    const employeeId = document.getElementById('employeeId').value.trim();
    const fullName = document.getElementById('fullName').value.trim();
    
    const basicSalary = parseFloat(document.getElementById('basicSalary').value) || 0;
    const housingAllowance = parseFloat(document.getElementById('housingAllowance').value) || 0;
    const transportAllowance = parseFloat(document.getElementById('transportAllowance').value) || 0;
    const otherAllowances = parseFloat(document.getElementById('otherAllowances').value) || 0;

    const payroll = calculatePayroll(basicSalary, housingAllowance, transportAllowance, otherAllowances);

    const employeeData = {
        employeeId,
        fullName,
        position: document.getElementById('position').value.trim(),
        ghanaCard: document.getElementById('ghanaCard').value.trim(),
        bankAccount: document.getElementById('bankAccount').value.trim(),
        tin: document.getElementById('tin').value.trim(),
        basicSalary,
        housingAllowance,
        transportAllowance,
        otherAllowances,
        ...payroll
    };

    const existingIndex = employees.findIndex(emp => emp.employeeId === employeeId);

    if (currentEditId || existingIndex !== -1) {
        const indexToUpdate = currentEditId ? employees.findIndex(emp => emp.employeeId === currentEditId) : existingIndex;
        employees[indexToUpdate] = employeeData;
        alert("Employee updated successfully!");
    } else {
        employees.push(employeeData);
        alert("Employee added successfully!");
    }

    saveEmployees();
    updateDashboard();
    updateEmployeeTable();
    populateEmployeeSelect();
    
    document.getElementById('employeeForm').reset();
    currentEditId = null;
    showSection('dashboard');
}

// Dashboard and UI Updates
function updateDashboard() {
    const totalEmployees = employees.length;
    const totalGross = employees.reduce((sum, emp) => sum + emp.grossPay, 0);
    const totalNet = employees.reduce((sum, emp) => sum + emp.netPay, 0);

    if(document.getElementById('totalEmployees')) document.getElementById('totalEmployees').textContent = totalEmployees;
    if(document.getElementById('totalGrossPay')) document.getElementById('totalGrossPay').textContent = formatCurrency(totalGross);
    if(document.getElementById('totalNetPay')) document.getElementById('totalNetPay').textContent = formatCurrency(totalNet);
}

function updateEmployeeTable() {
    const tbody = document.getElementById('employeeTableBody');
    if (!tbody) return;

    if (employees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No employees added yet</td></tr>';
        return;
    }

    tbody.innerHTML = employees.map(emp => `
        <tr>
            <td>${emp.employeeId}</td>
            <td>${emp.fullName}</td>
            <td>${emp.position || '-'}</td>
            <td>${formatCurrency(emp.basicSalary)}</td>
            <td>${formatCurrency(emp.housingAllowance + emp.transportAllowance + emp.otherAllowances)}</td>
            <td>${formatCurrency(emp.grossPay)}</td>
            <td>${formatCurrency(emp.netPay)}</td>
            <td>
                <button class="btn btn-sm btn-primary me-1" onclick="editEmployee('${emp.employeeId}')">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteEmployee('${emp.employeeId}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

function editEmployee(id) {
    const emp = employees.find(e => e.employeeId === id);
    if (!emp) return;

    currentEditId = id;
    showSection('addEmployee');

    document.getElementById('employeeId').value = emp.employeeId;
    document.getElementById('fullName').value = emp.fullName;
    document.getElementById('position').value = emp.position;
    document.getElementById('ghanaCard').value = emp.ghanaCard;
    document.getElementById('bankAccount').value = emp.bankAccount;
    document.getElementById('tin').value = emp.tin;
    document.getElementById('basicSalary').value = emp.basicSalary;
    document.getElementById('housingAllowance').value = emp.housingAllowance;
    document.getElementById('transportAllowance').value = emp.transportAllowance;
    document.getElementById('otherAllowances').value = emp.otherAllowances;

    updateCalculations();
}

function deleteEmployee(id) {
    if (confirm("Are you sure you want to delete this employee?")) {
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

    select.innerHTML = '<option value="">-- Select Employee --</option>' + 
        employees.map(emp => `<option value="${emp.employeeId}">${emp.fullName}</option>`).join('');
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

// Generate Payslip HTML Content
function generatePayslip(employee) {
    const now = new Date();
    const monthYear = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    
    const payslipHTML = `
        <div class="payslip-header text-center mb-4">
            <h2>RESCONI</h2>
            <p>Professional Payroll Solutions | Accra, Ghana</p>
            <hr>
            <h4>PAYSLIP: ${monthYear.toUpperCase()}</h4>
        </div>
        <div class="row">
            <div class="col-6">
                <strong>Name:</strong> ${employee.fullName}<br>
                <strong>ID:</strong> ${employee.employeeId}<br>
                <strong>Position:</strong> ${employee.position}
            </div>
            <div class="col-6 text-end">
                <strong>TIN:</strong> ${employee.tin || 'N/A'}<br>
                <strong>SSNIT:</strong> ${employee.ghanaCard || 'N/A'}<br>
                <strong>Bank:</strong> ${employee.bankAccount || 'N/A'}
            </div>
        </div>
        <table class="table mt-4">
            <thead class="table-light">
                <tr><th>Description</th><th class="text-end">Amount (GHS)</th></tr>
            </thead>
            <tbody>
                <tr><td>Basic Salary</td><td class="text-end">${formatCurrency(employee.basicSalary)}</td></tr>
                <tr><td>Allowances</td><td class="text-end">${formatCurrency(employee.housingAllowance + employee.transportAllowance + employee.otherAllowances)}</td></tr>
                <tr class="fw-bold"><td>Gross Pay</td><td class="text-end">${formatCurrency(employee.grossPay)}</td></tr>
                <tr><td>SSNIT (5.5%)</td><td class="text-end">-${formatCurrency(employee.ssnitT1Employee)}</td></tr>
                <tr><td>PAYE Tax</td><td class="text-end">-${formatCurrency(employee.paye)}</td></tr>
                <tr><td>NHIS (2.5%)</td><td class="text-end">-${formatCurrency(employee.nhisEmployee)}</td></tr>
                <tr class="table-dark"><td>NET PAY</td><td class="text-end">${formatCurrency(employee.netPay)}</td></tr>
            </tbody>
        </table>
    `;
    
    const content = document.getElementById('payslipContent');
    if(content) content.innerHTML = payslipHTML;
}

// PDF Export
async function downloadPDF() {
    const element = document.getElementById('payslipContent');
    const { jsPDF } = window.jspdf;
    
    const btn = event.currentTarget;
    btn.disabled = true;
    btn.innerHTML = "Generating...";

    try {
        const canvas = await html2canvas(element, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Payslip_${currentEditId || 'Employee'}.pdf`);
    } catch (err) {
        console.error(err);
        alert("Failed to generate PDF.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = "Download PDF";
    }
}

function printPayslip() {
    window.print();
}

// Utility Function
function formatCurrency(amount) {
    return parseFloat(amount).toLocaleString('en-GH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}
