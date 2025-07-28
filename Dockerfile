# 无nginx版本 - 使用Vite开发服务器
FROM node:18-alpine AS builder

WORKDIR /app

# 安装主应用依赖
COPY package.json package-lock.json* ./
RUN npm install

# 安装DCR-js依赖
COPY dcr-js/package.json dcr-js/yarn.lock* dcr-js/
COPY dcr-js/app/package.json dcr-js/app/
COPY dcr-js/modeler/package.json dcr-js/modeler/
COPY dcr-js/dcr-engine/package.json dcr-js/dcr-engine/
WORKDIR /app/dcr-js
RUN yarn install --frozen-lockfile || yarn install
WORKDIR /app

# 复制源代码
COPY dcr-js/ dcr-js/
COPY src/ src/
COPY public/ public/
COPY tsconfig*.json vite.config.ts index.html ./

# Python后端
FROM python:3.11-alpine AS backend
WORKDIR /app
COPY bpmn2dcr-pycore/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY bpmn2dcr-pycore/ .

# 运行阶段 - 使用Node.js运行前端，Python运行后端
FROM node:18-alpine
RUN apk add --no-cache python3 py3-pip supervisor && \
    python3 -m venv /opt/venv

ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /app

# 复制前端代码和依赖
COPY --from=builder /app /app
# 复制Python后端
COPY --from=backend /app /app/backend

# 安装Python依赖
RUN cd /app/backend && /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

# 创建supervisor配置目录和配置文件
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