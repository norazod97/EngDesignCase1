// Mock data standing in for the MES / AAS digital-twin sources that are not
// reachable from the lab. Replace via a real gateway (see services/gateway).

export const OPERATORS = {
  jack: {
    id: "jack",
    password: "weld123",
    name: "Jack Bauer",
    firstName: "Jack",
    role: "Welding operator",
    badge: "OP-0451",
    certifications: [
      { id: "c1", name: "EN ISO 9606-1 (GMAW 135)", issuer: "TÜV", status: "verified", validUntil: "2027-06-30" },
      { id: "c2", name: "AWS CRAW-O", issuer: "American Welding Society", status: "pending", validUntil: null },
    ],
  },
  operator2: {
    id: "operator2",
    password: "weld456",
    name: "Maria Rossi",
    firstName: "Maria",
    role: "Welding operator",
    badge: "OP-0452",
    certifications: [],
  },
};

export const COLLEAGUES = [
  { id: "sup1", name: "Lena de Vries", role: "Shift supervisor", online: true },
  { id: "w2", name: "Tom Peeters", role: "Welder", online: true },
  { id: "w3", name: "Aisha Khan", role: "Welder", online: false },
  { id: "mnt1", name: "Paul Janssen", role: "Maintenance", online: true },
];

export const SHIFTS = {
  jack: { id: "S-2026-11-14-B", label: "Afternoon shift", start: "14:00", end: "22:00", cellId: "54", area: "51.2", process: "GMAW" },
  operator2: { id: "S-2026-11-14-B", label: "Afternoon shift", start: "14:00", end: "22:00", cellId: "54", area: "51.2", process: "GMAW" },
};

export const CELLS = {
  54: {
    id: "54",
    area: "51.2",
    name: "Jigless GMAW cell",
    equipment: [
      { id: "R1", name: "Handling robot 1", kind: "robot", model: "Doosan H2017", status: "idle", nextServiceDue: "2026-12-02" },
      { id: "R2", name: "Handling robot 2", kind: "robot", model: "Doosan H2017", status: "idle", nextServiceDue: "2026-12-02" },
      { id: "R3", name: "Welding robot", kind: "robot", model: "Doosan H2017 + GMAW torch", status: "idle", nextServiceDue: "2026-11-16" },
      { id: "PS", name: "Welding power source", kind: "equipment", model: "GMAW power source", status: "idle", nextServiceDue: null },
      { id: "PF", name: "Profilometer camera", kind: "sensor", model: "Laser line profilometer", status: "idle", nextServiceDue: null },
      { id: "AS", name: "AI-SPECTO scanner", kind: "sensor", model: "3D inspection", status: "idle", nextServiceDue: null },
    ],
  },
};

const engineer = { name: "Ir. Sofia Bianchi", email: "s.bianchi@example.com", phone: "+31 40 000 0000" };

export const JOBS = [
  {
    id: "RW-BATCH-20261110-004", weldNo: "#452",
    tags: { geometry: "Plate-to-plate", material: "Stainless steel 1.4301", bevel: "V" },
    cad: { file: "RW452_plate.step" }, wps: { file: "WPS-452-rev2.pdf", hasNote: true, note: "Pre-clean with acetone. Max interpass 150 °C." },
    receivedAt: "2026-11-12T12:00", dueAt: "2026-11-14T18:00", commissioner: engineer, cellId: "54",
  },
  {
    id: "RW-BATCH-20261110-005", weldNo: "#453",
    tags: { geometry: "Tube-to-plate", material: "S355 carbon steel", bevel: "V" },
    cad: { file: "RW453_tube.step" }, wps: { file: "WPS-453-rev1.pdf", hasNote: false },
    receivedAt: "2026-11-12T12:00", dueAt: "2026-11-14T19:30", commissioner: engineer, cellId: "54",
  },
  {
    id: "RW-BATCH-20261110-006", weldNo: "#454",
    tags: { geometry: "Plate-to-plate", material: "S355 carbon steel", bevel: "U" },
    cad: { file: "RW454_plate.step" }, wps: null,
    receivedAt: "2026-11-13T09:00", dueAt: "2026-11-14T21:00", commissioner: engineer, cellId: "54",
  },
  {
    id: "RW-BATCH-20261110-007", weldNo: "#455",
    tags: { geometry: "Tube-to-plate", material: "Stainless steel 1.4404", bevel: "V" },
    cad: null, wps: { file: "WPS-455-rev1.pdf", hasNote: false },
    receivedAt: "2026-11-13T09:00", dueAt: "2026-11-14T21:30", commissioner: engineer, cellId: "54",
  },
];

export const STOCK = [
  { id: "m1", type: "Base plate", quality: "S355, 6 mm", amount: 24, unit: "pcs", min: 10 },
  { id: "m2", type: "Base plate", quality: "1.4301, 4 mm", amount: 6, unit: "pcs", min: 10 },
  { id: "m3", type: "Tube", quality: "1.4404 Ø60×3", amount: 12, unit: "pcs", min: 6 },
  { id: "m4", type: "Filler wire", quality: "G3Si1 Ø1.0", amount: 2, unit: "spools", min: 2 },
  { id: "m5", type: "Shielding gas", quality: "Ar + 18% CO₂", amount: 1, unit: "cylinders", min: 2 },
];
