# scripts/ — 项目脚本目录

本目录存放项目维护/诊断类脚本。规则见 `.gitignore`（`!scripts/**` 豁免）。

## 目录约定

| 子目录 | 用途 | 示例 |
|--------|------|------|
| `scripts/`（根） | 长期有用的工具/验证脚本（命名不带 `_` 前缀） | `bili_subtitle_check.mjs` |
| `scripts/diag/` | 一次性排查脚本（保留备查，命名带 `_` 前缀） | `_bili_check.py` 等 |

## 相关约定（铁律）

- **根目录禁止存放 md 文档与脚本**。文档归 `shared/docs/`，脚本归 `scripts/`。
- 一次性诊断脚本统一放 `scripts/diag/`，不再散落项目根目录。
- 长期有用的验证/回填脚本放 `scripts/`（或后端 `src/server/scripts/`），命名不用 `_` 前缀以便纳入版本管理。
