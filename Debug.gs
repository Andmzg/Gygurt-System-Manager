function test_ConexionBaseDatos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  console.log("--- INICIO DIAGNÓSTICO ---");
  
  // 1. Verificar Hoja Clientes
  const sheetCli = ss.getSheetByName("Clients"); // ¿Coincide el nombre?
  if (!sheetCli) {
    console.error("❌ ERROR CRÍTICO: No encuentro la hoja llamada 'Clients'. Revisa mayúsculas/minúsculas.");
  } else {
    const dataCli = sheetCli.getDataRange().getValues();
    console.log(`✅ Hoja Clients encontrada. Filas totales: ${dataCli.length}`);
    if (dataCli.length > 1) {
      console.log(`   Ejemplo Fila 2 (ID): ${dataCli[1][0]}`); // Debería ver C001
      console.log(`   Ejemplo Fila 2 (Nombre): ${dataCli[1][1]}`); // Debería ver BOLT
    } else {
      console.warn("⚠️ La hoja Clients existe pero parece vacía (solo encabezados).");
    }
  }

  // 2. Verificar Hoja Productos
  const sheetProd = ss.getSheetByName("Products");
  if (!sheetProd) {
    console.error("❌ ERROR CRÍTICO: No encuentro la hoja llamada 'Products'.");
  } else {
    const dataProd = sheetProd.getDataRange().getValues();
    console.log(`✅ Hoja Products encontrada. Filas totales: ${dataProd.length}`);
    
    // Verificamos el problema del TRUE/Check
    if (dataProd.length > 1) {
      const activeVal = dataProd[1][5]; // Columna F
      console.log(`   Producto Fila 2: ${dataProd[1][0]}`);
      console.log(`   Valor 'is_active' crudo: [${activeVal}]`);
      console.log(`   Tipo de dato: ${typeof activeVal}`);
      
      // Prueba de lógica
      const testCheck = (String(activeVal).toUpperCase() === 'TRUE');
      console.log(`   ¿Pasa el filtro nuevo? ${testCheck ? "SÍ" : "NO"}`);
    }
  }
  console.log("--- FIN DIAGNÓSTICO ---");
}