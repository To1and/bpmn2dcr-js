
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



RUN mkdir -p /etc/supervisor/conf.d /var/log/supervisor && \
    echo '[supervisord]' > /etc/supervisor/conf.d/supervisord.conf && \
    echo 'nodaemon=true' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'user=root' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'logfile=/var/log/supervisor/supervisord.log' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'pidfile=/var/run/supervisord.pid' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo '' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo '[program:frontend]' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'command=npm run dev -- --host 0.0.0.0 --port 80' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'directory=/app' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'stdout_logfile=/var/log/supervisor/frontend.log' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'stderr_logfile=/var/log/supervisor/frontend.log' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'autorestart=true' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'priority=10' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo '' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo '[program:backend]' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'command=/opt/venv/bin/python -m uvicorn server:app --host 0.0.0.0 --port 8000' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'directory=/app/backend' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'stdout_logfile=/var/log/supervisor/backend.log' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'stderr_logfile=/var/log/supervisor/backend.log' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'autorestart=true' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'priority=20' >> /etc/supervisor/conf.d/supervisord.conf

EXPOSE 80 8000

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]