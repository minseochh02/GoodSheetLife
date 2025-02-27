UI BUTTONS

- Connect to GoodSheetLife
  -- Separator --
- My Page
- Add Friends
- Send Message/Memo
- Send Upcoming Birthdays
- Subscribe to Upcoming Events
- Schedule Management
  -- Separator --
- Sign Out

---

Connect to GoodSheetLife

- open goosl_vercel/login as modal

My Page

- open goosl_vercel/mypage as modal

Add Friends

- open goosl_vercel/subscriptions?[user_id] as modal

Send Message/Memo

- open a modal with a text input and recipient lists as toggle buttons

Send Upcoming Birthdays

- first convert lunar birthday to solar birthday
- then send a message to the user with the solar birthday

Subscribe to Upcoming Events

- open a sidebar with list of columns of dates

Schedule Management

- open a modal with list of scheduled messages

Sign Out

- open goosl_vercel/logout as modal

below are functions removed but might use them later

REASON: Moved to MyPage > Add Friends
/\*

getInviteStatus
retrieves the invite status of the user

returns
{
"user_id": "user_id",
"invite_status": [
{
"friend_id": "friend_id",
"name": "name",
"profile_pic": "profile_pic",
"status": 0 || 1 || 2
}
]
}
0 - not subscribed
1 - subscribed
2 - blocked

\*/

function getInviteStatus() {
let url = CONFIG.API_URL + "kakao/invite-status";

    // get user_id from script properties
    const user_id =
    	PropertiesService.getScriptProperties().getProperty("user_id");

    // get invite status
    const invite = UrlFetchApp.fetch(url + "?user_id=" + user_id, {
    	method: "GET",
    });

    return JSON.parse(invite.getContentText());

}
