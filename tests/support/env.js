// Every test file gets its own database on the shared in-memory server; the real .env is never
// read for these (dotenv does not override variables that are already set).
process.env.MONGOOSEURI = `${process.env.TEST_MONGO_URI}incomeexpense_${process.env.JEST_WORKER_ID}_${Date.now()}`;
process.env.REFRESH_TOKEN_SECRET = "test-refresh-secret";
process.env.PORT = "0";
