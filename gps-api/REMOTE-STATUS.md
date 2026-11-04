# 远程状态

入口：App 首页 → 远程状态，也可点击桌面的 Device status 卡片。
在 Settings 中用设备 read 凭证连接，沿用现有接口和权限。

## 更新

1. Cloudflare → Workers & Pages → smartstep-gps → Edit code。
2. 用本目录 hybrid.mjs 的完整内容替换 Worker 代码并 Deploy。
3. 保留原有 DB 绑定、DEVICE_CREDENTIALS 和 ALLOWED_ORIGINS；无需新建表或更换凭证。
4. 烧录新版 firmware/SmartHybrid/SmartHybrid.ino，沿用自己的 secrets.h、天线、SIM 和板型。
5. 打开 https://guanleyang.github.io/smartstep_v2/，刷新后连接，进入远程状态。

旧版板子和旧版Worker仍能显示定位方式及服务器接收时间；新字段缺失时显示“未上报”。
板子及Worker两端都更新后，显示上报时运行时长、本轮Wi-Fi扫描数量、上一次上传状态码和错误。
有GPS定位时不扫描Wi-Fi，因此扫描数量为null，页面显示“未上报”。

## 数据含义

- battery_voltage_v：实测电池电压（V），可缺省或null，范围0–6。
- battery_percent：电量百分比，可缺省或null，范围0–100。
- 当前固件尚未接入电池测量，电池数据保持未上报。电池槽有电池不代表程序已经能测电量。
- received_at：服务器收到最近一次上报的时间（Unix毫秒）。
- recorded_at：位置采样时间；Wi-Fi/LTE无设备时间时由服务器填充。
- diagnostics.uptime_ms：生成本次上报时的运行毫秒数，约49.7天回绕，非实时心跳。
- diagnostics.wifi_scan_count：本轮扫描到的热点数量，未扫描或扫描失败时null。
- diagnostics.previous_upload_http：此前一次上传的HTTP/模块状态码，尚无状态码时null。
- diagnostics.previous_upload_error：此前一次上传错误代码，正常或尚未尝试时null。

错误仅传固定代码，不传AT原始流量或凭证。支持upload_config、lte_unregistered、clock_unavailable、tls_setup、http_init、http_transfer、http_timeout、http_status。

正在传输的数据无法包含本次传输的结果，所以页面明确显示“上一次上传”。断网期间无法上报；恢复后下一次成功上报可带回此前失败结果，再次成功后错误会清空。本页不是完整历史日志，重启也会清空板子端此前的结果。

页面请求结束后约2秒再读取；手动刷新只读取服务器缓存的最近上报，不会命令板子立即采样。超过2分钟无新数据会显示最后已知数据和过期提示，无法仅凭此区分关机、断网或上传阻塞。

定位顺序保持GPS → Wi-Fi → LTE，GNSS持续开启。

室内位置支持wifi_status=confirmed/held以及wifi_age_ms。服务端生成wifi_confirmed_at；保留上次位置不会因心跳而把确认时间刷新为当前时间。超过两分钟后仍会标记过期。
