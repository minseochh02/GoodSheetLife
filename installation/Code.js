function onOpen(){
  let ui = SpreadsheetApp.getUi();
  ui.createMenu("test")
  .addSeparator()
  .addToUi();
}