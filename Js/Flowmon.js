// 2025.12.31
const args = getArgs();
const urls = args.url ? args.url.split("@").map((u) => u.trim()).filter((u) => u) : [];
const titles = args.title ? args.title.split("@").map((t) => t.trim()) : [];
const timeout = args.timeout ? parseInt(args.timeout) : 3000;

function getArgs() {
  const result = {};
  if ($argument) {
    $argument.split("&").forEach((p) => {
      const index = p.indexOf("=");
      const key = p.substring(0, index);
      const value = p.substring(index + 1);
      result[key] = decodeURIComponent(value);
    });
  }
  return result;
}

function fetchUsage(url) {
  return new Promise((resolve) => {
    $httpClient.get(
      { url, headers: { "User-Agent": "clash.meta/v1.19.16" }, timeout },
      (err, resp) => {
        if (err) {
          resolve({ status: 0, error: err });
        } else {
          resolve(resp);
        }
      }
    );
  });
}

function parseUsage(headers) {
  const headerKey = Object.keys(headers).find(
    (k) => k.toLowerCase() === "subscription-userinfo"
  );
  if (!headerKey || !headers[headerKey]) return null;

  const data = {};
  headers[headerKey].split(";").forEach((p) => {
    const [k, v] = p.trim().split("=");
    if (k && v) data[k] = parseInt(v);
  });
  return data;
}

function formatBytes(bytes, fixed = 2) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let num = bytes;
  while (num >= 1024 && i < units.length - 1) {
    num /= 1024;
    i++;
  }
  return fixed === 0
    ? Math.floor(num) + units[i]
    : num.toFixed(fixed) + units[i];
}

function generateText(data, title) {
  if (!data) return "";
  const used = (data.upload || 0) + (data.download || 0);
  const total = data.total || 0;

  const percent = total > 0
    ? Math.floor((used / total) * 100)
    : 0;

  const lines = [];
  if (title) lines.push(`机场：${title} ${percent}%`);
  lines.push(`流量：${formatBytes(used)} ⇆ ${formatBytes(total,0)}`);

  if (data.expire) {
    const d = new Date(data.expire * 1000);
    lines.push(`到期：${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`);
  }

  return lines.join("\n");
}

(async () => {
  let texts = [];
  const icon = "antenna.radiowaves.left.and.right.circle.fill";
  let iconColor = "#00FF7F";

  if (!urls.length) {
    texts.push("未填写机场订阅");
    iconColor = "#FF3B30";
  } else {
    const results = await Promise.all(urls.map((u) => fetchUsage(u)));
    for (let i = 0; i < results.length; i++) {
      const r = results[i];

      if (!r || r.status !== 200) {
        if (r && r.error && r.error.includes("timeout")) {
          texts.push(`第${i + 1}个订阅请求超时：${timeout}ms`);
        } else if (r && r.status) {
          texts.push(`第${i + 1}个订阅请求失败HTTP：${r.status}`);
        }
        iconColor = "#FF3B30";
        continue;
      }

      const data = parseUsage(r.headers || {});
      const text = generateText(data, titles[i]);
      if (text) texts.push(text);
    }
  }

  $done({
    title: "订阅信息",
    content: texts.join("\n\n"),
    icon: icon,
    "icon-color": iconColor,
  });
})();
