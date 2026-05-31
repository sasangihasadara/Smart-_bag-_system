// Controllers/SalaryController.js
const mongoose   = require("mongoose");
const Finance    = require("../Model/FinanceSalaryModel");
const Advance    = require("../Model/AdvanceModel");
const Attendance = require("../Model/AttendanceModel");

function toNumberSafe(v) {
  if (v === null || v === undefined) return 0;
  const n = Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function currentPeriod() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${m}`;
}

/* --------------------------- per-employee calc --------------------------- */
async function calculateSalary(req, res) {
  try {
    const empId  = String(req.query.empId || "").trim();
    const period = (req.query.period || currentPeriod()).trim();

    // NEW: default to strict attendance for the requested period.
    // Pass ?strictAttendance=0 if you want the previous fallback behavior.
    const strictAttendance = String(req.query.strictAttendance ?? "1") !== "0";

    if (!empId) return res.status(400).json({ message: "empId is required" });

    const emp = await Finance.findOne({ EmpId: empId }).lean().exec();
    if (!emp) return res.status(404).json({ message: "Employee not found" });

    const basic =
      toNumberSafe(
        emp.Base_Sal ??
        emp.Basic_Salary ??
        emp.baseSalary ??
        emp.Base_Salary
      );

    // ---- ATTENDANCE LOOKUP (strict by default) ----
    let att = await Attendance.findOne({ empId, period }).lean().exec();

    if (!att && !strictAttendance) {
      // optional fallback (old behavior) only when strictAttendance=0
      att = await Attendance.findOne({ empId })
        .sort({ createdAt: -1 })
        .lean()
        .exec() || null;
    }

    // If still not found, hard-zero the attendance fields for this period
    if (!att) {
      att = {
        empId,
        period,
        workingDays: 0,
        overtimeHrs: 0,
        noPayLeave: 0,
        leaveAllowed: 0,
        leaveTaken: 0,
        other: ""
      };
    }

    // ---- ADVANCE LOOKUP (unchanged: still falls back) ----
    let adv = await Advance.findOne({ empId, period }).lean().exec();
    if (!adv) {
      adv = await Advance.findOne({ empId })
        .sort({ createdAt: -1 })
        .lean()
        .exec() || {};
    }

    const col   = toNumberSafe(adv.costOfLiving);
    const food  = toNumberSafe(adv.food);
    const conv  = toNumberSafe(adv.conveyance);
    const med   = toNumberSafe(adv.medical);
    const perf  = toNumberSafe(adv.bonus);
    const attendBonus   = toNumberSafe(adv.attendance);
    const reimbursements = toNumberSafe(adv.reimbursements);

    const workingDays = toNumberSafe(att.workingDays);
    const otHrs       = toNumberSafe(att.overtimeHrs);
    const noPayLeave  = toNumberSafe(att.noPayLeave);

    // Attendance-based calculations will naturally become 0 when there is no attendance row.
    const hourlyRate   = basic > 0 ? basic / (22 * 8) : 0;
    const overtimePay  = otHrs * hourlyRate * 1.5;
    const noPay        = (basic / 22) * noPayLeave;

    const totalAllowances = col + food + conv + med;
    const gross           = basic + totalAllowances;

    const bonus = perf + attendBonus;

    const salaryBeforeDeduction = gross + overtimePay + bonus + reimbursements;

    // (kept as in your codebase)
    const epfEmp = salaryBeforeDeduction * 0.08;
    const epfEr  = salaryBeforeDeduction * 0.12;
    const etf    = salaryBeforeDeduction * 0.03;
    const apit   = 0;
    const salaryAdvance = 0;

    const totalDeductions = noPay + salaryAdvance + apit + epfEmp + etf;
    const netPayable      = salaryBeforeDeduction - totalDeductions;

    return res.json({
      employee: {
        id: emp.EmpId,
        name: emp.Emp_Name,
        designation: emp.Designation,
        epf: emp.Epf_No,
        bankName: emp.Bank_Name,
        branch: emp.branch,
        accNo: emp.Acc_No,
      },
      attendance: {
        period: att?.period || period,
        workingDays,
        overtimeHrs: otHrs,
        leaveAllowed: toNumberSafe(att.leaveAllowed),
        noPayLeave,
        leaveTaken: toNumberSafe(att.leaveTaken),
        other: att?.other || ""
      },
      advance: {
        period: adv?.period || period,
        costOfLiving: col,
        food,
        conveyance: conv,
        medical: med,
        bonus: perf,
        attendance: attendBonus,
        reimbursements
      },
      numbers: {
        basic, col, food, conv, med, bonus,
        reimbursements, overtimePay, noPay, totalAllowances, gross,
        salaryBeforeDeduction, epfEmp, epfEr, etf, apit, salaryAdvance,
        totalDeductions, netPayable
      }
    });
  } catch (err) {
    console.error("[salary:calc]", err);
    res.status(500).json({ message: "Error calculating salary" });
  }
}

/* ------------------------ ALL employees: total net ----------------------- */
/**
 * GET /salary/summary?period=YYYY-MM
 */
async function salarySummary(req, res) {
  try {
    const period = (req.query.period || currentPeriod()).trim();

    // employees (EmpId + Base_Sal only)
    const employees = await Finance.find(
      {},
      { EmpId: 1, Emp_Name: 1, Base_Sal: 1, _id: 0 }
    ).lean().exec();

    const empIds = employees.map(e => e.EmpId);

    // period records
    const [attsPeriod, advsPeriod] = await Promise.all([
      Attendance.find({ empId: { $in: empIds }, period }).lean().exec(),
      Advance.find({ empId: { $in: empIds }, period }).lean().exec(),
    ]);
    const attMap = new Map(attsPeriod.map(a => [a.empId, a]));
    const advMap = new Map(advsPeriod.map(a => [a.empId, a]));

    // need fallbacks for missing (summary can still use latest)
    const missingAttIds = empIds.filter(id => !attMap.has(id));
    const missingAdvIds = empIds.filter(id => !advMap.has(id));

    if (missingAttIds.length) {
      const latestAtt = await Attendance.aggregate([
        { $match: { empId: { $in: missingAttIds } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: "$empId", doc: { $first: "$$ROOT" } } },
      ]);
      latestAtt.forEach(x => attMap.set(x._id, x.doc));
    }

    if (missingAdvIds.length) {
      const latestAdv = await Advance.aggregate([
        { $match: { empId: { $in: missingAdvIds } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: "$empId", doc: { $first: "$$ROOT" } } },
      ]);
      latestAdv.forEach(x => advMap.set(x._id, x.doc));
    }

    // compute per-employee, sum
    let totalNet = 0;
    let countUsed = 0;

    for (const emp of employees) {
      const basic = toNumberSafe(emp.Base_Sal);
      const att = attMap.get(emp.EmpId) || {};
      const adv = advMap.get(emp.EmpId) || {};

      const col   = toNumberSafe(adv.costOfLiving);
      const food  = toNumberSafe(adv.food);
      const conv  = toNumberSafe(adv.conveyance);
      const med   = toNumberSafe(adv.medical);
      const perf  = toNumberSafe(adv.bonus);
      const attendBonus = toNumberSafe(adv.attendance);
      const reimbursements = toNumberSafe(adv.reimbursements);

      const otHrs      = toNumberSafe(att.overtimeHrs);
      const noPayLeave = toNumberSafe(att.noPayLeave);

      const hourlyRate   = basic > 0 ? basic / (22 * 8) : 0;
      const overtimePay  = otHrs * hourlyRate * 1.5;
      const noPay        = (basic / 22) * noPayLeave;

      const totalAllowances = col + food + conv + med;
      const gross           = basic + totalAllowances;
      const bonus           = perf + attendBonus;

      const salaryBeforeDeduction = gross + overtimePay + bonus + reimbursements;

      const epfEmp = salaryBeforeDeduction * 0.08;
      const etf    = salaryBeforeDeduction * 0.03;
      const apit   = 0;
      const salaryAdvance = 0;

      const totalDeductions = noPay + salaryAdvance + apit + epfEmp + etf;
      const netPayable      = salaryBeforeDeduction - totalDeductions;

      if (Number.isFinite(netPayable)) {
        totalNet += netPayable;
        countUsed += 1;
      }
    }

    return res.json({
      totalNet: Math.round(totalNet),
      employeesCount: countUsed,
      period,
    });
  } catch (err) {
    console.error("[salary:summary]", err);
    res.status(500).json({ message: "Failed to load salary summary" });
  }
}

module.exports = { calculateSalary, salarySummary };

/* -------------------------------------------------------------------------- */
/*                          NEW: Month-aware summaries                        */
/* -------------------------------------------------------------------------- */

/** Build last N periods as 'YYYY-MM' strings, ending at current month. */
function buildLastNPeriods(n = 12) {
  const arr = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    arr.push(`${y}-${m}`);
  }
  return arr;
}

/** Compute payroll + contribution totals for a single period (strict, no fallbacks). */
async function computeTotalsForPeriodStrict(period) {
  // Pull employees (EmpId + Base_Sal)
  const employees = await Finance.find(
    {},
    { EmpId: 1, Emp_Name: 1, Base_Sal: 1, _id: 0 }
  ).lean().exec();

  if (!employees.length) {
    return {
      totalNet: 0,
      totalEpfEmp: 0, // 8% employee
      totalEpfEr: 0,  // 12% employer
      totalEtf: 0,    // 3% employer
      employeesCount: 0,
    };
  }

  const empIds = employees.map(e => e.EmpId);

  // Strict records for the exact period
  const [attDocs, advDocs] = await Promise.all([
    Attendance.find({ empId: { $in: empIds }, period }).lean().exec(),
    Advance.find({ empId: { $in: empIds }, period }).lean().exec(),
  ]);

  const attMap = new Map(attDocs.map(a => [a.empId, a]));
  const advMap = new Map(advDocs.map(a => [a.empId, a]));

  let totalNet = 0;
  let totalEpfEmp = 0;
  let totalEpfEr  = 0;
  let totalEtf    = 0;
  let used = 0;

  for (const emp of employees) {
    const basic = toNumberSafe(emp.Base_Sal);

    // if attendance for this period is missing, treat attendance as zeros (strict)
    const att = attMap.get(emp.EmpId) || {
      workingDays: 0,
      overtimeHrs: 0,
      noPayLeave: 0,
    };
    const adv = advMap.get(emp.EmpId) || {
      costOfLiving: 0,
      food: 0,
      conveyance: 0,
      medical: 0,
      bonus: 0,
      attendance: 0,
      reimbursements: 0,
    };

    const col   = toNumberSafe(adv.costOfLiving);
    const food  = toNumberSafe(adv.food);
    const conv  = toNumberSafe(adv.conveyance);
    const med   = toNumberSafe(adv.medical);
    const perf  = toNumberSafe(adv.bonus);
    const attendBonus   = toNumberSafe(adv.attendance);
    const reimbursements = toNumberSafe(adv.reimbursements);

    const otHrs      = toNumberSafe(att.overtimeHrs);
    const noPayLeave = toNumberSafe(att.noPayLeave);

    const hourlyRate   = basic > 0 ? basic / (22 * 8) : 0;
    const overtimePay  = otHrs * hourlyRate * 1.5;
    const noPay        = (basic / 22) * noPayLeave;

    const totalAllowances = col + food + conv + med;
    const gross           = basic + totalAllowances;
    const bonus           = perf + attendBonus;

    const salaryBeforeDeduction = gross + overtimePay + bonus + reimbursements;

    // Contributions (same as in your per-employee calc)
    const epfEmp = salaryBeforeDeduction * 0.08; // employee share (deduction)
    const epfEr  = salaryBeforeDeduction * 0.12; // employer share (expense)
    const etf    = salaryBeforeDeduction * 0.03; // employer expense
    const apit   = 0;
    const salaryAdvance = 0;

    const totalDeductions = noPay + salaryAdvance + apit + epfEmp + etf;
    const netPayable      = salaryBeforeDeduction - totalDeductions;

    if (Number.isFinite(netPayable)) {
      totalNet    += netPayable;
      totalEpfEmp += epfEmp;
      totalEpfEr  += epfEr;
      totalEtf    += etf;
      used += 1;
    }
  }

  return {
    totalNet: Math.round(totalNet),
    totalEpfEmp: Math.round(totalEpfEmp),
    totalEpfEr: Math.round(totalEpfEr),
    totalEtf: Math.round(totalEtf),
    employeesCount: used,
  };
}

/**
 * GET /salary/summary-v2?months=12
 * - KPI (this month only): returns `currentMonth` (net payroll)
 * - Charts: `monthly` array for last N months (strict by period, no fallback)
 */
async function salarySummaryV2(req, res) {
  try {
    const months = Math.max(1, Math.min(24, Number(req.query.months || 12)));
    const periods = buildLastNPeriods(months);

    const monthly = [];
    for (const p of periods) {
      const { totalNet, employeesCount } = await computeTotalsForPeriodStrict(p);
      const [y, m] = p.split("-");
      const label = new Date(Number(y), Number(m) - 1, 1).toLocaleString("en", { month: "short" });
      monthly.push({ period: p, y: Number(y), m: Number(m), month: label, value: totalNet, count: employeesCount });
    }

    const current = monthly[monthly.length - 1] || { value: 0, count: 0, period: periods[periods.length - 1] };

    return res.json({
      periodEnd: periods[periods.length - 1],
      monthly,                                // [{period:'2025-07', month:'Jul', value: <net>, count:<n>}, …]
      currentMonth: { value: current.value, count: current.count, period: current.period },
      totalNet: current.value,                // convenience alias for KPI
    });
  } catch (err) {
    console.error("[salary:summary-v2]", err);
    res.status(500).json({ message: "Failed to load monthly payroll summary" });
  }
}

/**
 * GET /contributions/summary-v2?months=12
 * - KPI (this month only): employer EPF 12% + ETF 3%
 * - Charts: `monthly` array of employer contributions for last N months
 *
 * NOTE:
 *   - Company expense is usually EPF (employer 12%) + ETF (3%) = 15%.
 *   - Employee EPF (8%) is a deduction, not employer expense; excluded here.
 */
async function contributionsSummaryV2(req, res) {
  try {
    const months = Math.max(1, Math.min(24, Number(req.query.months || 12)));
    const periods = buildLastNPeriods(months);

    const monthly = [];
    let grandTotal = 0;

    for (const p of periods) {
      const { totalEpfEr, totalEtf } = await computeTotalsForPeriodStrict(p);
      const companyContrib = totalEpfEr + totalEtf; // 12% + 3%
      grandTotal += companyContrib;

      const [y, m] = p.split("-");
      const label = new Date(Number(y), Number(m) - 1, 1).toLocaleString("en", { month: "short" });
      monthly.push({ period: p, y: Number(y), m: Number(m), month: label, value: companyContrib, epfEr: totalEpfEr, etf: totalEtf });
    }

    const current = monthly[monthly.length - 1] || { value: 0, period: periods[periods.length - 1] };

    return res.json({
      periodEnd: periods[periods.length - 1],
      monthly,                     // [{period:'2025-07', month:'Jul', value:<EPF12+ETF3>, epfEr, etf}, …]
      currentMonth: { value: current.value, period: current.period },
      grandTotal,                  // sum over the requested window (last N months)
    });
  } catch (err) {
    console.error("[contrib:summary-v2]", err);
    res.status(500).json({ message: "Failed to load EPF/ETF summary" });
  }
}

// add new exports without touching the original assignment above
module.exports.salarySummaryV2 = salarySummaryV2;
module.exports.contributionsSummaryV2 = contributionsSummaryV2;
