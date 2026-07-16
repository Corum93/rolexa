(() => {
  if (!/\/(index\.html)?$/.test(location.pathname)) return;
  if (window.__rolexaPremiumComparisonSection) return;
  window.__rolexaPremiumComparisonSection = true;

  const section = document.getElementById('why');
  if (!section) return;

  const style = document.createElement('style');
  style.textContent = `
    #why{position:relative;padding-top:24px!important;padding-bottom:52px!important;background:linear-gradient(180deg,#f5f7fc 0%,#f8faff 100%)}
    #why:before{content:'';position:absolute;left:0;right:0;top:0;height:1px;background:linear-gradient(90deg,transparent,rgba(76,116,255,.22),transparent)}
    #why .sec-head{margin-bottom:22px!important;align-items:flex-start}
    #why .sec-head>div{max-width:760px}
    #why .sec-head>div:before{content:'Why Rolexa';display:inline-flex;align-items:center;background:#e9edff;color:#2946c7;border-radius:999px;padding:6px 11px;font-size:11px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;margin-bottom:12px}
    #why .sec-head h2{font-size:34px!important;line-height:1.15;letter-spacing:-.025em}
    #why .sec-head p{max-width:720px!important;font-size:15px!important;line-height:1.62!important;color:#626c82!important}
    #why .compare-table-wrap{position:relative;overflow:hidden!important;border:1px solid rgba(10,14,26,.09)!important;border-radius:24px!important;padding:0!important;background:#fff!important;box-shadow:0 24px 60px rgba(10,14,26,.08)!important}
    #why .compare-table-wrap:before{content:'';position:absolute;left:0;right:0;top:0;height:4px;background:linear-gradient(90deg,#4c74ff,#7b61ff)}
    #why .compare-table{min-width:720px!important;table-layout:fixed}
    #why .compare-table th,#why .compare-table td{padding:18px 22px!important;border-bottom:1px solid rgba(10,14,26,.07)!important;vertical-align:middle}
    #why .compare-table thead th{padding-top:24px!important;font-size:11.5px!important;letter-spacing:.075em!important;color:#8a94aa!important;background:#fff}
    #why .compare-table thead th:first-child{width:22%}
    #why .compare-table thead th.col-rolexa{width:40%}
    #why .compare-table th.col-rolexa{color:#2946c7!important;background:linear-gradient(180deg,#edf2ff,#e9efff)!important}
    #why .compare-table td:first-child{font-size:13.5px!important;color:#111a35!important;font-weight:850!important}
    #why .compare-table td.col-rolexa{position:relative;background:#f1f5ff!important;color:#2442b4!important;font-weight:750!important;line-height:1.42!important;font-size:13.5px!important}
    #why .compare-table td.col-rolexa:before{content:'✓';display:inline-grid;place-items:center;width:21px;height:21px;border-radius:50%;background:#dfe8ff;color:#176bff;font-size:12px;font-weight:900;margin-right:10px;vertical-align:middle;flex:0 0 auto}
    #why .compare-table td:not(:first-child):not(.col-rolexa){color:#657086!important;line-height:1.48}
    #why .compare-table tbody tr:hover td{background:#fafbff}
    #why .compare-table tbody tr:hover td.col-rolexa{background:#eaf0ff!important}
    #why .compare-table tbody tr:last-child td{border-bottom:0!important}

    @media(min-width:1180px){
      #why .compare-table td.col-rolexa{white-space:nowrap;font-size:13px!important;letter-spacing:-.005em}
    }

    @media(max-width:780px){
      #why{padding-top:18px!important;padding-bottom:38px!important}
      #why .wrap{padding-left:18px!important;padding-right:18px!important}
      #why .sec-head{margin-bottom:18px!important}
      #why .sec-head h2{font-size:29px!important}
      #why .sec-head p{font-size:14.5px!important;line-height:1.55!important}
      #why .compare-table-wrap{overflow:visible!important;background:transparent!important;border:0!important;box-shadow:none!important;border-radius:0!important}
      #why .compare-table-wrap:before{display:none}
      #why .compare-table,#why .compare-table tbody,#why .compare-table tr,#why .compare-table td{display:block;width:100%;min-width:0!important}
      #why .compare-table thead{display:none}
      #why .compare-table tbody{display:grid;gap:12px}
      #why .compare-table tr{background:#fff;border:1px solid rgba(10,14,26,.08);border-radius:18px;overflow:hidden;box-shadow:0 12px 30px rgba(10,14,26,.055)}
      #why .compare-table td{border:0!important;padding:0!important;white-space:normal!important}
      #why .compare-table td:first-child{padding:16px 17px 10px!important;font-size:14px!important;background:#fff}
      #why .compare-table td.col-rolexa{padding:13px 17px!important;background:#eef3ff!important;font-size:13.5px!important;line-height:1.48}
      #why .compare-table td:not(:first-child):not(.col-rolexa){padding:12px 17px 16px!important;font-size:13px!important;line-height:1.48;background:#fff}
      #why .compare-table td.col-rolexa:after{content:'Rolexa';display:block;margin-top:5px;font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:#6680d9}
      #why .compare-table td:not(:first-child):not(.col-rolexa):before{content:'Typical job boards';display:block;margin-bottom:5px;font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:#9aa3b6;font-weight:800}
      #why .compare-table tbody tr:hover td{background:inherit}
      #why .compare-table tbody tr:hover td.col-rolexa{background:#eef3ff!important}
    }
    @media(max-width:420px){
      #why .wrap{padding-left:14px!important;padding-right:14px!important}
      #why .sec-head h2{font-size:27px!important}
      #why .compare-table tr{border-radius:16px}
    }
  `;
  document.head.appendChild(style);

  section.querySelectorAll('td.col-rolexa').forEach(cell => {
    cell.textContent = cell.textContent
      .replace(/real time/gi, 'real\u00a0time')
      .replace(/open role/gi, 'open\u00a0role');
  });
})();