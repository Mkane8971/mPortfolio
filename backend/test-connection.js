import sql from 'mssql';

const config = {
  server: 'localhost',
  port: 1434,
  user: 'sa',
  password: 'Pass123!',
  database: 'master',
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

console.log('Attempting to connect to SQL Server...');
console.log('Server:', config.server);
console.log('Port:', config.port);
console.log('User:', config.user);

try {
  const pool = await sql.connect(config);
  console.log('✓ Connected successfully!');
  
  const result = await pool.request().query('SELECT @@VERSION as version');
  console.log('SQL Server version:', result.recordset[0].version);
  
  await pool.close();
  console.log('Connection closed.');
} catch (err) {
  console.error('✗ Connection failed:');
  console.error('Error code:', err.code);
  console.error('Message:', err.message);
  console.error('\nFull error:', err);
}
