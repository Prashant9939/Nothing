document.addEventListener('DOMContentLoaded', function () {
  var retry = document.getElementById('retry');
  if (retry) {
    retry.addEventListener('click', function () {
      window.location.reload();
    });
  }
});

window.addEventListener('online', function () {
  window.location.reload();
});
