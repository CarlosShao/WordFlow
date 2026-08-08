// 测试环境设置
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'postgresql://wordflow:wordflow@localhost:5432/wordflow_test'
process.env.JWT_SECRET = 'test-secret'
process.env.LOG_LEVEL = 'silent'
