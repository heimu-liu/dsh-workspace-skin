# 安装与回退

支持已验证的 DSH 0.2.2-rc.1。本项目同时提供 Host 与客户端插件；仅加载 CSS 无法显示余额与费用。

## 本地源码加载

1. 克隆仓库，进入 `dsh/workspace-skin` 子目录，执行 `npm ci` 与 `npm run build`。
2. 退出 DSH，备份当前 profile 的 `cordis.patch.yml`。macOS 桌面默认在 `~/.dsh/profiles/desktop/cordis.patch.yml`。
3. 运行以下命令，生成当前目录对应的加载项：

   ```sh
   node scripts/print-install-patch.mjs
   ```

4. 将输出追加到现有 patch 顶层列表。不要覆盖原有项目；如果已存在 `laishu-workspace-skin`，更新该项，不能重复添加。原文件若为 `[]`，用生成的列表替换空列表。
5. 启动 DSH，在通用设置中查看“暖纸与雾绿”。

请保留源码目录及其依赖，加载项引用的是本地绝对路径；移动目录后须同步修改该项。

从原先的仓库根目录结构更新时，将旧插件加载项的路径替换为新子目录生成的路径，保留同一个 `laishu-workspace-skin` ID，不要增加第二个实例。随后重启 DSH。

## 安装本地包

在项目目录执行 `npm pack` 得到 `.tgz`。若已有可用的 DSH CLI，可运行：

```sh
dsh plugin --profile desktop add /absolute/path/to/package.tgz
```

随后确认该 profile 的 patch 列表包含以下加载项；若已存在则不要重复添加：

```yaml
- insert:
    - id: laishu-workspace-skin
      name: '@laishu/dsh-workspace-skin'
```

重启 DSH。安装依赖与启用插件是两个步骤。

## 使用

- 右上角的暂停按钮控制所有竹影层。
- 通用设置 → 暖纸与雾绿可关闭竹影或恢复默认外观。
- 系统启用“减少动态效果”时，竹影保持静止。
- 余额来源在余额文字的悬停提示及费用说明中显示。

## 停用与回退

只恢复外观：在插件设置中选择“恢复默认外观”。停用插件：退出 DSH，在 patch 中移除本插件对应的加载项，保留其他配置，再重启。

更新前建议保留上一版源码或包。回退时恢复原版本并重启 DSH。客户端偏好键为 `laishu.dsh.workspace-skin.v1`，只存三个布尔开关。
