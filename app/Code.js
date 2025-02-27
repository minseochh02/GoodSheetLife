function signUp() {
	const url = `https://minseochh02-goodsheet.hf.space/sign-up`;
	const response = UrlFetchApp.fetch(url);
	const data = JSON.parse(response.getContentText());
	const user_id = data.user_id;
	const scriptProperties = PropertiesService.getScriptProperties();
	scriptProperties.setProperty("user_id", user_id);
}

function openAddFriends() {
	const ui = SpreadsheetApp.getUi();
	// retrieve user_id
	const scriptProperties = PropertiesService.getScriptProperties();
	let user_id = scriptProperties.getProperty("user_id");

	// make a request to the server for a url to add friends
	let url = `${CONFIG.URL}kakao/add/${user_id}`;
	// show a copy and paste modal so the user can copy and paste to friends
	const html = HtmlService.createHtmlOutput(`
    <html>
    <body>
		<p>Copy and paste the following URL to your friends:</p>
		<p>${url}</p>
		<button onclick="google.script.host.close()">Close</button>
	</body>
	</html>
	`);
	ui.showModalDialog(html, "Add Friends");
}

function sendMessage() {
	const ui = SpreadsheetApp.getUi();
	const scriptProperties = PropertiesService.getScriptProperties();
	const user_id = scriptProperties.getProperty("user_id");

	if (!user_id) {
		ui.alert("Please connect to KakaoTalk first");
		return;
	}

	// Get friend names if available (from Friends sheet)
	const friendsSheet =
		SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Friends");
	let friendsList = [];
	if (friendsSheet) {
		const friendsData = friendsSheet.getDataRange().getValues();
		// Skip header row and create friend list
		for (let i = 1; i < friendsData.length; i++) {
			if (friendsData[i][0] && friendsData[i][1]) {
				friendsList.push({
					uuid: friendsData[i][1],
					name: friendsData[i][2],
				});
			}
		}
	}

	// Create input form
	const inputFormHtml = `
		<html>
			<head>
				${htmlStyle}
			</head>
			<body>
				<div class="container">
					<h2>Send KakaoTalk Message</h2>
					<form id="messageForm" onsubmit="handleSubmit(event)">
						<div class="form-group">
							<label for="message">Message:</label>
							<textarea id="message" name="message" required></textarea>
						</div>
						<div class="form-group">
							<label>Select Recipients:</label>
							<div class="friend-select" id="friendSelect">
								${friendsList
									.map(
										(friend) => `
									<div class="friend-option" data-uuid="${
										friend.uuid
									}" onclick="toggleSelection(this)">
										${friend.name} ${friend.uuid === "ALL" ? "(모두)" : ""}
									</div>
								`
									)
									.join("")}
							</div>
						</div>
						<div class="buttons">
							<button type="button" class="btn btn-secondary" onclick="google.script.host.close()">Cancel</button>
							<button type="submit" class="btn btn-primary">Preview & Send</button>
						</div>
					</form>
				</div>
				<script>
					let selectedFriends = new Set();

					function toggleSelection(element) {
						const uuid = element.dataset.uuid;

						// Handle "ALL" selection
						if (uuid === 'ALL') {
							if (!selectedFriends.has('ALL')) {
								// Clear all other selections
								selectedFriends.clear();
								document.querySelectorAll('.friend-option').forEach(el => {
									el.classList.remove('selected');
								});
								// Select ALL
								selectedFriends.add('ALL');
								element.classList.add('selected');
							} else {
								selectedFriends.delete('ALL');
								element.classList.remove('selected');
							}
							return;
						}

						// If ALL was selected, deselect it when selecting individual friends
						if (selectedFriends.has('ALL')) {
							selectedFriends.delete('ALL');
							document.querySelector('.friend-option[data-uuid="ALL"]').classList.remove('selected');
						}

						if (selectedFriends.has(uuid)) {
							selectedFriends.delete(uuid);
							element.classList.remove('selected');
						} else {
							selectedFriends.add(uuid);
							element.classList.add('selected');
						}
					}

					function handleSubmit(event) {
						event.preventDefault();
						const message = document.getElementById('message').value.trim();

						if (!message) {
							alert('Please enter a message');
							return;
						}

						if (selectedFriends.size === 0) {
							alert('Please select at least one recipient');
							return;
						}

						// If ALL is selected, collect all friend UUIDs
						let friendIds = Array.from(selectedFriends);
						if (selectedFriends.has('ALL')) {
							friendIds = Array.from(document.querySelectorAll('.friend-option'))
								.filter(el => el.dataset.uuid !== 'ALL')
								.map(el => el.dataset.uuid);
						}

						google.script.run
							.withSuccessHandler(google.script.host.close)
							.showMessageConfirmation({
								message: message,
								friendIds: friendIds
							});
					}
				</script>
			</body>
		</html>
	`;

	// Show input form
	const htmlOutput = HtmlService.createHtmlOutput(inputFormHtml)
		.setWidth(600)
		.setHeight(600);
	ui.showModalDialog(htmlOutput, "Send Message");
}

