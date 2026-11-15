// Mock data standing in for the MES / AAS digital-twin sources that are not
// reachable from the lab. Replace via a real gateway (see services/gateway).

// Demo accounts for the study (client-side only, NOT secure).
// operator1 runs the GMAW cell, operator2 the WAAM cell (see docs/PLAN.md section 1).
export const OPERATORS = {
  operator1: {
    id: "operator1",
    password: "weld123",
    name: "Operator 1",
    firstName: "Operator 1",
    role: "Welding operator",
    badge: "GMAW",
    certifications: [],
  },
  operator2: {
    id: "operator2",
    password: "weld456",
    name: "Operator 2",
    firstName: "Operator 2",
    role: "Welding operator",
    badge: "WAAM",
    certifications: [],
  },
};

export const COLLEAGUES = [
  { id: "sup1", name: "Lena de Vries", role: "Shift supervisor", online: true },
  { id: "w2", name: "Tom Peeters", role: "Welder", online: true },
  { id: "w3", name: "Aisha Khan", role: "Welder", online: false },
  { id: "mnt1", name: "Paul Janssen", role: "Maintenance", online: true },
];

// Which cell each account works in. cellId points into CELLS below.
export const SHIFTS = {
  operator1: { id: "S-GMAW", label: "Study session", start: "", end: "", cellId: "54", area: "51.2", process: "GMAW" },
  operator2: { id: "S-WAAM", label: "Study session", start: "", end: "", cellId: "W1", area: "51.3", process: "WAAM" },
};

// The simulated cells. "process" decides which steps the cell goes through (models/cellModel.js).
export const CELLS = {
  54: {
    id: "54",
    area: "51.2",
    name: "Jigless GMAW cell",
    process: "GMAW",
    equipment: [
      { id: "R1", name: "Handling robot 1", kind: "robot", model: "ABB IRB 4600", status: "idle", nextServiceDue: "2026-12-02" },
      { id: "R2", name: "Handling robot 2", kind: "robot", model: "ABB IRB 6700", status: "idle", nextServiceDue: "2026-12-02" },
      { id: "R3", name: "Welding robot", kind: "robot", model: "Doosan H2017 + GMAW torch", status: "idle", nextServiceDue: "2026-11-16" },
      { id: "PS", name: "Welding power source", kind: "equipment", model: "GMAW power source", status: "idle", nextServiceDue: null },
      { id: "PF", name: "Profilometer camera", kind: "sensor", model: "Laser line profilometer", status: "idle", nextServiceDue: null },
      { id: "AS", name: "AI inspection camera", kind: "sensor", model: "Industrial camera", status: "idle", nextServiceDue: null },
    ],
  },
  W1: {
    id: "W1",
    area: "51.3",
    name: "WAAM repair cell",
    process: "WAAM",
    equipment: [
      { id: "R1", name: "Deposition robot", kind: "robot", model: "6-axis robot + WAAM torch", status: "idle", nextServiceDue: null },
      { id: "PS", name: "Welding power source", kind: "equipment", model: "CMT power source", status: "idle", nextServiceDue: null },
      { id: "SC", name: "3D scanner", kind: "sensor", model: "Hand-guided laser scanner", status: "idle", nextServiceDue: null },
      { id: "PY", name: "Pyrometer", kind: "sensor", model: "Interpass temperature", status: "idle", nextServiceDue: null },
    ],
  },
};

const engineer = { name: "Ir. Sofia Bianchi", email: "s.bianchi@example.com", phone: "+31 40 000 0000" };

// The study assemblies: 4 per cell, with neutral names.
// The list never says which assembly has an anomaly: that is decided by the
// study schedule and the wizard (docs/PLAN.md section 1).
const docs = (n) => ({ cad: { file: `${n}.step` }, wps: { file: `WPS-${n}.pdf`, hasNote: false } });
export const JOBS = [
  { id: "GMAW-A1", name: "Assembly 1 · Bracket", weldNo: "#1", tags: { geometry: "Plate-to-plate", material: "S355 steel", bevel: "V" }, ...docs("GMAW-A1"), commissioner: engineer, cellId: "54" },
  { id: "GMAW-A2", name: "Assembly 2 · Flange", weldNo: "#2", tags: { geometry: "Tube-to-plate", material: "S355 steel", bevel: "V" }, ...docs("GMAW-A2"), commissioner: engineer, cellId: "54" },
  { id: "GMAW-A3", name: "Assembly 3 · Frame corner", weldNo: "#3", tags: { geometry: "T-joint", material: "S355 steel", bevel: "none" }, ...docs("GMAW-A3"), commissioner: engineer, cellId: "54" },
  { id: "GMAW-A4", name: "Assembly 4 · Gusset", weldNo: "#4", tags: { geometry: "Plate-to-plate", material: "S355 steel", bevel: "V" }, ...docs("GMAW-A4"), commissioner: engineer, cellId: "54" },
  { id: "WAAM-A1", name: "Assembly 1 · Shaft", weldNo: "#1", tags: { geometry: "Worn shaft", material: "Low-alloy steel", bevel: "-" }, ...docs("WAAM-A1"), commissioner: engineer, cellId: "W1" },
  { id: "WAAM-A2", name: "Assembly 2 · Mould insert", weldNo: "#2", tags: { geometry: "Chipped edge", material: "Tool steel", bevel: "-" }, ...docs("WAAM-A2"), commissioner: engineer, cellId: "W1" },
  { id: "WAAM-A3", name: "Assembly 3 · Pump impeller", weldNo: "#3", tags: { geometry: "Eroded blade", material: "Stainless steel", bevel: "-" }, ...docs("WAAM-A3"), commissioner: engineer, cellId: "W1" },
  { id: "WAAM-A4", name: "Assembly 4 · Flange", weldNo: "#4", tags: { geometry: "Worn face", material: "S355 steel", bevel: "-" }, ...docs("WAAM-A4"), commissioner: engineer, cellId: "W1" },
];

export const STOCK = [
  { id: "m1", type: "Base plate", quality: "S355, 6 mm", amount: 24, unit: "pcs", min: 10 },
  { id: "m2", type: "Base plate", quality: "1.4301, 4 mm", amount: 6, unit: "pcs", min: 10 },
  { id: "m3", type: "Tube", quality: "1.4404 Ø60×3", amount: 12, unit: "pcs", min: 6 },
  { id: "m4", type: "Filler wire", quality: "G3Si1 Ø1.0", amount: 2, unit: "spools", min: 2 },
  { id: "m5", type: "Shielding gas", quality: "Ar + 18% CO₂", amount: 1, unit: "cylinders", min: 2 },
];
