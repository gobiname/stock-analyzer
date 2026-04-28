const { exec } = require('child_process');

function parseTableToJson(stdout) {
  const lines = stdout.trim().split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  let headerIndex = 0;
  while (headerIndex < lines.length && !lines[headerIndex].includes('|')) {
    headerIndex++;
  }
  if (headerIndex >= lines.length) return [];

  const headers = lines[headerIndex].split('|')
    .filter(h => h.trim())
    .map(h => h.trim());

  console.log('表头数量:', headers.length);

  const data = [];
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('---') || !line.includes('|')) continue;

    const values = line.split('|')
      .map(v => v.trim());

    // 过滤掉完全为空的分隔，但保留空字符串字段
    const filteredValues = values.filter((v, i) => {
      return v !== '' || (i > 0 && i < values.length - 1);
    });

    console.log(`行 ${i}: 原始值数量=${values.length}, 过滤后=${filteredValues.length}, 表头=${headers.length}`);

    if (filteredValues.length === headers.length) {
      const row = {};
      let validValueCount = 0;
      headers.forEach((header, index) => {
        const val = filteredValues[index] || '';
        row[header] = val;
        if (val && val !== '---') validValueCount++;
      });
      if (validValueCount > 0) {
        data.push(row);
      }
    }
  }
  return data;
}

exec('npx --yes westock-data-skillhub@latest asfund sz002729', { encoding: 'utf-8' }, (error, stdout) => {
  if (error) {
    console.error('错误:', error);
    return;
  }
  
  const data = parseTableToJson(stdout);
  console.log('---');
  console.log('解析结果条数:', data.length);
  if (data.length > 0) {
    console.log('第一条数据 code:', data[0].code);
    console.log('第一条数据 MainNetFlow:', data[0].MainNetFlow);
  }
});
