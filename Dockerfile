FROM node:18-alpine

WORKDIR /app

# 零依赖：只需要这两个文件
COPY package.json ./
COPY index.js ./

ENV PORT=8080
EXPOSE 8080

CMD ["node", "index.js"]
