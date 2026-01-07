/* PDFGenerator.gs - Handles PDF creation and Drive storage */

// TU ID DE CARPETA (No lo cambies, ya funciona bien)
const DRIVE_FOLDER_ID = "YOUR_FOLDER_ID_HERE"; 

function createDeliveryNote(orderData, newOrderId) {
  try {
    const template = HtmlService.createTemplateFromFile('NotaEntrega');
    
    // 1. Datos Básicos
    template.orderId = formatOrderId(newOrderId);
    template.clientName = orderData.client.name;
    template.date = new Date().toLocaleDateString();
    
    // --- NUEVO: CÁLCULO DE CANTIDAD GLOBAL (Igual que en el Backend) ---
    // Sumamos todos los yogures de 7oz para saber el rango de precio real
    const totalYogurt7ozQty = orderData.items
        .filter(i => i.category === 'Yogurt' && i.presentation === '7oz')
        .reduce((sum, i) => sum + Number(i.quantity), 0);

    // 2. Procesar Items para el PDF
    template.items = orderData.items.map(item => {
      
      // Decidimos qué cantidad usar para consultar el precio
      const qtyForPriceLogic = (item.category === 'Yogurt' && item.presentation === '7oz') 
                               ? totalYogurt7ozQty 
                               : item.quantity;

      // Recalculamos el precio unitario usando la cantidad GLOBAL
      const appliedPrice = calculateItemPrice(
        orderData.client.type, 
        orderData.client.specialPrice,
        item.category,
        item.presentation,
        item.basePrice,
        qtyForPriceLogic // <--- Aquí pasamos el Total Global
      );
      
      return { ...item, unitPrice: appliedPrice };
    });

    // 3. Calcular Totales para el PDF
    // Suma de Dinero ($)
    template.totalAmount = template.items.reduce((acc, item) => {
      return acc + (item.unitPrice * item.quantity);
    }, 0).toFixed(2);

    // Suma de Unidades Físicas (Qty)
    template.totalQty = orderData.items.reduce((acc, item) => acc + Number(item.quantity), 0);

    // 4. Generar Blob PDF
    const htmlBody = template.evaluate().getContent();
    const blob = Utilities.newBlob(htmlBody, 'text/html', `Nota_${newOrderId}.html`)
                  .getAs('application/pdf')
                  .setName(`Nota_Entrega_${formatOrderId(newOrderId)}.pdf`);

    // 5. Guardar en Drive
    let folder;
    try {
      folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    } catch(e) {
      folder = DriveApp.getRootFolder();
    }
    
    const pdfFile = folder.createFile(blob);
    pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return pdfFile.getUrl();

  } catch (e) {
    Logger.log("PDF Error: " + e.toString());
    return null; 
  }
}

// Helper: 199 -> "00199"
function formatOrderId(id) {
  return id.toString().padStart(5, '0');
}