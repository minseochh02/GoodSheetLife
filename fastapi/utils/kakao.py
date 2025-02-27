import os
import requests
import logging
from fastapi import HTTPException
from supabase import create_client
import json

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(supabase_url, supabase_key)

KAKAO_AUTH_URL = "https://kauth.kakao.com/oauth"
KAKAO_V1_API_URL = "https://kapi.kakao.com/v1"
KAKAO_V2_API_URL = "https://kapi.kakao.com/v2"
user_redirect_uri = "https://minseochh02-goodsheet.hf.space/auth/callback"
user_scope = "talk_message,friends,profile_nickname,profile_image"

subscriber_redirect_uri = "https://minseochh02-goodsheet.hf.space/auth/callback/subscription"
subscriber_scope = "profile_nickname,profile_image,talk_message"

kakao_client_id = os.getenv("KAKAO_CLIENT_ID")
kakao_admin_key = os.getenv("KAKAO_ADMIN_KEY")

async def get_kakao_token(code: str):
    """Get Kakao access token using authorization code"""
    # Exchange code for tokens
    url = f"{KAKAO_AUTH_URL}/token"
    data = {
        "grant_type": "authorization_code",
        "client_id": kakao_client_id,
        "redirect_uri": user_redirect_uri,
        "code": code
    }
    
    response = requests.post(url, data=data)
    response.raise_for_status()  # Raise an exception for bad status codes
    tokens = response.json()
    
    if "access_token" not in tokens or "refresh_token" not in tokens:
        raise HTTPException(status_code=400, detail="Failed to get access token")
    
    return tokens
        
async def get_kakao_subscriber_token(code: str):
    url = f"{KAKAO_AUTH_URL}/token"
    data = {
        "grant_type": "authorization_code",
        "client_id": kakao_client_id,
        "redirect_uri": subscriber_redirect_uri,
        "code": code
    }
    
    response = requests.post(url, data=data)
    response.raise_for_status()
    tokens = response.json()
    
    return tokens

async def unlink_kakao_account(token: str):
    url = f"{KAKAO_V1_API_URL}/user/unlink"
    headers = {
        "Authorization": f"Bearer {token}"
    }
    response = requests.post(url, headers=headers)
    response.raise_for_status()
    
    return response.json()



async def refresh_kakao_token(user_id: int, refresh_token: str):
    """Helper function to refresh Kakao access token"""

    url = "https://kauth.kakao.com/oauth/token"
    data = {
        "grant_type": "refresh_token",
        "client_id": kakao_client_id,
        "refresh_token": refresh_token
    }

    response = requests.post(url, data=data)
    
    if response.status_code != 200:
        logging.error(f"Token refresh failed with status {response.status_code}: {response.text}")
        raise HTTPException(status_code=401, detail="Failed to refresh token")
    
    tokens = response.json()
    logging.info("Successfully refreshed token")
    
    # Update tokens in database
    try:
        update_data = {
            "access_token": tokens["access_token"],
            **({"refresh_token": tokens["refresh_token"]} if "refresh_token" in tokens else {})
        }
        supabase.table("users").update(update_data).eq("id", user_id).execute()

    except Exception as e:
        logging.error(f"Failed to update tokens in database: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update tokens")
    
    return tokens["access_token"]

async def get_valid_kakao_token(user_id: int):
    """Get a valid Kakao access token, refreshing if necessary"""
    # Get current tokens
    try:
        result = supabase.table("users").select("*").eq("id", user_id).execute()
        
        if not result.data:
            logging.error(f"No user found for user_id: {user_id}")
            raise HTTPException(status_code=401, detail="User not found")
        
        tokens = result.data[0]
        if not tokens.get("access_token") or not tokens.get("refresh_token"):
            logging.error(f"Missing tokens for user_id: {user_id}")
            raise HTTPException(status_code=401, detail="No tokens found. Please reconnect to KakaoTalk")
        
        logging.info("Retrieved tokens from database")
    except Exception as e:
        logging.error(f"Error retrieving tokens from database: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve tokens")
    
    try:
        # Try to use current access token
        url = "https://kapi.kakao.com/v1/user/access_token_info"
        response = requests.get(url, headers={"Authorization": f"Bearer {tokens['access_token']}"})

        if response.status_code == 200:
            return tokens["access_token"]
        
        # If token is expired, try to refresh
        return await refresh_kakao_token(user_id, tokens["refresh_token"])
    except Exception as e:
        logging.error(f"Error validating/refreshing token: {str(e)}")
        raise HTTPException(status_code=401, detail="Failed to get valid token. Please reconnect to KakaoTalk")

