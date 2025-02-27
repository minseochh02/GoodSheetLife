function subscribeToUpcomingEvents() {
	const dateColumns = findDateColumns();

	const template = HtmlService.createTemplateFromFile("Subscribe.html");
	template.dateColumns = dateColumns;

	const htmlOutput = template
		.evaluate()
		.setTitle("Subscribe to Event Notifications")
		.setWidth(300); // Sidebar width is fixed, so we only need to set title

	SpreadsheetApp.getUi().showSidebar(htmlOutput);
}

function getSheetColumns(sheetName) {
	const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
	if (!sheet) return [];

	const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
	return headers.filter((header) => header !== ""); // Remove empty headers
}

function generatePreview(sheetName, messageTemplate) {
	const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
	if (!sheet) return "Error: Sheet not found";

	// Get headers and a sample row
	const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
	const sampleRow = sheet
		.getRange(2, 1, 1, sheet.getLastColumn())
		.getValues()[0];

	// Replace placeholders with sample data
	let previewText = messageTemplate;
	headers.forEach((header, index) => {
		if (header) {
			const value = sampleRow[index];
			const formattedValue = formatValue(value);
			previewText = previewText.replace(
				new RegExp(`{${header}}`, "g"),
				formattedValue
			);
		}
	});

	return previewText;
}

function formatValue(value) {
	if (value instanceof Date) {
		return Utilities.formatDate(
			value,
			Session.getScriptTimeZone(),
			"MMM dd, yyyy"
		);
	}
	return value !== undefined && value !== null ? value.toString() : "";
}

function calculateTriggerDate(eventDate, timing) {
	const date = new Date(eventDate);

	// First calculate the target date based on timing
	switch (timing) {
		case "1-day":
			date.setDate(date.getDate() - 1);
			break;
		case "3-days":
			date.setDate(date.getDate() - 3);
			break;
		case "1-week":
			date.setDate(date.getDate() - 7);
			break;
		case "2-weeks":
			date.setDate(date.getDate() - 14);
			break;
		case "1-month":
			date.setMonth(date.getMonth() - 1);
			break;
	}

	// Set the time to 9:00 AM
	date.setHours(9, 0, 0, 0);

	// If this time has already passed today, move to the next day
	const now = new Date();
	if (date <= now) {
		date.setDate(date.getDate() + 1);
	}

	return date;
}

function processSubscription(selectedColumn, timing, messageTemplate) {
	// Set the script timezone to KST
	SpreadsheetApp.getActiveSpreadsheet().setSpreadsheetTimeZone("Asia/Seoul");

	// Create or get the Subscriptions sheet
	let subscriptionsSheet =
		SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Subscriptions");
	if (!subscriptionsSheet) {
		subscriptionsSheet =
			SpreadsheetApp.getActiveSpreadsheet().insertSheet("Subscriptions");
		subscriptionsSheet
			.getRange("A1:G1")
			.setValues([
				[
					"Created Date",
					"Sheet Name",
					"Date Column",
					"Timing",
					"Message Template",
					"Trigger IDs",
					"Status",
				],
			]);
	}

	// Get all dates from the selected column
	const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
		selectedColumn.sheetName
	);
	const columnData = sheet
		.getRange(2, selectedColumn.columnIndex, sheet.getLastRow() - 1, 1)
		.getValues();

	// Create triggers for each date
	const triggerIds = [];
	const now = new Date();

	columnData.forEach((row, rowIndex) => {
		const eventDate = row[0];
		if (!(eventDate instanceof Date) || isNaN(eventDate.getTime())) return;

		// Calculate when to trigger the notification
		const triggerDate = calculateTriggerDate(eventDate, timing);
		if (triggerDate <= now) return; // Skip past dates

		try {
			// Get all column values for this row to use in message template
			const rowData = sheet
				.getRange(rowIndex + 2, 1, 1, sheet.getLastColumn())
				.getValues()[0];
			const headers = sheet
				.getRange(1, 1, 1, sheet.getLastColumn())
				.getValues()[0];

			// Replace placeholders in message template
			let message = messageTemplate;
			headers.forEach((header, index) => {
				if (header) {
					const value = rowData[index];
					const formattedValue = formatValue(value);
					message = message.replace(
						new RegExp(`{${header}}`, "g"),
						formattedValue
					);
				}
			});

			// Create trigger
			const trigger = ScriptApp.newTrigger("executeEventNotification")
				.timeBased()
				.at(triggerDate)
				.create();

			// Store trigger ID and message
			const triggerId = trigger.getUniqueId();
			triggerIds.push(triggerId);

			// Store trigger information
			PropertiesService.getScriptProperties().setProperty(
				triggerId,
				JSON.stringify({
					message: message,
					eventDate: eventDate,
					triggerDate: triggerDate,
				})
			);
		} catch (e) {
			console.error("Failed to create trigger for date:", eventDate, e);
		}
	});

	// Add the new subscription with trigger IDs
	const newRow = [
		new Date(),
		selectedColumn.sheetName,
		selectedColumn.columnName,
		timing,
		messageTemplate,
		triggerIds.join(","),
		"ACTIVE",
	];
	subscriptionsSheet.appendRow(newRow);
}

