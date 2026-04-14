// modules/api.js

export const api = {
    obtenerEmpleados: async () => {
        const res = await fetch("/api/empleados");
        return res.json();
    },

    guardarEmpleado: async (data, id = null) => {
        const url = id ? `/api/empleados/${id}` : "/api/empleados";
        const method = id ? "PUT" : "POST";

        await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
    },

    eliminarEmpleado: async (id) => {
        await fetch(`/api/empleados/${id}`, { method: "DELETE" });
    },

    obtenerHistorial: async (id) => {
        const res = await fetch(`/api/empleados/${id}/historial`);
        return res.json();
    },

    calcularNomina: async (body) => {
        const res = await fetch("/api/nomina/calcular", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        return res.json();
    }
};