
FROM node:18-alpine AS builder

WORKDIR /app


COPY package.json package-lock.json* ./
RUN npm install


COPY dcr-js/package.json dcr-js/yarn.lock* dcr-js/
COPY dcr-js/app/package.json dcr-js/app/
COPY dcr-js/modeler/package.json dcr-js/modeler/
COPY dcr-js/dcr-engine/package.json dcr-js/dcr-engine/
WORKDIR /app/dcr-js
RUN yarn install --frozen-lockfile || yarn install
WORKDIR /app


COPY dcr-js/ dcr-js/
COPY src/ src/
COPY public/ public/
COPY tsconfig*.json vite.config.ts index.html ./


FROM python:3.11-alpine AS backend
WORKDIR /app
COPY bpmn2dcr-pycore/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY bpmn2dcr-pycore/ .


FROM node:18-alpine
RUN apk add --no-cache python3 py3-pip supervisor && \
    python3 -m venv /opt/venv

ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /app


COPY --from=builder /app /app

COPY --from=backend /app /app/backend


RUN cd /app/backend && /opt/venv/bin/pip install --no-cache-dir -r requirements.txt


RUN mkdir -p /etc/supervisor/conf.d && \
    cat > /etc/supervisor/conf.d/supervisord.conf << 'EOF'
[supervisord]
nodaemon=true
user=root

logfile=/var/log/supervisor/supervisord.log
pidfile=/var/run/supervisord.pid

[program:frontend]
command=npm run dev -- --host 0.0.0.0 --port 80
directory=/app
stdout_logfile=/var/log/supervisor/frontend.log
stderr_logfile=/var/log/supervisor/frontend.log
autorestart=true
priority=10

[program:backend]
command=/opt/venv/bin/python -m uvicorn server:app --host 0.0.0.0 --port 8000
directory=/app/backend
stdout_logfile=/var/log/supervisor/backend.log
stderr_logfile=/var/log/supervisor/backend.log
autorestart=true
priority=20
EOF

RUN mkdir -p /var/log/supervisor

EXPOSE 80 8000

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]