function showMessageConfirmation(formData) {
	const { message, friendIds } = formData;

	// Get friend names for display
	const friendsSheet =
		SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Friends");
	let friendNames = {};
	if (friendsSheet) {
		const friendsData = friendsSheet.getDataRange().getValues();
		friendsData.forEach((row) => {
			if (row[1] && row[2]) {
				friendNames[row[1]] = row[2];
			}
		});
	}

	const messageHtml = `
		<html>
			<head>
			${htmlStyle}
			</head>
			<body>
				<div class="summary">
					<h2>Message Sending Confirmation</h2>
					<div class="message-preview">
						<strong>Message to be sent:</strong><br>
						${message}
					</div>
					<p><strong>Total Recipients:</strong> ${friendIds.length}</p>
					<div class="recipients">
						<ul class="recipient-list">
							${friendIds
								.map(
									(id) => `
								<li>${friendNames[id] ? `${friendNames[id]}` : id}</li>
							`
								)
								.join("")}
						</ul>
					</div>
				</div>
				<div class="buttons">
					<button class="btn btn-secondary" onclick="google.script.host.close()">Cancel</button>
					<button class="btn btn-primary" onclick="google.script.run.withSuccessHandler(google.script.host.close).sendMessagesAfterConfirmation()">Send Messages</button>
				</div>
			</body>
		</html>
	`;

	// Store data for sending in script properties
	const scriptProperties = PropertiesService.getScriptProperties();
	scriptProperties.setProperty("pendingMessage", message);
	scriptProperties.setProperty("pendingFriendIds", JSON.stringify(friendIds));

	// Show confirmation dialog
	const htmlOutput = HtmlService.createHtmlOutput(messageHtml)
		.setWidth(500)
		.setHeight(400);
	SpreadsheetApp.getUi().showModalDialog(htmlOutput, "Confirm Message Sending");
}

function sendMessagesAfterConfirmation() {
	const ui = SpreadsheetApp.getUi();
	const scriptProperties = PropertiesService.getScriptProperties();

	// Retrieve stored data
	const message = scriptProperties.getProperty("pendingMessage");
	const friendIds = JSON.parse(
		scriptProperties.getProperty("pendingFriendIds")
	);
	const user_id = scriptProperties.getProperty("user_id");

	// Get Friends sheet for display name lookup
	const friendsSheet =
		SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Friends");
	const friendsData = friendsSheet.getDataRange().getValues();

	// Create UUID to name mapping for display purposes
	const uuidToName = {};
	friendsData.forEach((row) => {
		if (row[0] && row[1]) {
			uuidToName[row[0]] = row[1];
		}
	});

	let successCount = 0;
	let failCount = 0;
	let results = [];

	// Split friends into chunks of 5 (Kakao API limit)
	for (let i = 0; i < friendIds.length; i += 5) {
		const chunk = friendIds.slice(i, i + 5);
		const chunkDisplayNames = chunk.map((id) => uuidToName[id] || id);

		try {
			const url = `https://minseochh02-goodsheet.hf.space/send-message`;
			const response = UrlFetchApp.fetch(url, {
				method: "post",
				contentType: "application/json",
				payload: JSON.stringify({
					user_id: user_id,
					friend_ids: chunk,
					message: message,
				}),
			});

			const result = JSON.parse(response.getContentText());
			if (result.status_code === 200) {
				successCount += chunk.length;
				chunk.forEach((id, index) => {
					results.push({
						friendId: chunkDisplayNames[index],
						status: "Success",
					});
				});
			} else {
				failCount += chunk.length;
				chunk.forEach((id, index) => {
					results.push({
						friendId: chunkDisplayNames[index],
						status: "Failed - API Error",
					});
				});
			}
		} catch (e) {
			failCount += chunk.length;
			chunk.forEach((id, index) => {
				results.push({
					friendId: chunkDisplayNames[index],
					status: "Failed - Network Error",
				});
			});
		}

		// Add a small delay between batches to avoid rate limiting
		if (i + 5 < friendIds.length) {
			Utilities.sleep(1000);
		}
	}

	// Clear stored data
	scriptProperties.deleteProperty("pendingMessage");
	scriptProperties.deleteProperty("pendingFriendIds");

	// Create HTML results summary
	const htmlContent = `
		<html>
			<head>
				${htmlStyle}
			</head>
			<body>
				<div class="summary">
					<h2>Message Sending Results</h2>
					<p>Message: "${message}"</p>
					<p>Total Recipients: ${friendIds.length}</p>
					<p>Successful: <span class="success">${successCount}</span></p>
					<p>Failed: <span class="failed">${failCount}</span></p>
				</div>
				<table class="results">
					<tr>
						<th>Recipient</th>
						<th>Status</th>
					</tr>
					${results
						.map(
							(r) => `
						<tr>
							<td>${r.friendId}</td>
							<td class="${r.status === "Success" ? "success" : "failed"}">${r.status}</td>
						</tr>
					`
						)
						.join("")}
				</table>
			</body>
		</html>
	`;

	// Show HTML summary
	const htmlOutput = HtmlService.createHtmlOutput(htmlContent)
		.setWidth(600)
		.setHeight(400);

	ui.showModalDialog(htmlOutput, "Message Sending Results");
}

