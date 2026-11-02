# SmartStep GPS + 4G 接入（第一版）

此版本不需要手机 BLE 网关：LILYGO → 4G HTTPS → Worker + D1 → GitHub Pages 网页。
原演示界面保留在“Open demo dashboard”，真实模式不展示模拟电池、安全区域或警报。
网页默认打开真实模式，尚未部署 API 时不会展示虚构位置。

## 云端部署

先安装 Node >=22.13 和项目依赖（npm ci），登录你自己的 Cloudflare 账号。
以下命令在仓库根目录运行；不要在原仓库部署。

1. `npx wrangler login`
2. `npx wrangler d1 create smartstep-gps`
3. 将返回的 database_id 填入 gps-api/wrangler.jsonc，核对 ALLOWED_ORIGINS。
   GitHub Pages origin 是 https://guanleyang.github.io（没有仓库路径）。
4. `npx wrangler d1 execute smartstep-gps --config gps-api/wrangler.jsonc --remote --file gps-api/schema.sql`
5. `npx wrangler secret put DEVICE_CREDENTIALS --config gps-api/wrangler.jsonc`
   交互输入 JSON：{"shoe_001":{"upload":"你的随机上传凭证","read":"另一个随机查看凭证"}}。
   两个凭证必须不同、各至少32字符，建议使用32字节密码学随机值的十六进制表示。
   不要把真实凭证提交 GitHub、写入前端构建变量或发到聊天中。
6. `npx wrangler deploy --config gps-api/wrangler.jsonc`

只保存每台设备最新一个位置，不保存轨迹。设备凭证按设备隔离；
网页示例登录不承担鉴权，API 独立核验查看凭证。
服务未配置、存储异常均拒绝访问。
正式多用户系统仍需用户身份、权限分配、凭证轮换和速率限制。

参考：[D1 入门](https://developers.cloudflare.com/d1/get-started/)、
[Worker 数据库 API](https://developers.cloudflare.com/d1/worker-api/)。

## 硬件上传约定

POST https://你的Worker域名/v1/devices/shoe_001/location

请求头：
- Content-Type: application/json
- Authorization: Bearer 上传凭证

请求 JSON（与现有 V5 字段兼容）：

```json
{
  "device_id": "shoe_001",
  "latitude": 1.354268,
  "longitude": 103.687622,
  "pdop": 1.39,
  "battery_percent": null
}
```

只有有 GPS fix 时上传，不用 0,0 代表丢失定位。
battery_percent 和 pdop 可省略或为 null，未知电池不会显示为模拟百分比。
可选 recorded_at 是 GPS fix 的 Unix 毫秒时间戳，须在服务器当前时间前120秒到后30秒内。
未提供时使用服务器接收时间，仅适合即时上传；不能拿积压数据重传冒充当前定位。
有 recorded_at 时，重复或乱序的旧 fix 不覆盖最新位置，响应 updated:false。
PDOP 不是米级精度。

200 表示请求有效，updated:true 才表示已更新；
400 数据错误，401 凭证错误，413 超过4KB，415 类型错误，503 服务未配置或暂不可用。
V5 上传代码尚未改动，需确认实际模块、HTTPS实现和源代码后再接入。

## 网页连接

合并分支后，按仓库已有 GitHub Pages 工作流构建。
已将 Vite 资源路径更改为 /smartstep_v2/，需在 GitHub Settings → Pages 启用 GitHub Actions。
网页填入 Worker 的 HTTPS origin、shoe_001、查看凭证，点击 Connect。
每10秒读取一次，超时10秒，超过120秒的定位显示为过期。
网络失败保留“最后已知位置”，不会标记为实时。
凭证不保存到 localStorage，刷新需要重新输入。
OpenStreetMap 提供地图瓦片；瓦片请求会包含所显示区域。

## 验证

`node --test gps-api/api.test.mjs`：接口鉴权、字段边界、空数据、写入/读取和旧记录保护。
`npm run build:pages`：网页构建。
本次开发环境无法下载 npm 依赖，网页构建尚未在本机验证，已附构建检查工作流，提交后需运行验证。
部署、真实4G上传、浏览器端到端联调均尚未完成。

