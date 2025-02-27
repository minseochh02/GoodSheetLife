/*

setUpApp
creates appropriate folders
gets current sheet_id, user_id, script_id, and folders ids
returns to the /signup 

*/

function setUpApp() {
	// share with admin email goodsheet-service@goodsheet-450901.iam.gserviceaccount.com
	SpreadsheetApp.getActiveSpreadsheet().addEditor(
		"goodsheet-service@goodsheet-450901.iam.gserviceaccount.com"
	);

	// create FP Copilot Folder
	const fpCopilotFolder = DriveApp.createFolder("FP Copilot");
	// save it to properties
	PropertiesService.getScriptProperties().setProperty(
		"fpCopilotFolderId",
		fpCopilotFolder.getId()
	);

	// get current sheet_id, script_id
	const sheetId = SpreadsheetApp.getActiveSpreadsheet().getId();
	const scriptId = ScriptApp.getScriptId();
	const email = Session.getActiveUser().getEmail();
	// open the /signup page
	openPage(
		"signup?sheet_id=" + sheetId + "&script_id=" + scriptId + "&email=" + email
	);
}

/*
handleSetupSuccess
Handles the success message from the web app after setup is complete
Stores the necessary IDs in script properties and updates the UI
*/
function handleSetupSuccess(user_id, sheet_id, script_id) {
	const scriptProperties = PropertiesService.getScriptProperties();

	// Store the IDs
	scriptProperties.setProperty("user_id", user_id);
	scriptProperties.setProperty("sheet_id", sheet_id);
	scriptProperties.setProperty("script_id", script_id);

	// Update the UI menu
	const ui = SpreadsheetApp.getUi();
	ui.createMenu("GoodSheetLife")
		.addItem("Add Friends", "openAddFriends")
		.addItem("Send Message/Memo", "sendMessage")
		.addItem("Send Upcoming Birthdays", "sendUpcomingBirthdays")
		.addItem("Subscribe to Upcoming Events", "subscribeToUpcomingEvents")
		.addItem("Trigger Manager", "showTriggerManager")
		.addSeparator()
		.addItem("My Dashboard", "openMyDashboard")
		.addToUi();
}
