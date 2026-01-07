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
        document.getElementById(id).addEventListener('input', updateCalculations);
    });

    // Form submit handler
    document.getElementById('employeeForm').addEventListener('submit', handleFormSubmit);

    // Employee select handler
    document.getElementById('selectEmployee').addEventListener('change', handleEmployeeSelect);

    // Reset form handler
    document.getElementById('employeeForm').addEventListener('reset', function() {
        currentEditId = null;
        updateCalculations();
    });
});

// Section Navigation
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    // Show selected section
    document.getElementById(sectionId).classList.add('active');

    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    event.target.classList.add('active');
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

    // Employee Deductions
    const ssnitT1Employee = basic * 0.055; // 5.5%
    const ssnitT2Employee = basic * 0.05;  // 5%
    const nhisEmployee = basic * 0.025;    // 2.5%

    // Taxable Income
    const taxableIncome = grossPay - (ssnitT1Employee + ssnitT2Employee);

    // PAYE Calculation (Ghana Tax Brackets - Simplified)
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
        grossPay: grossPay,
        ssnitT1Employee: ssnitT1Employee,
        ssnitT2Employee: ssnitT2Employee,
        nhisEmployee: nhisEmployee,
        paye: paye,
        totalDeductions: totalDeductions,
        netPay: netPay,
        ssnitT1Employer: ssnitT1Employer,
        ssnitT2Employer: ssnitT2Employer,
        nhisEmployer: nhisEmployer,
        totalEmployerCost: totalEmployerCost
    };
}

function calculatePAYE(taxableIncome) {
    // Ghana PAYE Tax Brackets (Annual - Simplified Example)
    // These brackets should be updated to match current Ghana tax laws
    const monthlyIncome = taxableIncome;
    const annualIncome = monthlyIncome * 12;

    let tax = 0;

    if (annualIncome <= 4380) {
        // First GHS 4,380 - Tax Free
        tax = 0;
    } else if (annualIncome <= 7380) {
        // Next GHS 3,000 @ 5%
        tax = (annualIncome - 4380) * 0.05;
    } else if (annualIncome <= 10380) {
        // Next GHS 3,000 @ 10%
        tax = 150 + (annualIncome - 7380) * 0.10;
    } else if (annualIncome <= 49380) {
        // Next GHS 39,000 @ 17.5%
        tax = 450 + (annualIncome - 10380) * 0.175;
    } else if (annualIncome <= 240000) {
        // Next GHS 190,620 @ 25%
        tax = 7275 + (annualIncome - 49380) * 0.25;
    } else {
        // Excess @ 30%
        tax = 54930 + (annualIncome - 240000) * 0.30;
    }

    // Convert annual tax to monthly
    return tax / 12;
}

// Live Calculation Update
function updateCalculations() {
    const basicSalary = document.getElementById('basicSalary').value;
    const housingAllowance = document.getElementById('housingAllowance').value;
    const transportAllowance = document.getElementById('transportAllowance').value;
    const otherAllowances = document.getElementById('otherAllowances').value;

    const payroll = calculatePayroll(basicSalary, housingAllowance, transportAllowance, otherAllowances);

    // Update display
    document.getElementById('calcSsnitT1').textContent = formatCurrency(payroll.ssnitT1Employee);
    document.getElementById('calcSsnitT2').textContent = formatCurrency(payroll.ssnitT2Employee);
    document.getElementById('calcNhis').textContent = formatCurrency(payroll.nhisEmployee);
    document.getElementById('calcPaye').textContent = formatCurrency(payroll.paye);
    document.getElementById('calcGrossPay').textContent = formatCurrency(payroll.grossPay);
    document.getElementById('calcNetPay').textContent = formatCurrency(payroll.netPay);
}

