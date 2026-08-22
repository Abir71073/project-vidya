async function test() {
  const pdfModule = await import('pdf-parse/lib/pdf-parse.js');
  console.log(pdfModule);
  console.log('default:', pdfModule.default);
}
test();
