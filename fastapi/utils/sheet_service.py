from google.oauth2 import service_account
from googleapiclient.discovery import build
import os

# google api
google_client_id = os.getenv("GOOGLE_CLIENT_ID")
google_client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
google_refresh_token = os.getenv("GOOGLE_REFRESH_TOKEN")

SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
]

creds = service_account.Credentials.from_service_account_file(
    '/app/secrets/google_service_account_secret.json', scopes=SCOPES
)


async def update_sheet(sheet_id: str, data: list[list[str]]):
    """
    Update a Google Sheet with the given data
    """
    service = build('sheets', 'v4', credentials=creds)
    service.spreadsheets().values().append(
        spreadsheetId=sheet_id,
        range="A1",
        valueInputOption="USER_ENTERED",
        insertDataOption="INSERT_ROWS",
        body={"values": data}
    ).execute()