async def get_kakao_user_info(access_token: str):
    """Get user information from Kakao API"""
    url = f"{KAKAO_V1_API_URL}/api/talk/profile"
    headers = {
        "Authorization": f"Bearer {access_token}",
    }
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    user_info = response.json()
    
    if 'nickName' not in user_info or 'profileImageURL' not in user_info:
        raise Exception("Profile information not available" + str(user_info))
    
    return user_info

async def get_kakao_subscriber_info(access_token: str, friend_id: int):
    url = f"{KAKAO_V2_API_URL}/user/me"
    header = {"Authorization": f"Bearer {access_token}"}
    response = requests.get(url, headers=header)
    response.raise_for_status()
    subscriber_info = response.json()
    return subscriber_info

async def get_kakao_friends(access_token: str):
    url = f"{KAKAO_V1_API_URL}/api/talk/friends"
    header = {"Authorization": f"Bearer {access_token}"}
    response = requests.get(url, headers=header)
    
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail="Failed to retrieve friends")

    result = response.json()
    friends_list = result.get("elements")
    logging.info("user's friends list: " + str(friends_list))
    
    # [{
        # "profile_nickname": "Hose Cha", 
        # "profile_thumbnail_image": "https://p.kakaocdn.net/th/talkp/wnbQcrCSzb/Tqbl47NjIgpWMGI7mMHUu1/ofbv3r_110x110_c.jpg", 
        # "allowed_msg": true, 
        # "id": 3927782780, 
        # "uuid": "yPnI_sf2xffD793p2-ve7d_q2vbH9cX0wPHCTg", 
        # "favorite": true
    # }, ....]
    return friends_list

async def send_kakao_message(access_token: str, friend_ids: list, message: str):
    url = f"{KAKAO_V1_API_URL}/api/talk/friends/message/default/send"
    header = {"Authorization": f"Bearer {access_token}"}
    payload = {
        'receiver_uuids': json.dumps(friend_ids),
        "template_object": json.dumps({
            "object_type": "text",
            "text": data.get("message", "No message provided"),
            "link": {
                "web_url": "https://www.google.co.kr/search?q=deep+learning&source=lnms&tbm=nws",
                "mobile_web_url": "https://www.google.co.kr/search?q=deep+learning&source=lnms&tbm=nws"
            },
            "button_title": "뉴스 보기"
        })
    }
    
    logging.info(f"Sending message with payload: {payload}")
    response = requests.post(url, headers=header, data=payload)
    logging.info(f"Message send response status: {response.status_code}")
    logging.info(f"Message send response body: {response.text}")
    return response.status_code

async def send_memo(access_token: str, user_id: int, memo: str):
    url = f"{KAKAO_V2_API_URL}/api/talk/memo/default/send"
    header = {"Authorization": f"Bearer {access_token}"}
    payload = {
        "template_object": json.dumps({
            "object_type": "text",
            "text": memo,
            "link": {
                "web_url": "https://developers.kakao.com",
                "mobile_web_url": "https://developers.kakao.com"
            },
            "button_title": "바로 확인"
        })
    }
    logging.info(f"Sending memo with payload: {payload}")
    response = requests.post(url, headers=header, data=payload)
    logging.info(f"Memo send response status: {response.status_code}")
    logging.info(f"Memo send response body: {response.text}")
    return response