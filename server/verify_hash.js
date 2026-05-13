const bcrypt = require('bcryptjs');
['Admin@123', 'Emp@123'].forEach(p => {
  const h = bcrypt.hashSync(p, 10);
  console.log(`${p}: ${h}`);
});
