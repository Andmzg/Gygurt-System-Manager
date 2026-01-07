/* ***************************************************************
 * GYGURT ERP V2.1 - CONTROLADOR DE BACKEND (MASTER)
 * ---------------------------------------------------------------
 * Módulos integrados:
 * 1. Router (Navegación)
 * 2. Precios (Lógica VIP y Volumen)
 * 3. Pedidos (Guardado y PDF)
 * 4. Cobranza (Tasa BCV, Registro de Pagos y Conciliación de Saldo)
 * ***************************************************************/

const SS = SpreadsheetApp.getActiveSpreadsheet();

// Configuración de Hojas
const SHEET_NAMES = {
  CLIENTS: 'Clients',
  PRODUCTS: 'Products',
  ORDERS: 'Orders',
  DETAILS: 'Order_Details',
  PAYMENTS: 'Payments'
};

const DOLAR_SHEET_ID = "1hOGX8I4yFEhVfVycV2uY8uMJxcme4vm-ZL0HN_caX0w"; // Tu hoja de tasas

/* ===============================================================
 * 1. ROUTER (Manejo de URL ?page=...)
 * =============================================================== */
function doGet(e) {
  const page = e.parameter.page;
  let templateName = 'Index'; 
  let title = 'Gygurt - Inicio';

  if (page === 'form') {
    templateName = 'Formulario';
    title = 'Gygurt - Nuevo Pedido';
  } else if (page === 'payments') {
    templateName = 'Payments';
    title = 'Gygurt - Cobranza';
  }

  return HtmlService.createTemplateFromFile(templateName)
    .evaluate()
    .setTitle(title)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/* ===============================================================
 * 2. DATOS INICIALES (Para el Formulario de Pedidos)
 * =============================================================== */
function getInitialData() {
  try {
    const clientSheet = SS.getSheetByName(SHEET_NAMES.CLIENTS);
    const clientsData = clientSheet.getRange(2, 1, clientSheet.getLastRow() - 1, 4).getValues();
    
    const clients = clientsData
      .filter(row => row[0] !== "")
      .map(row => ({ id: row[0], name: row[1], type: row[2], specialPrice: row[3] }));

    const prodSheet = SS.getSheetByName(SHEET_NAMES.PRODUCTS);
    const prodData = prodSheet.getRange(2, 1, prodSheet.getLastRow() - 1, 6).getValues();
    
    const products = prodData
      .filter(row => String(row[5]).toUpperCase() === 'TRUE') 
      .map(row => ({ sku: row[0], name: row[1], presentation: row[2], category: row[3], basePrice: row[4] }));

    return { success: true, clients: clients, products: products };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/* ===============================================================
 * 3. LÓGICA DE PRECIOS (El Cerebro Financiero)
 * =============================================================== */
function calculateItemPrice(clientType, clientSpecialPrice, productCategory, productPresentation, basePrice, determinationQty) {
  
  const qty = Number(determinationQty); // Cantidad GLOBAL (Suma de todos los sabores de 7oz)
  const priceBase = Number(basePrice);
  const priceSpecial = Number(clientSpecialPrice);

  // REGLA 1: Clientes VIP (Estricta: Solo si es Yogurt Y de 7oz)
  // Esto evita cobrar mermeladas o yogures de 24oz a precio VIP incorrecto.
  if (clientType.startsWith('VIP') && productCategory === 'Yogurt' && productPresentation === '7oz' && priceSpecial > 0) {
    return priceSpecial;
  }

  // REGLA 2: Descuento por Volumen (Estricta: Solo Yogurt 7oz)
  if (productCategory === 'Yogurt' && productPresentation === '7oz') {
    if (qty < 8) return 1.90;
    if (qty >= 8 && qty <= 24) return 1.55;
    if (qty > 24) return 1.45;
  }

  // REGLA 3: Precio Base (Fallback para todo lo demás)
  return priceBase;
}

/* ===============================================================
 * 4. GUARDAR PEDIDO (Transaction Order)
 * =============================================================== */
function saveOrder(orderData) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return { success: false, error: "Servidor ocupado" };

  try {
    const ordersSheet = SS.getSheetByName(SHEET_NAMES.ORDERS);
    const detailsSheet = SS.getSheetByName(SHEET_NAMES.DETAILS);
    
    const lastRow = ordersSheet.getLastRow();
    let newOrderId = 1001; 
    if (lastRow > 1) {
      newOrderId = Number(ordersSheet.getRange(lastRow, 1).getValue()) + 1;
    }

    const timestamp = new Date();
    let totalOrderAmount = 0;
    const orderDetailsRows = [];

    // CÁLCULO DE CANTIDAD GLOBAL (Para descuento por volumen correcto)
    const totalYogurt7ozQty = orderData.items
        .filter(i => i.category === 'Yogurt' && i.presentation === '7oz')
        .reduce((sum, i) => sum + Number(i.quantity), 0);

    // Procesar Items
    orderData.items.forEach(item => {
      // Si es Yogurt 7oz usamos el TOTAL GLOBAL, si no, su cantidad individual
      const qtyForPriceLogic = (item.category === 'Yogurt' && item.presentation === '7oz') 
                               ? totalYogurt7ozQty 
                               : item.quantity;

      const unitPrice = calculateItemPrice(
        orderData.client.type, 
        orderData.client.specialPrice,
        item.category,
        item.presentation,
        item.basePrice,
        qtyForPriceLogic 
      );

      const subtotal = unitPrice * item.quantity;
      totalOrderAmount += subtotal;

      orderDetailsRows.push([
        `D-${newOrderId}-${item.sku}`, newOrderId, item.sku, item.quantity, unitPrice, subtotal
      ]);
    });

    // Guardar Cabecera en 'Orders'
    // Col H (Balance) inicia igual al Total
    ordersSheet.appendRow([
      newOrderId, timestamp, orderData.client.id, orderData.client.name,   
      "Pending", "Pending", totalOrderAmount, totalOrderAmount, orderData.notes || ""    
    ]);

    // Guardar Detalles en 'Order_Details'
    if (orderDetailsRows.length > 0) {
      detailsSheet.getRange(detailsSheet.getLastRow() + 1, 1, orderDetailsRows.length, 6).setValues(orderDetailsRows);
    }

    // Generar PDF
    let pdfUrl = null;
    try {
       pdfUrl = createDeliveryNote(orderData, newOrderId);
    } catch (e) {
       Logger.log("PDF Error: " + e.toString());
    }

    return { success: true, orderId: newOrderId, total: totalOrderAmount, pdfUrl: pdfUrl };

  } catch (error) {
    return { success: false, error: error.toString() };
  } finally {
    lock.releaseLock(); 
  }
}

/* ===============================================================
 * 5. CONSULTA DE DEUDAS (Vital para Payments.html)
 * =============================================================== */
function getPendingOrders(query) {
  try {
    const ordersSheet = SS.getSheetByName(SHEET_NAMES.ORDERS);
    const lastRow = ordersSheet.getLastRow();
    if (lastRow < 2) return []; 

    // [0]ID, [1]Fecha, [2]ClientID, [3]Nombre... [6]Total, [7]Deuda
    const data = ordersSheet.getRange(2, 1, lastRow - 1, 8).getValues();
    
    // Filtrar deuda positiva (> 0.01 para evitar decimales fantasma)
    let pending = data.filter(row => Number(row[7]) > 0.01);

    if (query && query.trim() !== "") {
      const q = query.toLowerCase();
      pending = pending.filter(row => String(row[3]).toLowerCase().includes(q));
    }

    return pending.map(row => ({
      orderId: row[0],
      date: new Date(row[1]).toLocaleDateString(),
      client: row[3],
      total: Number(row[6]).toFixed(2),
      balance: Number(row[7])
    }));

  } catch (e) {
    Logger.log("Error getPendingOrders: " + e.toString());
    return [];
  }
}

/* ===============================================================
 * 6. REGISTRAR PAGO Y ACTUALIZAR DEUDA
 * =============================================================== */
function savePayment(paymentData) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return { success: false, error: "Sistema ocupado" };

  try {
    const paymentsSheet = SS.getSheetByName(SHEET_NAMES.PAYMENTS || 'Payments');
    const ordersSheet = SS.getSheetByName(SHEET_NAMES.ORDERS);

    // 1. Guardar el Pago en 'Payments'
    let newId = paymentsSheet.getLastRow(); 
    const paymentIdStr = `PAY-${newId}`;

    paymentsSheet.appendRow([
      paymentIdStr,
      paymentData.orderId,
      new Date(paymentData.date),
      Number(paymentData.amountUsd),
      Number(paymentData.amountBs),
      paymentData.method,
      paymentData.ref,
      Number(paymentData.rate)
    ]);
    
    // Forzar guardado para leerlo inmediatamente abajo
    SpreadsheetApp.flush(); 

    // 2. Buscar la fila de la Orden en 'Orders'
    const ordersData = ordersSheet.getDataRange().getValues();
    let orderRowIndex = -1;
    let totalOrderAmount = 0;

    // Empezamos en 1 para saltar encabezados
    for (let i = 1; i < ordersData.length; i++) {
      if (String(ordersData[i][0]) === String(paymentData.orderId)) {
        orderRowIndex = i + 1; // Ajuste por base-0 vs base-1
        totalOrderAmount = Number(ordersData[i][6]); // Col G: Total Amount
        break;
      }
    }

    if (orderRowIndex === -1) {
      return { success: false, error: "Pago guardado, pero no se encontró la orden para actualizar el saldo." };
    }

    // 3. Calcular Total Pagado Real (Sumando historial de Payments)
    const allPayments = paymentsSheet.getDataRange().getValues();
    let totalPaid = 0;
    
    // Sumar todos los pagos que coincidan con este Order ID
    for (let j = 1; j < allPayments.length; j++) {
      if (String(allPayments[j][1]) === String(paymentData.orderId)) {
        totalPaid += Number(allPayments[j][3]); // Col D: Amount USD
      }
    }

    // 4. Calcular Nuevo Saldo y Estatus
    const newBalance = totalOrderAmount - totalPaid;
    
    let paymentStatus = "Partial";
    if (newBalance <= 0.05) { // Margen de error de 5 centavos
      paymentStatus = "Paid";
    } else if (totalPaid === 0) {
      paymentStatus = "Pending";
    }

    // 5. Actualizar Hoja 'Orders' (Columnas F y H)
    ordersSheet.getRange(orderRowIndex, 6).setValue(paymentStatus);
    ordersSheet.getRange(orderRowIndex, 8).setValue(newBalance < 0 ? 0 : newBalance);

    return { 
      success: true, 
      newBalance: newBalance.toFixed(2),
      status: paymentStatus
    }; 

  } catch (e) {
    return { success: false, error: e.toString() };
  } finally {
    lock.releaseLock();
  }
}

/* ===============================================================
 * 7. TASA DE CAMBIO (API EXTERNA)
 * =============================================================== */
function getExchangeRate(dateString) {
  try {
    const externalSS = SpreadsheetApp.openById(DOLAR_SHEET_ID);
    const sheet = externalSS.getSheetByName("Dólar BCV");
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues(); 
    
    const searchDate = new Date(dateString + "T12:00:00");
    let bestRate = null;
    let minDiff = Infinity;

    for (let i = 0; i < data.length; i++) {
      let rowDate = new Date(data[i][0]);
      let rate = parseFloat(data[i][1]);
      rowDate.setHours(12,0,0,0);
      let diff = searchDate - rowDate;
      
      // Busca la fecha exacta o la inmediatamente anterior
      if (diff >= 0 && diff < minDiff) {
        minDiff = diff;
        bestRate = rate;
      }
    }
    
    if (bestRate) return { success: true, rate: bestRate };
    return { success: false, error: "No hay tasa histórica para esta fecha." };

  } catch (e) {
    return { success: false, error: "Error BD Dolar: " + e.toString() };
  }
}

/* ===============================================================
 * 8. UTILIDADES
 * =============================================================== */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}