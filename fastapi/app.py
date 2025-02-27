from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from google.oauth2 import service_account
from googleapiclient.discovery import build
import logging
from supabase import create_client
import os 
import requests
from fastapi.responses import RedirectResponse, JSONResponse, HTMLResponse
from fastapi import Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.templating import Jinja2Templates
from pathlib import Path
from static.lunar_converter import lunar_converter
from utils import *
# Configure logging
logging.basicConfig(level=logging.INFO)

# Initialize FastAPI app
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(supabase_url, supabase_key)


@app.get("/sign-up")
async def sign_up(request: Request):
    # create new user
    user = supabase.table("users").insert({}).execute()
    return {"user_id": user.data[0]["id"]}

@app.get("/authorize")
async def url_handler(request: Request):
    user_id = request.query_params.get("user_id")
    url = f"{KAKAO_AUTH_URL}/authorize?client_id={kakao_client_id}&redirect_uri={user_redirect_uri}&response_type=code&scope={user_scope}&state={user_id}"
    return {"authorization_url": url}

@app.get("/auth/callback")
async def token(request: Request):
    # Get code from query parameters
    code = request.query_params.get("code")
    user_id = request.query_params.get("state")
    
    if not code or not user_id:
        return JSONResponse(
            status_code=400,
            content={"error": "Authorization code and user_id are both required"}
        )
    
    try:
        tokens = await get_kakao_token(code)
            
        user_info = await get_kakao_user_info(tokens["access_token"])
        name = user_info['nickName']
        profile_pic = user_info['profileImageURL']
        
        # fetch user's friend list
        friend_list = await get_kakao_friends(tokens["access_token"])
        
        try:
            supabase.table("apps").update({
                "kakao": {
                    "nickname": name,
                    "profile_image": profile_pic,
                    "token": tokens["access_token"],
                    "message_count": 0
                }
            }).eq("user_id", user_id).execute()
            
            supabase.table("subscriptions").insert({
                "user_id": user_id,
                "friend_ids": [],
                "subscriptions": [],  # Initialize as empty array
                "friend_ids": friend_list
            }).execute()
            
        except Exception as e:
            logging.error(f"Failed to create subscription or update user: {str(e)}")
            return JSONResponse(
                status_code=500,
                content={"error": f"Failed to create subscription: {str(e)}"}
            )
            
    except requests.exceptions.RequestException as e:
        logging.error(f"Failed to exchange code for tokens: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to exchange code for tokens: {str(e)}"}
        )
    except ValueError:
        return JSONResponse(
            status_code=400,
            content={"error": "Invalid state parameter format"}
        )
    except Exception as e:
        logging.error(f"Failed to process login: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to process login: {str(e)}"}
        )
    
    # redirect to dashboard
    return RedirectResponse(url=f"https://goodsheet-vercel.vercel.app/kakao/success?user_id={user_id}")

 
@app.post("/send-message")
async def send_message(request: Request):
    data = await request.json()
    user_id = data["user_id"]
    friend_ids = data.get("friend_ids", [])
    
    if not friend_ids:
        raise HTTPException(status_code=400, detail="No friend IDs provided")
    
    if len(friend_ids) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 friends allowed per request")
    
    try:
        access_token = await get_valid_kakao_token(user_id)
        
        response = await send_kakao_message(access_token, friend_ids, data["message"])
        
        if response.status_code != 200:
            logging.error(f"Failed to send message: {response.status_code} - {response.text}")
            raise HTTPException(status_code=response.status_code, detail=f"Failed to send message: {response.text}")
            
        return {"status_code": response.status_code}
    except HTTPException as e:
        logging.error(f"HTTP Exception in send_message: {str(e)}")
        raise e
    except Exception as e:
        logging.error(f"Unexpected error in send_message: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send message: {str(e)}")
    
@app.post("/send-memo")
async def send_memo(request: Request):
    """
    """
    data = await request.json()
    user_id = data["user_id"]
    memo = data["memo"]
    logging.info(f"Sending memo for user_id: {user_id} with memo: {memo}")
    
    if not user_id or not memo:
        raise HTTPException(status_code=400, detail="User ID and memo are required")
    
    # get user's token from supabase
    
    try:
        access_token = await get_valid_kakao_token(user_id)
        response = await send_memo(access_token, user_id, memo)
        return {"status_code": response.status_code}
    except HTTPException as e:
        raise e
    except Exception as e:
        logging.error(f"Unexpected error in send_memo: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send memo: {str(e)}")
    

