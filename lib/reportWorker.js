// Worker-thread entry: renders the multi-page internship report off the main
// event loop so one download can't freeze every other request (pdfkit rendering
// is synchronous CPU work). The main thread (lib/reportPdf.js) sends the
// prepared payload + brand cache; PDF bytes stream back as chunk messages.
//
// This file is also statically required by reportPdf.js (as a no-op when
// running on the main thread) so serverless bundlers include it in the deploy.
const { isMainThread, parentPort, workerData } = require('worker_threads');

if (isMainThread) {
  module.exports = {};
} else {
  (async () => {
    try {
      const { PassThrough } = require('stream');
      const { hydrateBrand } = require('./documentBrand');
      hydrateBrand(workerData.brand);

      const { streamReportInline } = require('./reportPdf');

      // streamReport() expects an Express-like response; a PassThrough with a
      // no-op setHeader() stands in for it — bytes are forwarded to the main
      // thread, which writes them to the real response.
      const sink = new PassThrough();
      sink.setHeader = () => {};
      sink.on('data', (chunk) => {
        parentPort.postMessage({ type: 'chunk', data: new Uint8Array(chunk) });
      });

      // streamReportInline resolves after doc.end(); the PDF bytes only reach
      // 'end' once pdfkit has fully flushed — wait for that before signalling
      // done, otherwise the worker could exit with a truncated document.
      await new Promise((resolve, reject) => {
        sink.once('end', resolve);
        sink.once('error', reject);
        streamReportInline(sink, workerData.payload).catch(reject);
      });
      parentPort.postMessage({ type: 'done' });
    } catch (err) {
      parentPort.postMessage({ type: 'error', message: err && err.message ? err.message : String(err) });
    }
  })();
}
