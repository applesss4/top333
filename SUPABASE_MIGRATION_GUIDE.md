# Supabase 迁移指南

## 概述

本指南将帮助您完成从维格表到Supabase的完整迁移。系统已经配置为使用Supabase API，但需要在Supabase中创建必要的表结构。

## 迁移步骤

### 1. 创建Supabase表结构

在Supabase控制台中执行以下操作：

1. 登录您的Supabase账户
2. 进入项目仪表板
3. 点击左侧菜单中的「SQL编辑器」
4. 创建一个新的查询
5. 复制并粘贴`setup-schedule-shops-tables.sql`文件中的内容
6. 执行SQL脚本

```sql
-- 此处是setup-schedule-shops-tables.sql的内容
-- 请直接复制该文件中的SQL语句
```

### 2. 验证表结构

执行SQL脚本后，您可以通过以下方式验证表结构是否正确创建：

1. 在Supabase控制台中，点击左侧菜单的「表编辑器」
2. 确认`schedules`和`shops`表已经创建
3. 检查表结构是否符合预期

### 3. 运行测试脚本

使用以下命令运行测试脚本，验证系统是否能够正常连接和使用Supabase：

```bash
node test-supabase-migration.js
```

如果测试通过，您将看到所有测试项目都显示为成功。

### 4. 数据迁移

如果您有现有的维格表数据需要迁移到Supabase，可以使用以下方法：

1. 从维格表导出数据为JSON或CSV格式
2. 使用Supabase的导入功能或通过API将数据导入到相应的表中

## 故障排除

如果您在迁移过程中遇到问题，请检查以下几点：

1. 确保Supabase的URL和API密钥配置正确（检查`.env.supabase`文件）
2. 验证表结构是否正确创建，包括所有必要的列和约束
3. 检查行级安全策略是否正确设置

## 完成迁移

一旦所有测试通过，您可以：

1. 更新应用程序配置，确保所有环境都使用Supabase
2. 移除与维格表相关的代码和配置
3. 更新文档，反映新的数据存储方式