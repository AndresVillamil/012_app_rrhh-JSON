const express = require("express");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const { drawTable } = require("./utils/pdf");

const app = express();
const PORT = 3000;

const DATA_FILE = path.join(__dirname, "empleados.json");
const HIST_FILE = path.join(__dirname, "historial.json");
const NOMINA_FILE = path.join(__dirname, "nomina.json");

app.use(express.json());
app.use(express.static("public"));

/* ======================
   HELPERS
====================== */
const leerJSON = file => {
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, "[]");
        return [];
    }
    const c = fs.readFileSync(file, "utf8").trim();
    return c ? JSON.parse(c) : [];
};

const guardarJSON = (file, data) =>
    fs.writeFileSync(file, JSON.stringify(data, null, 2));

/* ======================
   HISTORIAL
====================== */
const guardarHistorial = (empleadoId, antes, despues) => {
    const historial = leerJSON(HIST_FILE);
    historial.push({
        empleadoId,
        fecha: new Date().toISOString(),
        antes,
        despues
    });
    guardarJSON(HIST_FILE, historial);
};

/* ======================
   EMPLEADOS
====================== */
app.get("/api/empleados", (req, res) =>
    res.json(leerJSON(DATA_FILE))
);

app.post("/api/empleados", (req, res) => {
    const empleados = leerJSON(DATA_FILE);

    const empleado = {
        id: Date.now(),
        personales: req.body.personales,
        laborales: req.body.laborales
    };

    empleados.push(empleado);
    guardarJSON(DATA_FILE, empleados);
    res.status(201).json(empleado);
});

app.put("/api/empleados/:id", (req, res) => {
    const empleados = leerJSON(DATA_FILE);
    const id = Number(req.params.id);
    const index = empleados.findIndex(e => e.id === id);

    if (index === -1)
        return res.status(404).json({ error: "Empleado no encontrado" });

    const antes = empleados[index];
    empleados[index] = { ...antes, ...req.body };

    guardarJSON(DATA_FILE, empleados);
    guardarHistorial(id, antes, empleados[index]);
    res.json(empleados[index]);
});

app.delete("/api/empleados/:id", (req, res) => {
    const empleados = leerJSON(DATA_FILE)
        .filter(e => e.id !== Number(req.params.id));

    guardarJSON(DATA_FILE, empleados);
    res.json({ ok: true });
});

/* ======================
   HISTORIAL - CONSULTA
====================== */
app.get("/api/empleados/:id/historial", (req, res) => {
    const id = Number(req.params.id);
    const historial = leerJSON(HIST_FILE)
        .filter(h => h.empleadoId === id);

    res.json(historial);
});



/* ======================
   NÓMINA
====================== */
app.post("/api/nomina/calcular", (req, res) => {
    const { empleadoId, periodo, novedades } = req.body;

    const empleados = leerJSON(DATA_FILE);
    const nomina = leerJSON(NOMINA_FILE);

    const emp = empleados.find(e => e.id === empleadoId);
    if (!emp) return res.status(404).json({ error: "Empleado no existe" });

    const index = nomina.findIndex(n =>
        n.empleadoId === empleadoId && n.periodo === periodo
    );

    // ❌ Período cerrado → NO modificar
    if (index !== -1 && nomina[index].cerrado) {
        return res.status(400).json({
            error: "El período está cerrado y no puede modificarse"
        });
    }

    const salario = emp.laborales.salario;
    const horasExtras = novedades.horasExtras || 0;
    const bonos = novedades.bonos || 0;
    const fondo = novedades.deducciones?.fondoEmpleados || 0;

    const valorHora = (salario / 240) * 1.25;
    const extras = Math.round(horasExtras * valorHora);
    const devengado = Math.round(salario + extras + bonos);

    const salud   = Math.round(devengado * 0.04);
    const pension = Math.round(devengado * 0.04);
    const arl     = Math.round(devengado * 0.00522);

    const deducciones = salud + pension + arl + fondo;
    const neto = devengado - deducciones;

    const registro = {
        empleadoId,
        periodo,
        salarioBase: salario,
        novedades,
        aportes: { salud, pension, arl },
        totales: { devengado, deducciones, netoPagar: neto },
        cerrado: false,
        fechaGeneracion: new Date().toISOString()
    };

    // 🔁 Sobrescribe si existe y está abierto
    if (index !== -1) {
        nomina[index] = { ...nomina[index], ...registro };
    } else {
        nomina.push(registro);
    }

    guardarJSON(NOMINA_FILE, nomina);
    res.json(registro);
});

app.post("/api/nomina/cerrar", (req, res) => {
    const { periodo } = req.body;
    const nomina = leerJSON(NOMINA_FILE);

    let cerrados = 0;

    nomina.forEach(n => {
        if (n.periodo === periodo && !n.cerrado) {
            n.cerrado = true;
            n.fechaCierre = new Date().toISOString();
            cerrados++;
        }
    });

    if (!cerrados)
        return res.status(404).json({
            error: "No hay nóminas abiertas para este período"
        });

    guardarJSON(NOMINA_FILE, nomina);
    res.json({
        ok: true,
        periodo,
        registrosCerrados: cerrados
    });
});


/* ======================
   PDF NÓMINA
====================== */
app.get("/api/nomina/:empleadoId/:periodo/pdf", (req, res) => {
    const empleados = leerJSON(DATA_FILE);
    const nomina = leerJSON(NOMINA_FILE);

    const emp = empleados.find(e => e.id === Number(req.params.empleadoId));
    const reg = nomina.find(n =>
        n.empleadoId === emp?.id && n.periodo === req.params.periodo
    );

    if (!emp || !reg) return res.status(404).send("Datos no encontrados");

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    doc.fontSize(18).text("DESPRENDIBLE DE NÓMINA", { align: "center" });
    doc.moveDown();

    doc.text(`Empleado: ${emp.personales.nombre}`);
    doc.text(`Departamento: ${emp.laborales.departamento}`);
    doc.text(`Periodo: ${reg.periodo}`);

    doc.moveDown();
    drawTable(doc, 50, doc.y, ["Concepto", "Valor"], [
        ["Salario Base", reg.salarioBase],
        ["Horas Extras", reg.novedades.horasExtras],
        ["Bonos", reg.novedades.bonos],
        ["Salud", reg.aportes.salud],
        ["Pensión", reg.aportes.pension],
        ["ARL", reg.aportes.arl],
        ["Neto a pagar", reg.totales.netoPagar]
    ]);

    doc.end();
});

app.listen(PORT, () =>
    console.log(`Servidor activo en http://localhost:${PORT}`)
);
