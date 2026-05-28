import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Project, ComplianceFinding, WorkflowGraph } from '@/models';
import { wallThickness, maop, hydrotest } from '@/services/calculations';

function header(doc: jsPDF, title: string, p: Project) {
  doc.setFillColor(14, 59, 102);
  doc.rect(0, 0, 210, 22, 'F');
  doc.setTextColor(255);
  doc.setFontSize(14);
  doc.text('PIPELINE DESIGN & COMPLIANCE ASSISTANT', 10, 10);
  doc.setFontSize(10);
  doc.text(title, 10, 17);
  doc.setTextColor(0);
  doc.setFontSize(9);
  doc.text(`Project: ${p.name}   Client: ${p.client}   Engineer: ${p.engineer}   ${new Date().toLocaleString()}`, 10, 28);
  doc.setDrawColor(200);
  doc.line(10, 31, 200, 31);
}

function footer(doc: jsPDF) {
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.text('Summarized engineering aid — not a substitute for qualified review or the governing code.', 10, 290);
    doc.text(`Page ${i} / ${n}`, 195, 290, { align: 'right' });
  }
}

function metaTable(doc: jsPDF, p: Project, startY: number) {
  autoTable(doc, {
    startY,
    head: [['Parameter', 'Value']],
    body: [
      ['Fluid', p.fluidType],
      ['Installation', p.installationType],
      ['Design Code', p.designCode],
      ['Region', p.region],
      ['Material', p.materialGrade],
      ['OD (mm)', String(p.outsideDiameter_mm ?? '—')],
      ['Design Pressure (MPa)', String(p.designPressure_MPa)],
      ['Design Temperature (°C)', String(p.designTemperature_C)],
      ['Corrosion Allowance (mm)', String(p.corrosionAllowance_mm)],
      ['Length (km)', String(p.length_km)],
      ['Design Life (yr)', String(p.designLife_years)],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [42, 50, 58] },
  });
}

export function designBasisMemo(p: Project) {
  const doc = new jsPDF();
  header(doc, 'Design Basis Memo', p);
  metaTable(doc, p, 35);
  footer(doc);
  doc.save(`DesignBasis_${p.name}.pdf`);
}

export function wallThicknessReport(p: Project, smys = 414, F = 0.72) {
  const doc = new jsPDF();
  header(doc, 'Wall Thickness Report', p);
  metaTable(doc, p, 35);
  if (p.outsideDiameter_mm) {
    const res = wallThickness({
      designPressure_MPa: p.designPressure_MPa, outsideDiameter_mm: p.outsideDiameter_mm,
      SMYS_MPa: smys, designFactor: F, corrosionAllowance_mm: p.corrosionAllowance_mm,
    });
    autoTable(doc, {
      startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6,
      head: [['Item', 'Value']],
      body: [
        ['Formula', res.formula], ['SMYS (MPa)', String(smys)], ['Design Factor F', String(F)],
        ['Computed t (mm)', `${res.value}`], ['Code Reference', res.codeRef],
      ],
      styles: { fontSize: 9 }, headStyles: { fillColor: [14, 59, 102] },
    });
  }
  footer(doc);
  doc.save(`WallThickness_${p.name}.pdf`);
}

export function hydrotestReport(p: Project) {
  const doc = new jsPDF();
  header(doc, 'Hydrotest Report', p);
  metaTable(doc, p, 35);
  if (p.MAOP_MPa) {
    const r = hydrotest({ MAOP_MPa: p.MAOP_MPa });
    autoTable(doc, {
      startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6,
      head: [['Item', 'Value']],
      body: [
        ['MAOP (MPa)', String(p.MAOP_MPa)],
        ['Recommended P_test (MPa)', String(r.value)],
        ['Recorded P_test (MPa)', String(p.hydrotestPressure_MPa ?? '—')],
        ['Result', p.hydrotestPressure_MPa && p.hydrotestPressure_MPa >= 1.25 * p.MAOP_MPa ? 'PASS' : 'REVIEW'],
      ],
      styles: { fontSize: 9 }, headStyles: { fillColor: [14, 59, 102] },
    });
  }
  footer(doc);
  doc.save(`Hydrotest_${p.name}.pdf`);
}

export function complianceSummary(p: Project, findings: ComplianceFinding[]) {
  const doc = new jsPDF();
  header(doc, 'Compliance Summary', p);
  autoTable(doc, {
    startY: 35,
    head: [['Rule', 'Status', 'Code Ref', 'Message']],
    body: findings.map((f) => [f.title, f.status.toUpperCase(), f.codeRef, f.message]),
    styles: { fontSize: 8 }, headStyles: { fillColor: [14, 59, 102] },
  });
  footer(doc);
  doc.save(`Compliance_${p.name}.pdf`);
}

export function workflowSummary(p: Project, wf?: WorkflowGraph) {
  const doc = new jsPDF();
  header(doc, 'Workflow Summary', p);
  autoTable(doc, {
    startY: 35,
    head: [['#', 'Node', 'Kind', 'Notes']],
    body: (wf?.nodes ?? []).map((n, i) => [String(i + 1), n.data.label, n.data.kind, n.data.notes ?? '']),
    styles: { fontSize: 9 }, headStyles: { fillColor: [14, 59, 102] },
  });
  footer(doc);
  doc.save(`Workflow_${p.name}.pdf`);
}
