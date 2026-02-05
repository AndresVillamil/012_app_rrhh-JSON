/**
 * Abre la hoja de vida en PDF para un empleado
 * El PDF se genera en el backend (server.js)
 */
const generarPDF = (idEmpleado) => {
    const url = `/api/empleados/${idEmpleado}/pdf`;

    // Abrir en nueva pestaña
    window.open(url, "_blank");
};
