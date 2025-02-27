function onOpen() {
	const ui = SpreadsheetApp.getUi();

	// Check if user is logged in
	const user_id =
		PropertiesService.getScriptProperties().getProperty("user_id");

	if (!user_id) {
		ui.createMenu("GoodSheetLife")
			.addItem("Connect to GoodSheetLife", "setUpApp")
			.addToUi();
	} else {
		ui.createMenu("GoodSheetLife")
			.addItem("Add Friends", "addFriends")
			.addItem("Send Message/Memo", "sendMessage")
			.addItem("Send Upcoming Birthdays", "sendUpcomingBirthdays")
			.addItem("Subscribe to Upcoming Events", "subscribeToUpcomingEvents")
			.addItem("Trigger Manager", "showTriggerManager")
			.addSeparator()
			.addItem("My Dashboard", "openMyDashboard")
			.addToUi();
	}
}
