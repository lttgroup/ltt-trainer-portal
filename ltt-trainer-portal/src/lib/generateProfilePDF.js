// src/lib/generateProfilePDF.js
// Generates a branded trainer competency profile PDF using jsPDF
// Install: npm install jspdf

import { jsPDF } from "jspdf";

// Brand colours
const NAVY = [8, 26, 71];       // #081a47
const TEAL = [50, 186, 154];    // #32ba9a
const BLUE = [28, 94, 168];     // #1c5ea8
const GREEN = [22, 101, 52];    // #166534
const RED = [201, 53, 53];      // #c93535
const AMBER = [146, 80, 10];    // #92500a
const GRAY = [107, 114, 128];
const LIGHT = [249, 250, 251];
const WHITE = [255, 255, 255];

function setColor(doc, rgb, type = "fill") {
  if (type === "fill") doc.setFillColor(...rgb);
  else doc.setTextColor(...rgb);
}

function drawRect(doc, x, y, w, h, color) {
  setColor(doc, color, "fill");
  doc.rect(x, y, w, h, "F");
}

function label(doc, text, x, y, size = 7, color = GRAY, bold = false) {
  doc.setFontSize(size);
  doc.setFont("helvetica", bold ? "bold" : "normal");
  setColor(doc, color, "text");
  doc.text(text, x, y);
}

function pill(doc, text, x, y, bg, fg, w = 30) {
  drawRect(doc, x, y - 4, w, 6, bg);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  setColor(doc, fg, "text");
  doc.text(text, x + w / 2, y, { align: "center" });
}

function sectionHeader(doc, number, title, y, approved) {
  const bg = approved ? GREEN : NAVY;
  drawRect(doc, 14, y, 182, 8, bg);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  setColor(doc, WHITE, "text");
  doc.text(`${number}  ${title}`, 18, y + 5.5);
  if (approved) {
    doc.setFontSize(7);
    doc.text("✓ Approved", 172, y + 5.5, { align: "right" });
  }
  return y + 10;
}

function fieldGrid(doc, fields, y, cols = 3) {
  const colW = 182 / cols;
  fields.forEach((f, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 14 + col * colW;
    const fy = y + row * 14;
    label(doc, f.label.toUpperCase(), x, fy, 6, GRAY, true);
    label(doc, f.value || "—", x, fy + 5, 8, [30, 30, 30]);
  });
  return y + Math.ceil(fields.length / cols) * 14 + 2;
}

function addPage(doc) {
  doc.addPage();
  return 20;
}

function checkY(doc, y, needed = 20) {
  if (y + needed > 275) {
    return addPage(doc);
  }
  return y;
}

