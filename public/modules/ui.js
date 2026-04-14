// modules/ui.js

export const ui = {

    renderEmpleados(lista, contenedor, selectNomina) {
        contenedor.innerHTML = "";
        selectNomina.innerHTML = "";

        lista.forEach(e => {
            if (!e || !e.laborales || !e.personales) return;

            selectNomina.innerHTML += `
                <option value="${e.id}">
                    ${e.personales.nombre}
                </option>
            `;

            contenedor.innerHTML += `
                <div class="card shadow mb-3 p-3">
                    <h5>${e.personales.nombre}</h5>
                    <p>Depto: ${e.laborales.departamento}</p>
                    <p>Salario: $${e.laborales.salario.toLocaleString()}</p>

                    <div class="d-flex gap-2">
                        <button class="btn btn-warning btn-sm" onclick="editarEmpleado(${e.id})">✏️Editar</button>
                        <button class="btn btn-danger btn-sm" onclick="eliminarEmpleado(${e.id})">🗑️Eliminar</button>
                        <button class="btn btn-info btn-sm" onclick="verHistorial(${e.id})">📜Historial</button>
                    </div>
                </div>
            `;
        });
    },

    mostrarResultadoNomina(n, contenedor) {
        contenedor.innerHTML = `
            Neto a pagar: <b>$${n.totales.netoPagar.toLocaleString()}</b>
        `;
    }
};