// Form Submit Handler
function handleFormSubmit(e) {
    e.preventDefault();

    const employeeId = document.getElementById('employeeId').value.trim();
    const fullName = document.getElementById('fullName').value.trim();
    const position = document.getElementById('position').value.trim();
    const ghanaCard = document.getElementById('ghanaCard').value.trim();
    const bankAccount = document.getElementById('bankAccount').value.trim();
    const tin = document.getElementById('tin').value.trim();

    const basicSalary = parseFloat(document.getElementById('basicSalary').value) || 0;
    const housingAllowance = parseFloat(document.getElementById('housingAllowance').value) || 0;
    const transportAllowance = parseFloat(document.getElementById('transportAllowance').value) || 0;
    const otherAllowances = parseFloat(document.getElementById('otherAllowances').value) || 0;

    // Calculate payroll
    const payroll = calculatePayroll(basicSalary, housingAllowance, transportAllowance, otherAllowances);

    // Check if employee already exists
    const existingIndex = employees.findIndex(emp => emp.employeeId === employeeId && currentEditId !== employeeId);

    if (existingIndex !== -1) {
        const confirm = window.confirm(`Employee with ID ${employeeId} already exists. Do you want to update this employee?`);
        if (!confirm) return;
    }

    const employee = {
        employeeId,
        fullName,
        position,
        ghanaCard,
        bankAccount,
        tin,
        basicSalary,
        housingAllowance,
        transportAllowance,
        otherAllowances,
        ...payroll
    };

    if (currentEditId && currentEditId === employeeId) {
        // Update existing
        const index = employees.findIndex(emp => emp.employeeId === currentEditId);
        employees[index] = employee;
    } else if (existingIndex !== -1) {
        // Update existing by ID
        employees[existingIndex] = employee;
    } else {
        // Add new
        employees.push(employee);
    }

    saveEmployees();
    updateDashboard();
    updateEmployeeTable();
    populateEmployeeSelect();

    // Reset form and show success message
    document.getElementById('employeeForm').reset();
    currentEditId = null;
    updateCalculations();

    alert(`Employee ${fullName} saved successfully!`);
    showSection('dashboard');
}

// Dashboard Update
function updateDashboard() {
    const totalEmployees = employees.length;
    const totalGrossPay = employees.reduce((sum, emp) => sum + emp.grossPay, 0);
    const totalNetPay = employees.reduce((sum, emp) => sum + emp.netPay, 0);

    document.getElementById('totalEmployees').textContent = totalEmployees;
    document.getElementById('totalGrossPay').textContent = formatCurrency(totalGrossPay);
    document.getElementById('totalNetPay').textContent = formatCurrency(totalNetPay);
}

