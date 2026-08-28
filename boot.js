(function () {
  var files = ["game-1.js?v=fight3","game-2.js?v=fight1","game-3.js?v=fight1","game-4.js?v=fight1","game-5.js?v=fight1","game-6.js?v=fight1"];
  Promise.all(files.map(function (u) {
    return fetch(u).then(function (r) {
      if (!r.ok) throw new Error(u + " " + r.status);
      return r.text();
    });
  })).then(function (parts) {
    var s = document.createElement("script");
    s.text = parts.join("");
    document.body.appendChild(s);
  }).catch(function (e) { console.error(e); });
})();
