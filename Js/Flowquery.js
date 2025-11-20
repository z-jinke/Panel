// 2025.11.20 23:33
// 处理外部参数
const args = {};
$argument.split("&").forEach(p => {
  const index = p.indexOf("=");
  const key = p.substring(0, index);
  const value = p.substring(index + 1);
  args[key] = decodeURIComponent(value);
});

// 计算重置日剩余天数
function getResetInfo(resetDay) {
  if (!resetDay) return "";
  const today = new Date();
  const nowDay = today.getDate();
  const nowMonth = today.getMonth();
  const nowYear = today.getFullYear();

  let resetDate;
  if (nowDay < resetDay) {
    resetDate = new Date(nowYear, nowMonth, resetDay);
  } else {
    resetDate = new Date(nowYear, nowMonth + 1, resetDay);
  }

  const diff = Math.ceil((resetDate - today) / (1000 * 60 * 60 * 24));
  return `重置：${diff}天`;
}

// 获取订阅流量信息
function fetchInfo(url, resetDay) {
  return new Promise(resolve => {
    $httpClient.get(
      { url, headers: { "User-Agent": "Quantumult%20X/1.5.2" } },
      (err, resp) => {

        // 处理请求失败
        if (err || !resp || resp.status !== 200) {
          resolve(`订阅请求失败，状态码：${resp ? resp.status : "请求错误"}`);
          return;
        }

        const data = {};

        // 读取流量信息字段
        const headerKey = Object.keys(resp.headers)
          .find(k => k.toLowerCase() === "subscription-userinfo");

        // 解析流量字段
        if (headerKey && resp.headers[headerKey]) {
          resp.headers[headerKey].split(";").forEach(p => {
            const [k, v] = p.trim().split("=");
            if (k && v) data[k] = parseInt(v);
          });
        }

        // 计算已用、总量
        const used = (data.upload || 0) + (data.download || 0);
        const total = data.total || 0;

        // 计算百分比
        const percent = total > 0 ? ((used / total) * 100).toFixed(2) : "0.00";

        // 流量转 GB
        const usedGB = (used / 1024 / 1024 / 1024).toFixed(2);
        const totalGB = (total / 1024 / 1024 / 1024).toFixed(2);

        // 生成展示文本
        const lines = [
          `已用：${percent}%`,
          `流量：${totalGB}GB ➟ ${usedGB}GB`
        ];

        // 加入到期时间
        if (data.expire) {
          const d = new Date(data.expire * 1000);
          lines.push(
            `到期：${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}号`
          );
        }

        // 加入重置信息
        if (resetDay) {
          lines.push(getResetInfo(resetDay));
        }

        resolve(lines.join("\n"));
      }
    );
  });
}

// 主流程：依次处理多个订阅
(async () => {
  const panels = [];

  for (let i = 1; i <= 10; i++) {
    const urlKey = `url${i}`;
    const titleKey = `title${i}`;
    const resetKey = `resetDay${i}`;

    // 若存在该订阅，开始获取
    if (args[urlKey]) {
      const content = await fetchInfo(
        args[urlKey],
        args[resetKey] ? parseInt(args[resetKey]) : null
      );

      // 添加标题或内容
      panels.push(
        args[titleKey]
          ? `机场：${args[titleKey]}\n${content}`
          : content
      );
    }
  }

  // 输出面板
  $done({
    title: "订阅流量",
    content: panels.join("\n\n"),
    icon: "antenna.radiowaves.left.and.right.circle.fill",
    "icon-color": "#00E28F"
  });
})();
