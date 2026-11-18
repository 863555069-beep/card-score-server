#!/bin/sh
# 抖音云 FaaS 运行时入口：容器启动后执行 /opt/application/run.sh
exec node /opt/application/index.js
