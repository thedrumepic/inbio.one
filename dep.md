# Финальный план деплоя (Hetzner 2 vCPU, 4 GB RAM)

## 1. Сводный .env (Список всех переменных)
Создайте файл `.env` и заполните его перед запуском:

```env
# Database Credentials
MONGO_USER=admin
MONGO_PASSWORD=ВАШ_СЛОЖНЫЙ_ПАРОЛЬ_БД

# Security & Sessions
JWT_SECRET_KEY=СЛУЧАЙНЫЙ_ДЛИННЫЙ_КЛЮЧ

# Google OAuth 2.0 (КРИТИЧЕСКИ ВАЖНО)
GOOGLE_CLIENT_ID=ваш_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=ВАШ_СЕКРЕТ_GOOGLE

# Telegram Bots (Раздельные токены)
TELEGRAM_BOT_TOKEN=ТОКЕН_БОТА_ДЛЯ_ЛИДОВ
SUPPORT_BOT_TOKEN=ТОКЕН_БОТА_ПОДДЕРЖКИ
SUPPORT_OPERATOR_ID=ВАШ_ID_ЦИФРАМИ

# Third-party APIs
RESEND_API_KEY=re_ваш_ключ_почты
OWNER_EMAIL=ваш@email.com
BASE_URL=https://inbio.one
```

---

## 2. Итоговые конфигурации

### [Dockerfile Backend](file:///c:/Users/Rustem/Downloads/inbio/inbio.v2/code/backend/Dockerfile)
Включена поддержка Pillow и прокси-заголовков.
```dockerfile
FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libjpeg-dev zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN mkdir -p uploads/avatars uploads/covers uploads/logo uploads/favs uploads/files/og-preview
EXPOSE 8000
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"]
```

### [docker-compose.yml](file:///c:/Users/Rustem/Downloads/inbio/inbio.v2/code/docker-compose.yml)
Оптимизирован под железо Hetzner (Memory Limits).
```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:6.0
    container_name: inbio-db
    restart: always
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_USER}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    volumes:
      - mongodb_data:/data/db
    deploy:
      resources:
        limits:
          memory: 1G
    networks:
      - inbio-net

  backend:
    build: ./backend
    container_name: inbio-backend
    restart: always
    environment:
      - MONGO_URL=mongodb://${MONGO_USER}:${MONGO_PASSWORD}@mongodb:27017/inbio?authSource=admin
      - USE_MOCK_DB=false
      - JWT_SECRET_KEY=${JWT_SECRET_KEY}
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - SUPPORT_BOT_TOKEN=${SUPPORT_BOT_TOKEN}
      - SUPPORT_OPERATOR_ID=${SUPPORT_OPERATOR_ID}
      - RESEND_API_KEY=${RESEND_API_KEY}
      - OWNER_EMAIL=${OWNER_EMAIL}
    depends_on:
      - mongodb
    networks:
      - inbio-net
    volumes:
      - ./backend/uploads:/app/uploads

  frontend:
    build:
      context: ./frontend
      args:
        - REACT_APP_GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
    container_name: inbio-frontend
    restart: always
    networks:
      - inbio-net

  caddy:
    image: caddy:2-alpine
    container_name: inbio-caddy
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - frontend
      - backend
    networks:
      - inbio-net

networks:
  inbio-net:
    driver: bridge

volumes:
  mongodb_data:
  caddy_data:
  caddy_config:
```

---

## 3. Команда финального запуска

```bash
docker-compose down && docker-compose up -d --build --remove-orphans
```

---
**Status**: Все системы синхронизированы. Синтаксис Caddy проверен. Google OAuth защищен.
