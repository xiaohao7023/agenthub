---
name: hermes-pair
description: 生成配对码，让手机APP连接到这个Hermes实例
version: 1.0.0
category: system
tags: [pairing, mobile, agenthub]
---

# Hermes 配对

将当前Hermes实例配对到手机APP，实现远程管理。

## 使用场景

当用户说以下任意一句话时，执行此skill：
- "配对"
- "连接手机"
- "生成配对码"
- "pair"
- "pairing"
- "connect to phone"

## 执行步骤

1. 运行Python脚本生成8位配对码
2. 向云端注册配对信息
3. 显示配对码给用户
4. 提示用户在手机APP中输入此码

## 命令

```bash
!python3 ${HERMES_SKILL_DIR}/scripts/pair.py
```

## 输出示例

```
🎉 配对码已生成！

配对码: ABC123XY

请在手机APP中输入此码完成配对。

提示：
- 配对码有效期：24小时
- 如需取消配对，请说"取消配对"
- 如需查看配对状态，请说"配对状态"
```

## 相关命令

- 取消配对：运行 `!python3 ${HERMES_SKILL_DIR}/scripts/unpair.py`
- 查看状态：运行 `!python3 ${HERMES_SKILL_DIR}/scripts/status.py`
- 启动守护进程：运行 `!python3 ${HERMES_SKILL_DIR}/scripts/daemon.py`

## 注意事项

- 首次配对需要用户在手机APP中输入配对码
- 配对成功后，Agent会自动向云端发送心跳
- 如果长时间没有心跳，Agent会被标记为离线
