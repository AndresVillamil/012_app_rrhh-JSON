const { ChartJSNodeCanvas } = require("chartjs-node-canvas");

/* ======================
   TABLAS PDF
====================== */
function drawTable(doc, startX, startY, headers, rows) {
    const colWidth = 200;
    const rowHeight = 20;

    // Encabezados
    headers.forEach((header, i) => {
        doc
            .rect(startX + i * colWidth, startY, colWidth, rowHeight)
            .stroke();
        doc.text(
            header,
            startX + i * colWidth + 5,
            startY + 5,
            { width: colWidth - 10 }
        );
    });

    // Filas
    rows.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
            doc
                .rect(
                    startX + colIndex * colWidth,
                    startY + (rowIndex + 1) * rowHeight,
                    colWidth,
                    rowHeight
                )
                .stroke();

            doc.text(
                cell,
                startX + colIndex * colWidth + 5,
                startY + (rowIndex + 1) * rowHeight + 5,
                { width: colWidth - 10 }
            );
        });
    });
}

/* ======================
   GRÁFICOS PDF
====================== */
const chartCanvas = new ChartJSNodeCanvas({
    width: 500,
    height: 300,
    backgroundColour: "white"
});

async function generarGrafico(emp) {
    return await chartCanvas.renderToBuffer({
        type: "bar",
        data: {
            labels: ["Salario"],
            datasets: [
                {
                    label: "Salario actual",
                    data: [emp.laborales.salario],
                    backgroundColor: "rgba(54, 162, 235, 0.6)"
                }
            ]
        },
        options: {
            responsive: false,
            plugins: {
                legend: { display: true }
            }
        }
    });
}

module.exports = {
    drawTable,
    generarGrafico
};
