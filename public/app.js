import { api } from './modules/api.js';
import { ui } from './modules/ui.js';

// ======================
// REFERENCIAS DOM
// ======================
const form = document.getElementById("formEmpleado");
const lista = document.getElementById("listaEmpleados");
const formNomina = document.getElementById("formNomina");
const empleadoNomina = document.getElementById("empleadoNomina");
const resultadoNomina = document.getElementById("resultadoNomina");
const btnPdfNomina = document.getElementById("btnPdfNomina");
const historialDiv = document.getElementById("historial");
const timelineDiv = document.getElementById("timelineAuditoria");

// ======================
// ESTADO GLOBAL
// ======================
let empleadosCache = [];
let editandoId = null;

// ======================
// HELPERS
// ======================
const calcularAnios = fecha => {
    if (!fecha) return 0;
    const inicio = new Date(fecha);
    const hoy = new Date();
    return Math.floor((hoy - inicio) / (1000 * 60 * 60 * 24 * 365));
};

// ======================
// CARGAR EMPLEADOS
// ======================
const cargarEmpleados = async () => {
    try {
        const empleados = await api.obtenerEmpleados();

        empleadosCache = empleados;

        ui.renderEmpleados(empleados, lista, empleadoNomina);

    } catch (error) {
        console.error("Error cargando empleados:", error);
    }
};

// ======================
// FORM EMPLEADO
// ======================
form.addEventListener("submit", async e => {
    e.preventDefault();

    const body = {
        personales: {
            nombre: nombre.value,
            fechaNacimiento: fechaNacimiento.value
        },
        laborales: {
            puesto: puesto.value,
            departamento: departamento.value,
            salario: Number(salario.value),
            fechaIngreso: fechaIngreso.value
        }
    };

    try {
        await api.guardarEmpleado(body, editandoId);

        editandoId = null;
        form.reset();
        cargarEmpleados();

    } catch (error) {
        console.error("Error guardando empleado:", error);
    }
});

// ======================
// FORM NÓMINA
// ======================
formNomina.addEventListener("submit", async e => {
    e.preventDefault();

    const body = {
        empleadoId: Number(empleadoNomina.value),
        periodo: periodo.value,
        novedades: {
            horasExtras: Number(horasExtras.value || 0),
            bonos: Number(bonos.value || 0),
            deducciones: {
                fondoEmpleados: Number(fondo.value || 0)
            }
        }
    };

    try {
        const n = await api.calcularNomina(body);

        if (n.error) return alert(n.error);

        ui.mostrarResultadoNomina(n, resultadoNomina);

        btnPdfNomina.style.display = "inline";
        btnPdfNomina.onclick = () =>
            window.open(`/api/nomina/${body.empleadoId}/${body.periodo}/pdf`);

    } catch (error) {
        console.error("Error calculando nómina:", error);
    }
});

// ======================
// LABELS PARA HISTORIAL
// ======================
const labels = {
    salario: "Salario",
    puesto: "Cargo",
    departamento: "Departamento",
    fechaIngreso: "Fecha de ingreso",
    nombre: "Nombre",
    fechaNacimiento: "Fecha de nacimiento"
};

// ======================
// RENDER CAMBIOS
// ======================
const renderCambios = (antes, despues) => {
    let html = "";

    for (const seccion in despues) {
        for (const campo in despues[seccion]) {
            const valorAntes = antes?.[seccion]?.[campo];
            const valorDespues = despues[seccion][campo];

            if (valorAntes !== valorDespues) {
                html += `
                    <div class="cambio">
                        <b>${labels[campo] || campo}:</b>
                        <span class="antes">${valorAntes ?? "—"}</span>
                        →
                        <span class="despues">${valorDespues}</span>
                    </div>
                `;
            }
        }
    }

    return html || "<i>Sin cambios relevantes</i>";
};

// ======================
// HISTORIAL
// ======================
const verHistorial = async empleadoId => {
    try {
        const historial = await api.obtenerHistorial(empleadoId);

        if (!historial.length) {
            historialDiv.innerHTML = "<i>Sin cambios registrados</i>";
            return;
        }

        historialDiv.innerHTML = historial.map(h => `
            <div class="card">
                <b>Fecha:</b> ${new Date(h.fecha).toLocaleString()}<br><br>
                ${renderCambios(h.antes, h.despues)}
            </div>
        `).join("");

    } catch (error) {
        console.error("Error cargando historial:", error);
    }
};

// ======================
// EDITAR
// ======================
const editarEmpleado = id => {
    const e = empleadosCache.find(emp => emp.id === id);
    if (!e) return;

    nombre.value = e.personales.nombre;
    fechaNacimiento.value = e.personales.fechaNacimiento;
    puesto.value = e.laborales.puesto;
    departamento.value = e.laborales.departamento;
    salario.value = e.laborales.salario;
    fechaIngreso.value = e.laborales.fechaIngreso;

    editandoId = id;
};

// ======================
// ELIMINAR
// ======================
const eliminarEmpleado = async id => {
    if (!confirm("¿Eliminar empleado?")) return;

    try {
        await api.eliminarEmpleado(id);
        cargarEmpleados();
    } catch (error) {
        console.error("Error eliminando empleado:", error);
    }
};

// ======================
// AUDITORÍA NÓMINA
// ======================
const compararCambios = (antes, despues) => {
    let html = "<ul>";

    for (const key in despues.totales) {
        const a = antes.totales[key];
        const d = despues.totales[key];

        if (a !== d) {
            html += `
                <li>
                    <b>${key}</b>:
                    <span class="antes">$${a.toLocaleString()}</span>
                    →
                    <span class="despues">$${d.toLocaleString()}</span>
                </li>
            `;
        }
    }

    html += "</ul>";
    return html;
};

const verAuditoriaNomina = async (empleadoId, periodo) => {
    try {
        const res = await fetch(`/api/nomina/${empleadoId}/${periodo}/auditoria`);
        const data = await res.json();

        if (!data.length) {
            timelineDiv.innerHTML = "<i>Sin auditoría registrada</i>";
            return;
        }

        timelineDiv.innerHTML = data.map(a => `
            <div class="timeline-item">
                <b>${new Date(a.fecha).toLocaleString()}</b><br>
                Acción: ${a.accion}
                ${compararCambios(a.antes, a.despues)}
            </div>
        `).join("");

    } catch (error) {
        console.error("Error auditoría:", error);
    }
};

const verAuditoriaDesdeUI = () => {
    const empleadoId = Number(empleadoNomina.value);
    const periodoSel = periodo.value;

    if (!empleadoId || !periodoSel) {
        alert("Seleccione empleado y período");
        return;
    }

    verAuditoriaNomina(empleadoId, periodoSel);
};

// ======================
// EXPONER A HTML (CRÍTICO)
// ======================
window.editarEmpleado = editarEmpleado;
window.eliminarEmpleado = eliminarEmpleado;
window.verHistorial = verHistorial;
window.verAuditoriaDesdeUI = verAuditoriaDesdeUI;

// ======================
// INIT
// ======================
cargarEmpleados();