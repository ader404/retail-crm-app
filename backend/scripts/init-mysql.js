require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

async function initDatabase() {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
  };

  dbConfig.password = process.env.DB_PASSWORD || '';

  const dbName = process.env.DB_NAME || 'retail_crm';

  console.log(`Connecting to MySQL at ${dbConfig.host}:${dbConfig.port} as ${dbConfig.user}...`);

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✓ Connected to MySQL server');

    // Check if database exists
    const [databases] = await connection.query(
      `SHOW DATABASES LIKE '${dbName}'`
    );

    if (databases.length === 0) {
      console.log(`Database "${dbName}" not found. Creating...`);
      await connection.query(`CREATE DATABASE \`${dbName}\``);
      console.log(`✓ Database "${dbName}" created`);
    } else {
      console.log(`✓ Database "${dbName}" already exists`);
    }

    await connection.end();
    console.log('\n✓ Database initialization complete');
    console.log(`\nYou can now run: pnpm prisma migrate deploy`);
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Database initialization failed:');
    console.error(error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

initDatabase();
