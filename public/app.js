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

    empleadosCache = empleados;   // ✅ CLAVE: cache global para editar

    lista.innerHTML = "";
    empleadoNomina.innerHTML = "";

    empleados.forEach(e => {
        if (!e || !e.laborales || !e.personales) return;

        const anios = calcularAnios(e.laborales.fechaIngreso);

        empleadoNomina.innerHTML += `
            <option value="${e.id}">
                ${e.personales.nombre}
            </option>
        `;

        lista.innerHTML += `
            <div class="card">
                <b>${e.personales.nombre}</b><br>
                Departamento: ${e.laborales.departamento}<br>
                Salario: $${e.laborales.salario.toLocaleString()}<br>
                Años de servicio: ${anios}<br><br>

                <button onclick="editarEmpleado(${e.id})">✏️ Editar</button>
                <button onclick="eliminarEmpleado(${e.id})">🗑️ Eliminar</button>
                <button onclick="verHistorial(${e.id})">📜 Historial</button>
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

const verAuditoriaNomina = async (empleadoId, periodo) => {
    const res = await fetch(
        `/api/nomina/${empleadoId}/${periodo}/auditoria`
    );

    const data = await res.json();

    if (!data.length) {
        alert("No hay auditoría para este período");
        return;
    }

    let texto = "AUDITORÍA DE NÓMINA\n\n";

    data.forEach(a => {
        texto += `
Fecha: ${new Date(a.fecha).toLocaleString()}
-------------------------
ANTES:
${JSON.stringify(a.antes.totales, null, 2)}

DESPUÉS:
${JSON.stringify(a.despues.totales, null, 2)}
\n`;
    });

    alert(texto);
};