function signOut() {
	const ui = SpreadsheetApp.getUi();
	const scriptProperties = PropertiesService.getScriptProperties();
	const user_id = scriptProperties.getProperty("user_id");

	if (!user_id) {
		ui.alert("You are not currently signed in.");
		return;
	}

	// Show confirmation dialog
	const response = ui.alert(
		"Sign Out Confirmation",
		"Are you sure you want to sign out? This will unlink your KakaoTalk connection.",
		ui.ButtonSet.YES_NO
	);

	if (response !== ui.Button.YES) {
		return;
	}

	try {
		// Make request to backend to sign out
		const url = "https://minseochh02-goodsheet.hf.space/sign-out";
		const response = UrlFetchApp.fetch(url, {
			method: "post",
			contentType: "application/json",
			payload: JSON.stringify({
				user_id: user_id,
			}),
		});

		const result = JSON.parse(response.getContentText());

		if (result.status === "success") {
			// Clear all script properties
			scriptProperties.deleteProperty("user_id");

			// Clear Friends sheet if it exists
			const friendsSheet =
				SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Friends");
			if (friendsSheet) {
				friendsSheet.clear();
			}

			ui.alert(
				"Successfully signed out. You can reconnect to KakaoTalk using the Connect menu item."
			);
		} else {
			throw new Error("Failed to sign out");
		}
	} catch (error) {
		ui.alert(
			"Failed to sign out. Please try again later. Error: " + error.toString()
		);
	}
}

function sendMemo() {
	const ui = SpreadsheetApp.getUi();
	const scriptProperties = PropertiesService.getScriptProperties();
	const user_id = scriptProperties.getProperty("user_id");

	if (!user_id) {
		ui.alert("Please connect to KakaoTalk first");
		return;
	}

	const html = HtmlService.createHtmlOutput(`
		<html>
			<body>
				<script>
					function handleSubmit(event) {
						event.preventDefault();
						const memo = document.getElementById('memo').value.trim();
						google.script.run.withSuccessHandler(google.script.host.close).sendMemoAfterConfirmation({memo: memo});
					}
				</script>
				<h1>Send Memo</h1>
				<form id="memoForm" onsubmit="handleSubmit(event)">
					<input type="text" id="memo" placeholder="Enter memo">
					<button type="submit">Send</button>
					<button type="button" onclick="google.script.host.close()">Close</button>
				</form>
			</body>
		</html>
	`);
	ui.showModalDialog(html, "Send Memo");
}

function sendMemoAfterConfirmation(formData) {
	const { memo } = formData;
	const ui = SpreadsheetApp.getUi();
	const scriptProperties = PropertiesService.getScriptProperties();
	const user_id = scriptProperties.getProperty("user_id");

	if (!user_id) {
		ui.alert("Please connect to KakaoTalk first");
		return;
	}

	try {
		const url = "https://minseochh02-goodsheet.hf.space/send-memo";
		const response = UrlFetchApp.fetch(url, {
			method: "post",
			contentType: "application/json",
			payload: JSON.stringify({
				user_id: user_id,
				memo: memo,
			}),
		});
	} catch (e) {
		ui.alert("Failed to send memo: " + e.toString());
	}
}

