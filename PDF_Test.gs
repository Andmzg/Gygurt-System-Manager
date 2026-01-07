function test_ForcePDF_Permissions() {
  console.log("--- STARTING MANUAL PDF TEST ---");

  // 1. Mock Data
  const mockOrderData = {
    client: {
      id: 'C-TEST',
      name: 'CLIENTE DE PRUEBA (DEBUG)',
      type: 'STANDARD',
      specialPrice: 0
    },
    items: [
      {
        sku: 'TEST-01',
        quantity: 5,
        category: 'Yogurt',
        presentation: '7oz',
        basePrice: 1.90,
        productData: { name: 'Yogurt Test Fresa' }
      },
      {
        sku: 'TEST-02',
        quantity: 1,
        category: 'Yogurt',
        presentation: '24oz',
        basePrice: 6.00,
        productData: { name: 'Yogurt Test Natural' }
      }
    ],
    notes: 'This is a test generated from the console to force authorization.'
  };

  const mockOrderId = 88888;

  // 2. Call the Generator
  const url = createDeliveryNote(mockOrderData, mockOrderId);

  // 3. Result
  if (url) {
    console.log("✅ SUCCESS! PDF Created.");
    console.log("🔗 Link: " + url);
  } else {
    console.error("❌ FAILED. The function returned null.");
  }
} // <--- AQUÍ TERMINA LA PRIMERA FUNCIÓN

// --- ESPACIO VACÍO ---

/* * RUN THIS FUNCTION ONCE TO AUTHORIZE DRIVE
 * It has no try/catch, so it forces the UI Prompt.
 */
function authorize_Drive_Access() {
  const test = DriveApp.getRootFolder();
  console.log("Drive Access Confirmed: " + test.getName());
} // <--- AQUÍ TERMINA LA SEGUNDA FUNCIÓN