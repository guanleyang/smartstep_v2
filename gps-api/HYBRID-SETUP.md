# GPS / Wi-Fi / LTE 联调版

此变更同时包含 App、v2 Worker 和板子源程序。正式演示基线ZIP未修改。

## 必须先升级 Cloudflare

在现有 smartstep-gps-db 的 Console 执行 hybrid-schema.sql，创建新的 hybrid_locations 表。
旧 latest_locations 表保留，原来的位置不会自动复制。

将现有 Worker 编辑器代码替换为 gps-api/hybrid.mjs 全文并 Deploy。它是独立文件，无需导入其他文件。
DB绑定、ALLOWED_ORIGINS和DEVICE_CREDENTIALS保持原配置。新接口为 /v2/devices/shoe_001/location。
这份独立v2 Worker不兼容旧/v1请求，因此在烧录新版前，旧GPS程序的上传会返回404。
回退：恢复原Worker index.mjs和旧固件即可，旧表仍在。

## App

合并PR到用户副本 main 后按原GitHub Pages工作流发布。进入真实设备页面，使用原来的read凭证。
GPS有坐标：显示大幅地图、坐标和时间；没有速度/高度。
Wi-Fi：显示“GPS信号不稳定，采用室内定位”和命名地点；不伪造室内经纬度。
LTE：显示“预估位置”、坐标和按accuracy_m绘制的范围圆，数值按半径解释，参考模块服务精度字段。
实测CLBS返回550，不强制缩小为直径150米。该精度是估计，非保证边界。
无可用来源：显示暂无位置。过期/断网显示最后已知状态，不冒充实时。

## 板子

firmware/SmartHybrid：复制secrets.example.h为secrets.h，在本机填原上传凭证；不要提交真实凭证。
提供给用户的本地SmartHybrid.zip已包含上传凭证，不能公开。
GPS初始化沿用验证过的Cloud版；4G注册后开GPS，定位切换期间不关GPS或重启4G。
每个循环先尝试GPS，满足有效fix/PDOP/日期条件才上传GPS；否则扫描Wi-Fi，连续两次匹配同一已采集点才采用室内；否则尝试CLBS，再失败则上传unavailable。
模块CLBS字段顺序按这块A011B09A7670M7_F实测的纬度、经度解析，不是旧手册顺序。
当前为同步GPS/HTTP/CLBS循环，周期不是严格5秒；App每5秒读取，板子每轮结束等10秒。慢网络会延后扫描与查询，但不会关闭GPS。
首次无GPS时TLS有效期验证依赖模块网络时钟；若HTTPS失败需要核查CCLK与证书链，不能关闭证书验证。
本次首次统一集成后仍需室内外真实走测、Cloudflare部署和板上验证，不声称已有端到端成功。

## 模型

保留11个正式地点，不包含Gly‘s Room开发测试点。没有“两个地点之间”分类。
SS2 Stairs to天台后及Canteen B后预期进入室外；这里只根据实际有效GPS/Wi-Fi信号选择，不按路线硬编码假位置。
GPS优先是本轮用户新指定策略；室内若误得到有效但漂移GPS也可能被优先选中，实测后再校准质量门槛。

## 验证

node --test gps-api/api.test.mjs gps-api/hybrid.test.mjs
npm run build:pages
前端构建及9项接口测试通过；板子编译结果以本聊天最终报告为准。尚未升级用户云端、合并或发布App。