function lunarToSolar() {
	const ui = SpreadsheetApp.getUi();
	const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("DB_기본");

	// Get the last row with data
	const lastRow = sheet.getLastRow();

	// Preserve header from column N if it exists
	const headerValue = lastRow >= 1 ? sheet.getRange("N1").getValue() : "";

	// Get data range excluding header (starting from row 2)
	let birthdates = sheet.getRange(2, 12, lastRow - 1, 2).getValues(); // 12 is column L

	const lunarDates = birthdates
		.filter((date) => date[1] === "음력")
		.map((date) => {
			if (date[0] instanceof Date) {
				const month = date[0].getMonth() + 1;
				const day = date[0].getDate();
				return `${month}/${day}`;
			}
			return null;
		})
		.filter((date) => date !== null);

	const url = "https://minseochh02-goodsheet.hf.space/lunar-to-solar";
	const response = UrlFetchApp.fetch(url, {
		method: "post",
		contentType: "application/json",
		payload: JSON.stringify({ lunar_dates: lunarDates }),
	});

	const result = JSON.parse(response.getContentText());

	// Process all dates (both lunar and solar)
	const processedBirthdates = birthdates.map((date) => {
		if (!date[0] || !(date[0] instanceof Date)) {
			return [""]; // Handle empty or invalid dates
		}

		if (date[1] === "음력") {
			// Get the converted solar date from results
			const index = lunarDates.findIndex((lunar) => {
				const month = date[0].getMonth() + 1;
				const day = date[0].getDate();
				return lunar === `${month}/${day}`;
			});
			return [result.solar_date[index]];
		} else if (date[1] === "양력") {
			// Format solar date as MM/DD
			const month = date[0].getMonth() + 1;
			const day = date[0].getDate();
			return [`${month}/${day}`];
		}
		return [""]; // Handle any other cases
	});

	// Create final data array with header
	const finalData = [[headerValue], ...processedBirthdates];

	// Write back to column N, including header
	sheet.getRange(1, 14, finalData.length, 1).setValues(finalData);

	ui.alert("Conversion complete");
}

function getUpcomingBirthdaysForMonth() {
	const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("DB_기본");

	// Get data from columns
	const data = sheet.getRange("A2:N").getValues(); // Start from row 2 to skip header

	// Get the current date
	const currentDate = new Date();
	const oneMonthFromNow = new Date(
		currentDate.getFullYear(),
		currentDate.getMonth() + 1,
		currentDate.getDate()
	);

	// Filter and format upcoming birthdays
	const upcomingBirthdays = data
		.filter((row) => {
			const upcomingDate = new Date(row[13]); // Column N
			return upcomingDate >= currentDate && upcomingDate <= oneMonthFromNow;
		})
		.map((row) => {
			const name = row[0]; // Column A
			const gender = row[1]; // Column B
			const actualBirthdate = row[11]; // Column L
			const calendarType = row[12]; // Column M
			const upcomingDate = new Date(row[13]); // Column N

			// Create honorific
			const honorific = gender === "남" ? "님" : "님";

			// Format the upcoming date
			const upcomingDateFormatted = Utilities.formatDate(
				upcomingDate,
				SpreadsheetApp.getActive().getSpreadsheetTimeZone(),
				"MM월 dd일"
			);

			// Format lunar date info if it exists and is lunar calendar
			let lunarInfo = "";
			try {
				if (calendarType === "음력") {
					const birthDate = new Date(actualBirthdate);
					const birthMonth = birthDate.getMonth() + 1;
					const birthDay = birthDate.getDate();
					lunarInfo = ` (음력: ${birthMonth}/${birthDay})`;
				}
			} catch (error) {
				console.error("Error processing date:", error);
				lunarInfo = "";
			}

			return {
				name: name + honorific,
				upcomingDate: upcomingDateFormatted,
				lunarInfo: lunarInfo,
			};
		})
		.sort((a, b) => new Date(a.upcomingDate) - new Date(b.upcomingDate));

	// Create the message
	let message = `📅 고객 생일 안내\n\n`;

	if (upcomingBirthdays.length === 0) {
		message += "이번 달은 생일자가 없습니다.";
	} else {
		upcomingBirthdays.forEach((birthday, index) => {
			message += `${index + 1}. ${birthday.name}\n`;
			message += `   ${birthday.upcomingDate}${birthday.lunarInfo}\n\n`;
		});
	}
	// send message to myself
	sendMemoAfterConfirmation({ memo: message });
}
