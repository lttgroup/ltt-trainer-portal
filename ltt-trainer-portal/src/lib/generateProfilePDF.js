// src/lib/generateProfilePDF.js
// Branded trainer competency profile PDF — Labtech Training
// Requires: npm install jspdf

import { jsPDF } from "jspdf";

// ── Brand palette ──────────────────────────────────────────────────────────────
const C = {
  navy:      [8,   26,  71],
  navyMid:   [22,  64, 111],
  blue:      [28,  94, 168],
  teal:      [50, 186, 154],
  green:     [22, 101,  52],
  greenBg:   [240, 253, 244],
  greenBdr:  [134, 239, 172],
  red:       [201,  53,  53],
  redBg:     [254, 234, 234],
  redBdr:    [252, 165, 165],
  amber:     [146,  80,  10],
  amberBg:   [253, 243, 224],
  amberBdr:  [245, 215, 138],
  purple:    [109,  40, 217],
  gray:      [107, 114, 128],
  grayLight: [243, 244, 246],
  grayBdr:   [229, 231, 235],
  white:     [255, 255, 255],
  black:     [ 17,  24,  39],
  textMid:   [ 55,  65,  81],
  textLight: [107, 114, 128],
};

// ── PDF page constants ─────────────────────────────────────────────────────────
const PW = 210;   // A4 width mm
const ML = 14;    // margin left
const MR = 14;    // margin right
const CW = PW - ML - MR;  // content width 182mm
const PH = 297;   // A4 height mm
const FOOTER_H = 10;
const BOTTOM_MARGIN = FOOTER_H + 8;

// ── Low-level helpers ──────────────────────────────────────────────────────────
const rgb   = (doc, c, t="fill") => t==="fill" ? doc.setFillColor(...c) : doc.setTextColor(...c);
const rect  = (doc, x, y, w, h, c, r="F") => { rgb(doc,c); doc.rect(x,y,w,h,r); };
const line  = (doc, x1, y1, x2, y2, c, lw=0.2) => { doc.setLineWidth(lw); doc.setDrawColor(...c); doc.line(x1,y1,x2,y2); };
const txt   = (doc, s, x, y, size, c, bold=false, opts={}) => {
  doc.setFontSize(size);
  doc.setFont("helvetica", bold ? "bold" : "normal");
  rgb(doc, c, "text");
  doc.text(String(s ?? ""), x, y, opts);
};

// Check remaining page space and add page if needed
const check = (doc, y, need, footer) => {
  if (y + need > PH - BOTTOM_MARGIN) {
    footer(doc);
    doc.addPage();
    return 22;
  }
  return y;
};

// ── Section heading ─────────────────────────────────────────────────────────────
// Returns new Y after the heading
function sectionHead(doc, label, y, status) {
  // Left accent bar
  rect(doc, ML, y, 3, 8, C.teal);
  // Section label
  txt(doc, label, ML+5, y+5.5, 9, C.navy, true);
  // Status badge on right
  if (status === "approved") {
    rect(doc, ML+CW-26, y+1, 26, 6, C.greenBg);
    rect(doc, ML+CW-26, y+1, 26, 6, C.greenBdr, "S");
    txt(doc, "✓  Approved", ML+CW-13, y+5.5, 6.5, C.green, true, {align:"center"});
  } else if (status === "rejected") {
    rect(doc, ML+CW-28, y+1, 28, 6, C.redBg);
    rect(doc, ML+CW-28, y+1, 28, 6, C.redBdr, "S");
    txt(doc, "✗  Not Approved", ML+CW-14, y+5.5, 6.5, C.red, true, {align:"center"});
  } else if (status === "pending") {
    rect(doc, ML+CW-32, y+1, 32, 6, C.amberBg);
    rect(doc, ML+CW-32, y+1, 32, 6, C.amberBdr, "S");
    txt(doc, "⏳  Awaiting Approval", ML+CW-16, y+5.5, 6.5, C.amber, true, {align:"center"});
  }
  // Divider line
  line(doc, ML, y+9, ML+CW, y+9, C.grayBdr, 0.3);
  return y + 13;
}

// ── Field label + value ────────────────────────────────────────────────────────
function field(doc, label, value, x, y, w) {
  txt(doc, label.toUpperCase(), x, y,   6,   C.textLight, true);
  txt(doc, value || "—",        x, y+5, 8.5, C.black);
  return y + 13;
}

