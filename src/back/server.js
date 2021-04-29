import app from './app.js'; // not sure why this needs the ".js"

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`wvc api is running on port: ${port}`);
});
