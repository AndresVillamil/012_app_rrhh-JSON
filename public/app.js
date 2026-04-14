const form = document.getElementById("formEmpleado");
const lista = document.getElementById("listaEmpleados");
const formNomina = document.getElementById("formNomina");
const empleadoNomina = document.getElementById("empleadoNomina");
const resultadoNomina = document.getElementById("resultadoNomina");
const btnPdfNomina = document.getElementById("btnPdfNomina");
const historialDiv = document.getElementById("historial");

let empleadosCache = [];      // ✅ YA EXISTÍA, ahora se usa correctamente
let editandoId = null;        // ✅ FALTABA → error editandoId not defined

const calcularAnios = fecha => {
    if (!fecha) return 0;     // ✅ Previene undefined
    const inicio = new Date(fecha);
    const hoy = new Date();
    return Math.floor((hoy - inicio) / (1000 * 60 * 60 * 24 * 365));
};

const cargarEmpleados = async () => {
    const res = await fetch("/api/empleados");
    const empleados = await res.json();
    console.log("Empleados cargados:", empleados);  // ✅ DEBUG
    empleadosCache = empleados;   // ✅ CLAVE: cache global para editar

    lista.innerHTML = "";
    empleadoNomina.innerHTML = "";

    empleados.forEach(e => {
        console.log("Procesando empleado:", e);  // ✅ DEBUG
        if (!e || !e.laborales || !e.personales) return;

        const anios = calcularAnios(e.laborales.fechaIngreso);
        

        empleadoNomina.innerHTML += `
            <option value="${e.id}">
                ${e.personales.nombre}
            </option>
        `;

       lista.innerHTML += `
<div class="card shadow mb-3 p-3">
    <h5>${e.personales.nombre}</h5>
    <p class="mb-1">Depto: ${e.laborales.departamento}</p>
    <p class="mb-1">Salario: $${e.laborales.salario.toLocaleString()}</p>

    <div class="d-flex gap-2">
        <button class="btn btn-warning btn-sm" onclick="editarEmpleado(${e.id})">✏️Enditar</button>
        <button class="btn btn-danger btn-sm" onclick="eliminarEmpleado(${e.id})">🗑️Eliminar</button>
        <button class="btn btn-info btn-sm" onclick="verHistorial(${e.id})">📜Historial</button>
    </div>
</div>
`;
    });
};

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

    const url = editandoId
        ? `/api/empleados/${editandoId}`
        : "/api/empleados";

    const method = editandoId ? "PUT" : "POST";

    await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    editandoId = null;
    form.reset();
    cargarEmpleados();
});

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

    const res = await fetch("/api/nomina/calcular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    const n = await res.json();
    if (n.error) return alert(n.error);

    resultadoNomina.innerHTML = `
        Neto a pagar: <b>$${n.totales.netoPagar.toLocaleString()}</b>
    `;

    btnPdfNomina.style.display = "inline";
    btnPdfNomina.onclick = () =>
        window.open(`/api/nomina/${body.empleadoId}/${body.periodo}/pdf`);
});
// ======================
// Render Historial de cambios
// ======================
/***********************************
 * Labels visibles para el usuario
 ***********************************/
const labels = {
  salario: "Salario",
  puesto: "Cargo",
  departamento: "Departamento",
  fechaIngreso: "Fecha de ingreso",
  nombre: "Nombre",
  fechaNacimiento: "Fecha de nacimiento"
};

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
// HISTORIAL DE CAMBIOS
// ======================

const verHistorial = async empleadoId => {
    const res = await fetch(`/api/empleados/${empleadoId}/historial`);
    const historial = await res.json();

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
};

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

const eliminarEmpleado = async id => {
    if (!confirm("¿Eliminar empleado?")) return;

    await fetch(`/api/empleados/${id}`, { method: "DELETE" });
    cargarEmpleados();
};

cargarEmpleados();

const timelineDiv = document.getElementById("timelineAuditoria");

const verAuditoriaNomina = async (empleadoId, periodo) => {
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
};

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

const verAuditoriaDesdeUI = () => {
    const empleadoId = Number(empleadoNomina.value);
    const periodoSel = periodo.value;

    if (!empleadoId || !periodoSel) {
        alert("Seleccione empleado y período");
        return;
    }

    verAuditoriaNomina(empleadoId, periodoSel);
};