// ── Horizontal rule ────────────────────────────────────────────────────────────
function hr(doc, y, color=C.grayBdr) {
  line(doc, ML, y, ML+CW, y, color, 0.2);
}

// ── Footer drawn on every page ─────────────────────────────────────────────────
function drawFooter(doc) {
  const pageCount = doc.internal.getNumberOfPages();
  const cur = doc.internal.getCurrentPageInfo().pageNumber;
  rect(doc, 0, PH-FOOTER_H, PW, FOOTER_H, C.navy);
  txt(doc, "Labtech Training — Trainer Competency Portal — Standards for RTOs 2025", ML, PH-3.5, 6.5, [160,180,215]);
  txt(doc, `Page ${cur}`, PW-ML, PH-3.5, 6.5, [160,180,215], false, {align:"right"});
}

// ── Status chip for experience units ──────────────────────────────────────────
function statusChip(doc, s, x, y) {
  if (s === true)  { txt(doc, "✓ Approved",     x, y, 7.5, C.green, true); }
  else if (s===false) { txt(doc, "✗ Not Approved", x, y, 7.5, C.red,   true); }
  else               { txt(doc, "Pending",         x, y, 7.5, C.amber);      }
}

// ── LOGO constant (base64 JPEG) ─────────────────────────────────────────────────
const LOGO_B64 = "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";
const LOGO_FORMAT = "JPEG";

