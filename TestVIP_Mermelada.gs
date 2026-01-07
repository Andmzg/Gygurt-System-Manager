function test_Precios_En_Consola() {
  console.log("🛠️ INICIANDO DIAGNÓSTICO DE PRECIOS 🛠️");

  // --- ESCENARIOS DE PRUEBA ---
  const escenarios = [
    {
      desc: "CASO 1 (EL BUG): VIP comprando Mermelada 7oz",
      inputs: ["VIP 1", 1.40, "Mermelada", "7oz", 1.00, 1],
      esperado: 1.00
    },
    {
      desc: "CASO 2: VIP comprando Yogurt 7oz",
      inputs: ["VIP 1", 1.40, "Yogurt", "7oz", 1.90, 1],
      esperado: 1.40
    },
    {
      desc: "CASO 3: Standard comprando Yogurt 24oz",
      inputs: ["STANDARD", 0, "Yogurt", "24oz", 6.00, 1],
      esperado: 6.00
    },
    {
      desc: "CASO 4: Standard Yogurt 7oz (Volumen < 8)",
      inputs: ["STANDARD", 0, "Yogurt", "7oz", 1.90, 12],
      esperado: 1.90
    }
  ];

  // --- EJECUCIÓN ---
  escenarios.forEach(caso => {
    const resultado = simuladorPrecio(...caso.inputs);
    const paso = resultado === caso.esperado;
    
    console.log(`\n🔹 ${caso.desc}`);
    console.log(`   Esperado: $${caso.esperado} | Recibido: $${resultado}`);
    console.log(`   Estado: ${paso ? "✅ CORRECTO" : "❌ ERROR"}`);
  });
}

// --- LA LÓGICA QUE QUEREMOS ARREGLAR ---
// Modifica ESTA función aquí mismo y dale a "Ejecutar" para probar cambios al instante.
function simuladorPrecio(clientType, clientSpecialPrice, productCategory, productPresentation, basePrice, quantity) {
  
  const qty = Number(quantity);
  const priceBase = Number(basePrice);
  const priceSpecial = Number(clientSpecialPrice);

  // DEBUG: Descomenta esto si quieres ver qué datos exactos están llegando
  // console.log(`   [Datos] Cat: '${productCategory}', Pres: '${productPresentation}'`);

  // REGLA 1: VIP (Solo si es Yogurt Y ADEMÁS es 7oz)
  // Aquí está el filtro que evita que la mermelada caiga
  if (clientType.startsWith('VIP') && productPresentation === '7oz' && productCategory === 'Yogurt' && priceSpecial > 0) {
    return priceSpecial;
  }

  // REGLA 2: Volumen (Solo Yogurt 7oz)
  if (productCategory === 'Yogurt' && productPresentation === '7oz') {
    if (qty < 8) return 1.90;
    if (qty >= 8 && qty <= 24) return 1.55;
    if (qty > 24) return 1.45;
  }

  // REGLA 3: Default (Mermeladas, 24oz, etc)
  return priceBase;
}