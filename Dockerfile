# 多阶段构建的单容器部署
FROM node:18-alpine AS frontend-builder

# 构建主应用
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY src/ src/
COPY public/ public/
COPY tsconfig.json vite.config.ts index.html ./
RUN npm run build

# 构建DCR-js应用
WORKDIR /app/dcr-js
COPY dcr-js/package.json dcr-js/yarn.lock* ./
RUN yarn install --frozen-lockfile
COPY dcr-js/app ./app/
COPY dcr-js/modeler ./modeler/
COPY dcr-js/dcr-engine ./dcr-engine/
RUN yarn predeploy

# Python后端阶段
FROM python:3.11-alpine AS backend-builder

WORKDIR /app/backend
COPY bpmn2dcr-pycore/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY bpmn2dcr-pycore/ .

# 最终运行阶段
FROM nginx:alpine

# 安装Python和supervisor
RUN apk add --no-cache python3 py3-pip supervisor curl && \
    python3 -m venv /opt/venv && \
    /opt/venv/bin/pip install --upgrade pip

# 设置PATH使用虚拟环境
ENV PATH="/opt/venv/bin:$PATH"

# 复制前端构建文件
COPY --from=frontend-builder /app/dist /usr/share/nginx/html/
COPY --from=frontend-builder /app/dcr-js/app/build /usr/share/nginx/html/dcr/

# 复制Python后端并安装依赖
COPY --from=backend-builder /app/backend /app/backend
RUN cd /app/backend && /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

# 复制配置文件
COPY nginx.conf /etc/nginx/nginx.conf
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# 创建必要的目录和设置权限
RUN mkdir -p /var/log/supervisor /run/nginx && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d

# 暴露端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

# 使用supervisor启动所有服务
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]