// ════════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT FUNCTION
// ════════════════════════════════════════════════════════════════════════════════
export async function generateProfilePDF({
  trainer, trainerProfile, industryQuals, evidenceFiles,
  questResponses, experienceData, assignedUnits, streams = [], streamUnits = {}
}) {
  const doc = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });

  // ── COVER PAGE ───────────────────────────────────────────────────────────────
  // Navy top band
  rect(doc, 0, 0, PW, 52, C.navy);
  // Teal accent strip at bottom of band
  rect(doc, 0, 49, PW, 3, C.teal);

  // Logo (top-left in band)
  try {
    doc.addImage(LOGO_B64, LOGO_FORMAT, ML, 8, 32, 32);
  } catch(e) {
    txt(doc, "LTT", ML, 28, 22, C.white, true);
  }

  // Organisation + document title (right of logo)
  txt(doc, "Labtech Training",              ML+38, 16,  8,   [180,200,230]);
  txt(doc, "Trainer Competency Profile",    ML+38, 26,  15,  C.white, true);
  txt(doc, "Standards for RTOs 2025  |  AF3.21", ML+38, 34, 8, [160,185,220]);

  // Trainer identity block (right side of band)
  txt(doc, trainer.full_name || "—",  PW-ML, 20, 13, C.white, true, {align:"right"});
  txt(doc, trainer.email || "",        PW-ML, 27, 8,  [180,200,230], false, {align:"right"});

  // Status pill
  const sc = trainer.compliance_status;
  let pillBg = C.amberBg, pillFg = C.amber, pillTxt = sc || "Incomplete";
  if (sc==="Compliant")    { pillBg=[210,252,231]; pillFg=C.green; }
  if (sc==="Incomplete")   { pillBg=C.redBg; pillFg=C.red; }
  if (sc==="Under Review") { pillBg=[219,234,254]; pillFg=C.blue; }
  rect(doc, PW-ML-34, 31, 34, 7, pillBg);
  txt(doc, pillTxt, PW-ML-17, 36.5, 7, pillFg, true, {align:"center"});

  // Generated date
  txt(doc, `Generated ${new Date().toLocaleDateString("en-AU",{day:"numeric",month:"long",year:"numeric"})}`,
    PW-ML, 45, 7, [150,175,210], false, {align:"right"});

  // Summary stats strip (below band)
  const questYes  = (questResponses||[]).filter(r=>r.response==="yes").length;
  const questNo   = (questResponses||[]).filter(r=>r.response==="no").length;
  const questTot  = (questResponses||[]).length;
  const expApp    = (experienceData||[]).filter(e=>e.competency_confirmed===true).length;
  const expTotal  = (assignedUnits||[]).length;

  rect(doc, 0, 52, PW, 18, C.grayLight);
  line(doc, 0, 70, PW, 70, C.grayBdr);

  const stats = [
    {label:"Position",         value: trainer.position||"—"},
    {label:"Employment",       value: trainer.employment_status||"—"},
    {label:"State",            value: trainer.state||"—"},
    {label:"TAE Credential",   value: trainerProfile?.tae_qualification?.split(" ")[0] || trainerProfile?.under_direction_qualification?.split(" ")[0] || "—"},
    {label:"Questionnaire",    value: `${questTot}/150 answered`},
    {label:"Experience",       value: expTotal>0 ? `${expApp}/${expTotal} approved` : "Awaiting assignment"},
  ];
  const sw = CW / stats.length;
  stats.forEach((s, i) => {
    const x = ML + i*sw;
    txt(doc, s.label.toUpperCase(), x, 59, 5.5, C.textLight, true);
    txt(doc, s.value,               x, 66, 8,   C.navy, true);
    if (i>0) line(doc, x-1, 54, x-1, 69, C.grayBdr, 0.2);
  });

  let y = 80;

  // ── SECTION 1 ────────────────────────────────────────────────────────────────
  const s1Status = trainerProfile?.s1_approved===true ? "approved" : trainerProfile?.s1_approved===false ? "rejected" : trainer?.full_name ? "pending" : null;
  y = sectionHead(doc, "Section 1 — Trainer Assessor Details", y, s1Status);

  const s1Fields = [
    ["Full Name",          trainer.full_name],
    ["Email Address",      trainer.email],
    ["Phone",              trainer.phone],
    ["Position",           trainer.position],
    ["Employment Status",  trainer.employment_status],
    ["State",              trainer.state],
  ];
  const fcols = 3, fw = CW/fcols;
  s1Fields.forEach(([lbl,val],i) => {
    const col=i%fcols, row=Math.floor(i/fcols);
    field(doc, lbl, val, ML+col*fw, y+row*14, fw-4);
  });
  y += Math.ceil(s1Fields.length/fcols)*14 + 6;
  hr(doc, y); y += 6;

  // ── SECTION 2 ────────────────────────────────────────────────────────────────
  y = check(doc, y, 35, drawFooter);
  const credStatus = trainerProfile?.profile_status==="Approved" ? "approved" : trainerProfile?.profile_status==="Rejected" ? "rejected" : (trainerProfile?.tae_qualification||trainerProfile?.under_direction_qualification) ? "pending" : null;
  y = sectionHead(doc, "Section 2 — Training and Assessment Credentials", y, credStatus);

  if (trainerProfile?.tae_qualification) {
    const s2f = [
      ["TAE Qualification",  trainerProfile.tae_qualification],
      ["Provider Name",      trainerProfile.tae_provider],
      ["Provider ID",        trainerProfile.tae_provider_id],
      ["Issue Date",         trainerProfile.tae_issue_date],
    ];
    s2f.forEach(([l,v],i) => field(doc, l, v, ML+i*(CW/4), y, CW/4-4));
    y += 16;
  } else if (trainerProfile?.under_direction_qualification) {
    rect(doc, ML, y, 40, 5.5, C.amberBg);
    txt(doc, "UNDER DIRECTION — ENROLLED", ML+2, y+4, 6, C.amber, true);
    y += 8;
    const s2f = [
      ["Qualification",  trainerProfile.under_direction_qualification],
      ["Provider Name",  trainerProfile.under_direction_provider],
      ["Provider ID",    trainerProfile.under_direction_provider_id],
      ["Commencement",   trainerProfile.under_direction_commencement],
    ];
    s2f.forEach(([l,v],i) => field(doc, l, v, ML+i*(CW/4), y, CW/4-4));
    y += 16;
  } else {
    txt(doc, "Not submitted", ML, y+5, 8.5, C.textLight);
    y += 12;
  }

  const taeFiles = (evidenceFiles||[]).filter(f=>f.document_type==="TAE Credential"||f.document_type==="TAE Enrolment Evidence");
  if (taeFiles.length) {
    txt(doc, "UPLOADED EVIDENCE", ML, y, 6, C.textLight, true);
    y += 5;
    taeFiles.forEach(f => {
      rect(doc, ML, y-3.5, CW, 7, C.grayLight);
      txt(doc, "📎", ML+2, y+1.5, 8, C.blue);
      txt(doc, f.file_name, ML+9, y+1.5, 8, C.textMid);
      y += 8;
    });
  }
  hr(doc, y); y += 6;

  // ── SECTION 3 ────────────────────────────────────────────────────────────────
  y = check(doc, y, 30, drawFooter);
  const qualsStatus = trainerProfile?.industry_quals_approved===true ? "approved" : trainerProfile?.industry_quals_approved===false ? "rejected" : (industryQuals||[]).length>0 ? "pending" : null;
  y = sectionHead(doc, "Section 3 — Industry Competencies", y, qualsStatus);

  if (industryQuals && industryQuals.length > 0) {
    // Table header
    rect(doc, ML, y, CW, 7, C.navy);
    const qx = [0, 28, 88, 132, 158];
    const qh = ["Code","Title","Provider","Provider ID","Issue Date"];
    qh.forEach((h,i) => txt(doc, h.toUpperCase(), ML+qx[i]+2, y+5, 6, C.white, true));
    y += 8;

    (industryQuals||[]).forEach((q, idx) => {
      y = check(doc, y, 8, drawFooter);
      if (idx%2===0) rect(doc, ML, y-1, CW, 8, C.grayLight);
      txt(doc, q.qualification_code||"—",                        ML+qx[0]+2, y+4.5, 7.5, C.blue, true);
      txt(doc, (q.qualification_title||"—").slice(0,32),          ML+qx[1]+2, y+4.5, 7.5, C.black);
      txt(doc, (q.provider_name||"—").slice(0,22),                ML+qx[2]+2, y+4.5, 7.5, C.textMid);
      txt(doc, q.provider_id||"—",                               ML+qx[3]+2, y+4.5, 7.5, C.textMid);
      txt(doc, q.issue_date||"—",                                ML+qx[4]+2, y+4.5, 7.5, C.textMid);
      y += 8;
    });
    y += 2;

    const indFiles = (evidenceFiles||[]).filter(f=>f.document_type==="Industry Qualification");
    if (indFiles.length) {
      txt(doc, "CERTIFICATES UPLOADED", ML, y, 6, C.textLight, true);
      y += 5;
      indFiles.forEach(f => {
        y = check(doc, y, 8, drawFooter);
        rect(doc, ML, y-3.5, CW, 7, C.grayLight);
        txt(doc, "📎", ML+2, y+1.5, 8, C.blue);
        txt(doc, f.file_name, ML+9, y+1.5, 8, C.textMid);
        y += 8;
      });
    }
  } else {
    txt(doc, "No industry qualifications submitted", ML, y+5, 8.5, C.textLight);
    y += 12;
  }
  hr(doc, y); y += 6;

  // ── SECTION 4 ────────────────────────────────────────────────────────────────
  y = check(doc, y, 30, drawFooter);
  const s4Status = trainerProfile?.s4_approved===true ? "approved" : trainerProfile?.s4_approved===false ? "rejected" : trainerProfile?.declaration_signature ? "pending" : null;
  y = sectionHead(doc, "Section 4 — Credentials Declaration", y, s4Status);

  const s4f = [
    ["Credentials Declared",  trainerProfile?.declaration_credentials ? "✓ Confirmed" : "Not confirmed"],
    ["Copies Provided",       trainerProfile?.declaration_copies ? "✓ Confirmed" : "Not confirmed"],
    ["Signature",             trainerProfile?.declaration_signature],
    ["Declaration Date",      trainerProfile?.declaration_date],
  ];
  s4f.forEach(([l,v],i) => field(doc, l, v, ML+i*(CW/4), y, CW/4-4));
  y += 16;
  hr(doc, y); y += 6;

  // ── SECTION 5 ────────────────────────────────────────────────────────────────
  y = check(doc, y, 40, drawFooter);
  const s5Done = (questResponses||[]).length === 150;
  y = sectionHead(doc, "Section 5 — Skills Questionnaire", y, s5Done ? "approved" : null);

  const questYesN  = (questResponses||[]).filter(r=>r.response==="yes").length;
  const questNoN   = (questResponses||[]).filter(r=>r.response==="no").length;
  const questHoldN = (questResponses||[]).filter(r=>r.response==="hold").length;
  const questTotN  = (questResponses||[]).length;
  const expApproved= (experienceData||[]).filter(e=>e.competency_confirmed===true).length;
  const expRejected= (experienceData||[]).filter(e=>e.competency_confirmed===false).length;

  // Summary cards row
  const sumCards = [
    {l:"Yes — Experience",  v:questYesN,   bg:[219,234,254], fg:C.blue},
    {l:"No — No Experience",v:questNoN,    bg:C.grayLight,   fg:C.gray},
    {l:"Hold",              v:questHoldN,  bg:C.amberBg,     fg:C.amber},
    {l:"Total Answered",    v:questTotN,   bg:[237,233,254],  fg:C.purple},
    {l:"Units Approved",    v:expApproved, bg:C.greenBg,     fg:C.green},
    {l:"Not Approved",      v:expRejected, bg:C.redBg,       fg:C.red},
  ];
  const cardW = CW/sumCards.length;
  sumCards.forEach((c,i) => {
    rect(doc, ML+i*cardW, y, cardW-1, 16, c.bg);
    txt(doc, String(c.v), ML+i*cardW+cardW/2, y+9,  14, c.fg, true, {align:"center"});
    txt(doc, c.l,          ML+i*cardW+cardW/2, y+14, 5.5,C.textLight, false, {align:"center"});
  });
  y += 20;

  // Unit grid — 6 columns, colour coded
  if ((questResponses||[]).length > 0) {
    txt(doc, "UNIT RESPONSES", ML, y, 6, C.textLight, true);
    y += 4;
    const gcols = 6, cellW = CW/gcols, cellH = 8;
    const sorted = [...questResponses].sort((a,b)=>a.unit_code.localeCompare(b.unit_code));
    sorted.forEach((r, i) => {
      const col = i%gcols, row = Math.floor(i/gcols);
      if (col===0 && row>0) y = check(doc, y, cellH, drawFooter);
      const cx = ML+col*cellW, cy = y+row*cellH;
      const exp = (experienceData||[]).find(e=>e.unit_code===r.unit_code);
      const isApp = r.response==="yes" && exp?.competency_confirmed===true;
      const isRej = r.response==="yes" && exp?.competency_confirmed===false;
      let bg=C.grayLight, fg=C.gray;
      if (isApp)              { bg=[220,252,231]; fg=C.green; }
      else if (isRej)         { bg=C.redBg;       fg=C.red;   }
      else if (r.response==="yes") { bg=[219,234,254]; fg=C.blue; }
      rect(doc, cx, cy, cellW-0.5, cellH-0.5, bg);
      txt(doc, r.unit_code, cx+cellW/2, cy+5.5, 6, fg, true, {align:"center"});
    });
    y += Math.ceil(sorted.length/gcols)*cellH + 6;
  }
  hr(doc, y); y += 6;

  // ── SECTION 6 ────────────────────────────────────────────────────────────────
  drawFooter(doc);
  doc.addPage();
  y = 22;

  const s6AllApproved = expTotal>0 && expApproved===expTotal;
  y = sectionHead(doc, "Section 6 — Industry Experience, Skills and Currency", y, s6AllApproved ? "approved" : null);

  if (expTotal === 0) {
    txt(doc, "No units assigned yet", ML, y+5, 8.5, C.textLight);
    y += 12;
  } else {
    const expNotApp = (experienceData||[]).filter(e=>e.competency_confirmed===false).length;
    const expPending= expTotal - expApproved - expNotApp;
    const holdsUnit = (experienceData||[]).filter(e=>e.holds_unit).length;

    // Summary cards
    const expCards = [
      {l:"Approved",       v:expApproved, bg:C.greenBg,     fg:C.green},
      {l:"Not Approved",   v:expNotApp,   bg:C.redBg,       fg:C.red},
      {l:"Pending",        v:expPending,  bg:C.amberBg,     fg:C.amber},
      {l:"Holds Unit",     v:holdsUnit,   bg:[219,234,254],  fg:C.blue},
      {l:"Total Assigned", v:expTotal,    bg:C.grayLight,   fg:C.navy},
    ];
    const ecW = CW/expCards.length;
    expCards.forEach((c,i) => {
      rect(doc, ML+i*ecW, y, ecW-1, 16, c.bg);
      txt(doc, String(c.v), ML+i*ecW+ecW/2, y+9,  14, c.fg, true, {align:"center"});
      txt(doc, c.l,          ML+i*ecW+ecW/2, y+14, 5.5,C.textLight, false, {align:"center"});
    });
    y += 20;

    // ── Stream assignments ─────────────────────────────────────────────────────
    if (streams && streams.length > 0 && Object.keys(streamUnits).length > 0) {
      txt(doc, "STREAM ASSIGNMENTS", ML, y, 6, C.textLight, true);
      y += 5;

      // Group streams by qualification
      const grouped = {};
      streams.forEach(s => {
        if (!grouped[s.qualification_code]) grouped[s.qualification_code] = [];
        grouped[s.qualification_code].push(s);
      });

      Object.entries(grouped).forEach(([qual, qualStreams]) => {
        y = check(doc, y, 14, drawFooter);
        // Qual header
        rect(doc, ML, y, CW, 7, C.navyMid);
        txt(doc, qual, ML+3, y+5, 8, C.white, true);
        y += 9;

        qualStreams.forEach(stream => {
          y = check(doc, y, 10, drawFooter);
          const units = streamUnits[stream.id] || [];
          const appCount = units.filter(u=>(experienceData||[]).find(e=>e.unit_code===u&&e.competency_confirmed===true)).length;
          const allApp = units.length>0 && appCount===units.length;
          const anyRej = units.some(u=>(experienceData||[]).find(e=>e.unit_code===u&&e.competency_confirmed===false));

          let rowBg = C.white;
          if (allApp) rowBg = C.greenBg;
          else if (anyRej) rowBg = C.redBg;

          rect(doc, ML, y-1, CW, 9, rowBg);
          line(doc, ML, y+8, ML+CW, y+8, C.grayBdr, 0.15);

          txt(doc, stream.stream_name, ML+3, y+5.5, 8, C.black);

          // Progress bar
          const barX = ML+CW-60, barW = 36, barH = 3;
          const pct = units.length ? appCount/units.length : 0;
          rect(doc, barX, y+2.5, barW, barH, C.grayBdr);
          if (pct > 0) rect(doc, barX, y+2.5, barW*pct, barH, allApp ? C.green : C.teal);
          txt(doc, `${appCount}/${units.length} approved`, barX+barW+2, y+5.5, 6.5, C.textMid);

          // Status label
          if (allApp) {
            txt(doc, "✓ All Approved", ML+CW-8, y+5.5, 6.5, C.green, true, {align:"right"});
          } else if (anyRej) {
            txt(doc, "✗ Some Not Approved", ML+CW-8, y+5.5, 6.5, C.red, true, {align:"right"});
          }
          y += 9;
        });
        y += 3;
      });
      y += 4;
    }

    // ── Unit assessment table ──────────────────────────────────────────────────
    txt(doc, "UNIT ASSESSMENTS", ML, y, 6, C.textLight, true);
    y += 5;

    // Table header
    rect(doc, ML, y, CW, 7, C.navy);
    txt(doc, "UNIT CODE",  ML+2,     y+5, 6, C.white, true);
    txt(doc, "UNIT TITLE", ML+28,    y+5, 6, C.white, true);
    txt(doc, "STATUS",     ML+146,   y+5, 6, C.white, true);
    txt(doc, "HOLDS",      ML+CW-8,  y+5, 6, C.white, true, {align:"right"});
    y += 8;

    const assignedCodes = (assignedUnits||[]).map(a=>a.unit_code).sort();
    assignedCodes.forEach((code, idx) => {
      y = check(doc, y, 7, drawFooter);
      const exp = (experienceData||[]).find(e=>e.unit_code===code);
      if (idx%2===0) rect(doc, ML, y-1, CW, 7, C.grayLight);
      // Unit code
      txt(doc, code, ML+2, y+4, 7, C.blue, true);
      // Title — truncated
      const title = (exp?.unit_title||code).slice(0,52);
      txt(doc, title, ML+28, y+4, 7, C.black);
      // Status
      statusChip(doc, exp?.competency_confirmed, ML+146, y+4);
      // Holds unit
      txt(doc, exp?.holds_unit ? "✓" : "—", ML+CW-8, y+4, 7, exp?.holds_unit ? C.green : C.gray, exp?.holds_unit, {align:"right"});
      y += 7;
    });
  }

  // ── Final footer on all pages ─────────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages();
  for (let i=1; i<=pageCount; i++) {
    doc.setPage(i);
    rect(doc, 0, PH-FOOTER_H, PW, FOOTER_H, C.navy);
    txt(doc, "Labtech Training — Trainer Competency Portal — Standards for RTOs 2025", ML, PH-3.5, 6.5, [160,180,215]);
    txt(doc, `Page ${i} of ${pageCount}`, PW-ML, PH-3.5, 6.5, [160,180,215], false, {align:"right"});
  }

  // ── Save ───────────────────────────────────────────────────────────────────────
  const safe = (trainer.full_name||"trainer").replace(/[^a-zA-Z0-9]/g,"_");
  const date = new Date().toISOString().slice(0,10);
  doc.save(`LTT_Competency_Profile_${safe}_${date}.pdf`);
}