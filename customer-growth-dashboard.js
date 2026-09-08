(function () {
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.growth-metric .spark').forEach(function (spark, index) {
      spark.style.transform = 'translateX(' + ((index % 3) * 2) + 'px)';
    });
  });
}());