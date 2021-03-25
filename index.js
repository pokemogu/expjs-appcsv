const path = require('path')
const stream = require('stream');
const express = require('express')
const multer = require('multer')
const fs = require('fs')
const parse = require("csv-parse/lib/sync");
const stringify = require('csv-stringify/lib/sync')

const app = express()
const port = process.env.PORT || 3000
app.set('view engine', 'ejs');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage })

app.use(express.static(path.join(__dirname, 'public')))
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

app.get('/', (request, response) => response.redirect('/upload'));

app.get('/upload', (req, res) => res.sendFile(path.join(__dirname, 'public/upload.html')))

app.post('/upload', upload.array('csvfile', 2), function (req, res) {
  const dirpath = path.join(__dirname, 'uploads');
  const outfilepath = path.join(dirpath, 'result.csv');

  const csv1 = req.files[0].buffer;
  const csv2 = req.files[1].buffer;

  const records1 = parse(csv1, {
    columns: false,
    skip_empty_lines: true
  })
  console.log(records1);

  const records2 = parse(csv2, {
    columns: false,
    skip_empty_lines: true
  })
  console.log(records2);

  let records = [];
  let i;
  for (i = 0; i < records1.length; i++) {
    records.push(records1[i]);
    if (i < records2.length)
      records.push(records2[i]);
  }
  if (i < records2.length) {
    for (; i < records2.length; i++) {
      records.push(records2[i]);
    }
  }
  console.log(records);

  const data = stringify(records);
  fs.writeFileSync(outfilepath, data);

  res.render('result', { result_csvfile: '/uploads/result.csv' });
})

app.listen(port, function () {
  console.log(`Example app listening on port ${port}!`)
})