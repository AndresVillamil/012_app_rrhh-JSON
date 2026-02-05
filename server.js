const express = require("express");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");
const { drawTable, generarGrafico } = require("./utils/pdf");

/* ======================
   CONFIG APP
====================== */
const app = express();
const PORT = 3000;

const DATA_FILE = path.join(__dirname, "empleados.json");
const HIST_FILE = path.join(__dirname, "historial.json");

app.use(express.json());
app.use(express.static("public"));

/* ======================
   HELPERS EMPLEADOS
====================== */
const leer = () => {
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, "[]");
        return [];
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8") || "[]");
};

const guardar = (data) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

/* ======================
   HELPERS HISTORIAL
====================== */
const leerHistorial = () => {
    if (!fs.existsSync(HIST_FILE)) {
        fs.writeFileSync(HIST_FILE, "[]");
        return [];
    }
    try {
        return JSON.parse(fs.readFileSync(HIST_FILE, "utf8") || "[]");
    } catch {
        fs.writeFileSync(HIST_FILE, "[]");
        return [];
    }
};

const guardarHistorial = (empleadoId, antes, despues) => {
    const historial = leerHistorial();
    historial.push({
        empleadoId,
        fecha: new Date().toISOString(),
        antes,
        despues
    });
    fs.writeFileSync(HIST_FILE, JSON.stringify(historial, null, 2));
};


/* ======================
   ENDPOINTS
====================== */

app.get("/api/empleados", (req, res) => {
    res.json(leer());
});

app.post("/api/empleados", (req, res) => {
    const empleados = leer();
    const empleado = {
        id: Date.now(),
        personales: req.body.personales,
        laborales: req.body.laborales
    };
    empleados.push(empleado);
    guardar(empleados);
    res.status(201).json(empleado);
});

app.put("/api/empleados/:id", (req, res) => {
    const empleados = leer();
    const id = parseInt(req.params.id);
    const index = empleados.findIndex(e => e.id === id);

    if (index === -1) {
        return res.status(404).json({ error: "Empleado no encontrado" });
    }

    const anterior = empleados[index];
    empleados[index] = { ...anterior, ...req.body };

    guardar(empleados);
    guardarHistorial(id, anterior, empleados[index]);
    res.json(empleados[index]);
});

/* ======================
   PDF HOJA DE VIDA
====================== */
app.get("/api/empleados/:id/pdf", async (req, res) => {
    const empleados = leer();
    const emp = empleados.find(e => e.id === parseInt(req.params.id));

    if (!emp) {
        return res.status(404).send("Empleado no encontrado");
    }

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=hoja_vida.pdf");

    doc.pipe(res);

    doc.fontSize(18).text("HOJA DE VIDA", { align: "center" });
    doc.moveDown();

    doc.fontSize(12)
        .text(`Nombre: ${emp.personales.nombre}`)
        .text(`Fecha Nacimiento: ${emp.personales.fechaNacimiento}`)
        .text(`ID Empleado: ${emp.id}`);

    doc.moveDown(2);

    drawTable(doc, 50, doc.y, ["Campo", "Valor"], [
        ["Puesto", emp.laborales.puesto],
        ["Departamento", emp.laborales.departamento],
        ["Salario", `$${emp.laborales.salario.toLocaleString()}`],
        ["Fecha Ingreso", emp.laborales.fechaIngreso]
    ]);

    const grafico = await generarGrafico(emp);
    doc.addPage();
    doc.text("Resumen Salarial", { align: "center" });
    doc.moveDown();
    doc.image(grafico, { width: 400, align: "center" });

    doc.end();
});

/* ======================
   START SERVER
====================== */
app.listen(PORT, () => {
    console.log(`Servidor activo en http://localhost:${PORT}`);
});
