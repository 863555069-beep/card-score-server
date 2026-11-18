# 房间服务部署说明

服务端代码：`server/index.js`（零依赖 Node HTTP 服务，`node index.js` 即启动，监听 `process.env.PORT`）。

## 接口

| 方法 | 路径 | 入参 | 返回 |
|---|---|---|---|
| POST | `/api/createRoom` | `{ memberName }` | `{ roomId, room }` |
| POST | `/api/joinRoom` | `{ roomId, memberName }` | `{ room, me }` |
| POST | `/api/getRoom` | `{ roomId }` | `{ room }` |
| POST | `/api/transfer` | `{ roomId, from, to, amount }` | `{ room }` |
| GET | `/api/health` | – | `{ rooms: n }` |

金额单位是**分**（整数），与客户端 `calc.js` 一致。

房间结构：

```json
{
  "id": "15ef7991840c",
  "name": "房间 11/18",
  "status": "playing",
  "createdAt": 1794975790318,
  "members": [{ "id": "cc09ed6d", "name": "阿强" }],
  "entries": [
    { "type": "join", "from": "cc09ed6d", "ts": 1794975790319 },
    { "type": "transfer", "from": "a", "to": "b", "amount": 5000, "ts": 1794975790402 }
  ]
}
```

## 本地自测（已通过）

```powershell
$env:PORT=8099
node server/index.js
# 另一个窗口
curl -X POST http://127.0.0.1:8099/api/createRoom -H "content-type: application/json" -d '{"memberName":"Aqiang"}'
```

## 部署到抖音云（三选一）

### 方式 A：绑定 Git 仓库自动部署（推荐）

1. 把 `server/` 目录推到你自己的 GitHub/Gitee 仓库
2. 抖音云控制台 → 你的服务 → 部署配置 → 绑定仓库 + 分支
3. 点「部署」，完成后访问 `<默认域名>/api/health` 应返回 `{"ok":true,...}`

### 方式 B：控制台在线编辑

如果服务详情里有「代码编辑 / 在线 IDE」，直接把 `server/index.js` 的内容贴进去，启动命令填 `node index.js`，重新部署。

### 方式 C：把代码发我，我贴到你的仓库

你把仓库地址给我，我把文件内容整理成可直接提交的形式。

## 部署后要改的地方

1. 客户端 `utils/sync.js` 里 `BASE` 换成你的服务默认域名（当前已填 `1mkhhkjm7864v-env-xrDjwZ73C`）
2. 真机测试要在小程序后台把该域名加入 **request 合法域名**；开发者工具里 `urlCheck:false` 已关校验，可以直接调
3. 默认域名只支持测试（100 QPS），正式上线要绑定自定义域名

## 已知限制

- **存储是内存 Map**：服务重启（重新部署）后房间清空。要持久化，把 `rooms` 换成「文档型数据库」，5 个存取函数改完即可，其余代码不动。
- 没有鉴权：知道房间 id 就能读写。内测够用，上线前应加一个基于 `tt.login` 的 openid 校验。
