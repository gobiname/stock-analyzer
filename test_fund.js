const { exec } = require('child_process');

function parseTableToJson(stdout) {
  const lines = stdout.trim().split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  // 找到表头行（包含 | 分隔符的行）
  let headerIndex = 0;
  while (headerIndex < lines.length && !lines[headerIndex].includes('|')) {
    headerIndex++;
  }
  if (headerIndex >= lines.length) return [];

  const headers = lines[headerIndex].split('|')
    .filter(h => h.trim())
    .map(h => h.trim());

  console.log('表头:', headers);
  console.log('数据行数:', lines.length - headerIndex - 1);

  const data = [];
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('---') || !line.includes('|')) continue;

    const values = line.split('|')
      .filter(v => v.trim())
      .map(v => v.trim());

    console.log(`行 ${i}: 值数量=${values.length}, 表头数量=${headers.length}`);
    console.log('值:', values.slice(0, 3), '...');

    if (values.length === headers.length) {
      const row = {};
      let validValueCount = 0;
      headers.forEach((header, index) => {
        const val = values[index] || '';
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
  console.log('原始数据长度:', stdout.length);
  console.log('原始数据前300字符:', stdout.substring(0, 300));
  console.log('---');
  
  const data = parseTableToJson(stdout);
  console.log('---');
  console.log('解析结果条数:', data.length);
  if (data.length > 0) {
    console.log('第一条数据:', JSON.stringify(data[0], null, 2).substring(0, 500));
  }
});
