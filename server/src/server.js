const app = require('./app');

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`LeaveFlow API on http://localhost:${PORT}`));
