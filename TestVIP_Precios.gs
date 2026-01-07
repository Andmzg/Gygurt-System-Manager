function test_Diagnostico_VIP2() {
  console.log("🛠️ INICIANDO AUTOPSIA DE PRECIOS (DEBUG) 🛠️");

  // 1. DATOS SIMULADOS (Mocks basados en tus capturas)
  const clientes = [
    { name: "Brian (Standard)", type: "STANDAR", specialPrice: "" }, // Caso Control
    { name: "BOLT (VIP1)",      type: "VIP 1",   specialPrice: 1.4 }, // Caso que funciona
    { name: "Hospikitos (VIP3)",    type: "VIP3",    specialPrice: 1.45 }  // CASO PROBLEMA
  ];

  const producto = {
    cat: "Yogurt",
    pres: "7oz",
    base: 1.90
  };

  // 2. EJECUCIÓN DE PRUEBAS
  clientes.forEach(cli => {
    console.log(`\n--------------------------------------------------`);
    console.log(`👤 PROBANDO CLIENTE: ${cli.name}`);
    console.log(`   Datos: Tipo=[${cli.type}] | Precio Esp.=[${cli.specialPrice}]`);
    
    // Llamamos a la función de cálculo con "Logs internos"
    const precioFinal = simuladorConTraza(
      cli.type, 
      cli.specialPrice, 
      producto.cat, 
      producto.pres, 
      producto.base, 
      1 // Cantidad
    );

    console.log(`💰 PRECIO CALCULADO: $${precioFinal}`);
  });
}

// --- LA LÓGICA DE NEGOCIO (CON RAYOS X) ---
function simuladorConTraza(clientType, clientSpecialPrice, productCategory, productPresentation, basePrice, quantity) {
  
  // Conversión y limpieza
  // IMPORTANTE: .toString() protege contra valores nulos o numéricos puros
  const cType = String(clientType).trim(); 
  const pCat = String(productCategory).trim();
  const pPres = String(productPresentation).trim();
  const pSpecial = Number(clientSpecialPrice);
  const pBase = Number(basePrice);

  // LOGS DE AUDITORÍA
  console.log(`   🔎 Analizando reglas...`);
  
  // 1. CHEQUEO REGLA VIP
  const esVIP = cType.startsWith('VIP');
  const esYogurt = pCat === 'Yogurt';
  const es7oz = pPres === '7oz';
  const tienePrecio = pSpecial > 0;

  console.log(`      ¿Empieza con VIP? [${cType}] -> ${esVIP ? "SÍ" : "NO"}`);
  console.log(`      ¿Es Yogurt?       [${pCat}] -> ${esYogurt ? "SÍ" : "NO"}`);
  console.log(`      ¿Es 7oz?          [${pPres}] -> ${es7oz ? "SÍ" : "NO"}`);
  console.log(`      ¿Tiene Precio?    [${pSpecial}] -> ${tienePrecio ? "SÍ" : "NO"}`);

  if (esVIP && esYogurt && es7oz && tienePrecio) {
    console.log(`   ✅ APLICA REGLA VIP. Retornando: ${pSpecial}`);
    return pSpecial;
  }

  // 2. CHEQUEO VOLUMEN
  if (esYogurt && es7oz) {
    console.log(`   ⚠️ No es VIP (o falló una condición). Entrando a Volumen.`);
    if (quantity < 8) return 1.90;
    // ... resto de lógica
  }

  console.log(`   ℹ️ Aplicando Precio Base.`);
  return pBase;
}