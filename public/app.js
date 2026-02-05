const form = document.getElementById("formEmpleado");
const lista = document.getElementById("listaEmpleados");

/* ======================
   CACHE GLOBAL
====================== */
let empleadosCache = [];
let editandoId = null;

/* ======================
   UTILIDADES
====================== */
const diasEntreFechas = (inicio, fin = new Date()) => {
    return Math.floor((new Date(fin) - new Date(inicio)) / 86400000);
};

const calcularEdad = fecha => {
    return Math.floor(diasEntreFechas(fecha) / 365);
};

const prestacionesAnuales = (salario, fechaIngreso) => {
    const dias = Math.min(diasEntreFechas(fechaIngreso), 360);

    return {
        dias,
        vacaciones: salario * (15 / 360) * (dias / 30),
        prima: salario * (30 / 360) * (dias / 30),
        cesantias: salario * (30 / 360) * (dias / 30)
    };
};

/* ======================
   GUARDAR / EDITAR
====================== */
form.addEventListener("submit", async e => {
    e.preventDefault();

    // Validación básica
    if (!nombre.value || !puesto.value || !salario.value) {
        alert("Formulario incompleto");
        return;
    }

    const empleado = {
        personales: {
            nombre: nombre.value,
            fechaNacimiento: fechaNacimiento.value
        },
        laborales: {
            puesto: puesto.value,
            departamento: departamento.value,
            salario: parseFloat(salario.value),
            fechaIngreso: fechaIngreso.value
        }
    };

    const url = editandoId
        ? `/api/empleados/${editandoId}`
        : "/api/empleados";

    const method = editandoId ? "PUT" : "POST";

    try {
        await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(empleado)
        });

        editandoId = null;
        form.reset();
        cargarEmpleados();
    } catch (err) {
        console.error(err);
        alert("Error guardando empleado");
    }
});

/* ======================
   CARGAR EMPLEADOS
====================== */
const cargarEmpleados = async () => {
    const res = await fetch("/api/empleados");
    empleadosCache = await res.json();

    lista.innerHTML = "";

    empleadosCache.forEach(e => {
        const edad = calcularEdad(e.personales.fechaNacimiento);
        const antiguedad = Math.floor(
            diasEntreFechas(e.laborales.fechaIngreso) / 365
        );

        const pres = prestacionesAnuales(
            e.laborales.salario,
            e.laborales.fechaIngreso
        );

        lista.innerHTML += `
        <div class="card">
            <b>${e.personales.nombre}</b><br>
            Edad: ${edad} años<br>
            Puesto: ${e.laborales.puesto}<br>
            Departamento: ${e.laborales.departamento}<br>
            Antigüedad: ${antiguedad} años<br>

            <table class="tabla">
                <tr><th>Prestación</th><th>Valor</th></tr>
                <tr><td>Vacaciones</td><td>$${pres.vacaciones.toLocaleString()}</td></tr>
                <tr><td>Prima</td><td>$${pres.prima.toLocaleString()}</td></tr>
                <tr><td>Cesantías</td><td>$${pres.cesantias.toLocaleString()}</td></tr>
            </table>

            <p>Días trabajados año: ${pres.dias}</p>

            <button onclick="eliminarEmpleado(${e.id})">🗑️ Eliminar</button>
            <button onclick="editarEmpleado(${e.id})">✏️ Editar</button>
            <button onclick="verHistorial(${e.id})">📜 Historial</button>
            <a href="/api/empleados/${e.id}/pdf" target="_blank">🖨️ PDF</a>

            <div id="historial-${e.id}" class="historial"></div>
        </div>`;
    });
};

cargarEmpleados();

/* ======================
   ELIMINAR
====================== */
const eliminarEmpleado = async (id) => {
    if (!confirm("¿Eliminar este empleado?")) return;

    await fetch(`/api/empleados/${id}`, { method: "DELETE" });
    cargarEmpleados();
};

/* ======================
   EDITAR
====================== */
const editarEmpleado = (id) => {
    const e = empleadosCache.find(emp => emp.id === id);
    if (!e) {
        alert("Empleado no encontrado");
        return;
    }

    nombre.value = e.personales.nombre;
    fechaNacimiento.value = e.personales.fechaNacimiento;
    puesto.value = e.laborales.puesto;
    departamento.value = e.laborales.departamento;
    salario.value = e.laborales.salario;
    fechaIngreso.value = e.laborales.fechaIngreso;

    editandoId = id;
};

/* ======================
   HISTORIAL
====================== */
const verHistorial = async (id) => {
    const contenedor = document.getElementById(`historial-${id}`);

    // Toggle
    if (contenedor.innerHTML.trim() !== "") {
        contenedor.innerHTML = "";
        return;
    }

    const res = await fetch(`/api/empleados/${id}/historial`);
    const historial = await res.json();

    if (historial.length === 0) {
        contenedor.innerHTML = "<p>Sin cambios registrados.</p>";
        return;
    }

    let html = `
        <h4>Historial de cambios</h4>
        <table class="tabla">
            <tr>
                <th>Fecha</th>
                <th>Antes</th>
                <th>Después</th>
            </tr>
    `;

    historial.forEach(h => {
        html += `
            <tr>
                <td>${new Date(h.fecha).toLocaleString()}</td>
                <td>
                    ${h.antes.laborales.puesto}<br>
                    $${h.antes.laborales.salario.toLocaleString()}
                </td>
                <td>
                    ${h.despues.laborales.puesto}<br>
                    $${h.despues.laborales.salario.toLocaleString()}
                </td>
            </tr>
        `;
    });

    html += "</table>";
    contenedor.innerHTML = html;
};