@app.get("/authorize-subscription")
async def friend_authorize(request: Request):
    user_id = request.query_params.get("user_id")
    # Use state parameter with 'friend' prefix to indicate friend addition flow
    url = f"{KAKAO_AUTH_URL}/authorize?client_id={kakao_client_id}&redirect_uri={subscriber_redirect_uri}&response_type=code&scope={subscriber_scope}&state={user_id}"
    return {"authorization_url": url}
    

@app.get("/auth/callback/subscription")
async def subscription_callback(request: Request):
    code = request.query_params.get("code")
    channel_user_id = request.query_params.get("state") # a user id of which the current subscriber is agreeing to subscribe to
    
    if not code or not channel_user_id:
        raise HTTPException(status_code=400, detail=f"Missing required parameters: code={code}, channel_user_id={channel_user_id}")
    
    try:
        
        tokens = await get_kakao_subscriber_token(code)
        # Get subscriber information using GET method
        subscriber_user_info = await get_kakao_subscriber_info(tokens["access_token"], subscription_id)
        subscriber_user_id = subscriber_user_info["id"]
        
        # find the subscription data using subscription_id as foreign key
        subscription_result = supabase.table("subscriptions").select("*").eq("user_id", subscription_id).execute()
        # convert the string back to json array
        current_subscriptions = json.loads(subscription_result.data[0]["friend_ids"])

        # convert string back to json array
        current_subscriptions = json.loads(subscription_result.data[0]["friend_ids"])
        if current_subscriptions is None:
            raise HTTPException(status_code=400, detail="No subscriptions found")
        existing_subscription = None
        for subscription in current_subscriptions:
            # Compare the Kakao ID with the ID in the subscription
            if subscription.get("id") == user_id:
                existing_subscription = subscription
                break
        if existing_subscription:
            # add the new friend id to the current_subscriptions
            friend_id = existing_subscription.get("id")
            friend_name = existing_subscription.get("profile_nickname")
            friend_profile_pic = existing_subscription.get("profile_thumbnail_image")
            current_subscriptions.append(friend_id)
            
            # Only update if we actually added something
            supabase.table("subscriptions").update({
                "subscriptions": current_subscriptions
            }).eq("user_id", subscription_id).execute()
            
            #  update user's sheet with new friend info via matching account id
            user_sheet = supabase.table("apps").select("*").eq("user_id", subscription_id).execute()
            user_sheet_id = user_sheet.data[0]["sheet_id"]
            
            # update sheet
            await update_sheet(user_sheet_id, [[friend_id, friend_name, friend_profile_pic]])
    except Exception as e:
        # Add proper error logging
        print(f"Error in subscription callback: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing subscription: {str(e)}")         
        
    return RedirectResponse(url=f"https://goodsheet-vercel.vercel.app/kakao/add/success?user_id={subscription_id}")
   
    

@app.post("/sign-out")
async def sign_out(request: Request):
    data = await request.json()
    user_id = data["user_id"]
    
    try:
        # First check if user exists and get token
        access_token = await get_valid_kakao_token(user_id)
        
        await unlink_kakao_account(access_token)
        
        # Only delete from Supabase if unlink succeeded
        supabase.table("users").delete().eq("id", user_id).execute()
        
        return {"status": "success"}
    except HTTPException as e:
        # If user doesn't exist, return success anyway since they're effectively signed out
        if e.status_code == 401 and "User not found" in str(e.detail):
            return {"status": "success", "message": "User already removed"}
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    
@app.post("/lunar-to-solar")
async def lunar_to_solar(request: Request):
    data = await request.json()
    lunar_date = data["lunar_dates"]
    logging.info(f"Converting lunar date: {lunar_date} to solar date")
    
    converted_date = []
    for date in lunar_date:
        converted_date.append(lunar_converter[date])
    logging.info(f"Converted lunar date: {lunar_date} to solar date: {converted_date}")
    return {"solar_date": converted_date}


    
