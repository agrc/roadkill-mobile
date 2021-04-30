import app from './app.js';

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`api is running on port: ${port}`);
});
