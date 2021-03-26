const path = require('path');
const stream = require('stream');
const express = require('express')
const multer = require('multer')
const parse = require("csv-parse/lib/sync");
const stringify = require('csv-stringify/lib/sync');
const iconv = require('iconv-lite');

const app = express();
const port = process.env.PORT || 3000
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

const storage = multer.memoryStorage();
const upload = multer({ storage: storage })

app.use(express.static(path.join(__dirname, 'public')))
app.get('/', (request, response) => response.redirect('/upload'));
app.get('/upload', (req, res) => res.sendFile(path.join(__dirname, 'public/upload.html')))

app.post('/upload', upload.fields([{ name: 'csvfile1', maxCount: 1 }, { name: 'csvfile2', maxCount: 1 }]), function (req, res) {
  // 文字コード変換する。
  const csv1 = iconv.decode(req.files['csvfile1'][0].buffer, req.body.encoding1);
  const csv2 = iconv.decode(req.files['csvfile2'][0].buffer, req.body.encoding1);

  const records1 = parse(csv1, {
    columns: true,
    skip_empty_lines: true
  });

  let records_worktime = [];
  for (const record of records1) {
    let record_worktime = { name: '', worktime: 0.0 };
    console.log(record);
    for (const key in record) {
      if (/^\s*利用者名\s*$/.test(key)) {
        record_worktime.name = record[key];
      }
      else if (/^\s*\d+月時間\s*$/.test(key) && /^\d+(\.\d+)?$/.test(record[key])) {
        record_worktime.worktime = parseFloat(record[key]);
      }
    }
    if (record_worktime.name != '' && record_worktime.worktime > 0.0) {
      records_worktime.push(record_worktime);
    }
  }

  /*
  const records_worktime = records1.map((record) => {
    const name_tmp = record[Object.keys(record).find(key => /^\s*利用者名\s*$/.test(key))];
    const worktime_tmp = record[Object.keys(record).find(key => /^\s*\d+月時間\s*$/.test(key))];
    if (name_tmp && worktime_tmp && name_tmp != '' && worktime_tmp != '' && /^\d+(\.\d+)?$/.test(worktime_tmp)) {
      return { name: name_tmp, worktime: parseFloat(worktime_tmp) };
    }
  });
  */

  if (records_worktime === undefined || records_worktime.length < 1) {
    res.send('<html><head></head><body><h1>エラー</h1><p>稼働時間が不正です。</p><hr/><p></p></body></html>');
    return;
  }
  else
    console.log(records_worktime);

  const records2 = parse(csv2, {
    columns: true,
    skip_empty_lines: true
  });

  /*
  for (const record in records2) {
    let record_usage = { name: '', usage: '', quantity: 0.0 };
    for (const key in record) {
      if (/^\s*利用者名\s*$/.test(key)) {
        record_usage.name = record[key];
      }
      else if (/^\s*利用料項目\s*$/.test(key)) {
        record_usage.usage = record[key];
      }
      else if (/^\s*数量\s*$/.test(key)) {
        record_usage.quantity = parseFloat(record[key]);
      }
    }
    if (record_usage.name != '' && record_usage.usage != '' && record_usage.quantiry > 0.0) {
      records_usage.push(record_usage);
    }
  }
  */

  const records_usage = records2.map((record) => {
    const name_tmp = record[Object.keys(record).find(key => /^\s*利用者名\s*$/.test(key))];
    const usage_tmp = record[Object.keys(record).find(key => /^\s*利用料項目\s*$/.test(key))];
    const quantity_tmp = record[Object.keys(record).find(key => /^\s*数量\s*$/.test(key))];
    if (
      name_tmp && usage_tmp && quantity_tmp &&
      name_tmp != '' &&
      usage_tmp != '' &&
      (/^\s*昼食代(\-保険適用)?\s*$/.test(usage_tmp) || /^\s*施設外時間数\s*$/.test(usage_tmp)) &&
      /^\d+(\.\d+)?$/.test(quantity_tmp)
    ) {
      return { name: name_tmp, usage: usage_tmp, quantity: parseFloat(quantity_tmp) };
    }
  });

  if (!records_usage) {
    res.send('<html><head></head><body><h1>エラー</h1><p>利用項目が不正です。</p><hr/><p></p></body></html>');
    return;
  }

  const data = stringify(records_worktime, {
    bom: true,
    header: true,
    columns: [
      { key: 'name', header: '利用者名' },
      { key: 'worktime', header: '時間' }
    ]
  }); // CSVファイルデータにUTF-8のBOMを付与してExcelでの文字化けを防ぐ
  const resultcsv = new stream.PassThrough();
  resultcsv.end(data); // streamにCSVデータを渡す
  res.set('Content-disposition', 'attachment; filename=result.csv');
  res.set('Content-Type', 'text/csv');
  resultcsv.pipe(res); // streamを出力する
})

app.listen(port, function () {
  console.log(`Example app listening on port ${port}!`)
})