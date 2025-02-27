// openMyPage
function openMyDashboard() {
	let user_id = PropertiesService.getScriptProperties().getProperty("user_id");
	if (!user_id) {
		openPage("signup");
	} else {
		openPage("dashboard?user_id=" + user_id);
	}
}

function openPage(endpoint) {
	const html = `
<!DOCTYPE html>
<html>
	<head>
		<base target="_top" />
		<style>
			html,
			body {
				margin: 0;
				padding: 0;
				height: 100%;
				width: 100%;
				overflow: hidden;
			}
			iframe {
				width: 100%;
				height: 100%;
				border: none;
			}
		</style>
	</head>
	<body>
		<script>
			// Listen for messages from the iframe
			window.addEventListener('message', function(event) {
				// Verify the origin
				if (event.origin !== '${CONFIG.URL.slice(0, -1)}') return;
				
				// Handle success message
				if (event.data && event.data.type === 'setup_success') {
					const { user_id, sheet_id, script_id } = event.data;
					google.script.run
						.withSuccessHandler(function() {
							// Close the dialog after successful setup
							google.script.host.close();
						})
						.withFailureHandler(function(error) {
							console.error('Setup error:', error);
						})
						.handleSetupSuccess(user_id, sheet_id, script_id);
				}
				// Handle Kakao success message
				if (event.data && event.data.type === 'kakao_success') {
					const { user_id } = event.data;
					google.script.run
						.withSuccessHandler(function() {
							// Close the dialog after successful Kakao setup
							// google.script.host.close();
						})
						.withFailureHandler(function(error) {
							console.error('Kakao setup error:', error);
						})
						.handleKakaoSuccess(user_id);
				}
			});
		</script>
		<iframe
			src="${CONFIG.URL}${endpoint}"
		></iframe>
	</body>
</html>
    `;
	const htmlOutput = HtmlService.createHtmlOutput(html)
		.setWidth(800)
		.setHeight(500);
	// open as modal
	SpreadsheetApp.getUi().showModalDialog(htmlOutput, "GoodSheetLife");
}

const CONFIG = {
	URL: "https://goodsheet-vercel.vercel.app/",
	API_URL: "https://goodsheet-vercel.vercel.app/api/",
};

function handleKakaoSuccess(user_id) {
	PropertiesService.getScriptProperties().setProperty("kakaotalk", "true");
	return true;
}
