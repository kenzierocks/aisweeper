const express = require('express');
const app = express();

app.use('/', express.static('dist'));

app.listen(13447, () => console.log("EJS: Ready to roll."));
