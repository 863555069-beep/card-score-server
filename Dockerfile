FROM node:18-alpine

# 抖音云 FaaS 运行时约定：
#   代码目录 /opt/application
#   入口脚本 /opt/application/run.sh
#   监听端口 8000
WORKDIR /opt/application

COPY index.js ./
COPY run.sh ./
COPY package.json ./

RUN chmod +x /opt/application/run.sh

ENV PORT=8000
EXPOSE 8000

CMD ["/bin/sh", "-c", "/opt/application/run.sh"]
