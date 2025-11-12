import sql from 'mssql';

const pool = await sql.connect({
  server: 'localhost',
  port: 1434,
  user: 'sa',
  password: 'Pass123!',
  database: 'portfolio',
  options: { encrypt: true, trustServerCertificate: true }
});

const tables = await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'");
console.log('\n✓ Database: portfolio');
console.log('✓ Tables created:');
tables.recordset.forEach(t => console.log('  -', t.TABLE_NAME));

const profile = await pool.request().query('SELECT full_name, title FROM portfolio_profile WHERE id = 1');
if (profile.recordset.length > 0) {
  console.log('\n✓ Profile seeded:');
  console.log('  Name:', profile.recordset[0].full_name);
  console.log('  Title:', profile.recordset[0].title);
}

await pool.close();
