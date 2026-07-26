const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL_UNPOOLED or DATABASE_URL is required to run database migrations.");
  process.exit(1);
}

if (!/^postgres(?:ql)?:\/\//.test(connectionString)) {
  console.error("Database migration URL must use a PostgreSQL connection string.");
  process.exit(1);
}

console.log("Database migration environment is configured.");
