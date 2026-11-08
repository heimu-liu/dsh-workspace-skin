# DSH 项目

DeepSeek Harness 插件及相关项目统一放在 [`dsh/`](dsh/) 目录，每个项目独立维护。

```text
dsh/
└── workspace-skin/    暖纸与雾绿：竹影主题、余额与对话费用
```

## 暖纸与雾绿

[项目介绍](dsh/workspace-skin/README.md) · [安装与回退](dsh/workspace-skin/INSTALL.md) · [源码](dsh/workspace-skin/src/)

![界面预览，金额为离线测试数据](dsh/workspace-skin/artifacts/native-desktop.png)

开发命令在项目子目录中运行：

```sh
cd dsh/workspace-skin
npm ci
npm run build
npm run check
```

从旧版仓库更新时，本地开发加载项需改为 `dsh/workspace-skin/src/host.js` 的绝对路径。在项目子目录运行 `node scripts/print-install-patch.mjs` 可生成新路径；详见安装说明。
