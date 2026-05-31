import React, { useEffect, useState } from "react";
import "./SalaryManagement.css";
import Sidebar from "../Sidebar/Sidebarsanu";
import { NavLink } from "react-router-dom";
import { api } from "../../lib/api";

const LKR = (n) => `LKR ${Math.round(Number(n || 0)).toLocaleString()}`;

function numberToWords(num) {
  num = Math.round(Number(num || 0));
  if (num === 0) return "Zero";
  const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  const chunk = (n) => n < 20 ? ones[n] :
    n < 100 ? tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "") :
    ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + chunk(n % 100) : "");
  let out = "", scales = [["Billion",1e9],["Million",1e6],["Thousand",1e3]];
  for (const [name, val] of scales) {
    if (num >= val) {
      out += `${chunk(Math.floor(num / val))} ${name} `;
      num %= val;
    }
  }
  if (num > 0) out += chunk(num);
  return out.trim();
}

export default function SalaryManagement() {
  const [employees, setEmployees] = useState([]);
  const [empId, setEmpId] = useState("");
  const [calc, setCalc] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/finances/min-list");
        setEmployees(data.employees || []);
        if ((data.employees || []).length) setEmpId(data.employees[0].EmpId);
      } catch (e) {
        alert(`ERROR: ${(e?.response?.data?.message || e.message)}`);
      }
    })();
  }, []);

  async function calculateSalary() {
    if (!empId) { alert("Select an employee"); return null; }
    try {
      setLoading(true);
      const { data } = await api.get(`/salary/calc`, { params: { empId } });
      setCalc(data);

      const n = data.numbers;
      document.getElementById("basicSal").textContent  = LKR(n.basic);
      document.getElementById("grossSal").textContent  = LKR(n.gross);
      document.getElementById("empEpf").textContent    = LKR(n.epfEmp);
      document.getElementById("emplerEpf").textContent = LKR(n.epfEr);
      document.getElementById("etfAmt").textContent    = LKR(n.etf);
      document.getElementById("netSal").textContent    = LKR(n.netPayable);
      document.getElementById("calcBox").style.display = "block";
      return data;
    } catch (e) {
      alert(`ERROR: ${(e?.response?.data?.message || e.message)}`);
      return null;
    } finally {
      setLoading(false);
    }
  }

  /* ---------- RELIABLE TAB OPEN (Blob) ---------- */
  function openSlip(html) {
    try {
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) {
      console.error("openSlip failed", e);
      alert("Could not open the salary slip tab.");
    }
  }

  async function generateSalarySlip() {
    // Always get a fresh calculation to avoid stale/slip mixups
    const data = await calculateSalary();
    if (!data) return;

    const emp = data.employee;
    const att = data.attendance || {};
    const n   = data.numbers;

    const now = new Date();
    const periodShort = now.toLocaleString("en-US", { month: "short" }) + " " + String(now.getFullYear()).slice(-2);
    const periodLong  = now.toLocaleString("en-US", { month: "long", year: "numeric" });
    const amountWords = numberToWords(n.netPayable);

    // Use an absolute URL to the logo so it loads from a Blob URL context
    const origin = window.location.origin;
    const logoUrl = `${origin}/new logo.png`; // place your file in /public/new logo.png

    const slipHTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Salary Slip - ${emp.name}</title>
<style>
 :root{ --ink:#2e2e2e; --grid:#aeb7d6; --head:#111; --muted:#666; --bg:#fff; }
 *{box-sizing:border-box}
 body{font-family:"Segoe UI",Arial,Helvetica,sans-serif;background:#fff;color:var(--ink);margin:0;padding:24px}
 .wrap{max-width:930px;margin:0 auto;background:var(--bg);border:1px solid var(--grid)}
 /* Header with logo + name */
 .brandbar{display:flex; align-items:center; gap:14px; padding:14px 14px 6px 14px;}
 .brandbar .logo{width:120px;height:120px;object-fit:contain;filter:drop-shadow(0 1px 3px rgba(0,0,0,.15))}
 .company{font-size:28px;font-weight:800;margin:0;line-height:1;margin-left:500px;}
 .addr{font-size:14px;color:var(--muted);margin:2px 0 10px 500px}
 .titlebar{display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--grid);border-bottom:1px solid var(--grid);padding:6px 10px;font-weight:800}
 .titlebar .left{font-size:16px}.titlebar .right{font-size:14px}
 .bar{font-weight:800;border-top:1px solid var(--grid);border-bottom:1px solid var(--grid);padding:6px 10px;background:#f6f8ff}
 .bar.bar-tight{padding:4px 8px}
 .tbl{width:100%;border-collapse:collapse;table-layout:fixed}
 .tbl th,.tbl td{border:1px solid var(--grid);padding:7px 10px;font-size:13px;vertical-align:middle}
 .tbl th{background:#eef2ff;font-weight:800;color:var(--head)}
 .tbl td.key{font-weight:700;background:#fafbff;width:35%}
 .tbl.tbl-mini td{padding:6px 8px;font-size:12px}
 .tbl.tbl-mini .k{background:#f6f8ff;font-weight:700;color:#223}
 .tbl.tbl-mini .v{width:72px;text-align:center;font-weight:700}
 .tbl.tbl-mini .v.wide{width:auto}
 .grid2{display:grid;grid-template-columns:1fr 1fr}
 .grid2>div{border-right:1px solid var(--grid)}
 .grid2>div:last-child{border-right:none}
 @media(max-width:640px){.grid2{grid-template-columns:1fr}.grid2>div{border-right:none}}
 .right{text-align:right}.tot{font-weight:800}.net{background:#f0fbf3}
 @media print{.noprint{display:none}}
 .noprint{margin-bottom:10px}
 .noprint .btn{display:inline-block;margin-right:8px;background:#3b82f6;color:#fff;border:none;border-radius:6px;padding:8px 14px;cursor:pointer;font-size:13px}
 .noprint .btn.green{background:#22c55e}
</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"><\/script>
</head>
<body>
<div class="noprint">
  <button class="btn" onclick="window.print()">🖨️ Print</button>
  <button class="btn green" onclick="downloadPDF()">📄 Download PDF</button>
</div>

<div id="slip" class="wrap">
  <div class="brandbar">
    <img class="logo" src="${logoUrl}" alt="PackPal logo" onerror="this.style.display='none'">
    <div>
      <h1 class="company">PackPal (Pvt) Ltd</h1>
      <div class="addr">No. 42, Elm Street, Colombo • +94 11 234 5678 • hello@packpal.lk</div>
    </div>
  </div>

  <div class="titlebar"><div class="left">Salary Slip For the month of</div><div class="right">${periodShort}</div></div>

  <div class="bar">Employee Information</div>
  <table class="tbl">
    <tr><td class="key">UID:</td><td>${emp.id}</td><td class="key">Designation:</td><td>${emp.designation || "-"}</td></tr>
    <tr><td class="key">Name:</td><td>${emp.name}</td><td class="key">EPF No:</td><td>${emp.epf || "-"}</td></tr>
  </table>

  <div class="grid2">
    <div>
      <div class="bar bar-tight">Employee Attendance</div>
      <table class="tbl tbl-mini">
        <tr><td class="k">Working Days</td><td class="v">${Number(att?.workingDays ?? 0)}</td><td class="k">Overtime Hours</td><td class="v">${Number(att?.overtimeHrs ?? 0)}</td></tr>
        <tr><td class="k">Leave Allowed</td><td class="v">${Number(att?.leaveAllowed ?? 0)}</td><td class="k">No Pay Leave</td><td class="v">${Number(att?.noPayLeave ?? 0)}</td></tr>
        <tr><td class="k">Leave Taken</td><td class="v wide" colspan="3">${Number(att?.leaveTaken ?? 0)}</td></tr>
      </table>
    </div>
    <div>
      <div class="bar bar-tight">Salary Transferred To</div>
      <table class="tbl tbl-mini">
        <tr><td class="k">Bank Name:</td><td class="v wide">${emp.bankName || "—"}</td></tr>
        <tr><td class="k">Account No:</td><td class="v wide">${emp.accNo || "—"}</td></tr>
        <tr><td class="k">Branch Name:</td><td class="v wide">${emp.branch || "—"}</td></tr>
      </table>
    </div>
  </div>

  <div class="bar">Salary Calculations</div>
  <div class="grid2">
    <div>
      <table class="tbl">
        <tr><td class="key">Basic Salary</td><td class="right">${LKR(n.basic)}</td></tr>
        <tr><td class="key">Allowances:</td><td></td></tr>
        <tr><td class="key">Cost of Living Allowance</td><td class="right">${LKR(n.col)}</td></tr>
        <tr><td class="key">Conveyance Allowance</td><td class="right">${LKR(n.conv)}</td></tr>
        <tr><td class="key">Medical Allowance</td><td class="right">${LKR(n.med)}</td></tr>
        <tr><td class="key tot">Total Allowances</td><td class="right tot">${LKR(n.totalAllowances)}</td></tr>
        <tr><td class="key tot">Gross Salary</td><td class="right tot">${LKR(n.gross)}</td></tr>
      </table>
    </div>
    <div>
      <table class="tbl">
        <tr><td class="key">Deductions</td><td></td></tr>
        <tr><td class="key">No Pay Days Deductions</td><td class="right">${LKR(n.noPay)}</td></tr>
        <tr><td class="key">EPF Employee Contribution (8%)</td><td class="right">${LKR(n.epfEmp)}</td></tr>
        <tr><td class="key tot">Total Deductions</td><td class="right tot">${LKR(n.totalDeductions)}</td></tr>
        <tr><td class="key">EPF Employer Contribution (12%)</td><td class="right">${LKR(n.epfEr)}</td></tr>
        <tr><td class="key">ETF Employer Contribution (3%)</td><td class="right">${LKR(n.etf)}</td></tr>
      </table>
    </div>
  </div>

  <div class="bar">Additional Perks</div>
  <table class="tbl">
    <tr><td class="key">Overtime</td><td class="right">${LKR(n.overtimePay)}</td><td class="key">Bonus</td><td class="right">${LKR(n.bonus)}</td></tr>
    <tr><td class="key tot">Salary Before Deduction</td><td class="right tot">${LKR(n.salaryBeforeDeduction)}</td><td class="key tot net">Net Payable Salary</td><td class="right tot net">${LKR(n.netPayable)}</td></tr>
  </table>

  <div class="bar">Amount in Words</div>
  <table class="tbl"><tr><td>${amountWords} Rupees Only</td></tr></table>

  <div style="padding:8px 10px;color:#555;border-top:1px solid var(--grid);font-size:12px;">Salary Period: ${periodLong}</div>
</div>

<script>
  function downloadPDF(){
    const el=document.getElementById('slip');
    html2canvas(el,{scale:2,useCORS:true,allowTaint:true}).then(cv=>{
      const img=cv.toDataURL('image/png');
      const pdf=new jspdf.jsPDF('p','mm','a4');
      const pageW=210, pageH=297;
      const imgW=pageW, imgH=cv.height*imgW/cv.width;
      let left=imgH;
      pdf.addImage(img,'PNG',0,0,imgW,imgH);
      left-=pageH;
      while(left>0){ pdf.addPage(); pdf.addImage(img,'PNG',0,-(left),imgW,imgH); left-=pageH; }
      pdf.save('salary-slip-${emp.name.replace(/\\s+/g,"-")}-${periodLong.replace(/\\s+/g,"-")}.pdf');
    });
  }
<\/script>
</body></html>`;
    openSlip(slipHTML);
  }

  async function transferSalary() {
    const data = await calculateSalary();
    if (!data) return;
    const month = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long" });
    try {
      await api.post("/transfers", {
        empId: data.employee.id,
        empName: data.employee.name,
        amount: Math.round(data.numbers.netPayable),
        month
      });
      alert(`Salary transfer initiated for ${data.employee.name} — ${LKR(data.numbers.netPayable)}`);
    } catch (e) {
      alert(e?.response?.data?.message || "Transfer failed");
    }
  }

  return (
    <div className="salarymgmt">{/* <- different page wrapper */}
      <Sidebar />
      <div className="container">
        <h1>Employee Salary Management</h1>
        <p>Real-time salary insights and employee payroll management</p>

        <div className="section">
          <div className="nav">
            <NavLink to="/finance/employees"  className={({isActive}) => `tab-btn ${isActive ? 'active' : ''}`}>👥 Employees</NavLink>
            <NavLink to="/finance/attendance" className={({isActive}) => `tab-btn ${isActive ? 'active' : ''}`}>📅 Attendance</NavLink>
            <NavLink to="/finance/advance"    className={({isActive}) => `tab-btn ${isActive ? 'active' : ''}`}>💰 Advance</NavLink>
            <NavLink to="/finance/salary"     className={({isActive}) => `tab-btn ${isActive ? 'active' : ''}`}>📊 Salary Management</NavLink>
            <NavLink to="/finance/transfers"  className={({isActive}) => `tab-btn ${isActive ? 'active' : ''}`}>💸 Salary Transfers</NavLink>
          </div>

          <h2>Salary Management</h2>

          <div className="form-group">
            <label>Select Employee</label>
            <select value={empId} onChange={(e)=>setEmpId(e.target.value)}>
              {employees.length === 0 ? (
                <option value="">Loading…</option>
              ) : employees.map(e => (
                <option key={e.EmpId} value={e.EmpId}>
                  {e.EmpId} - {e.Emp_Name}
                </option>
              ))}
            </select>
          </div>

          <div className="actions">
            <button className="btn btn-success"  onClick={generateSalarySlip} disabled={!empId || loading}>📄 Generate Salary Slip</button>
            <button className="btn btn-primary" onClick={transferSalary}     disabled={!empId || loading}>💰 Transfer Salary</button>
            <button className="btn btn-warning" onClick={calculateSalary}    disabled={!empId || loading}>🧮 Calculate Salary</button>
          </div>

          <div id="calcBox" className="calc" style={{ display: "none" }}>
            <h3>💰 Salary Calculation</h3>
            <div className="grid">
              <div className="tile"><h4>Basic Salary</h4><div id="basicSal"  className="amt">LKR 0</div></div>
              <div className="tile"><h4>Gross Salary</h4><div id="grossSal"  className="amt">LKR 0</div></div>
              <div className="tile"><h4>Employee EPF (8%)</h4><div id="empEpf" className="amt">LKR 0</div></div>
              <div className="tile"><h4>Employer EPF (12%)</h4><div id="emplerEpf" className="amt">LKR 0</div></div>
              <div className="tile"><h4>ETF (3%)</h4><div id="etfAmt" className="amt">LKR 0</div></div>
              <div className="tile"><h4>Net Salary</h4><div id="netSal" className="amt">LKR 0</div></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
