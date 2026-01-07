/* PaymentController.gs - Lógica de Cobranza y Actualización de Saldos */

// Buscar pedidos que NO estén pagados
function getPendingOrders(query) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ordersSheet = ss.getSheetByName('Orders');
  // Obtenemos todos los datos (asumiendo que la fila 1 son encabezados)
  const data = ordersSheet.getDataRange().getValues(); 
  
  const pendingOrders = [];
  
  // Recorremos desde la fila 1 (la 0 es encabezado)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    // Mapeo de columnas basado en tu estructura actual:
    // A[0]: id, B[1]: fecha, C[2]: id_client, D[3]: nombre, 
    // E[4]: status_pedido, F[5]: status_pago, G[6]: total, H[7]: deuda
    
    const orderId = row[0];
    const clientName = row[3].toString(); // Columna D
    const paymentStatus = row[5].toString(); // Columna F
    const total = Number(row[6]); // Columna G
    const balance = Number(row[7]); // Columna H
    
    // FILTRO: Si el estado NO es 'PAID' y la deuda es mayor a 0.01
    if (paymentStatus !== 'PAID' && balance > 0.01) {
      // Si hay texto de búsqueda, filtramos por nombre de cliente
      if (!query || clientName.toLowerCase().includes(query.toLowerCase())) {
        pendingOrders.push({
          orderId: orderId,
          date: new Date(row[1]).toLocaleDateString(),
          client: clientName,
          total: total,
          balance: balance,
          rowIndex: i + 1 // Guardamos el número de fila para actualizarla luego
        });
      }
    }
  }
  
  return pendingOrders; // Enviamos la lista al HTML
}

// Registrar Pago y Actualizar Saldo en Orders
/* PaymentController.gs - Actualizado para Multi-Moneda */

function registerPayment(data) {
  const lock = LockService.getScriptLock();
  // Esperar hasta 10 segundos para evitar conflictos
  if (!lock.tryLock(10000)) {
    return { success: false, error: "El sistema está ocupado, intenta de nuevo." };
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const paySheet = ss.getSheetByName('Payments');
    const ordersSheet = ss.getSheetByName('Orders');
    
    // 1. Guardar en Hoja 'Payments' (Historial Detallado)
    const newPayId = "PAY-" + new Date().getTime();
    
    // Convertimos la fecha que viene del HTML (YYYY-MM-DD) a Objeto Date
    // Agregamos 'T12:00:00' para evitar problemas de zona horaria que cambien el día
    const dateObj = new Date(data.date + 'T12:00:00'); 

    paySheet.appendRow([
      newPayId,
      data.orderId,
      dateObj,          // Col C: Fecha editable
      data.amountUsd,   // Col D: Equivalente $$ (Vital para el cálculo)
      data.amountBs,    // Col E: Monto Bs (Informativo)
      data.method,      // Col F: Método
      data.reference    // Col G: Referencia
    ]);

    // 2. Actualizar Hoja 'Orders' (Saldos)
    const ordersData = ordersSheet.getDataRange().getValues();
    let rowIndex = -1;
    let currentBalance = 0;
    let totalAmount = 0;

    for (let i = 1; i < ordersData.length; i++) {
      if (ordersData[i][0] == data.orderId) {
        rowIndex = i + 1; 
        totalAmount = Number(ordersData[i][6]); // Col G (Total)
        currentBalance = Number(ordersData[i][7]); // Col H (Deuda Actual)
        break;
      }
    }

    if (rowIndex === -1) throw new Error("Pedido no encontrado: " + data.orderId);

    // LÓGICA CRÍTICA: Restamos el Equivalente en Dólares, NO los Bolívares
    const payAmount = Number(data.amountUsd);
    
    // Fix de precisión decimal (para evitar que quede debiendo $0.0000001)
    let newBalance = Number((currentBalance - payAmount).toFixed(2));
    
    let newStatus = "Pending";
    if (newBalance <= 0.01) {
      newBalance = 0; // Forzamos cero limpio
      newStatus = "PAID";
    } else if (newBalance < totalAmount) {
      newStatus = "Partial";
    }

    // Actualizamos Columna F (Status) y Columna H (Deuda)
    ordersSheet.getRange(rowIndex, 6).setValue(newStatus);
    ordersSheet.getRange(rowIndex, 8).setValue(newBalance);

    return { success: true, newBalance: newBalance, newStatus: newStatus };

  } catch (e) {
    return { success: false, error: e.toString() };
  } finally {
    lock.releaseLock();
  }
}