/*

getSubscribers
retrieves the subscribers of the user

returns
{
    "user_id": "user_id",
    "subscribers": [
        {
            "user_id": "user_id",
            "name": "name",
            "profile_pic": "profile_pic"
        }
    ]
}

*/

function getSubscribers() {
	// retrieve friend's list
	let url = CONFIG.API_URL + "kakao/subscribers";

	// get user_id from script properties
	const user_id =
		PropertiesService.getScriptProperties().getProperty("user_id");

	// get friends list
	const subscribers = UrlFetchApp.fetch(url + "?user_id=" + user_id, {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
		},
	});

	return JSON.parse(subscribers.getContentText());
}

/*

sendMessage
sends a message to the subscribers or the user

returns
{
    "status": "success" || "error"
    "error": "error message"
}

*/

function sendMessage(message, recipient) {
	let url = CONFIG.API_URL + "kakao/send-message";

	// get user_id from script properties
	const user_id =
		PropertiesService.getScriptProperties().getProperty("user_id");

	const payload = {
		user_id: user_id,
		message: message,
		recipient: recipient,
	};

	// send message
	const send = UrlFetchApp.fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		payload: JSON.stringify(payload),
	});

	return JSON.parse(send.getContentText());
}
