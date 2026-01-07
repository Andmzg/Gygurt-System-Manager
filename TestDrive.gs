function test_GuardarArchivoSimple() {
  // ID de tu carpeta "Notas de Entrega"
  const ID_CARPETA = "10gWatDQITPnLkqSwZAIrHqX8pAEprJqX";

  console.log("1. Iniciando prueba de conexión con Drive...");
  
  // A. Intentar conectar con la carpeta
  // Si falla aquí, el ID está mal o no tienes acceso.
  const carpeta = DriveApp.getFolderById(ID_CARPETA);
  console.log("2. Carpeta encontrada: " + carpeta.getName());

  // B. Intentar escribir un archivo simple
  // Si falla aquí, es un problema de permisos de escritura.
  const fecha = new Date().toLocaleString();
  const contenido = "Hola! Si lees esto, la conexión entre Apps Script y Drive es exitosa.\nFecha: " + fecha;
  
  const archivo = carpeta.createFile("Prueba_Conexion.txt", contenido);
  
  console.log("3. ¡ÉXITO! Archivo creado.");
  console.log("   URL: " + archivo.getUrl());
}