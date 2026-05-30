const http = require('http');
const fs = require('fs');
const path = require('path');

// ─── Load .env ───────────────────────────────────────────
function loadEnv() {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) return;
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
        const match = line.match(/^\s*([^#=]+?)\s*=\s*(.*?)\s*$/);
        if (match && !process.env[match[1]]) {
            process.env[match[1]] = match[2];
        }
    }
}
loadEnv();

const PORT = Number(process.env.PORT || 3210);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 20);
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60000);

if (!OPENAI_API_KEY) {
    console.error('错误: 请在 .env 文件中设置 OPENAI_API_KEY');
    process.exit(1);
}

// ─── Rate Limiter (per IP) ───────────────────────────────
const rateLimitMap = new Map();

function isRateLimited(ip) {
    const now = Date.now();
    let record = rateLimitMap.get(ip);
    if (!record || now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
        record = { windowStart: now, count: 0 };
        rateLimitMap.set(ip, record);
    }
    record.count++;
    return record.count > RATE_LIMIT_MAX;
}

// Clean up expired entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of rateLimitMap) {
        if (now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
            rateLimitMap.delete(ip);
        }
    }
}, 300000);

// ─── Logger ──────────────────────────────────────────────
const LOGS_DIR = path.join(__dirname, 'logs');
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR);

function logChat(ip, message, reply) {
    const timestamp = new Date().toISOString();
    const logFile = path.join(LOGS_DIR, `chat-${timestamp.slice(0, 10)}.jsonl`);
    const entry = JSON.stringify({ timestamp, ip, message, reply });
    fs.appendFileSync(logFile, entry + '\n');
}

function logAccess(method, url, status, ip) {
    const timestamp = new Date().toISOString().slice(11, 19);
    console.log(`[${timestamp}] ${method} ${url} ${status} - ${ip}`);
}

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.mp4': 'video/mp4',
    '.svg': 'image/svg+xml'
};

const server = http.createServer(async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Chat API proxy
    if (req.method === 'POST' && req.url === '/api/chat') {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        // Rate limit check
        if (isRateLimited(ip)) {
            logAccess('POST', '/api/chat', 429, ip);
            res.writeHead(429, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: { message: '请求过于频繁，请稍后再试。' } }));
            return;
        }

        let body = '';
        for await (const chunk of req) body += chunk;

        try {
            const payload = JSON.parse(body);
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.text();
            logAccess('POST', '/api/chat', response.status, ip);

            // Log conversation for teaching analysis
            try {
                const parsed = JSON.parse(data);
                const userMsg = payload.messages?.filter(m => m.role === 'user').pop()?.content || '';
                const aiReply = parsed.choices?.[0]?.message?.content || '';
                logChat(ip, userMsg, aiReply);
            } catch {}

            res.writeHead(response.status, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(data);
        } catch (error) {
            logAccess('POST', '/api/chat', 500, ip);
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: { message: error.message } }));
        }
        return;
    }

    // Static file serving
    let filePath = req.url === '/' ? '/提出问题.html' : decodeURIComponent(req.url.split('?')[0]);
    filePath = path.join(__dirname, filePath);

    if (!fs.existsSync(filePath)) {
        logAccess(req.method, req.url, 404, req.socket.remoteAddress);
        res.writeHead(404);
        res.end('Not Found');
        return;
    }

    const ext = path.extname(filePath);
    const mime = MIME_TYPES[ext] || 'application/octet-stream';

    if (ext === '.mp4') {
        // Range request support for video
        const stat = fs.statSync(filePath);
        const range = req.headers.range;
        if (range) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${stat.size}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': end - start + 1,
                'Content-Type': mime
            });
            fs.createReadStream(filePath, { start, end }).pipe(res);
        } else {
            res.writeHead(200, { 'Content-Length': stat.size, 'Content-Type': mime });
            fs.createReadStream(filePath).pipe(res);
        }
    } else {
        const content = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': mime });
        res.end(content);
    }
});

server.listen(PORT, () => {
    console.log(`\n  K12 Physics Lab 服务已启动`);
    console.log(`  地址: http://localhost:${PORT}`);
    console.log(`  API Key: 已从 .env 加载`);
    console.log(`  频率限制: ${RATE_LIMIT_MAX} 次/${RATE_LIMIT_WINDOW_MS/1000}秒`);
    console.log(`  日志目录: ./logs/\n`);
});
