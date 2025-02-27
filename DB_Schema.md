Users

- id : uuid (primary key)
- name : string (nullable)
- email : string (required)
- profile_pic : string (nullable)
- created_at : timestamp (required)

Apps

- id : uuid (primary key)
- user_id : foreign key (users.id)
- sheet_id : string (nullable)
- script_id : string (nullable)
- kakao : {
  nickname: string (nullable)
  profile_image: string (nullable)
  token: string (nullable)
  message_count : integer (nullable)
  }

Subscriptions

- id : uuid (primary key)
- user_id : foreign key (users.id)
- subscriptions : string[] (nullable)
- friend_ids : string (nullable)
- created_at : timestamp (required)

friend_ids type as string
{
id : string (nullable)
uuid : string (nullable)
name : string (nullable)
account_id : string (nullable)
}
