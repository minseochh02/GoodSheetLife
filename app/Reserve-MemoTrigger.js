// function createMemoTrigger(triggerDate, memo) {
// 	// Create or get the Triggers sheet
// 	let triggersSheet =
// 		SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Triggers");
// 	if (!triggersSheet) {
// 		triggersSheet =
// 			SpreadsheetApp.getActiveSpreadsheet().insertSheet("Triggers");
// 		triggersSheet
// 			.getRange("A1:E1")
// 			.setValues([
// 				["Trigger ID", "Memo", "Trigger Date", "Status", "Created Date"],
// 			]);
// 	}

// 	// Create a time-based trigger
// 	const trigger = ScriptApp.newTrigger("executeMemoTrigger")
// 		.timeBased()
// 		.at(triggerDate)
// 		.create();

// 	// Add trigger information to sheet
// 	triggersSheet.appendRow([
// 		trigger.getUniqueId(),
// 		memo,
// 		triggerDate,
// 		"PENDING",
// 		new Date(),
// 	]);

// 	return trigger.getUniqueId();
// }

// function executeMemoTrigger() {
// 	const triggersSheet =
// 		SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Triggers");
// 	if (!triggersSheet) return;

// 	const now = new Date();
// 	const data = triggersSheet.getDataRange().getValues();
// 	const headers = data[0];

// 	// Find column indices
// 	const idCol = headers.indexOf("Trigger ID");
// 	const memoCol = headers.indexOf("Memo");
// 	const dateCol = headers.indexOf("Trigger Date");
// 	const statusCol = headers.indexOf("Status");

// 	// Process each trigger
// 	for (let i = 1; i < data.length; i++) {
// 		const row = data[i];
// 		const triggerDate = new Date(row[dateCol]);
// 		const status = row[statusCol];

// 		// Check if trigger should be executed
// 		if (status === "PENDING" && triggerDate <= now) {
// 			const memo = row[memoCol];
// 			const triggerId = row[idCol];

// 			try {
// 				// Send the memo
// 				sendMemoAfterConfirmation({ memo: memo });

// 				// Update trigger status
// 				triggersSheet.getRange(i + 1, statusCol + 1).setValue("COMPLETED");

// 				// Delete the time-based trigger
// 				const triggers = ScriptApp.getProjectTriggers();
// 				const trigger = triggers.find((t) => t.getUniqueId() === triggerId);
// 				if (trigger) {
// 					ScriptApp.deleteTrigger(trigger);
// 				}
// 			} catch (e) {
// 				console.error("Failed to execute trigger:", e);
// 				triggersSheet.getRange(i + 1, statusCol + 1).setValue("FAILED");
// 			}
// 		}
// 	}
// }

// function showTriggerBuilder() {
// 	const html = HtmlService.createHtmlOutput(`
// 		<html>
// 			<head>
// 				<style>
// 					body {
// 						font-family: Arial, sans-serif;
// 						padding: 20px;
// 					}
// 					.form-group {
// 						margin-bottom: 15px;
// 					}
// 					label {
// 						display: block;
// 						margin-bottom: 5px;
// 					}
// 					input, textarea {
// 						width: 100%;
// 						padding: 8px;
// 						margin-bottom: 10px;
// 						border: 1px solid #ddd;
// 						border-radius: 4px;
// 					}
// 					button {
// 						background: #4285f4;
// 						color: white;
// 						border: none;
// 						padding: 10px 20px;
// 						border-radius: 4px;
// 						cursor: pointer;
// 					}
// 					button:hover {
// 						background: #357abd;
// 					}
// 				</style>
// 			</head>
// 			<body>
// 				<h2>Schedule Memo</h2>
// 				<form id="triggerForm" onsubmit="handleSubmit(event)">
// 					<div class="form-group">
// 						<label for="memo">Memo Message:</label>
// 						<textarea id="memo" required></textarea>
// 					</div>
// 					<div class="form-group">
// 						<label for="triggerDate">Trigger Date and Time:</label>
// 						<input type="datetime-local" id="triggerDate" required>
// 					</div>
// 					<button type="submit">Schedule Memo</button>
// 				</form>

// 				<script>
// 					function handleSubmit(event) {
// 						event.preventDefault();
// 						const memo = document.getElementById('memo').value;
// 						const triggerDate = new Date(document.getElementById('triggerDate').value);

// 						google.script.run
// 							.withSuccessHandler(() => {
// 								alert('Memo scheduled successfully!');
// 								google.script.host.close();
// 							})
// 							.withFailureHandler((error) => {
// 								alert('Failed to schedule memo: ' + error);
// 							})
// 							.createMemoTrigger(triggerDate, memo);
// 					}
// 				</script>
// 			</body>
// 		</html>
// 	`);

// 	SpreadsheetApp.getUi().showModalDialog(html, "Schedule Memo");
// }
