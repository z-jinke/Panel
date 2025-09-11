const args = {};
$argument.split("&").forEach(p => {
  const index = p.indexOf("=");
  const key = p.substring(0, index);
  const value = p.substring(index + 1);
  args[key] = decodeURIComponent(value);
});

function fetchInfo(url) {
  return new Promise(resolve => {
    $httpClient.get({ url, headers: { "User-Agent": "Quantumult%20X/1.5.2" } }, (err, resp) => {
      if (err || !resp || resp.status !== 200) {
        resolve(`订阅请求失败，状态码：${resp ? resp.status : "请求错误"}`);
        return;
      }

      const data = {};
      const headerKey = Object.keys(resp.headers).find(k => k.toLowerCase() === "subscription-userinfo");
      resp.headers[headerKey].split(";").forEach(p => {
        const [k, v] = p.trim().split("=");
        if (k && v) data[k] = parseInt(v);
      });

      const used = (data.upload || 0) + (data.download || 0);
      const total = data.total || 0;
      const percent = total > 0 ? Math.round((used / total) * 100) : 0;

      const lines = [
        `已用：${percent}%`,
        `流量：${(used / 1024 / 1024 / 1024).toFixed(2)} GB｜${(total / 1024 / 1024 / 1024).toFixed(2)} GB`
      ];

      if (data.expire) {
        const d = new Date(data.expire * 1000);
        lines.push(`到期：${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}号`);
      }

      resolve(lines.join("\n"));
    });
  });
}

(async () => {
  const panels = [];

  for (let i = 1; i <= 5; i++) {
    const urlKey = `url${i}`;
    const titleKey = `title${i}`;
    if (args[urlKey]) {
      const content = await fetchInfo(args[urlKey]);
      panels.push(args[titleKey] ? `机场：${args[titleKey]}\n${content}` : content);
    }
  }

  $done({
    title: "订阅流量",
    content: panels.join("\n\n"),
    icon: "antenna.radiowaves.left.and.right.circle.fill",
    "icon-color": "#00E28F"
  });
})();
