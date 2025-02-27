FROM python:3.10

WORKDIR /code

COPY ./requirements.txt /code/requirements.txt

RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Create Docker secret
RUN mkdir -p /app/secrets

# Use the Docker secret at build time to write it to a file
RUN --mount=type=secret,id=SUPABASE_URL,mode=0444,required=true \
    cat /run/secrets/SUPABASE_URL > /app/secrets/supabase_url.txt
    
RUN --mount=type=secret,id=SUPABASE_SERVICE_ROLE_KEY,mode=0444,required=true \
    cat /run/secrets/SUPABASE_SERVICE_ROLE_KEY > /app/secrets/supabase_service_role_key.txt

RUN --mount=type=secret,id=SUPABASE_ANON_KEY,mode=0444,required=true \
    cat /run/secrets/SUPABASE_ANON_KEY > /app/secrets/supabase_anon_key.txt

RUN --mount=type=secret,id=GOOGLE_SERVICE_ACCOUNT_SECRET,mode=0444,required=true \
    cat /run/secrets/GOOGLE_SERVICE_ACCOUNT_SECRET > /app/secrets/google_service_account_secret.json


# ENV GOOGLE_APPLICATION_CREDENTIALS="/app/secrets/google_service_account_secret.json"
ENV SUPABASE_URL="/app/secrets/supabase_url.txt"
ENV SUPABASE_SERVICE_ROLE_KEY="/app/secrets/supabase_service_role_key.txt"
ENV SUPABASE_ANON_KEY="/app/secrets/supabase_anon_key.txt"


COPY . .

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]