// Employee Table Update
function updateEmployeeTable() {
    const tbody = document.getElementById('employeeTableBody');

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
                <button class="btn btn-sm btn-primary" onclick="editEmployee('${emp.employeeId}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteEmployee('${emp.employeeId}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        </tr>
    `).join('');
}

// Edit Employee
function editEmployee(employeeId) {
    const employee = employees.find(emp => emp.employeeId === employeeId);
    if (!employee) return;

    currentEditId = employeeId;

    // Populate form
    document.getElementById('employeeId').value = employee.employeeId;
    document.getElementById('fullName').value = employee.fullName;
    document.getElementById('position').value = employee.position || '';
    document.getElementById('ghanaCard').value = employee.ghanaCard || '';
    document.getElementById('bankAccount').value = employee.bankAccount || '';
    document.getElementById('tin').value = employee.tin || '';
    document.getElementById('basicSalary').value = employee.basicSalary;
    document.getElementById('housingAllowance').value = employee.housingAllowance;
    document.getElementById('transportAllowance').value = employee.transportAllowance;
    document.getElementById('otherAllowances').value = employee.otherAllowances;

    updateCalculations();
    showSection('addEmployee');

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Delete Employee
function deleteEmployee(employeeId) {
    const employee = employees.find(emp => emp.employeeId === employeeId);
    if (!employee) return;

    const confirm = window.confirm(`Are you sure you want to delete ${employee.fullName}?`);
    if (!confirm) return;

    employees = employees.filter(emp => emp.employeeId !== employeeId);
    saveEmployees();
    updateDashboard();
    updateEmployeeTable();
    populateEmployeeSelect();
}

// Populate Employee Select
function populateEmployeeSelect() {
    const select = document.getElementById('selectEmployee');

    if (employees.length === 0) {
        select.innerHTML = '<option value="">-- No employees added yet --</option>';
        return;
    }

    select.innerHTML = '<option value="">-- Select an employee --</option>' + 
        employees.map(emp => `<option value="${emp.employeeId}">${emp.fullName} (${emp.employeeId})</option>`).join('');
}

// Handle Employee Select
function handleEmployeeSelect(e) {
    const employeeId = e.target.value;

    if (!employeeId) {
        document.getElementById('payslipContainer').style.display = 'none';
        return;
    }

    const employee = employees.find(emp => emp.employeeId === employeeId);
    if (!employee) return;

    generatePayslip(employee);
    document.getElementById('payslipContainer').style.display = 'block';
}

// Generate Payslip
function generatePayslip(employee) {
    const now = new Date();
    const monthYear = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    const paymentDate = now.toLocaleDateString('en-GB');
    const generatedDateTime = now.toLocaleString('en-GB');

    const payslipHTML = `
        <div class="payslip-header">
            <div class="company-logo">
                <svg width="80" height="80" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
                        </linearGradient>
                    </defs>
                    <circle cx="50" cy="50" r="48" fill="url(#logoGradient)"/>
                    <text x="50" y="70" font-family="Arial, sans-serif" font-size="60" font-weight="bold" 
                          fill="white" text-anchor="middle">R</text>
                </svg>
            </div>
            <div class="company-info">
                <h1>RESCONI</h1>
                <p class="tagline">Professional Payroll & HR Solutions</p>
                <p class="address"><i class="fas fa-map-marker-alt"></i> Accra, Ghana</p>
                <p class="address"><i class="fas fa-phone"></i> +233 XXX XXX XXX | <i class="fas fa-envelope"></i> info@resconi.com</p>
            </div>
        </div>

        <div class="payslip-title">
            <h2>PAYSLIP FOR ${monthYear.toUpperCase()}</h2>
            <p class="payment-date">Payment Date: ${paymentDate}</p>
        </div>

        <div class="payslip-section">
            <h3><i class="fas fa-user me-2"></i>Employee Information</h3>
            <div class="info-grid">
                <div class="info-item">
                    <strong>Employee Name</strong>
                    <span>${employee.fullName}</span>
                </div>
                <div class="info-item">
                    <strong>Employee ID</strong>
                    <span>${employee.employeeId}</span>
                </div>
                <div class="info-item">
                    <strong>Position</strong>
                    <span>${employee.position || 'N/A'}</span>
                </div>
                <div class="info-item">
                    <strong>Ghana Card</strong>
                    <span>${employee.ghanaCard || 'N/A'}</span>
                </div>
                <div class="info-item">
                    <strong>Bank Account</strong>
                    <span>${employee.bankAccount || 'N/A'}</span>
                </div>
                <div class="info-item">
                    <strong>TIN</strong>
                    <span>${employee.tin || 'N/A'}</span>
                </div>
            </div>
        </div>

        <div class="payslip-section">
            <h3><i class="fas fa-money-bill-wave me-2"></i>Earnings</h3>
            <table class="earnings-table">
                <tr>
                    <td>Basic Salary</td>
                    <td>${formatCurrency(employee.basicSalary)}</td>
                </tr>
                <tr>
                    <td>Housing Allowance</td>
                    <td>${formatCurrency(employee.housingAllowance)}</td>
                </tr>
                <tr>
                    <td>Transport Allowance</td>
                    <td>${formatCurrency(employee.transportAllowance)}</td>
                </tr>
                <tr>
                    <td>Other Allowances</td>
                    <td>${formatCurrency(employee.otherAllowances)}</td>
                </tr>
                <tr class="total-row">
                    <td>GROSS PAY</td>
                    <td>${formatCurrency(employee.grossPay)}</td>
                </tr>
            </table>
        </div>

        <div class="payslip-section">
            <h3><i class="fas fa-minus-circle me-2"></i>Deductions</h3>
            <table class="deductions-table">
                <tr>
                    <td>SSNIT Tier 1 (5.5%)</td>
                    <td>${formatCurrency(employee.ssnitT1Employee)}</td>
                </tr>
                <tr>
                    <td>SSNIT Tier 2 (5%)</td>
                    <td>${formatCurrency(employee.ssnitT2Employee)}</td>
                </tr>
                <tr>
                    <td>PAYE Income Tax</td>
                    <td>${formatCurrency(employee.paye)}</td>
                </tr>
                <tr>
                    <td>NHIS (2.5%)</td>
                    <td>${formatCurrency(employee.nhisEmployee)}</td>
                </tr>
                <tr class="total-row">
                    <td>TOTAL DEDUCTIONS</td>
                    <td>${formatCurrency(employee.totalDeductions)}</td>
                </tr>
            </table>
        </div>

        <div class="net-pay-box">
            <h3>NET PAY</h3>
            <p class="amount">${formatCurrency(employee.netPay)}</p>
        </div>

        <div class="payslip-section employer-contributions">
            <h3><i class="fas fa-building me-2"></i>Employer Contributions (For Records)</h3>
            <table class="deductions-table">
                <tr>
                    <td>SSNIT Tier 1 Employer (13.5%)</td>
                    <td>${formatCurrency(employee.ssnitT1Employer)}</td>
                </tr>
                <tr>
                    <td>SSNIT Tier 2 Employer (5%)</td>
                    <td>${formatCurrency(employee.ssnitT2Employer)}</td>
                </tr>
                <tr>
                    <td>NHIS Employer (2.5%)</td>
                    <td>${formatCurrency(employee.nhisEmployer)}</td>
                </tr>
                <tr class="total-row">
                    <td>TOTAL EMPLOYER COST</td>
                    <td>${formatCurrency(employee.totalEmployerCost)}</td>
                </tr>
            </table>
        </div>

        <div class="signature-section">
            <div class="signature-grid">
                <div class="signature-line">
                    <div class="line"></div>
                    <p>Employee Signature</p>
                </div>
                <div class="signature-line">
                    <div class="line"></div>
                    <p>Date</p>
                </div>
                <div class="signature-line">
                    <div class="line"></div>
                    <p>HR / Payroll Officer</p>
                </div>
            </div>
        </div>

        <div class="payslip-footer">
            <p><i class="fas fa-university me-2"></i><strong>Payment Method:</strong> Bank Transfer</p>
            <p><i class="fas fa-info-circle me-2"></i>This is a computer-generated payslip and does not require a signature.</p>
            <p class="generated-date">Generated on ${generatedDateTime}</p>
        </div>
    `;

    document.getElementById('payslipContent').innerHTML = payslipHTML;
}

// Print Payslip
function printPayslip() {
    const container = document.getElementById('payslipContainer');

    if (container.style.display === 'none') {
        alert('Please select an employee first.');
        return;
    }

    window.print();
}

// Download PDF
function downloadPDF() {
    const container = document.getElementById('payslipContainer');

    if (container.style.display === 'none') {
        alert('Please select an employee first.');
        return;
    }

    const employeeId = document.getElementById('selectEmployee').value;
    const employee = employees.find(emp => emp.employeeId === employeeId);

    if (!employee) return;

    const element = document.getElementById('payslipContent');
    const now = new Date();
    const monthYear = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }).replace(' ', '_');
    const filename = `Payslip_${employee.fullName.replace(/\s+/g, '_')}_${monthYear}.pdf`;

    // Show loading message
    const originalButton = event.target;
    const originalText = originalButton.innerHTML;
    originalButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Generating PDF...';
    originalButton.disabled = true;

    html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false
    }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');

        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        pdf.save(filename);

        // Restore button
        originalButton.innerHTML = originalText;
        originalButton.disabled = false;
    }).catch(error => {
        console.error('PDF generation error:', error);
        alert('Error generating PDF. Please try again.');
        originalButton.innerHTML = originalText;
        originalButton.disabled = false;
    });
}

// Utility Function - Format Currency
function formatCurrency(amount) {
    return 'GHS ' + parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}