function executeEventNotification(e) {
	const triggerId = e.triggerUid;
	const scriptProperties = PropertiesService.getScriptProperties();
	const triggerData = JSON.parse(scriptProperties.getProperty(triggerId));

	if (!triggerData) return;

	try {
		// Send the notification
		sendMemoAfterConfirmation({ memo: triggerData.message });

		// Clean up
		scriptProperties.deleteProperty(triggerId);

		// Update subscription status if all triggers for this subscription are complete
		const subscriptionsSheet =
			SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Subscriptions");
		if (subscriptionsSheet) {
			const data = subscriptionsSheet.getDataRange().getValues();
			const triggerIdsCol = 5; // Column F
			const statusCol = 6; // Column G

			for (let i = 1; i < data.length; i++) {
				const triggerIds = data[i][triggerIdsCol].split(",");
				if (triggerIds.includes(triggerId)) {
					const remainingTriggers = triggerIds.filter(
						(id) => id !== triggerId && scriptProperties.getProperty(id)
					);

					if (remainingTriggers.length === 0) {
						subscriptionsSheet
							.getRange(i + 1, statusCol + 1)
							.setValue("COMPLETED");
					}
					break;
				}
			}
		}
	} catch (e) {
		console.error("Failed to execute notification:", e);
	} finally {
		// Delete the trigger
		const triggers = ScriptApp.getProjectTriggers();
		const trigger = triggers.find((t) => t.getUniqueId() === triggerId);
		if (trigger) {
			ScriptApp.deleteTrigger(trigger);
		}
	}
}

function findDateColumns() {
	const sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
	const dateColumns = [];

	sheets.forEach((sheet) => {
		const dataRange = sheet.getDataRange();
		const values = dataRange.getValues();
		const headers = values[0];

		if (values.length > 1) {
			const formats = sheet
				.getRange(2, 1, 1, headers.length)
				.getNumberFormats()[0];

			headers.forEach((header, colIndex) => {
				const format = formats[colIndex];
				const isDateFormat =
					format &&
					(format.includes("dd") ||
						format.includes("mm") ||
						format.includes("yyyy") ||
						format.includes("yy") ||
						format.includes("m/d") ||
						format.includes("d/m"));

				const hasDateValues = values
					.slice(1, Math.min(5, values.length))
					.some((row) => {
						const value = row[colIndex];
						return value instanceof Date;
					});

				if (isDateFormat || hasDateValues) {
					dateColumns.push({
						sheetName: sheet.getName(),
						columnName: header,
						columnIndex: colIndex + 1,
					});
				}
			});
		}
	});

	return dateColumns;
}

function navigateToSheet(sheetName, columnIndex) {
	const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
	if (sheet) {
		sheet.activate();
		const lastRow = sheet.getLastRow();
		const range = sheet.getRange(1, columnIndex, lastRow, 1);
		sheet.setActiveRange(range);
	}
}

function showTriggerManager() {
	const template = HtmlService.createTemplateFromFile("TriggerManager.html");
	const htmlOutput = template
		.evaluate()
		.setTitle("Trigger Manager")
		.setWidth(400);

	SpreadsheetApp.getUi().showSidebar(htmlOutput);
}

function getTriggersList() {
	const subscriptionsSheet =
		SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Subscriptions");
	if (!subscriptionsSheet) return [];

	const data = subscriptionsSheet.getDataRange().getValues();
	if (data.length <= 1) return []; // Only headers

	return data
		.slice(1)
		.map((row, index) => ({
			rowIndex: index + 2, // +2 because index is 0-based and we skipped header
			sheetName: row[1],
			columnName: row[2],
			timing: row[3],
			status: row[6],
		}))
		.filter((trigger) => trigger.status === "ACTIVE");
}

function deleteTrigger(rowIndex) {
	const subscriptionsSheet =
		SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Subscriptions");
	if (!subscriptionsSheet) return false;

	// Get the trigger IDs from the row
	const triggerIds = subscriptionsSheet
		.getRange(rowIndex, 6)
		.getValue()
		.toString()
		.split(",");

	// Delete each trigger
	triggerIds.forEach((triggerId) => {
		// Delete from ScriptProperties
		PropertiesService.getScriptProperties().deleteProperty(triggerId);

		// Delete actual trigger
		const triggers = ScriptApp.getProjectTriggers();
		const trigger = triggers.find((t) => t.getUniqueId() === triggerId);
		if (trigger) {
			ScriptApp.deleteTrigger(trigger);
		}
	});

	// Update status to DELETED
	subscriptionsSheet.getRange(rowIndex, 7).setValue("DELETED");

	return true;
}