export async function generateProfilePDF({ trainer, trainerProfile, industryQuals, evidenceFiles, questResponses, experienceData, assignedUnits, streams = [], streamUnits = {} }) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const marginL = 14;
  const contentW = 182;

  // ── COVER / HEADER ──────────────────────────────────────────────────────────
  drawRect(doc, 0, 0, pageW, 45, NAVY);

  // Logo text (LTT)
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  setColor(doc, WHITE, "text");
  doc.text("LTT", marginL, 18);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  setColor(doc, [180, 200, 230], "text");
  doc.text("Labtech Training", marginL, 24);

  // Title
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  setColor(doc, WHITE, "text");
  doc.text("Trainer Competency Profile", marginL, 35);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  setColor(doc, [180, 200, 230], "text");
  doc.text("Standards for RTOs 2025 — AF3.21", marginL, 41);

  // Trainer name + status on cover
  const statusColors = {
    Compliant: { bg: TEAL, fg: NAVY },
    Pending: { bg: [248, 222, 149], fg: AMBER },
    Incomplete: { bg: [252, 200, 200], fg: RED },
    "Under Review": { bg: [200, 220, 255], fg: BLUE },
  };
  const sc = statusColors[trainer.compliance_status] || statusColors["Incomplete"];

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  setColor(doc, WHITE, "text");
  doc.text(trainer.full_name || "—", pageW - marginL, 28, { align: "right" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(trainer.email || "", pageW - marginL, 34, { align: "right" });

  // Status pill
  pill(doc, trainer.compliance_status || "Incomplete", pageW - marginL - 28, 37, sc.bg, sc.fg, 28);

  // Generated date
  doc.setFontSize(7);
  setColor(doc, [150, 170, 200], "text");
  doc.text(`Generated ${new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}`, pageW - marginL, 43, { align: "right" });

  let y = 55;

  // ── SECTION 1 — PERSONAL DETAILS ──────────────────────────────────────────
  y = sectionHeader(doc, "Section 1", "Trainer Assessor Details", y, trainerProfile?.s1_approved === true);
  y = fieldGrid(doc, [
    { label: "Full Name", value: trainer.full_name },
    { label: "Email", value: trainer.email },
    { label: "Phone", value: trainer.phone },
    { label: "Position", value: trainer.position },
    { label: "Employment Status", value: trainer.employment_status },
    { label: "State", value: trainer.state },
  ], y, 3);
  y += 4;

  // ── SECTION 2 — TRAINING CREDENTIALS ──────────────────────────────────────
  y = checkY(doc, y, 35);
  const credApproved = trainerProfile?.profile_status === "Approved";
  y = sectionHeader(doc, "Section 2", "Training Credentials", y, credApproved);

  if (trainerProfile?.tae_qualification) {
    y = fieldGrid(doc, [
      { label: "TAE Qualification", value: trainerProfile.tae_qualification },
      { label: "Provider Name", value: trainerProfile.tae_provider },
      { label: "Provider ID", value: trainerProfile.tae_provider_id },
      { label: "Issue Date", value: trainerProfile.tae_issue_date },
    ], y, 4);
  } else if (trainerProfile?.under_direction_qualification) {
    label(doc, "UNDER DIRECTION — ENROLLED", marginL, y + 3, 6.5, AMBER, true);
    y += 6;
    y = fieldGrid(doc, [
      { label: "Qualification", value: trainerProfile.under_direction_qualification },
      { label: "Provider Name", value: trainerProfile.under_direction_provider },
      { label: "Provider ID", value: trainerProfile.under_direction_provider_id },
      { label: "Commencement", value: trainerProfile.under_direction_commencement },
    ], y, 4);
  } else {
    label(doc, "Not submitted", marginL, y + 5, 8, GRAY);
    y += 10;
  }

  // TAE evidence files
  const taeFiles = (evidenceFiles || []).filter((f) => f.document_type === "TAE Credential" || f.document_type === "TAE Enrolment Evidence");
  if (taeFiles.length > 0) {
    label(doc, "UPLOADED EVIDENCE", marginL, y, 6, GRAY, true);
    y += 5;
    taeFiles.forEach((f) => {
      label(doc, `📎  ${f.file_name}`, marginL + 2, y, 7.5, [50, 50, 50]);
      y += 5;
    });
  }
  y += 4;

  // ── SECTION 3 — INDUSTRY COMPETENCIES ─────────────────────────────────────
  y = checkY(doc, y, 30);
  const qualsApproved = trainerProfile?.industry_quals_approved === true;
  y = sectionHeader(doc, "Section 3", "Industry Competencies", y, qualsApproved);

  if (industryQuals && industryQuals.length > 0) {
    // Table header
    drawRect(doc, marginL, y, contentW, 6, [235, 240, 248]);
    const qCols = [0, 30, 90, 130, 156];
    const qHeaders = ["Code", "Title", "Provider", "Provider ID", "Issue Date"];
    qHeaders.forEach((h, i) => label(doc, h.toUpperCase(), marginL + qCols[i] + 1, y + 4.5, 6, GRAY, true));
    y += 7;

    industryQuals.forEach((q, idx) => {
      if (idx % 2 === 0) drawRect(doc, marginL, y - 1, contentW, 7, LIGHT);
      y = checkY(doc, y, 8);
      label(doc, q.qualification_code || "—", marginL + qCols[0] + 1, y + 4, 7.5, [30, 30, 30]);
      label(doc, (q.qualification_title || "—").slice(0, 35), marginL + qCols[1] + 1, y + 4, 7.5, [30, 30, 30]);
      label(doc, (q.provider_name || "—").slice(0, 20), marginL + qCols[2] + 1, y + 4, 7.5, [30, 30, 30]);
      label(doc, q.provider_id || "—", marginL + qCols[3] + 1, y + 4, 7.5, [30, 30, 30]);
      label(doc, q.issue_date || "—", marginL + qCols[4] + 1, y + 4, 7.5, [30, 30, 30]);
      y += 7;
    });

    // Industry evidence files
    const indFiles = (evidenceFiles || []).filter((f) => f.document_type === "Industry Qualification");
    if (indFiles.length > 0) {
      y += 2;
      label(doc, "CERTIFICATES UPLOADED", marginL, y, 6, GRAY, true);
      y += 5;
      indFiles.forEach((f) => {
        label(doc, `📎  ${f.file_name}`, marginL + 2, y, 7.5, [50, 50, 50]);
        y += 5;
      });
    }
  } else {
    label(doc, "No industry qualifications submitted", marginL, y + 5, 8, GRAY);
    y += 10;
  }
  y += 4;

  // ── SECTION 4 — DECLARATION ────────────────────────────────────────────────
  y = checkY(doc, y, 30);
  const s4Approved = trainerProfile?.s4_approved === true;
  y = sectionHeader(doc, "Section 4", "Credentials Declaration", y, s4Approved);
  y = fieldGrid(doc, [
    { label: "Credentials Declared", value: trainerProfile?.declaration_credentials ? "✓ Confirmed" : "Not confirmed" },
    { label: "Copies Provided", value: trainerProfile?.declaration_copies ? "✓ Confirmed" : "Not confirmed" },
    { label: "Signature", value: trainerProfile?.declaration_signature },
    { label: "Date", value: trainerProfile?.declaration_date },
  ], y, 4);
  y += 6;

  // ── SECTION 5 — SKILLS QUESTIONNAIRE ──────────────────────────────────────
  y = checkY(doc, y, 30);
  const questTotal = questResponses?.length || 0;
  const questYes = questResponses?.filter((r) => r.response === "yes").length || 0;
  const questNo = questResponses?.filter((r) => r.response === "no").length || 0;
  const questHold = questResponses?.filter((r) => r.response === "hold").length || 0;
  y = sectionHeader(doc, "Section 5", "Skills Questionnaire", y, questTotal === 150);

  // Summary row
  const summaryItems = [
    { label: "Yes — Experience", value: questYes, color: BLUE },
    { label: "No — No Experience", value: questNo, color: GRAY },
    { label: "Hold", value: questHold, color: AMBER },
    { label: "Total Answered", value: questTotal, color: NAVY },
  ];
  summaryItems.forEach((item, i) => {
    const x = marginL + i * 46;
    drawRect(doc, x, y, 44, 14, LIGHT);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    setColor(doc, item.color, "text");
    doc.text(String(item.value), x + 22, y + 9, { align: "center" });
    label(doc, item.label, x + 22, y + 13, 6, GRAY);
  });
  y += 18;

  // Unit grid — compact display
  if (questResponses && questResponses.length > 0) {
    label(doc, "UNIT RESPONSES", marginL, y, 6, GRAY, true);
    y += 4;
    const sorted = [...questResponses].sort((a, b) => a.unit_code.localeCompare(b.unit_code));
    const cols = 6;
    const cellW = contentW / cols;
    const cellH = 7;
    sorted.forEach((r, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      if (col === 0 && row > 0) y = checkY(doc, y, cellH);
      const x = marginL + col * cellW;
      const cy = y + row * cellH;
      const expEntry = experienceData?.find((e) => e.unit_code === r.unit_code);
      const isApproved = r.response === "yes" && expEntry?.competency_confirmed === true;
      const isRejected = r.response === "yes" && expEntry?.competency_confirmed === false;
      const bg = isApproved ? [220, 252, 231] : isRejected ? [254, 234, 234] : r.response === "yes" ? [219, 234, 254] : LIGHT;
      const fg = isApproved ? GREEN : isRejected ? RED : r.response === "yes" ? BLUE : GRAY;
      drawRect(doc, x, cy, cellW - 0.5, cellH - 0.5, bg);
      doc.setFontSize(6);
      doc.setFont("helvetica", "bold");
      setColor(doc, fg, "text");
      doc.text(r.unit_code, x + cellW / 2, cy + 4, { align: "center" });
    });
    y += Math.ceil(sorted.length / cols) * cellH + 4;
  }
  y += 4;

  // ── SECTION 6 — INDUSTRY EXPERIENCE ───────────────────────────────────────
  y = checkY(doc, y, 30);
  const assignedCount = assignedUnits?.length || 0;
  const approvedExp = experienceData?.filter((e) => e.competency_confirmed === true).length || 0;
  const s6AllApproved = assignedCount > 0 && approvedExp === assignedCount;
  y = sectionHeader(doc, "Section 6", "Industry Experience, Skills and Currency", y, s6AllApproved);

  if (assignedCount === 0) {
    label(doc, "No units assigned yet", marginL, y + 5, 8, GRAY);
    y += 12;
  } else {
    // Summary
    const notApproved = experienceData?.filter((e) => e.competency_confirmed === false).length || 0;
    const pending = experienceData?.filter((e) => e.competency_confirmed === null && assignedUnits?.find((a) => a.unit_code === e.unit_code)).length || 0;
    const holdUnits = experienceData?.filter((e) => e.holds_unit).length || 0;

    const s6Items = [
      { label: "Approved", value: approvedExp, color: GREEN },
      { label: "Not Approved", value: notApproved, color: RED },
      { label: "Pending", value: pending, color: AMBER },
      { label: "Holds Unit", value: holdUnits, color: BLUE },
      { label: "Total Assigned", value: assignedCount, color: NAVY },
    ];
    s6Items.forEach((item, i) => {
      const x = marginL + i * 37;
      drawRect(doc, x, y, 36, 14, LIGHT);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      setColor(doc, item.color, "text");
      doc.text(String(item.value), x + 18, y + 9, { align: "center" });
      label(doc, item.label, x + 18, y + 13, 6, GRAY);
    });
    y += 18;

    // Unit detail table
    if (experienceData && experienceData.length > 0) {
      label(doc, "UNIT ASSESSMENTS", marginL, y, 6, GRAY, true);
      y += 4;

      // Table header
      drawRect(doc, marginL, y, contentW, 6, [235, 240, 248]);
      label(doc, "UNIT CODE", marginL + 1, y + 4.5, 6, GRAY, true);
      label(doc, "TITLE", marginL + 26, y + 4.5, 6, GRAY, true);
      label(doc, "STATUS", marginL + 142, y + 4.5, 6, GRAY, true);
      label(doc, "HOLDS UNIT", marginL + 162, y + 4.5, 6, GRAY, true);
      y += 7;

      const assigned = (assignedUnits || []).map((a) => a.unit_code).sort();
      assigned.forEach((code, idx) => {
        y = checkY(doc, y, 7);
        const exp = experienceData.find((e) => e.unit_code === code);
        const isApp = exp?.competency_confirmed === true;
        const isNotApp = exp?.competency_confirmed === false;
        if (idx % 2 === 0) drawRect(doc, marginL, y - 1, contentW, 7, LIGHT);
        label(doc, code, marginL + 1, y + 4, 7, BLUE, true);
        // Find unit title from UNITS if available, else use stored
        const title = (exp?.unit_title || code).slice(0, 55);
        label(doc, title, marginL + 26, y + 4, 7, [30, 30, 30]);
        const statusText = isApp ? "✓ Approved" : isNotApp ? "✗ Not Approved" : "Pending";
        const statusColor = isApp ? GREEN : isNotApp ? RED : AMBER;
        label(doc, statusText, marginL + 142, y + 4, 7, statusColor, isApp || isNotApp);
        label(doc, exp?.holds_unit ? "✓" : "—", marginL + 168, y + 4, 7, exp?.holds_unit ? GREEN : GRAY);
        y += 7;
      });
    }
  }
  y += 6;

  // ── FOOTER on all pages ────────────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawRect(doc, 0, 285, pageW, 12, NAVY);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    setColor(doc, [150, 170, 210], "text");
    doc.text("Labtech Training — Trainer Competency Portal — Standards for RTOs 2025", marginL, 292);
    doc.text(`Page ${i} of ${pageCount}`, pageW - marginL, 292, { align: "right" });
  }

  // Save
  const safeName = (trainer.full_name || "trainer").replace(/[^a-zA-Z0-9]/g, "_");
  const date = new Date().toISOString().slice(0, 10);
  doc.save(`LTT_Competency_Profile_${safeName}_${date}.pdf`);
}