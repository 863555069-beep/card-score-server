/**
 * 打牌记账 · 房间服务
 *
 * 部署方式：抖音云（容器），启动 `node index.js`，监听 PORT。
 * 接口前缀 /api/，与抖音云「授权访问路径 auto_deploy_add /api/*」对应。
 *
 * 存储：内存 Map（重启即清空）。要持久化，把 store 换成「文档型数据库」即可，
 *       其余代码不用动，因为都只通过下面这 5 个函数访问数据。
 */

const http = require('http')
const crypto = require('crypto')

// 抖音云 FaaS 运行时固定监听 8000
const PORT = process.env.PORT || 8000

// ---------- 内存存储 ----------
const rooms = new Map()

function newId(n) {
  return crypto.randomBytes(16).toString('hex').slice(0, n)
}

function createRoom(memberName) {
  const id = newId(12)
  const name = (memberName || '').trim() || '房主'
  const room = {
    id: id,
    name: '房间 ' + new Date().toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }),
    status: 'playing',
    createdAt: Date.now(),
    members: [{ id: newId(8), name: name }],
    entries: []
  }
  room.entries.push({ id: newId(8), ts: Date.now(), type: 'join', from: room.members[0].id })
  rooms.set(id, room)
  return room
}

function joinRoom(roomId, memberName) {
  const room = rooms.get(roomId)
  if (!room) return null
  const name = (memberName || '').trim() || '玩家'
  // 同名成员直接复用，避免重复加入产生重复头像
  const exist = room.members.filter(function (m) { return m.name === name })[0]
  if (exist) return room
  const id = newId(8)
  room.members.push({ id: id, name: name })
  room.entries.push({ id: newId(8), ts: Date.now(), type: 'join', from: id })
  return room
}

function getRoom(roomId) {
  return rooms.get(roomId) || null
}

function transfer(roomId, from, to, amount) {
  const room = rooms.get(roomId)
  if (!room) return null
  const amt = Math.round(Number(amount) || 0)
  if (amt <= 0) return room
  const okFrom = room.members.some(function (m) { return m.id === from })
  const okTo = room.members.some(function (m) { return m.id === to })
  if (!okFrom || !okTo) return room
  room.entries.push({
    id: newId(8),
    ts: Date.now(),
    type: 'transfer',
    from: from,
    to: to,
    amount: amt
  })
  return room
}

// ---------- HTTP ----------
function send(res, code, obj) {
  const body = JSON.stringify(obj)
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
  })
  res.end(body)
}

function readBody(req) {
  return new Promise(function (resolve) {
    let raw = ''
    req.on('data', function (c) {
      raw += c
      if (raw.length > 1e6) req.destroy()
    })
    req.on('end', function () {
      try {
        resolve(raw ? JSON.parse(raw) : {})
      } catch (e) {
        resolve({})
      }
    })
  })
}

const server = http.createServer(async function (req, res) {
  if (req.method === 'OPTIONS') {
    send(res, 200, { ok: true })
    return
  }

  const url = (req.url || '').split('?')[0]
  const action = url.replace(/^\/api\/?/, '').replace(/\/$/, '')

  if (req.method === 'GET' && (action === '' || action === 'health')) {
    send(res, 200, { ok: true, data: { rooms: rooms.size } })
    return
  }

  if (req.method !== 'POST') {
    send(res, 405, { ok: false, error: 'method-not-allowed' })
    return
  }

  const body = await readBody(req)

  try {
    if (action === 'createRoom') {
      const room = createRoom(body.memberName)
      send(res, 200, { ok: true, data: { roomId: room.id, room: room } })
      return
    }
    if (action === 'joinRoom') {
      const room = joinRoom(body.roomId, body.memberName)
      if (!room) {
        send(res, 404, { ok: false, error: 'room-not-found' })
        return
      }
      send(res, 200, { ok: true, data: { room: room, me: room.members[room.members.length - 1].id } })
      return
    }
    if (action === 'getRoom') {
      const room = getRoom(body.roomId)
      if (!room) {
        send(res, 404, { ok: false, error: 'room-not-found' })
        return
      }
      send(res, 200, { ok: true, data: { room: room } })
      return
    }
    if (action === 'transfer') {
      const room = transfer(body.roomId, body.from, body.to, body.amount)
      if (!room) {
        send(res, 404, { ok: false, error: 'room-not-found' })
        return
      }
      send(res, 200, { ok: true, data: { room: room } })
      return
    }
    send(res, 404, { ok: false, error: 'unknown-action:' + action })
  } catch (e) {
    send(res, 500, { ok: false, error: String(e && e.message) })
  }
})

server.listen(PORT, function () {
  console.log('[room-server] listening on ' + PORT)
})
